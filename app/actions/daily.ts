"use server";

import { differenceInCalendarDays, startOfDay } from "date-fns";
import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth";
import { levelForXp, rankForXp } from "@/lib/gamification";
import { prisma } from "@/lib/prisma";

export async function submitDailyQuestionAction(questionId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const selected = String(formData.get("answer") ?? "").trim();
  if (!selected) throw new Error("Choose an answer.");

  const question = await prisma.dailyQuestion.findUnique({
    where: { id: questionId },
    include: { course: { select: { enrollments: { where: { userId: session.user.id }, select: { id: true } } } } }
  });
  if (!question || !question.course.enrollments.length) throw new Error("You are not enrolled in this course.");

  const normalizedSelected = selected.toLowerCase();
  const normalizedAnswer = question.answer.trim().toLowerCase();
  const correct = normalizedSelected === normalizedAnswer;
  const score = correct ? question.xpReward : 0;

  const existing = await prisma.result.findFirst({
    where: { userId: session.user.id, dailyQuestionId: questionId },
    orderBy: { submittedAt: "asc" }
  });

  await prisma.$transaction(async (tx) => {
    if (existing) {
      await tx.result.update({
        where: { id: existing.id },
        data: {
          score,
          maxScore: question.xpReward,
          answers: { selected, correct, answer: question.answer },
          submittedAt: new Date()
        }
      });
      return;
    }

    await tx.result.create({
      data: {
        userId: session.user.id,
        dailyQuestionId: questionId,
        score,
        maxScore: question.xpReward,
        answers: { selected, correct, answer: question.answer }
      }
    });

    if (correct) {
      const updatedUser = await tx.user.update({
        where: { id: session.user.id },
        data: { xp: { increment: question.xpReward } }
      });
      await tx.user.update({
        where: { id: session.user.id },
        data: { level: levelForXp(updatedUser.xp), heroTag: rankForXp(updatedUser.xp).tag }
      });
      await tx.xPLog.create({
        data: { userId: session.user.id, amount: question.xpReward, reason: "Daily question", sourceId: questionId }
      });

      const today = startOfDay(new Date());
      const streak = await tx.streak.upsert({
        where: { userId: session.user.id },
        update: {},
        create: { userId: session.user.id, current: 0, best: 0 }
      });
      const gap = streak.lastSeen ? differenceInCalendarDays(today, startOfDay(streak.lastSeen)) : null;
      const current = gap === 0 ? streak.current : gap === 1 ? streak.current + 1 : 1;
      await tx.streak.update({
        where: { userId: session.user.id },
        data: { current, best: Math.max(streak.best, current), lastSeen: today }
      });
    }
  });

  revalidatePath("/daily-question");
  revalidatePath("/feed");
  revalidatePath("/teacher/courses");
}

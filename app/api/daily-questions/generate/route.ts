import { NextResponse } from "next/server";
import { startOfDay } from "date-fns";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateDailyQuestion } from "@/lib/ai/gemini";

export async function POST() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "TEACHER" && session.user.role !== "ADMIN")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const courses = await prisma.course.findMany({
    where: {
      activeTopic: { not: null },
      ...(session.user.role === "TEACHER" ? { teacherId: session.user.id } : {})
    }
  });
  const date = startOfDay(new Date());
  const created = [];

  for (const course of courses) {
    const aiQuestion = await generateDailyQuestion(course.activeTopic!);
    const question = await prisma.dailyQuestion.upsert({
      where: { courseId_date: { courseId: course.id, date } },
      update: {},
      create: {
        courseId: course.id,
        date,
        topic: course.activeTopic!,
        prompt: aiQuestion.prompt,
        options: aiQuestion.options,
        answer: aiQuestion.answer,
        solution: aiQuestion.solution
      }
    });
    created.push(question);
  }

  return NextResponse.json({ count: created.length, questions: created });
}

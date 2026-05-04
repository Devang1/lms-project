import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateDailyQuestion } from "@/lib/ai/gemini";

export async function POST() {
  // OPTIONAL: allow manual trigger only for teacher/admin
  const session = await auth();

  const isManualRequest = !!session?.user;

  if (
    isManualRequest &&
    session.user.role !== "TEACHER" &&
    session.user.role !== "ADMIN"
  ) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  // ✅ UTC-safe date
  const now = new Date();
  const date = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate()
    )
  );

  // ✅ Prevent duplicate generation
  const alreadyExists = await prisma.dailyQuestion.findFirst({
    where: { date }
  });

  if (alreadyExists) {
    return NextResponse.json({
      message: "Questions already generated for today"
    });
  }

  // ✅ Fetch all courses with active topics
  const courses = await prisma.course.findMany({
    where: {
      activeTopic: { not: null }
    }
  });

  // ✅ Generate questions in parallel
  const created = await Promise.all(
    courses.map(async (course) => {
      const aiQuestion = await generateDailyQuestion(
        course.activeTopic!
      );

      return prisma.dailyQuestion.create({
        data: {
          courseId: course.id,
          date,
          topic: course.activeTopic!,
          prompt: aiQuestion.prompt,
          options: aiQuestion.options,
          answer: aiQuestion.answer,
          solution: aiQuestion.solution
        }
      });
    })
  );

  return NextResponse.json({
    count: created.length,
    questions: created
  });
}
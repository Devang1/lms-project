import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateDailyQuestion } from "@/lib/ai/gemini";

export async function POST() {
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

  // ✅ STRICT UTC NORMALIZED DATE (IMPORTANT FIX)
  const now = new Date();

  const todayStart = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      0, 0, 0, 0
    )
  );

  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setUTCDate(tomorrowStart.getUTCDate() + 1);

  // 🔥 HARD CLEAN: DELETE EVERYTHING NOT EXACTLY TODAY
  await prisma.dailyQuestion.deleteMany({
    where: {
      NOT: {
        date: todayStart
      }
    }
  });

  // 🔁 DOUBLE CHECK (extra safety)
  const alreadyExists = await prisma.dailyQuestion.findFirst({
    where: {
      date: todayStart
    }
  });

  if (alreadyExists) {
    return NextResponse.json({
      message: "Questions already generated for today"
    });
  }

  // 📚 Fetch courses
  const courses = await prisma.course.findMany({
    where: {
      activeTopic: { not: null }
    }
  });

  // ⚡ Generate questions
  const created = await Promise.all(
    courses.map(async (course) => {
      const aiQuestion = await generateDailyQuestion(
        course.activeTopic!
      );

      return prisma.dailyQuestion.create({
        data: {
          courseId: course.id,

          // ✅ ALWAYS NORMALIZED DATE
          date: todayStart,

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
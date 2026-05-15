import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

function calculateRisk(score: number) {
  if (score <= 20) return "LOW";
  if (score <= 50) return "MEDIUM";
  return "HIGH";
}

export async function GET(
  request: Request,
  { params }: { params: { testId: string } }
) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  // TEACHER ONLY
  if (session.user.role !== "TEACHER") {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  const test = await prisma.test.findUnique({
    where: {
      id: params.testId
    },
    include: {
      results: {
        include: {
          user: true
        }
      },
      questions: true
    }
  });

  if (!test) {
    return NextResponse.json(
      { error: "Test not found" },
      { status: 404 }
    );
  }

  const formattedResults = await Promise.all(
    test.results.map(async (result) => {
      const suspiciousEvents =
        await prisma.suspiciousActivity.findMany({
          where: {
            userId: result.userId,
            testId: test.id
          },
          orderBy: {
            createdAt: "asc"
          }
        });

      const EVENT_SCORES: Record<string, number> = {
    TAB_SWITCH: 10,
    FULLSCREEN_EXIT: 15,
    APP_MINIMIZE: 20,
    RAPID_ANSWERING: 15,
    MULTIPLE_DISCONNECTS: 25
  };

  const suspicionScore = suspiciousEvents.reduce(
    (total, event) =>
      total + (EVENT_SCORES[event.event] || 5),
    0
  );

      return {
        id: result.id,
        score: result.score,
        maxScore: result.maxScore,
        submittedAt: result.submittedAt,

        suspicionScore,

        riskLevel: calculateRisk(suspicionScore),

        user: {
          name: result.user.name,
          email: result.user.email
        },

        suspiciousEvents: suspiciousEvents.map(
  (event) => ({
    ...event,
    severity:
      EVENT_SCORES[event.event] || 5
  })
),

        review: test.questions.map((question) => ({
          id: question.id,
          prompt: question.prompt,
          correctAnswer: question.answer,
          explanation: question.explanation,
          yourAnswer:
            (result.answers as any)?.[question.id] || null,
          earned: 0,
          marks: question.marks
        }))
      };
    })
  );

  return NextResponse.json({
    testId: test.id,
    title: test.title,
    results: formattedResults
  });
}
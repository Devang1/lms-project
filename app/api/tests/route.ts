import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

function calculateRisk(score: number) {
  if (score <= 20) return "LOW";
  if (score <= 50) return "MEDIUM";
  return "HIGH";
}

const EVENT_SCORES: Record<string, number> = {
  TAB_SWITCH: 10,
  FULLSCREEN_EXIT: 15,
  APP_SWITCH: 15,
  APP_MINIMIZE: 20,
  RAPID_ANSWERING: 15,
  MULTIPLE_DISCONNECTS: 25
};

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (session.user.role !== "TEACHER") {
      return NextResponse.json(
        { error: "Forbidden" },
        { status: 403 }
      );
    }

    const tests = await prisma.test.findMany({
      where: {
        course: {
          teacherId: session.user.id
        }
      },

      include: {
        course: true,

        results: {
          include: {
            user: true
          }
        }
      },

      orderBy: {
        createdAt: "desc"
      }
    });

    const formattedTests = await Promise.all(
      tests.map(async (test) => {
        const testIds = [test.id];

        const suspiciousEvents =
          await prisma.suspiciousActivity.findMany({
            where: {
              testId: {
                in: testIds
              }
            }
          });

        const suspiciousUsers = new Set<string>();

        suspiciousEvents.forEach((event) => {
          const score =
            EVENT_SCORES[event.event] || 5;

          if (score >= 10) {
            suspiciousUsers.add(event.userId);
          }
        });

        const averageScore =
          test.results.length > 0
            ? (
                test.results.reduce(
                  (sum, result) =>
                    sum + result.score,
                  0
                ) / test.results.length
              ).toFixed(1)
            : "0";

        return {
          id: test.id,

          title: test.title,

          courseTitle: test.course.title,

          submissions: test.results.length,

          averageScore,

          suspiciousCount:
            suspiciousUsers.size,

          createdAt: test.createdAt
        };
      })
    );

    return NextResponse.json({
      tests: formattedTests
    });
  } catch (error) {
    console.error(error);

    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
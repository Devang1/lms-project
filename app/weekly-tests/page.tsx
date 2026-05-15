import { Activity, ArrowLeft, Clock, Layers, ShieldCheck } from "lucide-react";
import type { Prisma } from "@prisma/client";
import Link from "next/link";
import { AntiCheatClient } from "@/app/weekly-tests/anti-cheat-client";
import { ExamClient } from "@/app/weekly-tests/exam-client";
import { ResultAnalysisCard } from "@/app/weekly-tests/result-analysis-card";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { buildResultAnalysis } from "@/lib/exams/results";
import { personalizeQuestions } from "@/lib/exams/question-variants";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function WeeklyTestsPage({
  searchParams
}: {
  searchParams: Promise<{ testId?: string }>;
}) {
  const session = await auth();

  const params = await searchParams;

  const role = session?.user.role ?? "STUDENT";

  const userId = session?.user.id;

  const where: Prisma.TestWhereInput = !userId
    ? { status: "ACTIVE" as const }
    : role === "STUDENT"
      ? {
          course: {
            enrollments: {
              some: { userId }
            }
          },

          status: {
            in: ["SCHEDULED", "ACTIVE"]
          }
        }
      : role === "TEACHER"
        ? {
            course: {
              teacherId: userId
            }
          }
        : {};

  const tests = await prisma.test.findMany({
    where,

    include: {
      course: true,
      questions: true,
      results: true
    },

    orderBy: {
      startsAt: "desc"
    },

    take: 20
  });

  const selectedTest =
    tests.find(
      (test) => test.id === params.testId
    ) ?? null;

  const selectedResult =
    selectedTest && userId
      ? selectedTest.results
          .filter(
            (result) =>
              result.userId === userId
          )
          .sort(
            (left, right) =>
              right.submittedAt.getTime() -
              left.submittedAt.getTime()
          )[0]
      : null;

  const existingEvents =
    selectedTest && session?.user
      ? await prisma.suspiciousActivity.findMany({
          where: {
            userId: session.user.id,
            testId: selectedTest.id
          },

          orderBy: {
            createdAt: "asc"
          },

          select: {
            event: true,
            createdAt: true
          }
        })
      : [];

  const selectedAnalysis =
    selectedTest &&
    selectedResult &&
    session?.user
      ? buildResultAnalysis({
          questions:
            selectedTest.questions,

          result: selectedResult,

          studentId:
            session.user.id,

          testId:
            selectedTest.id,

          events: existingEvents.map(
            (event) => ({
              event: event.event,
              createdAt:
                event.createdAt
            })
          )
        })
      : null;

  return (
    <AppShell role={role}>
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">

        {/* HEADER */}

        {!selectedTest ? (
          <div className="mb-6 sm:mb-8">
            <p className="text-md font-medium text-primary/80 sm:text-sm">
              Anti-cheat interactive testing
            </p>

            <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl lg:text-4xl">
              Secure assessment arena
            </h1>

            {role === "STUDENT" ? (
              <p className="mt-2 text-xs text-muted-foreground sm:text-sm">
                Showing tests only from
                courses you are enrolled in.
              </p>
            ) : null}
          </div>
        ) : null}

        {/* SELECTED TEST */}

        {selectedTest && selectedAnalysis ? (
          <div className="mb-6 space-y-4 sm:mb-8 sm:space-y-6">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="w-fit gap-2 sm:size-default"
            >
              <Link href="/weekly-tests">
                <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />

                <span className="text-xs sm:text-sm">
                  Back to tests
                </span>
              </Link>
            </Button>

            <ResultAnalysisCard
              title={selectedTest.title}
              analysis={selectedAnalysis}
            />
          </div>
        ) : selectedTest &&
          session?.user ? (
          <div className="mb-6 space-y-4 sm:mb-8 sm:space-y-6">
            <Button
              asChild
              variant="outline"
              size="sm"
              className="w-fit gap-2 sm:size-default"
            >
              <Link href="/weekly-tests">
                <ArrowLeft className="h-3 w-3 sm:h-4 sm:w-4" />

                <span className="text-xs sm:text-sm">
                  Back to tests
                </span>
              </Link>
            </Button>

            <ExamClient
              testId={selectedTest.id}
              title={selectedTest.title}
              durationMin={
                selectedTest.durationMin
              }
              questions={personalizeQuestions(
                selectedTest.questions,
                session.user.id,
                selectedTest.id
              )}
              existingEvents={existingEvents.map(
                (event) => ({
                  event: event.event,
                  createdAt:
                    event.createdAt.toISOString()
                })
              )}
            />
          </div>
        ) : tests.length ? (
          <div className="mb-6 rounded-lg border bg-card p-3 text-xs text-muted-foreground sm:mb-8 sm:p-4 sm:text-sm">
            Select a test below and press{" "}
            <span className="font-medium text-foreground">
              Start test
            </span>{" "}
            to open the secure exam screen.
          </div>
        ) : (
          <AntiCheatClient
            testId={tests[0]?.id}
          />
        )}

        {/* TEST GRID */}

        {!selectedTest && (
          <div className="grid gap-3 sm:gap-4 lg:grid-cols-2">

            {tests.map((test) => {
              const hasSubmitted =
                test.results.some(
                  (result) =>
                    result.userId === userId
                );

              return (
                <Card
                  key={test.id}
                  className="transition-all duration-200 hover:shadow-md"
                >
                  <CardHeader className="p-4 pb-2 sm:p-6 sm:pb-3">

                    <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">

                      <div className="min-w-0 flex-1">

                        <CardTitle className="text-base font-semibold line-clamp-1 sm:text-lg lg:text-xl">
                          {test.title}
                        </CardTitle>

                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-1 sm:mt-1 sm:text-sm">
                          {test.course.title} -{" "}
                          {test.topic}
                        </p>

                      </div>

                      <Badge
                        variant="outline"
                        className="w-fit text-[10px] sm:text-xs"
                      >
                        {test.status}
                      </Badge>

                    </div>
                  </CardHeader>

                  <CardContent className="space-y-3 p-4 pt-0 sm:space-y-4 sm:p-6 sm:pt-0">

                    {hasSubmitted && (
                      <Badge
                        variant="secondary"
                        className="w-fit text-[10px] sm:text-xs"
                      >
                        Submitted
                      </Badge>
                    )}

                    <div className="space-y-2 text-xs text-muted-foreground sm:space-y-2.5 sm:text-sm">

                      <p className="flex items-center gap-2">
                        <Clock className="h-3 w-3 sm:h-4 sm:w-4" />

                        <span>
                          {test.durationMin} minutes
                        </span>
                      </p>

                      <p className="flex items-center gap-2">
                        <ShieldCheck className="h-3 w-3 sm:h-4 sm:w-4" />

                        <span>
                          {test.questions.length} personalized
                          questions -{" "}
                          {test.results.length} submission
                          {test.results.length !== 1
                            ? "s"
                            : ""}
                        </span>
                      </p>

                    </div>

                    <Button
                      asChild
                      className="mt-2 w-full gap-2 text-sm sm:w-fit sm:text-base"
                      variant={
                        hasSubmitted
                          ? "outline"
                          : "default"
                      }
                    >
                      <Link
                        href={`/weekly-tests?testId=${test.id}`}
                      >
                        {hasSubmitted
                          ? "View result"
                          : "Start test"}
                      </Link>
                    </Button>

                  </CardContent>
                </Card>
              );
            })}

            {!tests.length && (
              <Card>
                <CardContent className="p-6 text-center text-sm text-muted-foreground sm:p-8">
                  <p className="text-xs sm:text-sm">
                    No course tests are
                    available yet.
                  </p>

                  <p className="mt-1 text-[10px] text-muted-foreground/70 sm:mt-2 sm:text-xs">
                    Check back later for new
                    assessments.
                  </p>
                </CardContent>
              </Card>
            )}

          </div>
        )}
      </div>
    </AppShell>
  );
}
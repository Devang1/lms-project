import Link from "next/link";
import { ArrowLeft, ClipboardList, Plus, ShieldAlert } from "lucide-react";
import { createManualTestAction, createPromptGeneratedTestAction } from "@/app/actions/tests";
import { ManualTestBuilder } from "@/app/teacher/tests/manual-test-builder";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { auth } from "@/lib/auth";
import { eventLabels, getRiskClass, getRiskLevel, getSuspicionScore } from "@/lib/exams/anti-cheat";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function TeacherTestsPage({
  searchParams
}: {
  searchParams: Promise<{ courseId?: string; created?: string }>;
}) {
  const session = await auth();
  const params = await searchParams;
  const courses = await prisma.course.findMany({
    where: session?.user.role === "ADMIN" ? {} : { teacherId: session!.user.id },
    include: {
      tests: {
        include: {
          questions: true,
          results: { include: { user: true }, orderBy: { submittedAt: "desc" } }
        },
        orderBy: { startsAt: "desc" }
      }
    },
    orderBy: { createdAt: "desc" }
  });
  const selectedCourse = courses.find((course) => course.id === params.courseId) ?? courses[0];
  const studentIds = selectedCourse?.tests.flatMap((test) => test.results.map((result) => result.userId)) ?? [];
  const testIds = selectedCourse?.tests.map((test) => test.id) ?? [];
  const suspiciousEvents = await prisma.suspiciousActivity.findMany({
    where: { userId: { in: studentIds }, testId: { in: testIds } },
    orderBy: { createdAt: "desc" },
    take: 200
  });

  return (
    <AppShell role={session?.user.role ?? "TEACHER"}>
      <div className="mx-auto grid max-w-6xl gap-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">Teacher tests and exams</p>
            <h1 className="text-3xl font-semibold tracking-normal">Exam builder</h1>
          </div>
          <Button asChild variant="outline">
            <Link href="/teacher/courses"><ArrowLeft size={16} /> Courses</Link>
          </Button>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {courses.map((course) => (
            <Button asChild key={course.id} variant={course.id === selectedCourse?.id ? "default" : "outline"} size="sm">
              <Link href={`/teacher/tests?courseId=${course.id}`}>{course.title}</Link>
            </Button>
          ))}
        </div>

        {selectedCourse ? (
          <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><Plus size={18} /> Create full test from prompt</CardTitle>
                <CardDescription>Enter one teacher prompt. The system generates every question and stores it as a normal course test.</CardDescription>
              </CardHeader>
              <CardContent>
                {params.created ? (
                  <p className="mb-3 rounded-md border border-secondary/40 bg-secondary/10 p-3 text-sm text-secondary">
                    Test created successfully.
                  </p>
                ) : null}
                <form action={createPromptGeneratedTestAction.bind(null, selectedCourse.id)} className="grid gap-3">
                  <Input name="title" placeholder="Generated test title, e.g. Friction and NLM Weekly Exam" required />
                  <Input name="topic" placeholder="Topic, e.g. Newton's Laws of Motion" defaultValue={selectedCourse.activeTopic ?? selectedCourse.subject} required />
                  <div className="grid gap-2 sm:grid-cols-3">
                    <Input name="durationMin" type="number" min={5} max={240} defaultValue={45} placeholder="Duration in minutes" required />
                    <Input name="questionCount" type="number" min={1} max={20} defaultValue={8} placeholder="Number of questions" required />
                    <select name="status" className="h-10 rounded-md border bg-background px-3 text-sm" defaultValue="ACTIVE">
                      <option value="DRAFT">Draft</option>
                      <option value="SCHEDULED">Scheduled</option>
                      <option value="ACTIVE">Active</option>
                    </select>
                  </div>
                  <Textarea
                    name="prompt"
                    required
                    className="min-h-40"
                    placeholder="Example: Create a class 10 physics exam on Newton's laws with conceptual questions, find-the-mistake items, missing steps, and scenario reasoning. Avoid direct formula recall."
                  />
                  <Button type="submit"><ClipboardList size={16} /> Generate and save test</Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2"><ClipboardList size={18} /> Create questions one by one</CardTitle>
                <CardDescription>Manually build the full test. Add each question, options, answer, marks, and explanation.</CardDescription>
              </CardHeader>
              <CardContent>
                <ManualTestBuilder
                  action={createManualTestAction.bind(null, selectedCourse.id)}
                  defaultTopic={selectedCourse.activeTopic ?? selectedCourse.subject}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{selectedCourse.title}</CardTitle>
                <CardDescription>{selectedCourse.tests.length} test(s) created for this course.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3">
                {selectedCourse.tests.map((test) => (
                  <div className="rounded-md border p-3" key={test.id}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-medium">{test.title}</p>
                        <p className="text-xs text-muted-foreground">{test.topic} - {test.durationMin} min - {test.questions.length} question(s)</p>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="outline">{test.status}</Badge>
                        <Badge variant="secondary">{test.results.length} submissions</Badge>
                      </div>
                    </div>
                    <div className="mt-3 grid gap-2">
                      {test.results.map((result) => {
                        const events = suspiciousEvents.filter((event) => event.userId === result.userId && event.testId === test.id);
                        const score = getSuspicionScore(events);
                        return (
                          <div className="rounded-md bg-muted/50 p-3 text-sm" key={result.id}>
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <span className="font-medium">{result.user.name}</span>
                              <div className="flex gap-2">
                                <Badge variant="outline">{result.score}/{result.maxScore}</Badge>
                                <span className={cn("rounded-md border px-2 py-1 text-xs font-medium", getRiskClass(score))}>{getRiskLevel(score)}</span>
                              </div>
                            </div>
                            <div className="mt-2 grid gap-1 text-xs text-muted-foreground">
                              {events.slice(0, 3).map((event) => (
                                <p key={event.id}><ShieldAlert className="mr-1 inline" size={12} />{event.createdAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })} {eventLabels[event.event] ?? event.event}</p>
                              ))}
                              {!events.length ? <p>No cheating events logged.</p> : null}
                            </div>
                          </div>
                        );
                      })}
                      {!test.results.length ? <p className="text-sm text-muted-foreground">No submissions yet.</p> : null}
                    </div>
                  </div>
                ))}
                {!selectedCourse.tests.length ? <p className="text-sm text-muted-foreground">No tests created yet.</p> : null}
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="p-5 text-sm text-muted-foreground">Create a course before building tests.</CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  );
}

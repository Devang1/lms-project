import { startOfDay } from "date-fns";
import { CheckCircle2, Flame, XCircle } from "lucide-react";
import { submitDailyQuestionAction } from "@/app/actions/daily";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DailyQuestionPage() {
  const session = await auth();
  const enrollments = await prisma.enrollment.findMany({ where: { userId: session!.user.id }, select: { courseId: true } });
  const questions = await prisma.dailyQuestion.findMany({
    where: { date: startOfDay(new Date()), courseId: { in: enrollments.map((enrollment) => enrollment.courseId) } },
    include: { course: true, attempts: { where: { userId: session!.user.id }, orderBy: { submittedAt: "desc" }, take: 1 } },
    orderBy: { course: { title: "asc" } }
  });

  return (
    <AppShell role={session?.user.role ?? "STUDENT"}>
      <div className="grid gap-5">
        <div>
          <p className="text-sm text-muted-foreground">Daily question engine</p>
          <h1 className="text-3xl font-semibold">Today’s XP challenges</h1>
        </div>
        <div className="grid gap-4 lg:grid-cols-2">
          {questions.map((question) => {
            const attempt = question.attempts[0];
            const answer = attempt?.answers as { selected?: string; correct?: boolean; answer?: string } | undefined;

            return (
            <Card key={question.id}>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <CardTitle>{question.course.title}</CardTitle>
                  <Badge variant="accent"><Flame size={14} /> {question.xpReward} XP</Badge>
                </div>
                <CardDescription>{question.topic}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="font-medium">{question.prompt}</p>
                <div className="mt-4 grid gap-2">
                  {(question.options as string[]).map((option) => (
                    <form action={submitDailyQuestionAction.bind(null, question.id)} key={option}>
                      <input type="hidden" name="answer" value={option} />
                      <Button
                        type="submit"
                        variant={answer?.selected === option ? (answer.correct ? "secondary" : "outline") : "outline"}
                        className="h-auto w-full justify-start whitespace-normal p-3 text-left"
                        disabled={Boolean(attempt)}
                      >
                        {option}
                      </Button>
                    </form>
                  ))}
                </div>
                {attempt ? (
                  <div className="mt-4 rounded-md border bg-muted/40 p-3 text-sm">
                    <div className="flex items-center gap-2 font-medium">
                      {answer?.correct ? <CheckCircle2 className="text-secondary" size={18} /> : <XCircle className="text-destructive" size={18} />}
                      {answer?.correct ? `Correct, +${question.xpReward} XP` : "Not correct yet"}
                    </div>
                    <p className="mt-2 text-muted-foreground">Your answer: {answer?.selected}</p>
                    <p className="text-muted-foreground">Correct answer: {question.answer}</p>
                    <p className="mt-2">{question.solution}</p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
            );
          })}
          {!questions.length ? (
            <Card>
              <CardContent className="p-6 text-sm text-muted-foreground">
                No daily questions are available yet. Teachers can set an active topic and run the generation endpoint.
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}

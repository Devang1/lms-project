import { answerDoubtAction } from "@/app/actions/social";
import { DoubtClient } from "@/app/doubts/doubt-client";
import { DoubtComposer } from "@/app/feed/doubt-composer";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function DoubtsPage() {
  const session = await auth();
  const doubts = await prisma.doubt.findMany({
    include: { user: true, answers: { include: { user: true } } },
    orderBy: { createdAt: "desc" },
    take: 20
  });

  return (
    <AppShell role={session?.user.role ?? "STUDENT"}>
      <div className="grid gap-5 xl:grid-cols-[0.85fr_1.15fr]">
        <div className="grid gap-5">
          <DoubtClient />
          <Card>
            <CardHeader><CardTitle>Ask peers</CardTitle></CardHeader>
            <CardContent>
              <DoubtComposer compact />
            </CardContent>
          </Card>
        </div>
        <div className="grid gap-3">
          {doubts.map((doubt) => (
            <Card key={doubt.id}>
              <CardContent className="p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{doubt.subject}</Badge>
                  {doubt.isResolved ? <Badge variant="secondary">Resolved</Badge> : null}
                </div>
                <h2 className="mt-3 font-semibold">{doubt.title}</h2>
                <p className="mt-2 text-sm text-muted-foreground">{doubt.body}</p>
                {doubt.imageUrl ? (
                  <div className="mt-4 overflow-hidden rounded-md border bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element -- User uploaded doubt images are remote Cloudinary URLs. */}
                    <img src={doubt.imageUrl} alt="" className="max-h-80 w-full object-cover" />
                  </div>
                ) : null}
                <div className="mt-4 grid gap-2">
                  {doubt.answers.map((answer) => (
                    <div className="rounded-md border p-3 text-sm" key={answer.id}>
                      <p>{answer.body}</p>
                      <p className="mt-1 text-xs text-muted-foreground">Answered by {answer.user.name}</p>
                    </div>
                  ))}
                  <form action={answerDoubtAction.bind(null, doubt.id)} className="flex gap-2">
                    <Input name="body" placeholder="Add an answer" required />
                    <Button type="submit" variant="secondary">Answer</Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

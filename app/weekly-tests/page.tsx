import { Clock, ShieldCheck } from "lucide-react";
import { AntiCheatClient } from "@/app/weekly-tests/anti-cheat-client";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function WeeklyTestsPage() {
  const session = await auth();
  const tests = await prisma.test.findMany({
    include: { course: true, questions: true, results: true },
    orderBy: { startsAt: "desc" },
    take: 20
  });

  return (
    <AppShell role={session?.user.role ?? "STUDENT"}>
      <div className="grid gap-5">
        <div>
          <p className="text-sm text-muted-foreground">Weekly automated tests</p>
          <h1 className="text-3xl font-semibold">Secure assessment arena</h1>
        </div>
        <AntiCheatClient testId={tests[0]?.id} />
        <div className="grid gap-4 lg:grid-cols-2">
          {tests.map((test) => (
            <Card key={test.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle>{test.title}</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">{test.course.title} · {test.topic}</p>
                  </div>
                  <Badge variant="outline">{test.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="grid gap-3 text-sm text-muted-foreground">
                <p className="flex items-center gap-2"><Clock size={16} /> {test.durationMin} minutes</p>
                <p className="flex items-center gap-2"><ShieldCheck size={16} /> {test.questions.length} randomized questions · {test.results.length} submissions</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AppShell>
  );
}

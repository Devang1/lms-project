import { BookOpen, BrainCircuit, Flame, Target, Trophy } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { nextRankProgress } from "@/lib/gamification";

export const dynamic = "force-dynamic";

export default async function StudentDashboard() {
  const session = await auth();
  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    include: { streak: true, enrollments: { include: { course: true } }, badges: { include: { badge: true } } }
  });

  return (
    <AppShell role="STUDENT">
      <div className="flex flex-col gap-6">
        <div>
          <p className="text-sm text-muted-foreground">Student command center</p>
          <h1 className="text-3xl font-semibold">Welcome, {user?.name}</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total XP" value={user?.xp ?? 0} icon={Trophy} note={user?.heroTag} />
          <StatCard label="Current streak" value={`${user?.streak?.current ?? 0} days`} icon={Flame} note={`Best ${user?.streak?.best ?? 0}`} />
          <StatCard label="Courses" value={user?.enrollments.length ?? 0} icon={BookOpen} />
          <StatCard label="AI tools" value="Ready" icon={BrainCircuit} note="Notes and doubts guarded by limits" />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Hero rank progression</CardTitle>
            <CardDescription>Earn XP from lessons, daily questions, doubts, tests, posts, and streaks.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-2 flex items-center justify-between text-sm">
              <span>{user?.heroTag}</span>
              <span>{nextRankProgress(user?.xp ?? 0)}%</span>
            </div>
            <Progress value={nextRankProgress(user?.xp ?? 0)} />
          </CardContent>
        </Card>
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Active courses</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3">
              {user?.enrollments.map((enrollment) => (
                <div className="rounded-md border p-4" key={enrollment.id}>
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{enrollment.course.title}</p>
                    <span className="text-sm text-muted-foreground">{enrollment.progress}%</span>
                  </div>
                  <Progress className="mt-3" value={enrollment.progress} />
                </div>
              ))}
              {!user?.enrollments.length ? <p className="text-sm text-muted-foreground">Apply to a course marketplace to begin.</p> : null}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Today’s mission</CardTitle>
              <CardDescription>Complete a daily question, post progress, and answer one peer doubt.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 text-sm">
              {["Daily topic challenge", "One focused study post", "One useful peer answer"].map((item) => (
                <div className="flex items-center gap-3 rounded-md border p-3" key={item}>
                  <Target className="text-secondary" size={18} />
                  {item}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}

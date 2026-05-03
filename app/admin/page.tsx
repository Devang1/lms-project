import { BookOpen, BrainCircuit, ShieldCheck, Users } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/stat-card";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  const [users, courses, notes, flags] = await Promise.all([
    prisma.user.count(),
    prisma.course.count(),
    prisma.notesGeneration.count(),
    prisma.suspiciousActivity.count()
  ]);
  const teachers = await prisma.user.findMany({ where: { role: "TEACHER" }, orderBy: { createdAt: "desc" }, take: 8 });

  return (
    <AppShell role="ADMIN">
      <div className="grid gap-6">
        <div>
          <p className="text-sm text-muted-foreground">Admin oversight</p>
          <h1 className="text-3xl font-semibold">Platform analytics</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Users" value={users} icon={Users} />
          <StatCard label="Courses" value={courses} icon={BookOpen} />
          <StatCard label="AI notes" value={notes} icon={BrainCircuit} />
          <StatCard label="Flags" value={flags} icon={ShieldCheck} />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Teacher accounts</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {teachers.map((teacher) => (
              <div className="flex items-center justify-between rounded-md border p-4" key={teacher.id}>
                <div>
                  <p className="font-medium">{teacher.name}</p>
                  <p className="text-sm text-muted-foreground">@{teacher.username}</p>
                </div>
                <Badge variant={teacher.isApproved ? "secondary" : "accent"}>{teacher.isApproved ? "Approved" : "Review"}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

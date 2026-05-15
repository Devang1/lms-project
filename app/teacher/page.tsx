import { AlertTriangle, Check, Clock, MonitorCheck, Plus, ShieldAlert, Users } from "lucide-react";
import { createManagedUserAction } from "@/app/actions/auth";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { StatCard } from "@/components/stat-card";
import { createCourseAction, reviewApplicationAction, updateActiveTopicAction } from "@/app/actions/courses";
import { auth } from "@/lib/auth";
import { eventLabels, getRiskClass, getRiskLevel, getSuspicionScore } from "@/lib/exams/anti-cheat";
import { prisma } from "@/lib/prisma";
import { cn } from "@/lib/utils";
import Link from "next/link";
export const dynamic = "force-dynamic";

export default async function TeacherDashboard() {
  const session = await auth();
  const courses = await prisma.course.findMany({
    where: { teacherId: session!.user.id },
    include: {
      enrollments: { include: { user: true } },
      applications: { where: { status: "PENDING" }, include: { user: true } },
      tests: { include: { results: { include: { user: true } } } }
    }
  });
  const pending = courses.flatMap((course) => course.applications.map((application) => ({ ...application, course })));
  const testIds = courses.flatMap((course) => course.tests.map((test) => test.id));
  const studentIds = [...new Set(courses.flatMap((course) => course.enrollments.map((enrollment) => enrollment.userId)))];
  const suspiciousEvents = await prisma.suspiciousActivity.findMany({
    where: { userId: { in: studentIds }, testId: { in: testIds } },
    include: { user: true },
    orderBy: { createdAt: "desc" },
    take: 100
  });
  const monitoringRows = studentIds.map((studentId) => {
    const enrollment = courses.flatMap((course) => course.enrollments).find((item) => item.userId === studentId);
    const events = suspiciousEvents.filter((event) => event.userId === studentId);
    const submissions = courses.flatMap((course) => course.tests.flatMap((test) => test.results)).filter((result) => result.userId === studentId);
    const score = getSuspicionScore(events);

    return {
      student: enrollment?.user,
      events,
      score,
      submissions,
      fullscreenExits: events.filter((event) => event.event === "FULLSCREEN_EXIT").length,
      tabSwitches: events.filter((event) => event.event === "TAB_SWITCH" || event.event === "APP_SWITCH").length
    };
  }).filter((row) => row.student);

  return (
    <AppShell role="TEACHER">
      <div className="grid gap-6">
        <div>
          <p className="text-sm text-muted-foreground">Teacher operations</p>
          <h1 className="text-3xl font-semibold">Course cockpit</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Courses" value={courses.length} icon={Plus} />
          <StatCard label="Students" value={courses.reduce((sum, course) => sum + course.enrollments.length, 0)} icon={Users} />
          <StatCard label="Pending applications" value={pending.length} icon={Clock} />
        </div>
        <Card>
  <CardHeader>
    <div className="flex items-center justify-between">
      <div>
        <CardTitle>Students</CardTitle>

        <CardDescription>
          Students enrolled in your courses.
        </CardDescription>
      </div>

      <Users className="text-accent" size={24} />
    </div>
  </CardHeader>

  <CardContent className="grid gap-3">
    {monitoringRows.map((row) => (
      <div
        key={row.student!.id}
        className="flex items-center justify-between rounded-md border p-4"
      >
        <div>
          <p className="font-medium">
            {row.student!.name}
          </p>

          <p className="text-sm text-muted-foreground">
            @{row.student!.username}
          </p>
        </div>
      </div>
    ))}

    {!monitoringRows.length ? (
      <p className="text-sm text-muted-foreground">
        No students enrolled yet.
      </p>
    ) : null}
  </CardContent>
</Card>
        <Card>
  <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
    <div>
      <p className="text-sm text-muted-foreground">
        Anti-cheat analytics
      </p>

      <h2 className="text-2xl font-semibold">
        Test Results & Monitoring
      </h2>

      <p className="mt-1 text-sm text-muted-foreground">
        View student submissions, cheating logs,
        fullscreen exits, app switches, and
        suspicious activity reports.
      </p>
    </div>

    <Button asChild>
      <Link href="/teacher/results">
        <ShieldAlert className="mr-2 h-4 w-4" />
        Open Results Dashboard
      </Link>
    </Button>
  </CardContent>
</Card>
        <div className="grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
          <Card>
            <CardHeader>
              <CardTitle>Add student</CardTitle>
              <CardDescription>Create a student login and optionally place the student into one of your courses.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={createManagedUserAction} className="grid gap-3">
                <Input name="name" placeholder="Student full name" required />
                <Input name="username" placeholder="Username" required />
                <Input name="password" type="password" placeholder="Temporary password" minLength={6} required />
                <input type="hidden" name="role" value="STUDENT" />
                <select name="courseId" className="h-10 rounded-md border bg-background px-3 text-sm" defaultValue="">
                  <option value="">No initial course</option>
                  {courses.map((course) => <option value={course.id} key={course.id}>{course.title}</option>)}
                </select>
                <Button type="submit" variant="secondary">Create student</Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Create course</CardTitle>
              <CardDescription>Public courses accept applications. Private courses support invites and approvals.</CardDescription>
            </CardHeader>
            <CardContent>
              <form action={createCourseAction} className="grid gap-3">
                <Input name="title" placeholder="Course title" required />
                <Input name="subject" placeholder="Subject" required />
                <Textarea name="description" placeholder="What students will master" required />
                <select name="visibility" className="h-10 rounded-md border bg-background px-3 text-sm" defaultValue="PUBLIC">
                  <option value="PUBLIC">Public</option>
                  <option value="PRIVATE">Private</option>
                </select>
                <Button type="submit">Create course</Button>
              </form>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Course topics</CardTitle>
              <CardDescription>Daily questions continue from the active topic until changed.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              {courses.map((course) => (
                <form action={updateActiveTopicAction.bind(null, course.id)} className="rounded-md border p-4" key={course.id}>
                  <p className="font-medium">{course.title}</p>
                  <div className="mt-3 flex gap-2">
                    <Input name="activeTopic" defaultValue={course.activeTopic ?? ""} placeholder="Active topic" />
                    <Button type="submit" variant="secondary">Save</Button>
                  </div>
                </form>
              ))}
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Applications</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            {pending.map((application) => (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-4" key={application.id}>
                <div>
                  <p className="font-medium">{application.user.name}</p>
                  <p className="text-sm text-muted-foreground">{application.course.title}</p>
                </div>
                <div className="flex gap-2">
                  <form action={reviewApplicationAction.bind(null, application.id, "APPROVED")}>
                    <Button size="sm"><Check size={16} /> Approve</Button>
                  </form>
                  <form action={reviewApplicationAction.bind(null, application.id, "REJECTED")}>
                    <Button size="sm" variant="outline">Reject</Button>
                  </form>
                </div>
              </div>
            ))}
            {!pending.length ? <p className="text-sm text-muted-foreground">No pending applications.</p> : null}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}

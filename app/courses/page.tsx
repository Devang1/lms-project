import Link from "next/link";
import { BookOpen, Search, SlidersHorizontal, Users } from "lucide-react";
import { applyCourseAction } from "@/app/actions/courses";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";

export const dynamic = "force-dynamic";

export default async function CoursesPage({ searchParams }: { searchParams: Promise<{ q?: string; subject?: string }> }) {
  const session = await auth();
  const params = await searchParams;
  const query = params.q?.trim();
  const subject = params.subject?.trim();

  const courses = await prisma.course.findMany({
    where: {
      visibility: "PUBLIC",
      ...(query ? {
        OR: [
          { title: { contains: query, mode: "insensitive" } },
          { description: { contains: query, mode: "insensitive" } },
          { subject: { contains: query, mode: "insensitive" } }
        ]
      } : {}),
      ...(subject ? { subject: { equals: subject, mode: "insensitive" } } : {})
    },
    include: {
      teacher: true,
      lessons: true,
      enrollments: session?.user.id ? { where: { userId: session.user.id } } : true,
      applications: session?.user.id ? { where: { userId: session.user.id } } : false,
      _count: { select: { enrollments: true, lessons: true, tests: true } }
    },
    orderBy: { createdAt: "desc" }
  });

  const subjects = await prisma.course.findMany({
    where: { visibility: "PUBLIC" },
    select: { subject: true },
    distinct: ["subject"],
    orderBy: { subject: "asc" }
  });

  return (
    <AppShell role={session?.user.role ?? "STUDENT"}>
      <div className="grid gap-5 pb-20 lg:pb-0">
        <section className="rounded-md border bg-card p-4 shadow-sm sm:p-5">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-sm font-medium text-primary">Course marketplace</p>
              <h1 className="mt-1 text-2xl font-semibold sm:text-3xl">Browse and join courses</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                A familiar LMS flow: find a course, apply or open your enrolled course, then continue through modules, notes, tests, and discussion.
              </p>
            </div>
            <form className="grid gap-2 sm:grid-cols-[1fr_auto] lg:w-[460px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input name="q" defaultValue={query} placeholder="Search courses or subjects" className="pl-9" />
              </div>
              <Button type="submit" variant="secondary"><SlidersHorizontal size={16} /> Search</Button>
            </form>
          </div>
          <div className="mt-4 flex gap-2 overflow-x-auto">
            <Button asChild size="sm" variant={!subject ? "default" : "outline"}>
              <Link href="/courses">All</Link>
            </Button>
            {subjects.map((item) => (
              <Button asChild size="sm" variant={subject === item.subject ? "default" : "outline"} key={item.subject}>
                <Link href={`/courses?subject=${encodeURIComponent(item.subject)}`}>{item.subject}</Link>
              </Button>
            ))}
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {courses.map((course) => {
            const enrolled = course.enrollments.length > 0;
            const application = course.applications[0];
            const progress = enrolled ? course.enrollments[0]?.progress ?? 0 : 0;

            return (
              <Card key={course.id} className="overflow-hidden">
                <CardHeader>
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <Badge variant="secondary">{course.subject}</Badge>
                    <Badge variant="outline">{course.visibility}</Badge>
                  </div>
                  <CardTitle className="line-clamp-2">{course.title}</CardTitle>
                  <CardDescription>By {course.teacher.name}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4">
                  <p className="line-clamp-3 text-sm text-muted-foreground">{course.description}</p>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs text-muted-foreground">
                    <span className="rounded-md bg-muted px-2 py-2">{course._count.lessons} lessons</span>
                    <span className="rounded-md bg-muted px-2 py-2">{course._count.tests} tests</span>
                    <span className="rounded-md bg-muted px-2 py-2">{course._count.enrollments} learners</span>
                  </div>
                  {enrolled ? (
                    <div>
                      <div className="mb-2 flex items-center justify-between text-sm">
                        <span>Progress</span>
                        <span>{progress}%</span>
                      </div>
                      <Progress value={progress} />
                    </div>
                  ) : null}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users size={16} /> {course._count.enrollments} enrolled
                    </span>
                    <div className="flex gap-2">
                      <Button asChild size="sm" variant="outline">
                        <Link href={`/courses/${course.slug}`}><BookOpen size={16} /> Open</Link>
                      </Button>
                      {session?.user.role === "STUDENT" && !enrolled ? (
                        <form action={applyCourseAction.bind(null, course.id)}>
                          <Button size="sm" disabled={Boolean(application)}>
                            {application?.status ?? "Apply"}
                          </Button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </section>

        {!courses.length ? (
          <Card>
            <CardContent className="p-6 text-center text-sm text-muted-foreground">No courses match this filter.</CardContent>
          </Card>
        ) : null}
      </div>
    </AppShell>
  );
}

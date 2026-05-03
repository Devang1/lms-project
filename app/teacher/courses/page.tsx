import Link from "next/link";
import { BookOpen, Check, ChevronDown, Flame, Megaphone, MessageCircle, Plus, RefreshCw, Upload, Users } from "lucide-react";
import { createCourseAction, generateCourseDailyQuestionAction, reviewApplicationAction, sendCourseAnnouncementAction, sendCourseChatMessageAction, updateActiveTopicAction, updateCourseDailyQuestionAction } from "@/app/actions/courses";
import { MaterialUploadForm } from "@/app/teacher/courses/material-upload-form";
import { AppShell } from "@/components/app-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function TeacherCoursesPage() {
  const session = await auth();
  const courses = await prisma.course.findMany({
    where: session?.user.role === "ADMIN" ? {} : { teacherId: session!.user.id },
    include: {
      lessons: { orderBy: { order: "asc" } },
      enrollments: { include: { user: true }, orderBy: { createdAt: "desc" } },
      applications: { where: { status: "PENDING" }, include: { user: true }, orderBy: { createdAt: "desc" } },
      chats: {
        include: { messages: { include: { user: true }, orderBy: { createdAt: "desc" }, take: 8 } },
        orderBy: { createdAt: "asc" },
        take: 1
      },
      tests: true,
      dailyQuestions: {
        orderBy: { date: "desc" },
        take: 1,
        include: { attempts: { include: { user: true }, orderBy: { submittedAt: "desc" } } }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <AppShell role={session?.user.role ?? "TEACHER"}>
      <div className="mx-auto grid max-w-5xl gap-4 pb-20 lg:pb-0">
        <section className="rounded-md border bg-card p-4 shadow-sm">
          <p className="text-sm font-medium text-primary">Teacher courses</p>
          <h1 className="mt-1 text-2xl font-semibold">Course manager</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage modules, students, daily questions, announcements, and course chat from one mobile-friendly screen.
          </p>
        </section>

        <details className="rounded-md border bg-card shadow-sm">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
            <span className="flex items-center gap-2 font-semibold"><Plus size={18} /> Create course</span>
            <ChevronDown size={18} className="text-muted-foreground" />
          </summary>
          <form action={createCourseAction} className="grid gap-3 border-t p-4 sm:grid-cols-2">
            <Input name="title" placeholder="Course title" required />
            <Input name="subject" placeholder="Subject" required />
            <select name="visibility" className="h-10 rounded-md border bg-background px-3 text-sm" defaultValue="PUBLIC">
              <option value="PUBLIC">Public</option>
              <option value="PRIVATE">Private</option>
            </select>
            <Textarea name="description" placeholder="Course description and outcomes" required className="sm:col-span-2" />
            <Button type="submit" className="sm:w-fit">Create course</Button>
          </form>
        </details>

        <section className="grid gap-4">
          {courses.map((course) => {
            const chat = course.chats[0];
            const announcements = chat?.messages.filter((message) => message.isPinned) ?? [];
            const messages = chat?.messages.filter((message) => !message.isPinned) ?? [];
            const dailyQuestion = course.dailyQuestions[0];
            const dailyOptions = Array.isArray(dailyQuestion?.options) ? dailyQuestion.options.map(String).join("\n") : "";

            return (
              <article key={course.id} className="overflow-hidden rounded-md border bg-card shadow-sm">
                <header className="border-b bg-muted/30 p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="secondary">{course.subject}</Badge>
                        <Badge variant="outline">{course.visibility}</Badge>
                        {course.activeTopic ? <Badge variant="accent">Topic: {course.activeTopic}</Badge> : null}
                      </div>
                      <h2 className="mt-3 text-xl font-semibold">{course.title}</h2>
                      <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{course.description}</p>
                    </div>
                    <Button asChild variant="outline" size="sm" className="w-full sm:w-auto">
                      <Link href={`/courses/${course.slug}`}><BookOpen size={16} /> Student view</Link>
                    </Button>
                  </div>
                  <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs text-muted-foreground">
                    <MiniStat label="Modules" value={course.lessons.length} />
                    <MiniStat label="Students" value={course.enrollments.length} />
                    <MiniStat label="Pending" value={course.applications.length} />
                    <MiniStat label="Tests" value={course.tests.length} />
                  </div>
                </header>

                <div className="divide-y">
                  <CourseSection icon={Upload} title="Modules and files" defaultOpen>
                    <MaterialUploadForm courseId={course.id} />
                    <div className="mt-4 grid gap-2">
                      {course.lessons.slice(0, 6).map((lesson) => (
                        <div className="rounded-md bg-muted/50 p-3 text-sm" key={lesson.id}>
                          <div className="flex items-center justify-between gap-3">
                            <p className="font-medium">{lesson.order}. {lesson.title}</p>
                            {lesson.materialUrl ? <Badge variant="outline">File</Badge> : null}
                          </div>
                          <p className="mt-1 line-clamp-2 text-muted-foreground">{lesson.content}</p>
                          <div className="mt-2 flex flex-wrap gap-2 text-xs">
                            {lesson.videoUrl ? <Link className="text-primary" href={lesson.videoUrl}>Video</Link> : null}
                            {lesson.materialUrl ? <Link className="text-primary" href={lesson.materialUrl}>Open file</Link> : null}
                          </div>
                        </div>
                      ))}
                      {!course.lessons.length ? <p className="text-sm text-muted-foreground">No modules uploaded yet.</p> : null}
                    </div>
                  </CourseSection>

                  <CourseSection icon={Flame} title="Daily question">
                    <form action={updateActiveTopicAction.bind(null, course.id)} className="flex gap-2">
                      <Input name="activeTopic" defaultValue={course.activeTopic ?? ""} placeholder="Active daily topic" />
                      <Button type="submit" variant="secondary">Save</Button>
                    </form>
                    <form action={generateCourseDailyQuestionAction.bind(null, course.id)} className="mt-3">
                      <Button type="submit" size="sm" disabled={!course.activeTopic}>
                        <RefreshCw size={16} /> {dailyQuestion ? "Regenerate" : "Generate"}
                      </Button>
                    </form>
                    {dailyQuestion ? (
                      <div className="mt-4 rounded-md bg-muted/50 p-3 text-sm">
                        <Badge variant="accent">{dailyQuestion.topic}</Badge>
                        <p className="mt-3 font-medium">{dailyQuestion.prompt}</p>
                        <div className="mt-3 grid gap-1 text-muted-foreground">
                          {(dailyQuestion.options as string[]).map((option) => <p key={option}>- {option}</p>)}
                        </div>
                        <p className="mt-3 text-xs text-muted-foreground">Answer: {dailyQuestion.answer}</p>
                      </div>
                    ) : (
                      <p className="mt-3 rounded-md bg-muted/50 p-3 text-sm text-muted-foreground">No daily question generated yet.</p>
                    )}
                    <details className="mt-3 rounded-md border">
                      <summary className="cursor-pointer list-none p-3 text-sm font-medium">Edit daily question</summary>
                      <form action={updateCourseDailyQuestionAction.bind(null, course.id)} className="grid gap-2 border-t p-3">
                        <Input name="topic" defaultValue={dailyQuestion?.topic ?? course.activeTopic ?? ""} placeholder="Topic" required />
                        <Textarea name="prompt" defaultValue={dailyQuestion?.prompt ?? ""} placeholder="Question prompt" required />
                        <Textarea name="options" defaultValue={dailyOptions} placeholder="Options, one per line" required />
                        <Input name="answer" defaultValue={dailyQuestion?.answer ?? ""} placeholder="Correct answer" required />
                        <Textarea name="solution" defaultValue={dailyQuestion?.solution ?? ""} placeholder="Solution / explanation" required />
                        <Button type="submit" size="sm" variant="secondary">Save question</Button>
                      </form>
                    </details>
                    {dailyQuestion ? (
                      <div className="mt-4 rounded-md border p-3">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <p className="text-sm font-semibold">Student scores</p>
                          <Badge variant="outline">{dailyQuestion.attempts.length} attempts</Badge>
                        </div>
                        <div className="grid max-h-44 gap-2 overflow-y-auto">
                          {course.enrollments.map((enrollment) => {
                            const attempt = dailyQuestion.attempts.find((item) => item.userId === enrollment.userId);
                            return (
                              <div className="flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 text-sm" key={enrollment.id}>
                                <span className="font-medium">{enrollment.user.name}</span>
                                {attempt ? <Badge variant={attempt.score > 0 ? "secondary" : "outline"}>{attempt.score}/{attempt.maxScore}</Badge> : <span className="text-xs text-muted-foreground">Not attempted</span>}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                  </CourseSection>

                  <CourseSection icon={Users} title="Students and applications">
                    <div className="grid gap-2">
                      {course.applications.map((application) => (
                        <div className="grid gap-3 rounded-md border p-3 text-sm sm:grid-cols-[1fr_auto]" key={application.id}>
                          <div>
                            <p className="font-medium">{application.user.name}</p>
                            <p className="text-xs text-muted-foreground">@{application.user.username}</p>
                          </div>
                          <div className="flex gap-2">
                            <form action={reviewApplicationAction.bind(null, application.id, "APPROVED")}>
                              <Button size="sm"><Check size={15} /> Approve</Button>
                            </form>
                            <form action={reviewApplicationAction.bind(null, application.id, "REJECTED")}>
                              <Button size="sm" variant="outline">Reject</Button>
                            </form>
                          </div>
                        </div>
                      ))}
                      {!course.applications.length ? <p className="text-sm text-muted-foreground">No pending applications.</p> : null}
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      {course.enrollments.slice(0, 12).map((enrollment) => <Badge variant="outline" key={enrollment.id}>{enrollment.user.name}</Badge>)}
                      {!course.enrollments.length ? <p className="text-sm text-muted-foreground">No enrolled students yet.</p> : null}
                    </div>
                  </CourseSection>

                  <CourseSection icon={Megaphone} title="Announcements">
                    <form action={sendCourseAnnouncementAction.bind(null, course.id)} className="grid gap-2">
                      <Textarea name="body" placeholder="Publish teacher announcement to enrolled students" required />
                      <Input name="imageUrl" placeholder="Optional image/resource URL" />
                      <Button type="submit" size="sm"><Megaphone size={16} /> Announce</Button>
                    </form>
                    <div className="mt-4 grid gap-2">
                      {announcements.slice(0, 4).map((message) => (
                        <div className="rounded-md border bg-accent/10 p-3 text-sm" key={message.id}>
                          <p>{message.body}</p>
                          <p className="mt-1 text-xs text-muted-foreground">By {message.user.name}</p>
                        </div>
                      ))}
                      {!announcements.length ? <p className="text-sm text-muted-foreground">No announcements yet.</p> : null}
                    </div>
                  </CourseSection>

                  <CourseSection icon={MessageCircle} title="Course chat">
                    <form action={sendCourseChatMessageAction.bind(null, course.id)} className="grid gap-2">
                      <Textarea name="body" placeholder="Message the course discussion" required />
                      <Input name="imageUrl" placeholder="Optional image/resource URL" />
                      <Button type="submit" size="sm" variant="secondary"><MessageCircle size={16} /> Send chat</Button>
                    </form>
                    <div className="mt-4 grid max-h-64 gap-2 overflow-y-auto">
                      {messages.map((message) => (
                        <div className="rounded-md bg-muted/50 p-3 text-sm" key={message.id}>
                          <p>{message.body}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{message.user.name} - {message.createdAt.toLocaleString()}</p>
                        </div>
                      ))}
                      {!messages.length ? <p className="text-sm text-muted-foreground">No chat messages yet.</p> : null}
                    </div>
                  </CourseSection>
                </div>
              </article>
            );
          })}
          {!courses.length ? (
            <Card>
              <CardContent className="p-6 text-center text-sm text-muted-foreground">Create your first course to begin.</CardContent>
            </Card>
          ) : null}
        </section>
      </div>
    </AppShell>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-background p-2">
      <p className="font-semibold text-foreground">{value}</p>
      <p>{label}</p>
    </div>
  );
}

function CourseSection({
  icon: Icon,
  title,
  children,
  defaultOpen = false
}: {
  icon: typeof Upload;
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details open={defaultOpen} className="group">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 p-4">
        <span className="flex items-center gap-2 font-semibold"><Icon size={18} /> {title}</span>
        <ChevronDown size={18} className="text-muted-foreground transition group-open:rotate-180" />
      </summary>
      <div className="border-t p-4">{children}</div>
    </details>
  );
}

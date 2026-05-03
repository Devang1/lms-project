"use client";

import Link from "next/link";
import { useState } from "react";
import {
  BarChart3,
  BookOpen,
  BrainCircuit,
  CalendarClock,
  CheckCircle2,
  FileText,
  Flame,
  MessageCircle,
  MessagesSquare,
  PlayCircle,
  ShieldCheck,
  Sparkles,
  Trophy,
  Upload,
  Users
} from "lucide-react";
import { submitDailyQuestionAction } from "@/app/actions/daily";
import { createDoubtAction } from "@/app/actions/social";
import { sendCourseChatMessageAction, uploadLessonMaterialAction } from "@/app/actions/courses";
import { NotesClient } from "@/app/ai-notes/notes-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type CourseHubProps = {
  course: {
    id: string;
    title: string;
    description: string;
    subject: string;
    activeTopic: string | null;
    teacher: { name: string; bio: string | null };
    enrollments: { id: string; progress: number; user: { name: string; xp: number; heroTag: string } }[];
    lessons: { id: string; title: string; content: string; videoUrl: string | null; materialUrl: string | null; order: number }[];
    tests: { id: string; title: string; topic: string; startsAt: string; durationMin: number; status: string }[];
    dailyQuestions: {
      id: string;
      topic: string;
      prompt: string;
      options: unknown;
      answer: string;
      solution: string;
      xpReward: number;
      date: string;
      attempts: { id: string; score: number; maxScore: number; answers: unknown }[];
    }[];
    chatMessages: {
      id: string;
      body: string;
      imageUrl: string | null;
      isPinned: boolean;
      createdAt: string;
      user: { name: string };
    }[];
  };
  doubts: {
    id: string;
    title: string;
    body: string;
    subject: string;
    isResolved: boolean;
    user: { name: string };
    answers: { id: string; body: string; verified: boolean; user: { name: string } }[];
  }[];
  canUpload: boolean;
};

const tabs = [
  ["overview", "Overview", BarChart3],
  ["modules", "Modules", BookOpen],
  ["notes", "Notes", BrainCircuit],
  ["chat", "Chat", MessageCircle],
  ["doubts", "Doubts", MessagesSquare],
  ["daily", "Daily", Flame],
  ["tests", "Tests", ShieldCheck]
] as const;

export function CourseHubClient({ course, doubts, canUpload }: CourseHubProps) {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number][0]>("overview");

  return (
    <div className="grid gap-6">
      <div className="overflow-hidden rounded-md border bg-card shadow-sm">
        <div className="bg-primary px-5 py-6 text-primary-foreground">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <Badge variant="accent">{course.subject}</Badge>
              <h1 className="mt-3 text-3xl font-semibold sm:text-4xl">{course.title}</h1>
              <p className="mt-2 max-w-3xl text-sm text-primary-foreground/80">{course.description}</p>
            </div>
            <div className="grid grid-cols-3 gap-3 text-center text-sm">
              <Metric label="Students" value={course.enrollments.length} />
              <Metric label="Modules" value={course.lessons.length} />
              <Metric label="Tests" value={course.tests.length} />
            </div>
          </div>
        </div>
        <div className="sticky top-[66px] z-20 flex gap-2 overflow-x-auto border-b bg-background p-3 lg:top-0">
          {tabs.map(([id, label, Icon]) => (
            <button
              type="button"
              onClick={() => setActiveTab(id)}
              className={`inline-flex h-10 shrink-0 items-center gap-2 rounded-md px-3 text-sm font-medium transition ${
                activeTab === id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
              key={id}
            >
              <Icon size={16} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "overview" ? <Overview course={course} /> : null}
      {activeTab === "modules" ? <Materials course={course} canUpload={canUpload} /> : null}
      {activeTab === "notes" ? <NotesClient /> : null}
      {activeTab === "chat" ? <CourseChat course={course} /> : null}
      {activeTab === "doubts" ? <Doubts course={course} doubts={doubts} /> : null}
      {activeTab === "daily" ? <DailyQuestions course={course} /> : null}
      {activeTab === "tests" ? <WeeklyTests tests={course.tests} /> : null}
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md bg-white/10 px-4 py-3">
      <p className="text-xl font-semibold">{value}</p>
      <p className="text-xs text-primary-foreground/75">{label}</p>
    </div>
  );
}

function Overview({ course }: Pick<CourseHubProps, "course">) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
      <Card>
        <CardHeader>
          <CardTitle>Course overview</CardTitle>
          <CardDescription>Instructor details, announcements, active topic, and next learning steps.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="grid gap-3 md:grid-cols-3">
            <Info icon={Users} label="Teacher" value={course.teacher.name} />
            <Info icon={Flame} label="Active topic" value={course.activeTopic ?? "Waiting for topic"} />
            <Info icon={Trophy} label="XP path" value="Lessons, doubts, tests" />
          </div>
          <div className="grid gap-3">
            {course.lessons.slice(0, 6).map((lesson) => (
              <div className="flex items-center justify-between gap-3 rounded-md border p-3" key={lesson.id}>
                <div>
                  <p className="font-medium">{lesson.order}. {lesson.title}</p>
                  <p className="line-clamp-1 text-sm text-muted-foreground">{lesson.content}</p>
                </div>
                <Badge variant="outline">+20 XP</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Class activity</CardTitle>
          <CardDescription>Lightweight community signals without crowding the learning flow.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {course.enrollments.slice(0, 5).map((enrollment) => (
            <div className="flex items-center justify-between rounded-md border p-3" key={enrollment.id}>
              <div className="flex items-center gap-3">
                <span className="flex size-8 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                  {enrollment.user.name.charAt(0)}
                </span>
                <div>
                  <p className="font-medium">{enrollment.user.name}</p>
                  <p className="text-xs text-muted-foreground">{enrollment.user.heroTag}</p>
                </div>
              </div>
              <Badge variant="secondary">Active</Badge>
            </div>
          ))}
          {!course.enrollments.length ? <p className="text-sm text-muted-foreground">No enrolled students yet.</p> : null}
        </CardContent>
      </Card>
    </div>
  );
}

function Materials({ course, canUpload }: Pick<CourseHubProps, "course" | "canUpload">) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1.15fr_0.85fr]">
      <Card>
        <CardHeader>
          <CardTitle>Study materials</CardTitle>
          <CardDescription>Notes, PDFs, videos, assignments, practice sets, and saved resources.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {course.lessons.map((lesson) => (
            <article className="rounded-md border p-4" key={lesson.id}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <Badge variant="outline">Module {lesson.order}</Badge>
                  <h2 className="mt-2 font-semibold">{lesson.title}</h2>
                  <p className="mt-1 text-sm text-muted-foreground">{lesson.content}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {lesson.videoUrl ? <Button asChild variant="secondary" size="sm"><Link href={lesson.videoUrl}><PlayCircle size={16} /> Video</Link></Button> : null}
                  {lesson.materialUrl ? <Button asChild variant="outline" size="sm"><Link href={lesson.materialUrl}><FileText size={16} /> Material</Link></Button> : null}
                </div>
              </div>
            </article>
          ))}
          {!course.lessons.length ? <p className="rounded-md border p-4 text-sm text-muted-foreground">No materials uploaded yet.</p> : null}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>Upload material</CardTitle>
          <CardDescription>Teachers can add links to PDFs, images, docs, videos, and assignment notes.</CardDescription>
        </CardHeader>
        <CardContent>
          {canUpload ? (
            <form action={uploadLessonMaterialAction.bind(null, course.id)} className="grid gap-3">
              <Input name="title" placeholder="Module or note title" required />
              <Textarea name="content" placeholder="Description, assignment, or class notes" required />
              <Input name="videoUrl" placeholder="Video URL" />
              <Input name="materialUrl" placeholder="PDF / image / doc URL" />
              <Button type="submit"><Upload size={16} /> Upload resource</Button>
            </form>
          ) : (
            <div className="grid gap-3 text-sm text-muted-foreground">
              <p className="rounded-md bg-muted/60 p-3">Upload access is reserved for teachers and admins.</p>
              <Button asChild variant="secondary"><Link href="/ai-notes">Create personal AI notes</Link></Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function CourseChat({ course }: Pick<CourseHubProps, "course">) {
  const announcements = course.chatMessages.filter((message) => message.isPinned);
  const messages = course.chatMessages.filter((message) => !message.isPinned);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Course chat</CardTitle>
        <CardDescription>Dedicated course discussion space for announcements, topic threads, collaboration, and resources.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        {announcements.length ? (
          <div className="grid gap-2">
            {announcements.map((message) => (
              <div className="rounded-md border bg-accent/10 p-3 text-sm" key={message.id}>
                <Badge variant="accent">Announcement</Badge>
                <p className="mt-2">{message.body}</p>
                <p className="mt-1 text-xs text-muted-foreground">{message.user.name} · {new Date(message.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        ) : null}
        <div className="grid max-h-[520px] gap-3 overflow-y-auto rounded-md border bg-muted/30 p-3">
          {messages.map((message) => (
            <div className="max-w-2xl rounded-md bg-card p-3 shadow-sm" key={message.id}>
              <div className="flex items-center gap-2">
                <Badge variant="outline">Chat</Badge>
                <p className="text-sm font-medium">{message.user.name}</p>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">{message.body}</p>
              <p className="mt-1 text-xs text-muted-foreground">{new Date(message.createdAt).toLocaleString()}</p>
            </div>
          ))}
          {!messages.length ? <p className="text-sm text-muted-foreground">No course chat messages yet.</p> : null}
        </div>
        <form action={sendCourseChatMessageAction.bind(null, course.id)} className="grid gap-2 sm:grid-cols-[1fr_auto]">
          <Input name="body" placeholder="Message course chat" required />
          <Button type="submit"><MessageCircle size={16} /> Send</Button>
        </form>
      </CardContent>
    </Card>
  );
}

function Doubts({ course, doubts }: Pick<CourseHubProps, "course" | "doubts">) {
  return (
    <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
      <Card>
        <CardHeader>
          <CardTitle>Ask a course doubt</CardTitle>
          <CardDescription>Use AI hints first, then let peers and teachers verify the answer.</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={createDoubtAction} className="grid gap-3">
            <Input name="subject" defaultValue={course.subject} required />
            <Input name="title" placeholder="Short doubt title" required />
            <Textarea name="body" placeholder="Explain the exact step or concept where you are stuck" required />
            <Button type="submit"><Sparkles size={16} /> Publish doubt</Button>
          </form>
        </CardContent>
      </Card>
      <div className="grid gap-3">
        {doubts.map((doubt) => (
          <Card key={doubt.id}>
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{doubt.subject}</Badge>
                {doubt.isResolved ? <Badge variant="secondary"><CheckCircle2 size={14} /> Resolved</Badge> : null}
              </div>
              <h2 className="mt-3 font-semibold">{doubt.title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{doubt.body}</p>
              <div className="mt-3 grid gap-2">
                {doubt.answers.slice(0, 2).map((answer) => (
                  <div className="rounded-md border p-3 text-sm" key={answer.id}>
                    <p>{answer.body}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {answer.verified ? "Verified teacher answer" : "Peer answer"} by {answer.user.name}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
        {!doubts.length ? <p className="rounded-md border p-4 text-sm text-muted-foreground">No doubts for this subject yet.</p> : null}
      </div>
    </div>
  );
}

function DailyQuestions({ course }: Pick<CourseHubProps, "course">) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily questions</CardTitle>
        <CardDescription>Generated from the active topic until the teacher changes it.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        <div className="rounded-md border bg-muted/40 p-4">
          <p className="text-sm text-muted-foreground">Active topic</p>
          <p className="text-lg font-semibold">{course.activeTopic ?? "No active topic set"}</p>
        </div>
        {course.dailyQuestions.map((question) => (
          <div className="rounded-md border p-4" key={question.id}>
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="accent">{question.xpReward} XP</Badge>
              <Badge variant="outline">{new Date(question.date).toLocaleDateString()}</Badge>
            </div>
            <p className="mt-3 font-medium">{question.prompt}</p>
            <div className="mt-3 grid gap-2">
              {(question.options as string[]).map((option) => (
                <form action={submitDailyQuestionAction.bind(null, question.id)} key={option}>
                  <input type="hidden" name="answer" value={option} />
                  <Button
                    type="submit"
                    variant="outline"
                    disabled={question.attempts.length > 0}
                    className="h-auto w-full justify-start whitespace-normal p-3 text-left"
                  >
                    {option}
                  </Button>
                </form>
              ))}
            </div>
            {question.attempts[0] ? (
              <div className="mt-3 rounded-md bg-muted/50 p-3 text-sm">
                <p className="font-medium">Score: {question.attempts[0].score}/{question.attempts[0].maxScore}</p>
                <p className="mt-1 text-muted-foreground">Answer: {question.answer}</p>
                <p className="mt-2">{question.solution}</p>
              </div>
            ) : null}
          </div>
        ))}
        {!course.dailyQuestions.length ? <p className="text-sm text-muted-foreground">Daily questions will appear once generated.</p> : null}
      </CardContent>
    </Card>
  );
}

function WeeklyTests({ tests }: { tests: CourseHubProps["course"]["tests"] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Weekly tests</CardTitle>
        <CardDescription>Scheduled tests with anti-cheat, instant scoring, and leaderboard integration.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {tests.map((test) => (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border p-4" key={test.id}>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{test.status}</Badge>
                <Badge variant="secondary">{test.durationMin} min</Badge>
              </div>
              <h2 className="mt-2 font-semibold">{test.title}</h2>
              <p className="text-sm text-muted-foreground">{test.topic}</p>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarClock size={16} /> {new Date(test.startsAt).toLocaleString()}
            </div>
          </div>
        ))}
        {!tests.length ? <p className="text-sm text-muted-foreground">No weekly tests scheduled yet.</p> : null}
      </CardContent>
    </Card>
  );
}

function Info({ icon: Icon, label, value }: { icon: typeof Users; label: string; value: string }) {
  return (
    <div className="rounded-md border p-4">
      <Icon className="mb-3 text-primary" size={20} />
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}

import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CourseHubClient } from "./course-hub-client";

export const dynamic = "force-dynamic";

export default async function CoursePage({ params }: { params: Promise<{ slug: string }> }) {
  const session = await auth();
  const { slug } = await params;

  const course = await prisma.course.findUnique({
    where: { slug },
    include: {
      teacher: { select: { name: true, bio: true } },
      enrollments: {
        include: { user: { select: { name: true, xp: true, heroTag: true } } },
        orderBy: { progress: "desc" }
      },
      lessons: { orderBy: { order: "asc" } },
      tests: { orderBy: { startsAt: "asc" }, take: 8 },
      dailyQuestions: {
        orderBy: { date: "desc" },
        take: 1,
        include: { attempts: session?.user.id ? { where: { userId: session.user.id }, orderBy: { submittedAt: "desc" }, take: 1 } : false }
      },
      chats: {
        include: {
          messages: { include: { user: { select: { name: true } } }, orderBy: { createdAt: "desc" }, take: 30 }
        },
        orderBy: { createdAt: "asc" },
        take: 1
      }
    }
  });

  if (!course) notFound();

  const doubts = await prisma.doubt.findMany({
    where: { subject: { equals: course.subject, mode: "insensitive" } },
    include: {
      user: { select: { name: true } },
      answers: {
        include: { user: { select: { name: true } } },
        orderBy: [{ verified: "desc" }, { useful: "desc" }, { createdAt: "desc" }]
      }
    },
    orderBy: { createdAt: "desc" },
    take: 20
  });

  const canUpload = session?.user.role === "ADMIN" || (session?.user.role === "TEACHER" && course.teacherId === session.user.id);

  return (
    <AppShell role={session?.user.role ?? "STUDENT"}>
      <CourseHubClient
        canUpload={canUpload}
        course={{
          id: course.id,
          title: course.title,
          description: course.description,
          subject: course.subject,
          activeTopic: course.activeTopic,
          teacher: course.teacher,
          enrollments: course.enrollments,
          lessons: course.lessons,
          tests: course.tests.map((test) => ({ ...test, startsAt: test.startsAt.toISOString() })),
          dailyQuestions: course.dailyQuestions.map((question) => ({
            ...question,
            date: question.date.toISOString(),
            attempts: question.attempts.map((attempt) => ({
              id: attempt.id,
              score: attempt.score,
              maxScore: attempt.maxScore,
              answers: attempt.answers
            }))
          })),
          chatMessages: (course.chats[0]?.messages ?? []).map((message) => ({
            id: message.id,
            body: message.body,
            imageUrl: message.imageUrl,
            isPinned: message.isPinned,
            createdAt: message.createdAt.toISOString(),
            user: message.user
          }))
        }}
        doubts={doubts}
      />
    </AppShell>
  );
}

import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { buildResultAnalysis } from "@/lib/exams/results";
import { prisma } from "@/lib/prisma";
import { personalizeQuestions, scoreAnswer } from "@/lib/exams/question-variants";

const schema = z.object({
  testId: z.string().min(1),
  answers: z.record(z.unknown())
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const input = schema.parse(await request.json());
  const test = await prisma.test.findUnique({
    where: { id: input.testId },
    include: { questions: true, course: { include: { enrollments: { where: { userId: session.user.id } } } } }
  });

  if (!test) return NextResponse.json({ error: "Test not found" }, { status: 404 });
  if (session.user.role === "STUDENT" && !test.course.enrollments.length) {
    return NextResponse.json({ error: "You are not enrolled in this course." }, { status: 403 });
  }
  const existingResult = await prisma.result.findFirst({
    where: { userId: session.user.id, testId: test.id },
    orderBy: { submittedAt: "desc" }
  });
  const existingEvents = await prisma.suspiciousActivity.findMany({
    where: { userId: session.user.id, testId: test.id },
    orderBy: { createdAt: "asc" }
  });
  if (existingResult) {
    return NextResponse.json({
      error: "Test already submitted.",
      alreadySubmitted: true,
      ...buildResultAnalysis({
        questions: test.questions,
        result: existingResult,
        studentId: session.user.id,
        testId: test.id,
        events: existingEvents
      })
    }, { status: 409 });
  }

  const questions = personalizeQuestions(test.questions, session.user.id, test.id);
  const review = questions.map((question) => {
    const studentAnswer = input.answers[question.id];
    const earned = scoreAnswer(question, studentAnswer);

    return {
      id: question.id,
      kind: question.kind,
      prompt: question.prompt,
      yourAnswer: studentAnswer,
      correctAnswer: question.answer,
      explanation: question.explanation,
      earned: Math.max(0, earned),
      marks: question.marks
    };
  });
  const score = review.reduce((total, question) => total + question.earned, 0);
  const maxScore = questions.reduce((total, question) => total + question.marks, 0);

  const result = await prisma.result.create({
    data: {
      userId: session.user.id,
      testId: test.id,
      score,
      maxScore,
      answers: input.answers as Prisma.InputJsonValue
    }
  });
  const events = await prisma.suspiciousActivity.findMany({
    where: { userId: session.user.id, testId: test.id },
    orderBy: { createdAt: "asc" }
  });
  const analysis = buildResultAnalysis({
    questions: test.questions,
    result,
    studentId: session.user.id,
    testId: test.id,
    events
  });

  return NextResponse.json({
    resultId: result.id,
    ...analysis
  });
}

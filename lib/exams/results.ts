import type { Question, Result, SuspiciousActivity } from "@prisma/client";
import { eventLabels, getRiskLevel, getSuspicionScore } from "@/lib/exams/anti-cheat";
import { personalizeQuestions, scoreAnswer } from "@/lib/exams/question-variants";

type ResultWithAnswers = Pick<Result, "score" | "maxScore" | "answers" | "submittedAt">;

export function buildResultAnalysis(input: {
  questions: Question[];
  result: ResultWithAnswers;
  studentId: string;
  testId: string;
  events: Pick<SuspiciousActivity, "event" | "createdAt">[];
}) {
  const answers = isRecord(input.result.answers) ? input.result.answers : {};
  const questions = personalizeQuestions(input.questions, input.studentId, input.testId);
  const review = questions.map((question) => {
    const studentAnswer = answers[question.id];
    const earned = Math.max(0, scoreAnswer(question, studentAnswer));

    return {
      id: question.id,
      kind: question.kind,
      prompt: question.prompt,
      yourAnswer: studentAnswer,
      correctAnswer: question.answer,
      explanation: question.explanation,
      earned,
      marks: question.marks,
      isCorrect: earned === question.marks
    };
  });
  const suspicionScore = getSuspicionScore(input.events);

  return {
    score: input.result.score,
    maxScore: input.result.maxScore,
    percentage: input.result.maxScore > 0 ? Math.round((input.result.score / input.result.maxScore) * 100) : 0,
    submittedAt: input.result.submittedAt,
    correctCount: review.filter((item) => item.isCorrect).length,
    totalQuestions: review.length,
    review,
    cheating: {
      score: suspicionScore,
      risk: getRiskLevel(suspicionScore),
      events: input.events.map((event) => ({
        event: event.event,
        label: eventLabels[event.event] ?? event.event,
        createdAt: event.createdAt
      }))
    }
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

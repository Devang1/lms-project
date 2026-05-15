"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { generateExamQuestions } from "@/lib/ai/gemini";
import { prisma } from "@/lib/prisma";

const promptTestSchema = z.object({
  title: z.string().min(3),
  topic: z.string().min(2),
  durationMin: z.coerce.number().int().min(5).max(240),
  questionCount: z.coerce.number().int().min(1).max(20),
  status: z.enum(["DRAFT", "SCHEDULED", "ACTIVE"]).default("ACTIVE"),
  prompt: z.string().min(20)
});

const manualTestSchema = z.object({
  title: z.string().min(3),
  topic: z.string().min(2),
  durationMin: z.coerce.number().int().min(5).max(240),
  status: z.enum(["DRAFT", "SCHEDULED", "ACTIVE"]).default("ACTIVE"),
  questionCount: z.coerce.number().int().min(1).max(50)
});

async function assertCourseManager(courseId: string, userId: string, role: string) {
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { id: true, slug: true, teacherId: true }
  });
  if (!course) throw new Error("Course not found");
  if (role !== "ADMIN" && course.teacherId !== userId) throw new Error("Unauthorized");
  return course;
}

export async function createPromptGeneratedTestAction(courseId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  await assertCourseManager(courseId, session.user.id, session.user.role);
  const parsed = promptTestSchema.parse(Object.fromEntries(formData));
  const questions = await generateExamQuestions({
    prompt: parsed.prompt,
    topic: parsed.topic,
    count: parsed.questionCount
  });

  if (!questions.length) throw new Error("No valid questions were generated. Try a more specific prompt.");

  const startsAt = new Date();
  const endsAt = new Date(startsAt.getTime() + parsed.durationMin * 60 * 1000);
  const test = await prisma.test.create({
    data: {
      courseId,
      title: parsed.title,
      topic: parsed.topic,
      status: parsed.status,
      startsAt,
      endsAt,
      durationMin: parsed.durationMin,
      questions: {
        create: questions.map((question) => ({
          type: "MCQ",
          prompt: question.prompt,
          options: getQuestionOptions(question),
          answer: question.answer,
          explanation: question.explanation,
          marks: 4,
          negative: 0
        }))
      }
    }
  });

  revalidatePath("/teacher/tests");
  revalidatePath("/teacher/courses");
  revalidatePath("/weekly-tests");
  redirect(`/teacher/tests?courseId=${courseId}&created=${test.id}`);
}

export async function createManualTestAction(courseId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  await assertCourseManager(courseId, session.user.id, session.user.role);
  const parsed = manualTestSchema.parse(Object.fromEntries(formData));
  const questions = Array.from({ length: parsed.questionCount }, (_, index) => {
    const kind = String(formData.get(`questions.${index}.kind`) ?? "MCQ");
    const prompt = String(formData.get(`questions.${index}.prompt`) ?? "").trim();
    const options = String(formData.get(`questions.${index}.options`) ?? "")
      .split(/\r?\n/)
      .map((option) => option.trim())
      .filter(Boolean)
      .slice(0, 8);
    const answer = String(formData.get(`questions.${index}.answer`) ?? "").trim();
    const explanation = String(formData.get(`questions.${index}.explanation`) ?? "").trim();
    const scenario = String(formData.get(`questions.${index}.scenario`) ?? "").trim();
    const marks = Number(formData.get(`questions.${index}.marks`) ?? 4);
    const negative = Number(formData.get(`questions.${index}.negative`) ?? 0);

    if (!prompt) throw new Error(`Question ${index + 1} needs a prompt.`);
    if (options.length < 2) throw new Error(`Question ${index + 1} needs at least two options or steps.`);
    if (!answer && kind !== "ORDER") throw new Error(`Question ${index + 1} needs a correct answer.`);
    if (!explanation) throw new Error(`Question ${index + 1} needs an explanation.`);

    return {
      kind,
      prompt,
      options,
      answer: kind === "ORDER" ? options.join("|") : answer,
      explanation,
      scenario,
      marks: Number.isFinite(marks) ? Math.max(1, Math.min(20, marks)) : 4,
      negative: Number.isFinite(negative) ? Math.max(0, Math.min(10, negative)) : 0
    };
  });

  const startsAt = new Date();
  const endsAt = new Date(startsAt.getTime() + parsed.durationMin * 60 * 1000);
  const test = await prisma.test.create({
    data: {
      courseId,
      title: parsed.title,
      topic: parsed.topic,
      status: parsed.status,
      startsAt,
      endsAt,
      durationMin: parsed.durationMin,
      questions: {
        create: questions.map((question) => ({
          type: "MCQ",
          prompt: question.prompt,
          options: getQuestionOptions(question),
          answer: question.answer,
          explanation: question.explanation,
          marks: question.marks,
          negative: question.negative
        }))
      }
    }
  });

  revalidatePath("/teacher/tests");
  revalidatePath("/teacher/courses");
  revalidatePath("/weekly-tests");
  redirect(`/teacher/tests?courseId=${courseId}&created=${test.id}`);
}

function getQuestionOptions(question: {
  kind: string;
  options: string[];
  scenario: string;
}) {
  const output: Record<string, string | string[]> = { kind: question.kind };

  if (["MCQ", "MISSING_STEP", "SCENARIO"].includes(question.kind)) output.choices = question.options;
  if (question.kind === "FIND_MISTAKE") output.mistakeOptions = question.options;
  if (question.kind === "ORDER") output.steps = question.options;
  if (question.scenario) output.scenario = question.scenario;

  return output;
}

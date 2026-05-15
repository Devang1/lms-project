import type { Question } from "@prisma/client";

export type InteractiveKind =
  | "MCQ"
  | "FIND_MISTAKE"
  | "MISSING_STEP"
  | "ORDER"
  | "HOTSPOT"
  | "DYNAMIC_NUMERIC"
  | "SCENARIO";

export type ExamQuestion = {
  id: string;
  kind: InteractiveKind;
  prompt: string;
  options: string[];
  answer: string;
  explanation: string;
  marks: number;
  negative: number;
  layoutSeed: number;
  diagram?: {
    label: string;
    hotspots: Array<{ id: string; label: string; x: number; y: number }>;
  };
  scenario?: string;
  tolerance?: number;
};

type QuestionOptions = {
  kind?: InteractiveKind;
  choices?: string[];
  steps?: string[];
  missingStep?: string;
  mistakeOptions?: string[];
  scenario?: string;
  diagram?: ExamQuestion["diagram"];
  dynamicNumerical?: {
    template: string;
    variable: string;
    min: number;
    max: number;
    multiplier?: number;
    offset?: number;
    unit?: string;
    tolerance?: number;
  };
};

function hash(value: string) {
  let output = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    output ^= value.charCodeAt(index);
    output = Math.imul(output, 16777619);
  }
  return Math.abs(output);
}

export function seededShuffle<T>(items: T[], seed: string) {
  const output = [...items];
  let state = hash(seed) || 1;

  for (let index = output.length - 1; index > 0; index -= 1) {
    state = (state * 1664525 + 1013904223) % 4294967296;
    const swapIndex = state % (index + 1);
    [output[index], output[swapIndex]] = [output[swapIndex], output[index]];
  }

  return output;
}

export function personalizeQuestions(questions: Question[], studentId: string, testId: string): ExamQuestion[] {
  const shuffled = seededShuffle(questions, `${studentId}:${testId}:questions`);

  return shuffled.map((question, index) => {
    const rawOptions = (question.options ?? {}) as QuestionOptions | string[];
    const objectOptions = Array.isArray(rawOptions) ? { choices: rawOptions } : rawOptions;
    const seed = hash(`${studentId}:${question.id}:${index}`);
    const dynamic = objectOptions.dynamicNumerical;
    const generatedValue = dynamic ? dynamic.min + (seed % (dynamic.max - dynamic.min + 1)) : 0;
    const numericAnswer = dynamic
      ? String(generatedValue * (dynamic.multiplier ?? 1) + (dynamic.offset ?? 0))
      : question.answer;
    const prompt = dynamic
      ? dynamic.template.replaceAll(`{${dynamic.variable}}`, String(generatedValue))
      : question.prompt;

    const options =
      objectOptions.steps ??
      objectOptions.mistakeOptions ??
      objectOptions.choices ??
      [];

    return {
      id: question.id,
      kind: objectOptions.kind ?? (question.type === "NUMERIC" ? "DYNAMIC_NUMERIC" : "MCQ"),
      prompt,
      options: seededShuffle(options, `${studentId}:${question.id}:options`),
      answer: dynamic ? numericAnswer : question.answer,
      explanation: question.explanation,
      marks: question.marks,
      negative: question.negative,
      layoutSeed: seed,
      diagram: objectOptions.diagram,
      scenario: objectOptions.scenario,
      tolerance: dynamic?.tolerance
    };
  });
}

export function scoreAnswer(question: ExamQuestion, answer: unknown) {
  if (question.kind === "ORDER") {
    return Array.isArray(answer) && answer.join("|") === question.answer ? question.marks : -question.negative;
  }

  if (question.kind === "HOTSPOT") {
    const selected = answer && typeof answer === "object" && "id" in answer ? String(answer.id) : "";
    return selected === question.answer ? question.marks : -question.negative;
  }

  if (question.kind === "DYNAMIC_NUMERIC") {
    const numericAnswer = Number(answer);
    const expected = Number(question.answer);
    const tolerance = question.tolerance ?? 0;
    return Number.isFinite(numericAnswer) && Math.abs(numericAnswer - expected) <= tolerance
      ? question.marks
      : -question.negative;
  }

  return String(answer ?? "").trim().toLowerCase() === question.answer.trim().toLowerCase()
    ? question.marks
    : -question.negative;
}

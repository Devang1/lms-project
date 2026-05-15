import { GoogleGenerativeAI } from "@google/generative-ai";

const fallbackModel = "gemini-2.5-flash-lite";

function getModel(modelName = process.env.GEMINI_MODEL_DEFAULT ?? fallbackModel) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not configured.");
  return new GoogleGenerativeAI(key).getGenerativeModel({ model: modelName });
}

export async function generateStructuredNotes(transcript: string, youtubeUrl: string) {
  const trimmedTranscript = transcript.slice(0, 14000);
  const prompt = `Create premium, human-written exam study notes from this YouTube transcript.
Return strict JSON only, with exactly these keys:
{
  "shortNotes": [
    { "heading": "Clear heading", "content": "Friendly 2-4 sentence explanation", "items": ["formula/fact/example"] }
  ],
  "detailedNotes": [
    { "heading": "Clear heading", "content": "Human explanation with examples, formulas, and exam tips", "items": ["important formula", "common mistake"] }
  ],
  "keyConcepts": ["concept name"],
  "revisionPoints": ["one actionable revision point"],
  "practiceQuestions": [{ "prompt": "question", "answer": "step-by-step answer" }]
}
Write like a great coaching teacher preparing polished notes for students.
Do not return raw paragraphs as an object. Do not include markdown fences. Avoid filler.
Video: ${youtubeUrl}
Transcript:
${trimmedTranscript}`;

  const text = await generateText(prompt, process.env.GEMINI_MODEL_NOTES);
  return normalizeNotes(parseGeminiJson(text));
}

export async function solveDoubt(input: { question: string; subject?: string; imageUrl?: string }) {
  const prompt = `Solve this student doubt step by step for competitive exam preparation.
Return strict JSON with keys: answer, steps, commonMistakes, recommendedTopics.
Subject: ${input.subject ?? "General"}
Image URL if provided: ${input.imageUrl ?? "none"}
Doubt: ${input.question.slice(0, 4000)}`;

  return parseGeminiJson(await generateText(prompt, process.env.GEMINI_MODEL_DOUBT));
}

export async function generateDailyQuestion(topic: string) {
  const prompt = `Generate one MCQ daily practice question for topic "${topic}".
Return strict JSON: prompt, options array of 4 strings, answer, solution. Keep it exam-oriented.`;
  return parseGeminiJson(await generateText(prompt, process.env.GEMINI_MODEL_DAILY));
}

export async function generateExamQuestions(input: { prompt: string; topic: string; count: number }) {
  const prompt = `Create a full anti-cheat friendly exam from this teacher request.
Return strict JSON only with this shape:
{
  "questions": [
    {
      "kind": "MCQ" | "FIND_MISTAKE" | "MISSING_STEP" | "ORDER" | "SCENARIO",
      "prompt": "question text",
      "options": ["option or step 1", "option or step 2", "option or step 3", "option or step 4"],
      "answer": "exact correct option, or for ORDER use the exact options joined with | in the correct order",
      "explanation": "short teacher-quality explanation",
      "scenario": "optional scenario context"
    }
  ]
}
Rules:
- Create exactly ${input.count} questions.
- Mix conceptual, mistake-finding, missing-step, ordering, and scenario reasoning where appropriate.
- Keep every option concise and unambiguous.
- For ORDER questions, options must be the shuffled steps, while answer must be the correct order joined by |.
- Avoid plain recall when a reasoning version is possible.
Topic: ${input.topic}
Teacher prompt: ${input.prompt.slice(0, 5000)}`;

  const data = parseGeminiJson(await generateText(prompt, process.env.GEMINI_MODEL_DAILY)) as { questions?: unknown };
  return normalizeExamQuestions(data.questions, input.count);
}

async function generateText(prompt: string, modelName?: string) {
  try {
    const result = await getModel(modelName).generateContent(prompt);
    return result.response.text();
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gemini request failed.";
    if (message.includes("429") || message.toLowerCase().includes("quota")) {
      throw new Error(
        "Gemini free-tier quota is currently exhausted for this API key. Wait a minute and try again, switch to another Gemini model/key, or enable billing in Google AI Studio."
      );
    }
    if (message.includes("404") || message.includes("not found")) {
      throw new Error("The configured Gemini model is not available for this API key. Update GEMINI_MODEL_* in .env.");
    }
    throw error;
  }
}

function parseGeminiJson(text: string) {
  const cleaned = text.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");
    if (start >= 0 && end > start) return JSON.parse(cleaned.slice(start, end + 1));
    throw new Error("Gemini response was not valid JSON.");
  }
}

function normalizeNotes(notes: Record<string, unknown>) {
  return {
    shortNotes: stringifyNotesField(notes.shortNotes),
    detailedNotes: stringifyNotesField(notes.detailedNotes),
    keyConcepts: normalizeStringArray(notes.keyConcepts),
    revisionPoints: normalizeStringArray(notes.revisionPoints),
    practiceQuestions: Array.isArray(notes.practiceQuestions) ? notes.practiceQuestions : []
  };
}

function stringifyNotesField(value: unknown) {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    return value
      .map((item) => {
        if (typeof item === "string") return item;
        if (item && typeof item === "object") {
          const record = item as Record<string, unknown>;
          const heading = typeof record.heading === "string" ? `${record.heading}\n` : "";
          const content = typeof record.content === "string" ? record.content : JSON.stringify(record);
          return `${heading}${content}`;
        }
        return String(item);
      })
      .join("\n\n");
  }
  if (value && typeof value === "object") return JSON.stringify(value, null, 2);
  return "";
}

function normalizeStringArray(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.map((item) => (typeof item === "string" ? item : JSON.stringify(item)));
}

function normalizeExamQuestions(value: unknown, count: number) {
  if (!Array.isArray(value)) throw new Error("Gemini did not return exam questions.");
  return value.slice(0, count).map((item, index) => {
    const record = item && typeof item === "object" ? item as Record<string, unknown> : {};
    const kind = typeof record.kind === "string" ? record.kind : "MCQ";
    const options = normalizeStringArray(record.options).filter(Boolean).slice(0, 6);
    if (options.length < 2) throw new Error(`Generated question ${index + 1} needs at least two options.`);

    return {
      kind: ["MCQ", "FIND_MISTAKE", "MISSING_STEP", "ORDER", "SCENARIO"].includes(kind) ? kind : "MCQ",
      prompt: String(record.prompt ?? "").trim(),
      options,
      answer: String(record.answer ?? "").trim(),
      explanation: String(record.explanation ?? record.solution ?? "").trim(),
      scenario: typeof record.scenario === "string" ? record.scenario.trim() : ""
    };
  }).filter((question) => question.prompt && question.answer && question.explanation);
}

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

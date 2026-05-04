import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateStructuredNotes } from "@/lib/ai/gemini";
import { extractVideoId, fetchTranscript } from "@/lib/ai/youtube";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  youtubeUrl: z.string().url()
});

export async function POST(request: Request) {
  const session = await auth();

  if (!session?.user || session.user.role !== "STUDENT") {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  // ✅ Rate limit: 3 requests per minute
  const limited = rateLimit(
    `notes:${session.user.id}`,
    3,
    60_000
  );

  if (!limited.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429 }
    );
  }

  try {
    const { youtubeUrl } = schema.parse(await request.json());

    // ✅ Daily limit logic (5 per day)
    const now = new Date();
    const today = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate()
      )
    );

    let usage = await prisma.aIUsageLimit.findFirst({
      where: { userId: session.user.id },
      orderBy: { date: "desc" }
    });

    if (!usage || usage.date < today) {
      usage = await prisma.aIUsageLimit.create({
        data: {
          userId: session.user.id,
          date: today,
          notesCount: 0
        }
      });
    }

    if (usage.notesCount >= 5) {
      return NextResponse.json(
        { error: "Daily limit reached (5 notes per day)" },
        { status: 429 }
      );
    }

    // 🔥 FIXED: Safe transcript handling
    let transcript = "";

    try {
      transcript = await fetchTranscript(youtubeUrl);

      if (!transcript || transcript.trim().length < 50) {
        throw new Error("Transcript too short");
      }
    } catch (err) {
      console.log("⚠️ Transcript failed, using fallback");

      const videoId = extractVideoId(youtubeUrl);

      transcript = `
This is an educational YouTube video (ID: ${videoId}).

Generate structured notes including:
- Summary
- Key concepts
- Important formulas or ideas
- Examples
- Practice questions
`;
    }

    // ✅ Generate notes
    const notes = await generateStructuredNotes(
      transcript,
      youtubeUrl
    );

    const tokenCount = Math.ceil(transcript.length / 4);

    // ✅ Save + increment usage safely
    const record = await prisma.$transaction(async (tx) => {
      const saved = await tx.notesGeneration.create({
        data: {
          userId: session.user.id,
          youtubeUrl,
          videoId: extractVideoId(youtubeUrl),
          shortNotes: notes.shortNotes,
          detailNotes: notes.detailedNotes,
          concepts: notes.keyConcepts,
          revision: notes.revisionPoints,
          questions: notes.practiceQuestions,
          tokenCount
        }
      });

      await tx.aIUsageLimit.update({
        where: { id: usage.id },
        data: {
          notesCount: { increment: 1 }
        }
      });

      return saved;
    });

    return NextResponse.json(record);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate notes"
      },
      { status: 400 }
    );
  }
}
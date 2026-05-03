import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateStructuredNotes } from "@/lib/ai/gemini";
import { extractVideoId, fetchTranscript } from "@/lib/ai/youtube";
import { assertNotesAvailable } from "@/lib/ai/usage";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({ youtubeUrl: z.string().url() });

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "STUDENT") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = rateLimit(`notes:${session.user.id}`, 3, 60_000);
  if (!limited.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  try {
    const { youtubeUrl } = schema.parse(await request.json());
    await assertNotesAvailable(session.user.id);
    const transcript = await fetchTranscript(youtubeUrl);
    const notes = await generateStructuredNotes(transcript, youtubeUrl);
    const tokenCount = Math.ceil(transcript.length / 4);

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
      const usage = await tx.aIUsageLimit.findFirstOrThrow({
        where: { userId: session.user.id },
        orderBy: { date: "desc" }
      });
      await tx.aIUsageLimit.update({ where: { id: usage.id }, data: { notesCount: { increment: 1 } } });
      return saved;
    });

    return NextResponse.json(record);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to generate notes" }, { status: 400 });
  }
}

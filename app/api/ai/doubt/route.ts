import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { solveDoubt } from "@/lib/ai/gemini";
import { addDoubtUsage } from "@/lib/ai/usage";
import { rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  question: z.string().min(8).max(4000),
  subject: z.string().optional(),
  imageUrl: z.string().url().optional()
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = rateLimit(`doubt:${session.user.id}`, 8, 60_000);
  if (!limited.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  try {
    const input = schema.parse(await request.json());
    const estimatedTokens = Math.ceil((input.question.length + (input.imageUrl?.length ?? 0)) / 4);
    await addDoubtUsage(session.user.id, estimatedTokens);
    const answer = await solveDoubt(input);
    return NextResponse.json(answer);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "AI doubt failed" }, { status: 400 });
  }
}

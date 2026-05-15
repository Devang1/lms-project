import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { getRiskLevel, getSuspicionScore } from "@/lib/exams/anti-cheat";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  testId: z.string().optional(),
  event: z.string().min(2).max(120),
  device: z.string().optional()
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.text();
  let parsedBody: unknown = {};
  try {
    parsedBody = body ? JSON.parse(body) : {};
  } catch {
    return NextResponse.json({ error: "Invalid anti-cheat event" }, { status: 400 });
  }
  const input = schema.safeParse(parsedBody);
  if (!input.success) return NextResponse.json({ error: "Invalid anti-cheat event" }, { status: 400 });

  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for")?.split(",")[0] ?? "local";
  await prisma.suspiciousActivity.create({
    data: { userId: session.user.id, testId: input.data.testId, event: input.data.event, device: input.data.device, ip }
  });
  const events = await prisma.suspiciousActivity.findMany({
    where: { userId: session.user.id, testId: input.data.testId },
    orderBy: { createdAt: "asc" },
    select: { event: true, createdAt: true }
  });
  const score = getSuspicionScore(events);

  return NextResponse.json({ events, score, risk: getRiskLevel(score) });
}

import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const schema = z.object({
  testId: z.string().optional(),
  event: z.string().min(2).max(120),
  device: z.string().optional()
});

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const input = schema.parse(await request.json());
  const headerList = await headers();
  const ip = headerList.get("x-forwarded-for")?.split(",")[0] ?? "local";
  const flag = await prisma.suspiciousActivity.create({
    data: { userId: session.user.id, testId: input.testId, event: input.event, device: input.device, ip }
  });

  return NextResponse.json(flag);
}

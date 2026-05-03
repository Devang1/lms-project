import { startOfDay } from "date-fns";
import { prisma } from "@/lib/prisma";

export async function getDailyUsage(userId: string) {
  const date = startOfDay(new Date());
  return prisma.aIUsageLimit.upsert({
    where: { userId_date: { userId, date } },
    update: {},
    create: { userId, date }
  });
}

export async function assertNotesAvailable(userId: string) {
  const usage = await getDailyUsage(userId);
  if (!usage.override && usage.notesCount >= 1) {
    throw new Error("Daily AI notes limit reached. Try again tomorrow.");
  }
  return usage;
}

export async function addDoubtUsage(userId: string, estimatedTokens: number) {
  const usage = await getDailyUsage(userId);
  const limit = 12000;
  if (!usage.override && usage.doubtTokens + estimatedTokens > limit) {
    throw new Error("Daily AI doubt limit reached. Keep the question shorter or try tomorrow.");
  }
  return prisma.aIUsageLimit.update({
    where: { id: usage.id },
    data: { doubtTokens: { increment: estimatedTokens } }
  });
}

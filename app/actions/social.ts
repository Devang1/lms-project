"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { PostReactionType } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { levelForXp, rankForXp } from "@/lib/gamification";

const postSchema = z.object({
  content: z.string().min(3),
  studyHours: z.preprocess((value) => value === "" ? undefined : value, z.coerce.number().min(0).max(24).optional()),
  mockScore: z.preprocess((value) => value === "" ? undefined : value, z.coerce.number().min(0).max(100).optional()),
  imageUrl: z.preprocess(
    (value) => value === "" ? undefined : value,
    z.string().url("Image must be a valid URL").optional()
  )
});

export async function createPostAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const parsed = postSchema.parse(Object.fromEntries(formData));

  await prisma.$transaction(async (tx) => {
    await tx.post.create({ data: { userId: session.user.id, ...parsed } });
    const user = await tx.user.update({ where: { id: session.user.id }, data: { xp: { increment: 10 } } });
    await tx.user.update({
      where: { id: session.user.id },
      data: { level: levelForXp(user.xp), heroTag: rankForXp(user.xp).tag }
    });
    await tx.xPLog.create({ data: { userId: session.user.id, amount: 10, reason: "Progress post" } });
  });

  revalidatePath("/feed");
  revalidatePath("/profile");
}

const commentSchema = z.object({
  content: z.string().min(1).max(500)
});

export async function setPostReactionAction(postId: string, type: "LIKE" | "DISLIKE" | "NONE") {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  await prisma.$transaction(async (tx) => {
    const existing = await tx.postReaction.findUnique({
      where: { userId_postId: { userId: session.user.id, postId } }
    });

    let likeDelta = 0;
    if (existing?.type === "LIKE") likeDelta -= 1;
    if (type === "LIKE" && existing?.type !== "LIKE") likeDelta += 1;

    if (type === "NONE") {
      if (existing) await tx.postReaction.delete({ where: { id: existing.id } });
    } else if (existing) {
      await tx.postReaction.update({ where: { id: existing.id }, data: { type: type as PostReactionType } });
    } else {
      await tx.postReaction.create({
        data: { userId: session.user.id, postId, type: type as PostReactionType }
      });
    }

    if (likeDelta !== 0) {
      const post = await tx.post.findUnique({ where: { id: postId }, select: { likes: true } });
      await tx.post.update({
        where: { id: postId },
        data: { likes: Math.max(0, (post?.likes ?? 0) + likeDelta) }
      });
    }
  });

  revalidatePath("/feed");
}

export async function createCommentAction(postId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const parsed = commentSchema.parse(Object.fromEntries(formData));

  await prisma.comment.create({
    data: {
      postId,
      userId: session.user.id,
      content: parsed.content
    }
  });

  revalidatePath("/feed");
  revalidatePath("/profile");
}

const doubtSchema = z.object({
  subject: z.string().min(2),
  title: z.string().min(4),
  body: z.string().min(8),
  imageUrl: z.preprocess(
    (value) => value === "" ? undefined : value,
    z.string().url("Image must be a valid URL").optional()
  )
});

export async function createDoubtAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  await prisma.doubt.create({ data: { userId: session.user.id, ...doubtSchema.parse(Object.fromEntries(formData)) } });
  revalidatePath("/doubts");
  revalidatePath("/feed");
}

export async function answerDoubtAction(doubtId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  await prisma.doubtAnswer.create({
    data: { userId: session.user.id, doubtId, body: String(formData.get("body") ?? "") }
  });
  revalidatePath("/doubts");
}

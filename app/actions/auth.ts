"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { auth, signIn, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

const managedUserSchema = z.object({
  name: z.string().min(2),
  username: z.string().min(3).regex(/^[a-zA-Z0-9._-]+$/, "Use letters, numbers, dot, underscore, or dash."),
  password: z.string().min(6),
  role: z.enum(["STUDENT", "TEACHER"]),
  courseId: z.string().optional()
});

const profileSchema = z.object({
  name: z.string().min(2),
  bio: z.string().max(280).optional()
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6)
});

export async function createManagedUserAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const parsed = managedUserSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("Invalid account details.");

  if (session.user.role === "TEACHER" && parsed.data.role !== "STUDENT") {
    throw new Error("Teachers can only add students.");
  }

  if (session.user.role !== "ADMIN" && session.user.role !== "TEACHER") {
    throw new Error("Only admins and teachers can add users.");
  }

  const username = parsed.data.username.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { username } });
  if (existing) throw new Error("This username is already taken.");

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);

  await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        name: parsed.data.name,
        username,
        email: `${username}@starstudypoint.local`,
        passwordHash,
        role: parsed.data.role,
        isApproved: true,
        streak: parsed.data.role === "STUDENT" ? { create: {} } : undefined
      }
    });

    if (parsed.data.role === "STUDENT" && parsed.data.courseId) {
      const course = await tx.course.findUnique({ where: { id: parsed.data.courseId } });
      if (course && (session.user.role === "ADMIN" || course.teacherId === session.user.id)) {
        await tx.enrollment.create({ data: { userId: user.id, courseId: course.id } });
      }
    }
  });

  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath("/teacher");
}

export async function loginAction(formData: FormData) {
  try {
    await signIn("credentials", {
      username: String(formData.get("username")).toLowerCase(),
      password: String(formData.get("password")),
      redirectTo: "/feed"
    });
  } catch (error) {
    if (error instanceof AuthError && error.type === "CredentialsSignin") {
      redirect("/login?error=invalid");
    }
    throw error;
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: "/" });
}

export async function updateProfileAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const parsed = profileSchema.parse(Object.fromEntries(formData));

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: parsed.name,
      bio: parsed.bio ?? ""
    }
  });

  revalidatePath("/profile");
}

export async function changePasswordAction(formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const parsed = passwordSchema.parse(Object.fromEntries(formData));

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { passwordHash: true } });
  if (!user?.passwordHash) throw new Error("Password login is not enabled for this account.");
  const matches = await bcrypt.compare(parsed.currentPassword, user.passwordHash);
  if (!matches) throw new Error("Current password is incorrect.");

  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash: await bcrypt.hash(parsed.newPassword, 12) }
  });

  revalidatePath("/profile");
}

export async function dashboardRedirect() {
  redirect("/feed");
}

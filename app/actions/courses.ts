"use server";
import { v2 as cloudinary } from "cloudinary";
import { revalidatePath } from "next/cache";
import { startOfDay } from "date-fns";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { slugify } from "@/lib/utils";
import { generateDailyQuestion } from "@/lib/ai/gemini";

const courseSchema = z.object({
  title: z.string().min(3),
  description: z.string().min(10),
  subject: z.string().min(2),
  visibility: z.enum(["PUBLIC", "PRIVATE"])
});
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME!,
  api_key: process.env.CLOUDINARY_API_KEY!,
  api_secret: process.env.CLOUDINARY_API_SECRET!,
});
const lessonSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  content: z.string().min(3, "Content is required"),

  // External optional video link
  videoUrl: z.preprocess(
    (value) => {
      if (!value || String(value).trim() === "") return undefined;
      return String(value);
    },
    z.string().url("Invalid video URL").optional()
  ),

  // External optional material link
  materialUrl: z.preprocess(
    (value) => {
      if (!value || String(value).trim() === "") return undefined;
      return String(value);
    },
    z.string().url("Invalid material URL").optional()
  )
});

const courseMessageSchema = z.object({
  body: z.string().min(1).max(1200),
  imageUrl: z.preprocess((value) => value === "" ? undefined : value, z.string().url().optional())
});

const dailyQuestionEditSchema = z.object({
  topic: z.string().min(2),
  prompt: z.string().min(8),
  options: z.string().min(8),
  answer: z.string().min(1),
  solution: z.string().min(3)
});

const testQuestionKinds = [
  "MCQ",
  "FIND_MISTAKE",
  "MISSING_STEP",
  "ORDER",
  "DYNAMIC_NUMERIC",
  "SCENARIO"
] as const;

const courseTestSchema = z.object({
  title: z.string().min(3),
  topic: z.string().min(2),
  durationMin: z.coerce.number().int().min(5).max(240),
  status: z.enum(["DRAFT", "SCHEDULED", "ACTIVE", "COMPLETED"]).default("ACTIVE"),
  startsAt: z.string().optional(),
  endsAt: z.string().optional(),
  kind: z.enum(testQuestionKinds),
  prompt: z.string().min(8),
  options: z.string().optional(),
  answer: z.string().optional(),
  explanation: z.string().min(3),
  marks: z.coerce.number().int().min(1).max(20).default(4),
  negative: z.coerce.number().int().min(0).max(10).default(0),
  scenario: z.string().optional(),
  dynamicVariable: z.string().optional(),
  dynamicMin: z.coerce.number().int().optional(),
  dynamicMax: z.coerce.number().int().optional(),
  dynamicMultiplier: z.coerce.number().optional(),
  dynamicOffset: z.coerce.number().optional()
});

export async function createCourseAction(formData: FormData) {
  const session = await auth();
  if (session?.user.role !== "TEACHER" && session?.user.role !== "ADMIN") throw new Error("Unauthorized");
  const parsed = courseSchema.parse(Object.fromEntries(formData));

  await prisma.course.create({
    data: {
      ...parsed,
      slug: `${slugify(parsed.title)}-${Date.now().toString(36)}`,
      teacherId: session.user.id,
      chats: { create: { title: "General" } }
    }
  });

  revalidatePath("/teacher");
  revalidatePath("/teacher/courses");
  revalidatePath("/courses");
}

export async function applyCourseAction(courseId: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "STUDENT") throw new Error("Unauthorized");

  await prisma.courseApplication.upsert({
    where: { userId_courseId: { userId: session.user.id, courseId } },
    update: { status: "PENDING" },
    create: { userId: session.user.id, courseId }
  });

  revalidatePath("/courses");
}

export async function reviewApplicationAction(applicationId: string, status: "APPROVED" | "REJECTED") {
  const session = await auth();
  if (session?.user.role !== "TEACHER" && session?.user.role !== "ADMIN") throw new Error("Unauthorized");

  const application = await prisma.courseApplication.update({
    where: { id: applicationId },
    data: { status, reviewedAt: new Date() }
  });

  if (status === "APPROVED") {
    await prisma.enrollment.upsert({
      where: { userId_courseId: { userId: application.userId, courseId: application.courseId } },
      update: {},
      create: { userId: application.userId, courseId: application.courseId }
    });
  }

  revalidatePath("/teacher");
  revalidatePath("/teacher/courses");
}

export async function updateActiveTopicAction(courseId: string, formData: FormData) {
  const session = await auth();
  if (session?.user.role !== "TEACHER" && session?.user.role !== "ADMIN") throw new Error("Unauthorized");
  const activeTopic = String(formData.get("activeTopic") ?? "").trim();
  const course = await prisma.course.update({ where: { id: courseId }, data: { activeTopic }, select: { slug: true } });
  revalidatePath("/teacher");
  revalidatePath("/teacher/courses");
  revalidatePath(`/courses/${course.slug}`);
}

export async function uploadLessonMaterialAction(
  courseId: string,
  formData: FormData
) {
  const session = await auth();

  if (
    session?.user.role !== "TEACHER" &&
    session?.user.role !== "ADMIN"
  ) {
    throw new Error("Unauthorized");
  }

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      teacherId: true,
      slug: true,
      _count: { select: { lessons: true } }
    }
  });

  if (!course) throw new Error("Course not found");

  if (
    session.user.role !== "ADMIN" &&
    course.teacherId !== session.user.id
  ) {
    throw new Error("Unauthorized");
  }

  // SAFE PARSING
  const parsed = lessonSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
    videoUrl: formData.get("videoUrl"),
    materialUrl: formData.get("materialUrl")
  });

  if (!parsed.success) {
    console.error("Validation Error:", parsed.error.flatten());
    throw new Error(
      Object.values(parsed.error.flatten().fieldErrors)
        .flat()
        .join(", ")
    );
  }

  let finalMaterialUrl = parsed.data.materialUrl;
  let finalVideoUrl = parsed.data.videoUrl;

  const uploadedFile = formData.get("materialFile") as File | null;

  if (uploadedFile && uploadedFile.size > 0) {
    const bytes = await uploadedFile.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const uploadResult = await new Promise<{
  secure_url: string;
  resource_type: string;
}>((resolve, reject) => {
  const stream = cloudinary.uploader.upload_stream(
    {
      folder: "course-materials",
      resource_type: "auto"
    },
    (error, result) => {
      if (error) {
        reject(error);
      } else if (result) {
        resolve({
          secure_url: result.secure_url,
          resource_type: result.resource_type
        });
      } else {
        reject(new Error("Cloudinary upload failed"));
      }
    }
  );

  stream.end(buffer);
});
    if (uploadResult.resource_type === "video") {
      finalVideoUrl = uploadResult.secure_url;
    } else {
      finalMaterialUrl = uploadResult.secure_url;
    }
  }

  await prisma.lesson.create({
    data: {
      title: parsed.data.title,
      content: parsed.data.content,
      videoUrl: finalVideoUrl || null,
      materialUrl: finalMaterialUrl || null,
      courseId,
      order: course._count.lessons + 1
    }
  });

  revalidatePath("/courses");
  revalidatePath("/teacher");
  revalidatePath("/teacher/courses");
  revalidatePath(`/courses/${course.slug}`);
}
async function getOrCreateCourseChat(courseId: string) {
  const existing = await prisma.courseChat.findFirst({ where: { courseId }, orderBy: { createdAt: "asc" } });
  if (existing) return existing;
  return prisma.courseChat.create({ data: { courseId, title: "General" } });
}

async function assertCourseManager(courseId: string, userId: string, role: string) {
  const course = await prisma.course.findUnique({ where: { id: courseId }, select: { teacherId: true, slug: true } });
  if (!course) throw new Error("Course not found");
  if (role !== "ADMIN" && course.teacherId !== userId) throw new Error("Unauthorized");
  return course;
}

export async function sendCourseAnnouncementAction(courseId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const course = await assertCourseManager(courseId, session.user.id, session.user.role);
  const parsed = courseMessageSchema.parse(Object.fromEntries(formData));
  const chat = await getOrCreateCourseChat(courseId);

  await prisma.$transaction(async (tx) => {
    await tx.courseChatMessage.create({
      data: {
        chatId: chat.id,
        userId: session.user.id,
        body: parsed.body,
        imageUrl: parsed.imageUrl,
        isPinned: true,
        reactions: {}
      }
    });

    const enrollments = await tx.enrollment.findMany({ where: { courseId }, select: { userId: true } });
    if (enrollments.length) {
      await tx.notification.createMany({
        data: enrollments.map((enrollment) => ({
          userId: enrollment.userId,
          type: "COURSE",
          title: "New course announcement",
          body: parsed.body.slice(0, 180)
        }))
      });
    }
  });

  revalidatePath("/teacher");
  revalidatePath("/teacher/courses");
  revalidatePath(`/courses/${course.slug}`);
}

export async function sendCourseChatMessageAction(courseId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");

  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: {
      teacherId: true,
      slug: true,
      enrollments: session.user.role === "STUDENT" ? { where: { userId: session.user.id }, select: { id: true } } : false
    }
  });
  if (!course) throw new Error("Course not found");
  const canChat = session.user.role === "ADMIN" || course.teacherId === session.user.id || course.enrollments.length > 0;
  if (!canChat) throw new Error("Unauthorized");

  const parsed = courseMessageSchema.parse(Object.fromEntries(formData));
  const chat = await getOrCreateCourseChat(courseId);

  await prisma.courseChatMessage.create({
    data: {
      chatId: chat.id,
      userId: session.user.id,
      body: parsed.body,
      imageUrl: parsed.imageUrl,
      reactions: {}
    }
  });

  revalidatePath("/teacher");
  revalidatePath("/teacher/courses");
  revalidatePath(`/courses/${course.slug}`);
}

export async function generateCourseDailyQuestionAction(courseId: string) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const course = await assertCourseManager(courseId, session.user.id, session.user.role);

  const current = await prisma.course.findUnique({
    where: { id: courseId },
    select: { activeTopic: true }
  });
  if (!current?.activeTopic) throw new Error("Set an active topic before generating a daily question.");

  const aiQuestion = await generateDailyQuestion(current.activeTopic);
  const date = startOfDay(new Date());

  await prisma.dailyQuestion.upsert({
    where: { courseId_date: { courseId, date } },
    update: {
      topic: current.activeTopic,
      prompt: String(aiQuestion.prompt ?? ""),
      options: Array.isArray(aiQuestion.options) ? aiQuestion.options.map(String) : [],
      answer: String(aiQuestion.answer ?? ""),
      solution: String(aiQuestion.solution ?? "")
    },
    create: {
      courseId,
      date,
      topic: current.activeTopic,
      prompt: String(aiQuestion.prompt ?? ""),
      options: Array.isArray(aiQuestion.options) ? aiQuestion.options.map(String) : [],
      answer: String(aiQuestion.answer ?? ""),
      solution: String(aiQuestion.solution ?? "")
    }
  });

  revalidatePath("/teacher/courses");
  revalidatePath("/daily-question");
  revalidatePath(`/courses/${course.slug}`);
}

export async function updateCourseDailyQuestionAction(courseId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const course = await assertCourseManager(courseId, session.user.id, session.user.role);
  const parsed = dailyQuestionEditSchema.parse(Object.fromEntries(formData));
  const options = parsed.options
    .split(/\r?\n/)
    .map((option) => option.trim())
    .filter(Boolean)
    .slice(0, 6);
  if (options.length < 2) throw new Error("Add at least two options, one per line.");

  const date = startOfDay(new Date());
  await prisma.dailyQuestion.upsert({
    where: { courseId_date: { courseId, date } },
    update: {
      topic: parsed.topic,
      prompt: parsed.prompt,
      options,
      answer: parsed.answer,
      solution: parsed.solution
    },
    create: {
      courseId,
      date,
      topic: parsed.topic,
      prompt: parsed.prompt,
      options,
      answer: parsed.answer,
      solution: parsed.solution
    }
  });

  revalidatePath("/teacher/courses");
  revalidatePath("/daily-question");
  revalidatePath(`/courses/${course.slug}`);
}

export async function createCourseTestAction(courseId: string, formData: FormData) {
  const session = await auth();
  if (!session?.user) throw new Error("Unauthorized");
  const course = await assertCourseManager(courseId, session.user.id, session.user.role);
  const parsed = courseTestSchema.parse(Object.fromEntries(formData));
  const now = new Date();
  const startsAt = parsed.startsAt ? new Date(parsed.startsAt) : now;
  const endsAt = parsed.endsAt ? new Date(parsed.endsAt) : new Date(startsAt.getTime() + parsed.durationMin * 60 * 1000);
  const optionLines = (parsed.options ?? "")
    .split(/\r?\n/)
    .map((option) => option.trim())
    .filter(Boolean)
    .slice(0, 8);
  const isOrder = parsed.kind === "ORDER";
  const isNumeric = parsed.kind === "DYNAMIC_NUMERIC";

  if (!isNumeric && optionLines.length < 2) throw new Error("Add at least two options or steps.");
  if (!isOrder && !isNumeric && !parsed.answer?.trim()) throw new Error("Add the correct answer.");
  if (isNumeric && (parsed.dynamicMin === undefined || parsed.dynamicMax === undefined || !parsed.dynamicVariable)) {
    throw new Error("Dynamic numerical questions need a variable name and min/max values.");
  }

  const questionOptions = isNumeric
    ? {
      kind: parsed.kind,
      dynamicNumerical: {
        template: parsed.prompt,
        variable: parsed.dynamicVariable,
        min: parsed.dynamicMin,
        max: parsed.dynamicMax,
        multiplier: parsed.dynamicMultiplier ?? 1,
        offset: parsed.dynamicOffset ?? 0,
        tolerance: 0
      }
    }
    : getManualQuestionOptions(parsed.kind, optionLines, parsed.scenario);

  await prisma.test.create({
    data: {
      courseId,
      title: parsed.title,
      topic: parsed.topic,
      status: parsed.status,
      startsAt,
      endsAt,
      durationMin: parsed.durationMin,
      questions: {
        create: {
          type: isNumeric ? "NUMERIC" : "MCQ",
          prompt: parsed.prompt,
          options: questionOptions,
          answer: isOrder ? optionLines.join("|") : parsed.answer?.trim() || "0",
          explanation: parsed.explanation,
          marks: parsed.marks,
          negative: parsed.negative
        }
      }
    }
  });

  revalidatePath("/teacher");
  revalidatePath("/teacher/courses");
  revalidatePath("/weekly-tests");
  revalidatePath(`/courses/${course.slug}`);
}

function getManualQuestionOptions(kind: string, optionLines: string[], scenario?: string) {
  const output: Record<string, string | string[]> = { kind };
  if (["MCQ", "MISSING_STEP", "SCENARIO"].includes(kind)) output.choices = optionLines;
  if (kind === "FIND_MISTAKE") output.mistakeOptions = optionLines;
  if (kind === "ORDER") output.steps = optionLines;
  if (scenario?.trim()) output.scenario = scenario.trim();
  return output;
}

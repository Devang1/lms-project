import bcrypt from "bcryptjs";
import { addDays } from "date-fns";
import { prisma } from "../lib/prisma";

async function main() {
  const passwordHash = await bcrypt.hash("password123", 12);

  const admin = await prisma.user.upsert({
    where: { username: "admin" },
    update: {
      name: "Star Admin",
      email: "admin@starstudypoint.local",
      passwordHash,
      role: "ADMIN",
      isApproved: true
    },
    create: {
      name: "Star Admin",
      username: "admin",
      email: "admin@starstudypoint.local",
      passwordHash,
      role: "ADMIN",
      isApproved: true
    }
  });

  const teacher = await prisma.user.upsert({
    where: { username: "teacher" },
    update: {
      name: "Asha Sharma",
      email: "teacher@starstudypoint.local",
      passwordHash,
      role: "TEACHER",
      isApproved: true
    },
    create: {
      name: "Asha Sharma",
      username: "teacher",
      email: "teacher@starstudypoint.local",
      passwordHash,
      role: "TEACHER",
      isApproved: true
    }
  });

  const student = await prisma.user.upsert({
    where: { username: "student" },
    update: {
      name: "Rohan Hero",
      email: "student@starstudypoint.local",
      passwordHash,
      role: "STUDENT",
      isApproved: true,
      xp: 820,
      level: 4,
      heroTag: "Iron Mind"
    },
    create: {
      name: "Rohan Hero",
      username: "student",
      email: "student@starstudypoint.local",
      passwordHash,
      role: "STUDENT",
      isApproved: true,
      xp: 820,
      level: 4,
      heroTag: "Iron Mind",
      streak: { create: { current: 6, best: 13, lastSeen: new Date() } }
    }
  });

  const course = await prisma.course.upsert({
    where: { slug: "jee-physics-mastery" },
    update: {},
    create: {
      title: "JEE Physics Mastery",
      slug: "jee-physics-mastery",
      subject: "Physics",
      description: "Mechanics, electricity, magnetism, optics, and test strategy for high-pressure exam performance.",
      visibility: "PUBLIC",
      activeTopic: "Newton's Laws of Motion",
      teacherId: teacher.id
    }
  });

  await prisma.enrollment.upsert({
    where: { userId_courseId: { userId: student.id, courseId: course.id } },
    update: {},
    create: { userId: student.id, courseId: course.id, progress: 34 }
  });

  await prisma.badge.upsert({
    where: { name: "Consistency Spark" },
    update: {},
    create: { name: "Consistency Spark", description: "Maintained a serious study streak.", icon: "flame" }
  });

  await prisma.test.create({
    data: {
      courseId: course.id,
      title: "Mechanics Weekly Arena",
      topic: "Laws of Motion",
      status: "SCHEDULED",
      startsAt: addDays(new Date(), 2),
      endsAt: addDays(new Date(), 2),
      durationMin: 60,
      questions: {
        create: [
          {
            prompt: "A block is pulled with constant force on a frictionless surface. What remains constant?",
            options: ["Velocity", "Acceleration", "Momentum", "Displacement"],
            answer: "Acceleration",
            explanation: "A constant net force gives constant acceleration by F = ma."
          }
        ]
      }
    }
  });

  await prisma.post.create({
    data: { userId: student.id, content: "Completed 45 mechanics problems and revised free-body diagrams.", studyHours: 4, mockScore: 78 }
  });

  console.log({ admin: admin.username, teacher: teacher.username, student: student.username, password: "password123" });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());

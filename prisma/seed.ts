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
      status: "ACTIVE",
      startsAt: new Date(),
      endsAt: addDays(new Date(), 2),
      durationMin: 60,
      questions: {
        create: [
          {
            prompt: "A block is pulled with constant force on a frictionless surface. What remains constant?",
            options: { kind: "MCQ", choices: ["Velocity", "Acceleration", "Momentum", "Displacement"] },
            answer: "Acceleration",
            explanation: "A constant net force gives constant acceleration by F = ma."
          },
          {
            prompt: "Find the mistake in this free-body statement: the normal force always equals mg, even on an inclined plane.",
            options: {
              kind: "FIND_MISTAKE",
              mistakeOptions: [
                "Normal force always acts vertically upward",
                "Normal force equals mg only in specific horizontal cases",
                "Friction always acts in the direction of motion",
                "Weight is zero on an inclined plane"
              ]
            },
            answer: "Normal force equals mg only in specific horizontal cases",
            explanation: "On an incline, normal force is usually mg cos theta when no other perpendicular forces act."
          },
          {
            prompt: "Arrange the steps to solve a Newton's second law pulley problem.",
            options: {
              kind: "ORDER",
              steps: [
                "Choose a positive direction for each body",
                "Draw free-body diagrams",
                "Write F = ma for each body",
                "Solve the simultaneous equations"
              ]
            },
            answer: "Choose a positive direction for each body|Draw free-body diagrams|Write F = ma for each body|Solve the simultaneous equations",
            explanation: "A consistent direction choice comes before equations, and equations come before solving."
          },
          {
            prompt: "Tap the region where friction acts on the block in contact with the rough surface.",
            options: {
              kind: "HOTSPOT",
              diagram: {
                label: "Block on rough horizontal surface",
                hotspots: [
                  { id: "top", label: "Top face", x: 50, y: 28 },
                  { id: "contact", label: "Contact surface", x: 50, y: 67 },
                  { id: "left", label: "Left air side", x: 20, y: 50 }
                ]
              }
            },
            answer: "contact",
            explanation: "Friction is a contact force, so it acts along the contact surface."
          },
          {
            type: "NUMERIC",
            prompt: "Dynamic acceleration question",
            options: {
              kind: "DYNAMIC_NUMERIC",
              dynamicNumerical: {
                template: "A {mass} kg body experiences a net force equal to twice its mass in newtons. What is its acceleration in m/s^2?",
                variable: "mass",
                min: 2,
                max: 15,
                multiplier: 0,
                offset: 2,
                tolerance: 0
              }
            },
            answer: "2",
            explanation: "If F = 2m, then a = F/m = 2 m/s^2."
          },
          {
            prompt: "A student says the heavier body in free fall must have a larger acceleration because it has more weight. What is the best response?",
            options: {
              kind: "SCENARIO",
              scenario: "Two students are debating free fall while ignoring air resistance.",
              choices: [
                "The heavier body has more force and proportionally more mass, so acceleration is the same",
                "The heavier body always falls faster",
                "The lighter body has no gravitational force",
                "Acceleration depends only on shape"
              ]
            },
            answer: "The heavier body has more force and proportionally more mass, so acceleration is the same",
            explanation: "Near Earth without air resistance, all bodies have acceleration g regardless of mass."
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

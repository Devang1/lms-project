import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const formData = await req.formData();

    const content = formData.get("content")?.toString().trim();
    const imageUrl =
      formData.get("imageUrl")?.toString().trim() || null;

    const studyHoursValue = formData.get("studyHours")?.toString();
    const mockScoreValue = formData.get("mockScore")?.toString();

    const studyHours =
      studyHoursValue && studyHoursValue.length > 0
        ? Number(studyHoursValue)
        : null;

    const mockScore =
      mockScoreValue && mockScoreValue.length > 0
        ? Number(mockScoreValue)
        : null;

    if (!content || content.length < 3) {
      return NextResponse.json(
        {
          error: "Post content must be at least 3 characters.",
        },
        { status: 400 }
      );
    }

    await prisma.post.create({
      data: {
        userId: session.user.id,
        content,
        imageUrl,
        studyHours,
        mockScore,
      },
    });

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error("Feed create API error:", error);

    return NextResponse.json(
      {
        error: "Internal server error.",
      },
      {
        status: 500,
      }
    );
  }
}
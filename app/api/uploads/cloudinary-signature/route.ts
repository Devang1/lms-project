import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createCloudinarySignature } from "@/lib/storage/cloudinary";

export async function POST() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const timestamp = Math.round(Date.now() / 1000);
  const folder = `star-study-point/${session.user.id}`;
  const signature = createCloudinarySignature({ timestamp, folder });

  return NextResponse.json({
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    timestamp,
    folder,
    signature
  });
}

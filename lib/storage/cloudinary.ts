import crypto from "crypto";

export function createCloudinarySignature(params: Record<string, string | number>) {
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!secret) throw new Error("CLOUDINARY_API_SECRET is not configured.");

  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");

  return crypto.createHash("sha1").update(`${payload}${secret}`).digest("hex");
}

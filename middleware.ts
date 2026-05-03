import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const roleRoutes = {
  "/admin": "ADMIN",
  "/teacher": "TEACHER",
  "/student": "STUDENT",
} as const;

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth")
  ) {
    return NextResponse.next();
  }

  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
  });

  console.log("TOKEN:", token);
  console.log("PATH:", pathname);

  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const userRole = (token.role as string) ?? "STUDENT";

  for (const [prefix, role] of Object.entries(roleRoutes)) {
    if (
      pathname.startsWith(prefix) &&
      userRole !== role &&
      userRole !== "ADMIN"
    ) {
      return NextResponse.redirect(new URL("/feed", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/feed",
    "/feed/:path*",
    "/admin/:path*",
    "/teacher/:path*",
    "/student/:path*",
    "/ai-notes/:path*",
    "/ai-tools/:path*",
    "/daily-question/:path*",
    "/doubts/:path*",
    "/weekly-tests/:path*",
    "/leaderboards/:path*",
    "/profile/:path*",
    "/notifications/:path*",
    "/courses/:path*",
  ],
};
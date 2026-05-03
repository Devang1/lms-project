import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const roleRoutes = {
  "/admin": "ADMIN",
  "/teacher": "TEACHER",
  "/student": "STUDENT",
} as const;

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Lightweight session/token check (far smaller than importing full auth config)
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
  });

  // Original login protection
  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Preserve original role-based access logic
  for (const [prefix, role] of Object.entries(roleRoutes)) {
    if (
      pathname.startsWith(prefix) &&
      token.role !== role &&
      token.role !== "ADMIN"
    ) {
      return NextResponse.redirect(new URL("/feed", req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/teacher/:path*",
    "/student/:path*",
    "/ai-notes/:path*",
    "/ai-tools/:path*",
    "/daily-question/:path*",
    "/doubts/:path*",
    "/feed/:path*",
    "/weekly-tests/:path*",
    "/leaderboards/:path*",
    "/profile/:path*",
    "/notifications/:path*",
    "/courses/:path*",
  ],
};
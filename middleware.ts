import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const roleRoutes = {
  "/admin": "ADMIN",
  "/teacher": "TEACHER",
  "/student": "STUDENT",
} as const;

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Allow public auth pages
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth")
  ) {
    return NextResponse.next();
  }

  // Stable JWT token validation
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
  });

  // Redirect unauthenticated users
  if (!token) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Safe role fallback
  const userRole = (token.role as string) ?? "STUDENT";

  // Role-based route protection
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
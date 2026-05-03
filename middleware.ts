import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

const roleRoutes = [
  { prefix: "/admin", role: "ADMIN" },
  { prefix: "/teacher", role: "TEACHER" },
  { prefix: "/student", role: "STUDENT" }
] as const;

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const protectedRoute = roleRoutes.find((route) => pathname.startsWith(route.prefix));

  if (!req.auth?.user) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (protectedRoute && req.auth.user.role !== protectedRoute.role && req.auth.user.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/feed", req.url));
  }

  return NextResponse.next();
});

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
    "/courses/:path*"
  ]
};

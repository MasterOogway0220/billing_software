import NextAuth from "next-auth";
import { authConfig } from "./lib/auth.config";
import { NextResponse } from "next/server";

// Lightweight NextAuth instance for Edge Runtime — only authConfig, no bcrypt/Prisma
const { auth } = NextAuth(authConfig);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const middleware: any = auth(function (req: any) {
  const { nextUrl } = req;
  const session = req.auth;
  const isAuthenticated = !!session;

  const isAuthPage =
    nextUrl.pathname.startsWith("/login") ||
    nextUrl.pathname.startsWith("/register") ||
    nextUrl.pathname.startsWith("/forgot-password");

  const isPublic =
    isAuthPage ||
    nextUrl.pathname.startsWith("/api") ||
    nextUrl.pathname.startsWith("/invoice/") ||
    nextUrl.pathname.startsWith("/_next") ||
    nextUrl.pathname === "/";

  if (!isPublic && !isAuthenticated) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  if (isAuthPage && isAuthenticated) {
    const businessId = session?.user?.businessId;
    if (!businessId) {
      return NextResponse.redirect(new URL("/onboarding", nextUrl));
    }
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  if (
    isAuthenticated &&
    !session?.user?.businessId &&
    !nextUrl.pathname.startsWith("/onboarding") &&
    !nextUrl.pathname.startsWith("/api")
  ) {
    return NextResponse.redirect(new URL("/onboarding", nextUrl));
  }

  return NextResponse.next();
});

export default middleware;

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

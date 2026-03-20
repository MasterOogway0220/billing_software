import { NextRequest, NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  const { nextUrl } = req;

  const token = await getToken({
    req,
    secret: process.env.NEXTAUTH_SECRET,
  });

  const isAuthenticated = !!token;

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
    const businessId = token?.businessId;
    if (!businessId) {
      return NextResponse.redirect(new URL("/onboarding", nextUrl));
    }
    return NextResponse.redirect(new URL("/dashboard", nextUrl));
  }

  if (
    isAuthenticated &&
    !token?.businessId &&
    !nextUrl.pathname.startsWith("/onboarding") &&
    !nextUrl.pathname.startsWith("/api")
  ) {
    return NextResponse.redirect(new URL("/onboarding", nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

import type { NextAuthConfig } from "next-auth";

// Edge-compatible config — NO bcrypt, NO Prisma.
// Used by middleware (Edge Runtime). auth.ts extends this with full providers.
export const authConfig: NextAuthConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    newUser: "/onboarding",
  },
  providers: [],
  callbacks: {
    // Pass-through jwt — businessId was embedded at login time by auth.ts
    jwt({ token }) {
      return token;
    },
    session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.businessId = token.businessId as string | undefined;
        session.user.role = token.role as string | undefined;
      }
      return session;
    },
  },
};

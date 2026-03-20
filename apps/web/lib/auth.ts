import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { z } from "zod";
import type { Session } from "next-auth";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// Assign to variable first to avoid TS "cannot be named" export inference issue
const nextAuth = NextAuth({
  adapter: PrismaAdapter(prisma),
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    newUser: "/onboarding",
  },
  providers: [
    ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
      ? [Google({ clientId: process.env.GOOGLE_CLIENT_ID, clientSecret: process.env.GOOGLE_CLIENT_SECRET })]
      : []),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email },
        });

        if (!user || !user.passwordHash) return null;
        if (!user.emailVerified) return null;

        const isValid = await bcrypt.compare(parsed.data.password, user.passwordHash);
        if (!isValid) return null;

        return { id: user.id, email: user.email, name: user.name, image: user.image };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        const membership = await prisma.businessMember.findFirst({
          where: { userId: user.id!, isActive: true },
          orderBy: { joinedAt: "desc" },
        });
        if (membership) {
          token.businessId = membership.businessId;
          token.role = membership.role;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.businessId = token.businessId as string | undefined;
        session.user.role = token.role as string | undefined;
      }
      return session;
    },
  },
});

// Export with explicit types to avoid TS portability error
export const handlers: { GET: unknown; POST: unknown } = nextAuth.handlers;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const signIn: (...args: any[]) => Promise<void> = nextAuth.signIn as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const signOut: (...args: any[]) => Promise<void> = nextAuth.signOut as any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const auth: any = nextAuth.auth;

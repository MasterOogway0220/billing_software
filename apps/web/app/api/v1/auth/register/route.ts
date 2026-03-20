import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "../../../../../lib/prisma";
import { registerSchema } from "../../../../../schemas/user.schema";
import { seedBusiness } from "../../../../../lib/seed";
import { ok, err } from "../../../../../lib/api";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        err("VALIDATION_ERROR", "Invalid input", parsed.error.flatten()),
        { status: 400 }
      );
    }

    const { name, email, password, businessName } = parsed.data;

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        err("EMAIL_EXISTS", "An account with this email already exists"),
        { status: 409 }
      );
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email,
          passwordHash,
          emailVerified: new Date(), // skip email verification for now
        },
      });

      const business = await tx.business.create({
        data: { name: businessName },
      });

      await tx.businessMember.create({
        data: {
          userId: user.id,
          businessId: business.id,
          role: "OWNER",
          joinedAt: new Date(),
        },
      });

      return { userId: user.id, businessId: business.id };
    });

    // Seed default accounts and configs
    await seedBusiness(result.businessId);

    return NextResponse.json(
      ok({ userId: result.userId, businessId: result.businessId }),
      { status: 201 }
    );
  } catch (error) {
    console.error("[register]", error);
    return NextResponse.json(
      err("INTERNAL_ERROR", "Something went wrong"),
      { status: 500 }
    );
  }
}

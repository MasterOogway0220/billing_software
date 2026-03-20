import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { businessProfileSchema } from "../../../../schemas/business.schema";
import { ok, err } from "../../../../lib/api";

export async function GET() {
  const session = await auth();
  if (!session?.user?.businessId) {
    return NextResponse.json(err("UNAUTHORIZED", "Unauthorized"), { status: 401 });
  }

  const business = await prisma.business.findUnique({
    where: { id: session.user.businessId },
  });

  if (!business) {
    return NextResponse.json(err("NOT_FOUND", "Business not found"), { status: 404 });
  }

  return NextResponse.json(ok(business));
}

export async function PUT(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.businessId) {
    return NextResponse.json(err("UNAUTHORIZED", "Unauthorized"), { status: 401 });
  }

  const body = await req.json();
  const parsed = businessProfileSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      err("VALIDATION_ERROR", "Invalid input", parsed.error.flatten()),
      { status: 400 }
    );
  }

  const business = await prisma.business.update({
    where: { id: session.user.businessId },
    data: parsed.data,
  });

  return NextResponse.json(ok(business));
}

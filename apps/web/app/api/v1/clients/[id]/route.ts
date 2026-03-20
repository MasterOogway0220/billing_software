import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";
import { partySchema } from "../../../../../schemas/client.schema";
import { ok, err } from "../../../../../lib/api";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.businessId) {
    return NextResponse.json(err("UNAUTHORIZED", "Unauthorized"), { status: 401 });
  }

  const { id } = await params;
  const party = await prisma.party.findFirst({
    where: { id, businessId: session.user.businessId },
    include: {
      _count: { select: { invoicesAsClient: true, invoicesAsVendor: true } },
    },
  });

  if (!party) {
    return NextResponse.json(err("NOT_FOUND", "Client not found"), { status: 404 });
  }

  return NextResponse.json(ok(party));
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.businessId) {
    return NextResponse.json(err("UNAUTHORIZED", "Unauthorized"), { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const parsed = partySchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      err("VALIDATION_ERROR", "Invalid input", parsed.error.flatten()),
      { status: 400 }
    );
  }

  const existing = await prisma.party.findFirst({
    where: { id, businessId: session.user.businessId },
  });

  if (!existing) {
    return NextResponse.json(err("NOT_FOUND", "Client not found"), { status: 404 });
  }

  const party = await prisma.party.update({
    where: { id },
    data: parsed.data,
  });

  return NextResponse.json(ok(party));
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.businessId) {
    return NextResponse.json(err("UNAUTHORIZED", "Unauthorized"), { status: 401 });
  }

  const { id } = await params;
  await prisma.party.update({
    where: { id, businessId: session.user.businessId },
    data: { isActive: false },
  });

  return NextResponse.json(ok({ deleted: true }));
}

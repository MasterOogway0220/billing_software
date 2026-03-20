import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";
import { ok, err } from "../../../../../lib/api";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.businessId) {
    return NextResponse.json(err("UNAUTHORIZED", "Unauthorized"), { status: 401 });
  }

  const { id } = await params;
  const invoice = await prisma.invoice.findFirst({
    where: { id, businessId: session.user.businessId },
    include: {
      lineItems: { orderBy: { sortOrder: "asc" } },
      client: true,
      vendor: true,
      payments: { orderBy: { paymentDate: "desc" } },
    },
  });

  if (!invoice) {
    return NextResponse.json(err("NOT_FOUND", "Invoice not found"), { status: 404 });
  }

  return NextResponse.json(ok(invoice));
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.businessId) {
    return NextResponse.json(err("UNAUTHORIZED", "Unauthorized"), { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();

  const existing = await prisma.invoice.findFirst({
    where: { id, businessId: session.user.businessId },
  });

  if (!existing) {
    return NextResponse.json(err("NOT_FOUND", "Invoice not found"), { status: 404 });
  }

  if (existing.status === "VOID" || existing.status === "CANCELLED") {
    return NextResponse.json(
      err("INVALID_STATUS", "Cannot edit a voided or cancelled invoice"),
      { status: 400 }
    );
  }

  // Partial update — only update allowed fields
  const allowed = ["notes", "terms", "dueDate", "templateId", "status"];
  const updateData = Object.fromEntries(
    Object.entries(body).filter(([k]) => allowed.includes(k))
  );

  const updated = await prisma.invoice.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(ok(updated));
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.businessId) {
    return NextResponse.json(err("UNAUTHORIZED", "Unauthorized"), { status: 401 });
  }

  const { id } = await params;
  const existing = await prisma.invoice.findFirst({
    where: { id, businessId: session.user.businessId },
  });

  if (!existing) {
    return NextResponse.json(err("NOT_FOUND", "Invoice not found"), { status: 404 });
  }

  if (existing.status !== "DRAFT") {
    return NextResponse.json(
      err("INVALID_STATUS", "Only draft invoices can be deleted"),
      { status: 400 }
    );
  }

  await prisma.invoice.delete({ where: { id } });
  return NextResponse.json(ok({ deleted: true }));
}

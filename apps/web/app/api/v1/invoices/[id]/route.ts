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
  const businessId = session.user.businessId;

  const existing = await prisma.invoice.findFirst({
    where: { id, businessId },
  });

  if (!existing) {
    return NextResponse.json(err("NOT_FOUND", "Invoice not found"), { status: 404 });
  }

  if (existing.status !== "DRAFT") {
    return NextResponse.json(
      err("INVALID_STATUS", "Only draft invoices can be fully edited"),
      { status: 400 }
    );
  }

  // Full edit via createInvoiceSchema
  const { createInvoiceSchema } = await import("../../../../../schemas/invoice.schema");
  const { calculateLineItem, calculateInvoiceTotals } = await import("../../../../../lib/gst");

  const parsed = createInvoiceSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      err("VALIDATION_ERROR", "Invalid input", parsed.error.flatten()),
      { status: 400 }
    );
  }

  const data = parsed.data;
  const invoiceDate = new Date(data.invoiceDate);

  const calculatedItems = data.lineItems.map((item) =>
    calculateLineItem({
      quantity: item.quantity,
      rate: item.rate,
      discountType: item.discountType,
      discountValue: item.discountValue,
      taxRate: item.taxRate,
      supplyType: data.supplyType,
    })
  );
  const totals = calculateInvoiceTotals(calculatedItems, data.applyRoundOff);

  const updated = await prisma.$transaction(async (tx) => {
    // Delete old line items
    await tx.invoiceLineItem.deleteMany({ where: { invoiceId: id } });

    return tx.invoice.update({
      where: { id },
      data: {
        clientId: data.clientId,
        vendorId: data.vendorId,
        invoiceDate,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        currency: data.currency,
        fxRate: data.fxRate,
        supplyType: data.supplyType,
        placeOfSupply: data.placeOfSupply,
        notes: data.notes,
        terms: data.terms,
        templateId: data.templateId,
        ...totals,
        amountDue: totals.grandTotal,
        lineItems: {
          create: data.lineItems.map((item, idx) => {
            const calc = calculatedItems[idx]!;
            return {
              sortOrder: item.sortOrder,
              itemName: item.itemName,
              description: item.description,
              hsnSacCode: item.hsnSacCode,
              unit: item.unit,
              quantity: item.quantity,
              rate: item.rate,
              discountType: item.discountType,
              discountValue: item.discountValue,
              taxRate: item.taxRate,
              cgstRate: calc.cgstRate,
              sgstRate: calc.sgstRate,
              igstRate: calc.igstRate,
              cessRate: 0,
              taxableAmount: calc.taxableAmount,
              cgstAmount: calc.cgstAmount,
              sgstAmount: calc.sgstAmount,
              igstAmount: calc.igstAmount,
              cessAmount: calc.cessAmount,
              lineTotal: calc.lineTotal,
            };
          }),
        },
      },
      include: { lineItems: true },
    });
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

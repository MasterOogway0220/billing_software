import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../../../lib/auth";
import { prisma } from "../../../../../../lib/prisma";
import { ok, err } from "../../../../../../lib/api";
import { generateInvoiceNumber } from "../../../../../../lib/invoice-number";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.businessId) {
    return NextResponse.json(err("UNAUTHORIZED", "Unauthorized"), { status: 401 });
  }

  const { id } = await params;

  const original = await prisma.invoice.findFirst({
    where: { id, businessId: session.user.businessId },
    include: {
      lineItems: { orderBy: { sortOrder: "asc" } },
    },
  });

  if (!original) {
    return NextResponse.json(err("NOT_FOUND", "Invoice not found"), { status: 404 });
  }

  const today = new Date();

  const newInvoiceNumber = await generateInvoiceNumber(
    session.user.businessId,
    original.documentType,
    today
  );

  const newInvoice = await prisma.invoice.create({
    data: {
      businessId: original.businessId,
      documentType: original.documentType,
      invoiceNumber: newInvoiceNumber,
      status: "DRAFT",
      clientId: original.clientId,
      vendorId: original.vendorId,
      invoiceDate: today,
      dueDate: original.dueDate ? new Date(today.getTime() + (original.dueDate.getTime() - original.invoiceDate.getTime())) : null,
      currency: original.currency,
      fxRate: original.fxRate,
      supplyType: original.supplyType,
      placeOfSupply: original.placeOfSupply,
      subtotal: original.subtotal,
      totalDiscount: original.totalDiscount,
      totalTaxable: original.totalTaxable,
      totalCGST: original.totalCGST,
      totalSGST: original.totalSGST,
      totalIGST: original.totalIGST,
      totalCess: original.totalCess,
      roundOff: original.roundOff,
      grandTotal: original.grandTotal,
      amountPaid: 0,
      amountDue: original.grandTotal,
      notes: original.notes,
      terms: original.terms,
      templateId: original.templateId,
      shippingAddress: original.shippingAddress ?? undefined,
      createdById: session.user.id,
      lineItems: {
        create: original.lineItems.map((item, idx) => ({
          sortOrder: idx,
          itemName: item.itemName,
          description: item.description,
          hsnSacCode: item.hsnSacCode,
          unit: item.unit,
          quantity: item.quantity,
          rate: item.rate,
          discountType: item.discountType,
          discountValue: item.discountValue,
          taxRate: item.taxRate,
          cgstRate: item.cgstRate,
          sgstRate: item.sgstRate,
          igstRate: item.igstRate,
          cessRate: item.cessRate,
          taxableAmount: item.taxableAmount,
          cgstAmount: item.cgstAmount,
          sgstAmount: item.sgstAmount,
          igstAmount: item.igstAmount,
          cessAmount: item.cessAmount,
          lineTotal: item.lineTotal,
        })),
      },
    },
  });

  return NextResponse.json(ok({ id: newInvoice.id }));
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { createInvoiceSchema } from "../../../../schemas/invoice.schema";
import { calculateLineItem, calculateInvoiceTotals } from "../../../../lib/gst";
import { generateInvoiceNumber } from "../../../../lib/invoice-number";
import { postLedgerEntries, getSystemAccountId } from "../../../../lib/ledger";
import { ok, err } from "../../../../lib/api";
import type { DocumentType } from "@repo/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.businessId) {
    return NextResponse.json(err("UNAUTHORIZED", "Unauthorized"), { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");
  const status = searchParams.get("status");
  const clientId = searchParams.get("clientId");
  const docType = searchParams.get("documentType");
  const search = searchParams.get("search");

  const where = {
    businessId: session.user.businessId,
    ...(status && { status: status as never }),
    ...(clientId && { clientId }),
    ...(docType && { documentType: docType as DocumentType }),
    ...(search && {
      OR: [
        { invoiceNumber: { contains: search, mode: "insensitive" as const } },
        { client: { displayName: { contains: search, mode: "insensitive" as const } } },
      ],
    }),
  };

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: {
        client: { select: { id: true, displayName: true, gstin: true } },
        _count: { select: { payments: true } },
      },
      orderBy: { invoiceDate: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.invoice.count({ where }),
  ]);

  return NextResponse.json(
    ok(invoices, { page, limit, total, totalPages: Math.ceil(total / limit) })
  );
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.businessId) {
    return NextResponse.json(err("UNAUTHORIZED", "Unauthorized"), { status: 401 });
  }

  const body = await req.json();
  const parsed = createInvoiceSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      err("VALIDATION_ERROR", "Invalid input", parsed.error.flatten()),
      { status: 400 }
    );
  }

  const data = parsed.data;
  const businessId = session.user.businessId;
  const invoiceDate = new Date(data.invoiceDate);

  // Generate invoice number if not provided
  let invoiceNumber = data.invoiceNumber?.trim();
  if (!invoiceNumber) {
    invoiceNumber = await generateInvoiceNumber(
      businessId,
      data.documentType as DocumentType,
      invoiceDate
    );
  } else {
    // Check for duplicate
    const exists = await prisma.invoice.findFirst({
      where: { businessId, documentType: data.documentType as DocumentType, invoiceNumber },
    });
    if (exists) {
      return NextResponse.json(
        err("DUPLICATE_NUMBER", `Invoice number ${invoiceNumber} already exists`),
        { status: 409 }
      );
    }
  }

  // Calculate line items
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

  const invoice = await prisma.$transaction(async (tx) => {
    const inv = await tx.invoice.create({
      data: {
        businessId,
        documentType: data.documentType as DocumentType,
        invoiceNumber,
        status: "DRAFT",
        clientId: data.clientId,
        vendorId: data.vendorId,
        invoiceDate,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        currency: data.currency,
        fxRate: data.fxRate,
        supplyType: data.supplyType,
        placeOfSupply: data.placeOfSupply,
        notes: data.notes,
        terms: data.terms,
        templateId: data.templateId,
        shippingAddress: data.shippingAddress,
        createdById: session.user.id,
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
      include: { lineItems: true, client: true },
    });

    // Post to ledger if it's a tax invoice
    if (data.documentType === "TAX_INVOICE" && data.clientId) {
      const arAccountId = await getSystemAccountId(businessId, "Accounts Receivable");
      const salesAccountId = await getSystemAccountId(businessId, "Sales Revenue");

      await postLedgerEntries({
        businessId,
        entryDate: invoiceDate,
        voucherType: "INVOICE",
        voucherId: inv.id,
        voucherNo: invoiceNumber,
        lines: [
          {
            accountId: arAccountId,
            debit: totals.grandTotal,
            credit: 0,
            partyId: data.clientId,
            invoiceId: inv.id,
            narration: `Invoice ${invoiceNumber}`,
          },
          {
            accountId: salesAccountId,
            debit: 0,
            credit: totals.totalTaxable,
            invoiceId: inv.id,
            narration: `Sales - ${invoiceNumber}`,
          },
          ...(totals.totalCGST > 0
            ? [
                {
                  accountId: await getSystemAccountId(businessId, "CGST Payable"),
                  debit: 0,
                  credit: totals.totalCGST,
                  invoiceId: inv.id,
                },
              ]
            : []),
          ...(totals.totalSGST > 0
            ? [
                {
                  accountId: await getSystemAccountId(businessId, "SGST Payable"),
                  debit: 0,
                  credit: totals.totalSGST,
                  invoiceId: inv.id,
                },
              ]
            : []),
          ...(totals.totalIGST > 0
            ? [
                {
                  accountId: await getSystemAccountId(businessId, "IGST Payable"),
                  debit: 0,
                  credit: totals.totalIGST,
                  invoiceId: inv.id,
                },
              ]
            : []),
        ],
      });
    }

    return inv;
  });

  return NextResponse.json(ok(invoice), { status: 201 });
}

import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { recordPaymentSchema } from "../../../../schemas/invoice.schema";
import { postLedgerEntries, getSystemAccountId } from "../../../../lib/ledger";
import { ok, err } from "../../../../lib/api";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.businessId) {
    return NextResponse.json(err("UNAUTHORIZED", "Unauthorized"), { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "20");

  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where: { businessId: session.user.businessId },
      include: {
        invoice: { select: { invoiceNumber: true, documentType: true } },
        party: { select: { displayName: true } },
      },
      orderBy: { paymentDate: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.payment.count({ where: { businessId: session.user.businessId } }),
  ]);

  return NextResponse.json(
    ok(payments, { page, limit, total, totalPages: Math.ceil(total / limit) })
  );
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.businessId) {
    return NextResponse.json(err("UNAUTHORIZED", "Unauthorized"), { status: 401 });
  }

  const body = await req.json();
  const parsed = recordPaymentSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      err("VALIDATION_ERROR", "Invalid input", parsed.error.flatten()),
      { status: 400 }
    );
  }

  const data = parsed.data;
  const businessId = session.user.businessId;

  const invoice = await prisma.invoice.findFirst({
    where: { id: data.invoiceId, businessId },
  });

  if (!invoice) {
    return NextResponse.json(err("NOT_FOUND", "Invoice not found"), { status: 404 });
  }

  if (invoice.status === "VOID" || invoice.status === "CANCELLED") {
    return NextResponse.json(
      err("INVALID_STATUS", "Cannot record payment for a voided invoice"),
      { status: 400 }
    );
  }

  const totalAmount = data.amount + data.tdsAmount;
  const currentAmountDue = Number(invoice.amountDue);

  if (totalAmount > currentAmountDue + 0.01) {
    return NextResponse.json(
      err("OVERPAYMENT", `Payment exceeds amount due (${currentAmountDue})`),
      { status: 400 }
    );
  }

  const paymentDate = new Date(data.paymentDate);
  const newAmountPaid = Number(invoice.amountPaid) + data.amount;
  const newAmountDue = Number(invoice.grandTotal) - newAmountPaid;
  const newStatus =
    newAmountDue <= 0.01
      ? "PAID"
      : newAmountPaid > 0
      ? "PARTIALLY_PAID"
      : invoice.status;

  const payment = await prisma.$transaction(async (tx) => {
    const pmt = await tx.payment.create({
      data: {
        businessId,
        invoiceId: data.invoiceId,
        partyId: invoice.clientId,
        paymentDate,
        amount: data.amount,
        mode: data.mode,
        referenceNo: data.referenceNo,
        chequeNo: data.chequeNo,
        chequeDate: data.chequeDate ? new Date(data.chequeDate) : undefined,
        notes: data.notes,
        tdsAmount: data.tdsAmount,
        tdsSection: data.tdsSection,
      },
    });

    await tx.invoice.update({
      where: { id: data.invoiceId },
      data: {
        amountPaid: newAmountPaid,
        amountDue: newAmountDue,
        status: newStatus as never,
        ...(newStatus === "PAID" ? { paidAt: new Date() } : {}),
      },
    });

    // Post ledger: Dr Bank, Cr Accounts Receivable
    const bankAccountId = await getSystemAccountId(businessId, "Bank");
    const arAccountId = await getSystemAccountId(businessId, "Accounts Receivable");

    await postLedgerEntries({
      businessId,
      entryDate: paymentDate,
      voucherType: "PAYMENT",
      voucherId: pmt.id,
      voucherNo: data.referenceNo,
      lines: [
        {
          accountId: bankAccountId,
          debit: data.amount,
          credit: 0,
          partyId: invoice.clientId ?? undefined,
          paymentId: pmt.id,
          invoiceId: data.invoiceId,
          narration: `Payment received - ${invoice.invoiceNumber}`,
        },
        {
          accountId: arAccountId,
          debit: 0,
          credit: data.amount,
          partyId: invoice.clientId ?? undefined,
          paymentId: pmt.id,
          invoiceId: data.invoiceId,
          narration: `Payment received - ${invoice.invoiceNumber}`,
        },
        ...(data.tdsAmount > 0
          ? [
              {
                accountId: await getSystemAccountId(businessId, "TDS Receivable"),
                debit: data.tdsAmount,
                credit: 0,
                paymentId: pmt.id,
                narration: `TDS on ${invoice.invoiceNumber}`,
              },
              {
                accountId: arAccountId,
                debit: 0,
                credit: data.tdsAmount,
                paymentId: pmt.id,
              },
            ]
          : []),
      ],
    });

    return pmt;
  });

  return NextResponse.json(ok(payment), { status: 201 });
}

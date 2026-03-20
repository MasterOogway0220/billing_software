import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";
import { ok, err } from "../../../../../lib/api";

type Params = { params: Promise<{ id: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.businessId) {
    return NextResponse.json(err("UNAUTHORIZED", "Unauthorized"), { status: 401 });
  }

  const { id } = await params;
  const businessId = session.user.businessId;

  const payment = await prisma.payment.findFirst({
    where: { id, businessId },
  });

  if (!payment) {
    return NextResponse.json(err("NOT_FOUND", "Payment not found"), { status: 404 });
  }

  if (!payment.invoiceId) {
    return NextResponse.json(
      err("INVALID_OPERATION", "Cannot reverse a payment not linked to an invoice"),
      { status: 400 }
    );
  }

  await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({
      where: { id: payment.invoiceId!, businessId },
    });

    if (!invoice) {
      throw new Error("Invoice not found");
    }

    const newAmountPaid = Math.max(0, Number(invoice.amountPaid) - Number(payment.amount));
    const newAmountDue = Number(invoice.grandTotal) - newAmountPaid;

    const newStatus =
      newAmountPaid <= 0
        ? "SENT"
        : newAmountPaid < Number(invoice.grandTotal)
        ? "PARTIALLY_PAID"
        : invoice.status;

    await tx.invoice.update({
      where: { id: payment.invoiceId! },
      data: {
        amountPaid: newAmountPaid,
        amountDue: newAmountDue,
        status: newStatus as never,
        paidAt: newAmountPaid <= 0 ? null : invoice.paidAt,
      },
    });

    // Find existing ledger entries for this payment and create reversals
    const existingEntries = await tx.ledgerEntry.findMany({
      where: { businessId, paymentId: id },
    });

    if (existingEntries.length > 0) {
      await tx.ledgerEntry.createMany({
        data: existingEntries.map((e) => ({
          businessId: e.businessId,
          accountId: e.accountId,
          entryDate: new Date(),
          voucherType: e.voucherType,
          voucherId: e.voucherId ?? undefined,
          voucherNo: e.voucherNo ? `REV-${e.voucherNo}` : undefined,
          narration: `Reversal: ${e.narration ?? "payment"}`,
          debit: Number(e.credit),
          credit: Number(e.debit),
          partyId: e.partyId ?? undefined,
          invoiceId: e.invoiceId ?? undefined,
          paymentId: e.paymentId ?? undefined,
        })),
      });
    }

    await tx.payment.delete({ where: { id } });
  });

  return NextResponse.json(ok({ deleted: true }));
}

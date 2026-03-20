import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../../../lib/auth";
import { prisma } from "../../../../../../lib/prisma";
import { ok, err } from "../../../../../../lib/api";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.businessId) {
    return NextResponse.json(err("UNAUTHORIZED", "Unauthorized"), { status: 401 });
  }

  const { id } = await params;

  const invoice = await prisma.invoice.findFirst({
    where: { id, businessId: session.user.businessId },
  });

  if (!invoice) {
    return NextResponse.json(err("NOT_FOUND", "Invoice not found"), { status: 404 });
  }

  const nonVoidableStatuses = ["DRAFT", "PAID", "VOID", "CANCELLED"];
  if (nonVoidableStatuses.includes(invoice.status)) {
    return NextResponse.json(
      err("INVALID_STATUS", "Cannot void invoice in current status"),
      { status: 400 }
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    // Update invoice status to VOID
    const voided = await tx.invoice.update({
      where: { id },
      data: { status: "VOID", voidedAt: new Date() },
    });

    // Find existing ledger entries for this invoice
    const existingEntries = await tx.ledgerEntry.findMany({
      where: { invoiceId: id },
    });

    // Create reversing entries (swap debit/credit)
    if (existingEntries.length > 0) {
      await tx.ledgerEntry.createMany({
        data: existingEntries.map((entry) => ({
          businessId: entry.businessId,
          accountId: entry.accountId,
          entryDate: new Date(),
          voucherType: entry.voucherType,
          voucherId: id,
          voucherNo: `VOID-${invoice.invoiceNumber}`,
          narration: `Reversing entry — Invoice ${invoice.invoiceNumber} voided`,
          debit: entry.credit,
          credit: entry.debit,
          partyId: entry.partyId,
          invoiceId: id,
          paymentId: null,
          journalId: null,
        })),
      });
    }

    // Create audit log
    await tx.auditLog.create({
      data: {
        businessId: session.user.businessId!,
        userId: session.user.id,
        entityType: "Invoice",
        entityId: id,
        invoiceId: id,
        action: "VOID",
        diff: { status: { from: invoice.status, to: "VOID" } },
      },
    });

    return voided;
  });

  return NextResponse.json(ok({ id: result.id, status: result.status }));
}

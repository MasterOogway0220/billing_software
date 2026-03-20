import { prisma } from "./prisma";
import type { VoucherType } from "@repo/db";

interface LedgerPostingLine {
  accountId: string;
  debit: number;
  credit: number;
  narration?: string;
  partyId?: string;
  invoiceId?: string;
  paymentId?: string;
  journalId?: string;
}

interface LedgerPosting {
  businessId: string;
  entryDate: Date;
  voucherType: VoucherType;
  voucherId: string;
  voucherNo?: string;
  lines: LedgerPostingLine[];
}

export async function postLedgerEntries(posting: LedgerPosting) {
  const totalDebit = posting.lines.reduce((s, l) => s + l.debit, 0);
  const totalCredit = posting.lines.reduce((s, l) => s + l.credit, 0);

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    throw new Error(
      `Ledger imbalanced: debit=${totalDebit}, credit=${totalCredit}`
    );
  }

  await prisma.ledgerEntry.createMany({
    data: posting.lines.map((line) => ({
      businessId: posting.businessId,
      accountId: line.accountId,
      entryDate: posting.entryDate,
      voucherType: posting.voucherType,
      voucherId: posting.voucherId,
      voucherNo: posting.voucherNo,
      narration: line.narration,
      debit: line.debit,
      credit: line.credit,
      partyId: line.partyId,
      invoiceId: line.invoiceId,
      paymentId: line.paymentId,
      journalId: line.journalId,
    })),
  });
}

export async function reverseAndRepost(
  businessId: string,
  originalVoucherId: string,
  newPosting: LedgerPosting
) {
  // Create reversing entries for the original
  const original = await prisma.ledgerEntry.findMany({
    where: { businessId, voucherId: originalVoucherId },
  });

  if (original.length > 0) {
    await prisma.ledgerEntry.createMany({
      data: original.map((e) => ({
        businessId: e.businessId,
        accountId: e.accountId,
        entryDate: newPosting.entryDate,
        voucherType: e.voucherType,
        voucherId: e.voucherId ?? undefined,
        voucherNo: e.voucherNo ? `REV-${e.voucherNo}` : undefined,
        narration: `Reversal of ${e.narration ?? e.voucherNo}`,
        debit: Number(e.credit),   // swap
        credit: Number(e.debit),   // swap
        partyId: e.partyId ?? undefined,
        invoiceId: e.invoiceId ?? undefined,
        paymentId: e.paymentId ?? undefined,
        journalId: e.journalId ?? undefined,
      })),
    });
  }

  await postLedgerEntries(newPosting);
}

export async function getSystemAccountId(
  businessId: string,
  accountName: string
): Promise<string> {
  const account = await prisma.ledgerAccount.findFirst({
    where: { businessId, name: accountName, isSystem: true },
  });
  if (!account) throw new Error(`System account "${accountName}" not found`);
  return account.id;
}

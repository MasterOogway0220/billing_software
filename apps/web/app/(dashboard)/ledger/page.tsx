import type { Metadata } from "next";
import { auth } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";
import { LedgerPageClient } from "./LedgerPageClient";
import { AccountGroup } from "@repo/db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Ledger" };

const GROUP_ORDER: AccountGroup[] = [
  AccountGroup.ASSETS,
  AccountGroup.LIABILITIES,
  AccountGroup.EQUITY,
  AccountGroup.INCOME,
  AccountGroup.EXPENSES,
];

export default async function LedgerPage() {
  const session = await auth();
  const businessId = session!.user.businessId!;

  const accounts = await prisma.ledgerAccount.findMany({
    where: { businessId, isActive: true },
    include: { _count: { select: { entries: true } } },
    orderBy: [{ group: "asc" }, { name: "asc" }],
  });

  // Compute balances for all accounts
  const balances = await prisma.ledgerEntry.groupBy({
    by: ["accountId"],
    where: { businessId },
    _sum: { debit: true, credit: true },
  });

  const balanceMap = new Map(
    balances.map((b) => [
      b.accountId,
      {
        debit: Number(b._sum.debit ?? 0),
        credit: Number(b._sum.credit ?? 0),
      },
    ])
  );

  const accountsWithBalance = accounts.map((account) => {
    const sums = balanceMap.get(account.id) ?? { debit: 0, credit: 0 };
    const openingDebit =
      account.openingBalType === "DEBIT" ? Number(account.openingBalance) : 0;
    const openingCredit =
      account.openingBalType === "CREDIT" ? Number(account.openingBalance) : 0;
    const balance = openingDebit + sums.debit - openingCredit - sums.credit;
    return {
      id: account.id,
      name: account.name,
      group: account.group,
      code: account.code,
      subGroup: account.subGroup,
      isSystem: account.isSystem,
      isActive: account.isActive,
      entryCount: account._count.entries,
      balance,
    };
  });

  // Group by account type
  const grouped = GROUP_ORDER.reduce<Record<string, typeof accountsWithBalance>>(
    (acc, group) => {
      acc[group] = accountsWithBalance.filter((a) => a.group === group);
      return acc;
    },
    {}
  );

  return <LedgerPageClient grouped={grouped} groupOrder={GROUP_ORDER} />;
}

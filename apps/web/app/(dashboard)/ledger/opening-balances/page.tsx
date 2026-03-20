import { auth } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import type { Metadata } from "next";
import { OpeningBalancesClient } from "./OpeningBalancesClient";
import { AccountGroup } from "@repo/db";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Opening Balances" };

const GROUP_ORDER: AccountGroup[] = [
  AccountGroup.ASSETS,
  AccountGroup.LIABILITIES,
  AccountGroup.EQUITY,
  AccountGroup.INCOME,
  AccountGroup.EXPENSES,
];

export default async function OpeningBalancesPage() {
  const session = await auth();
  const businessId = session!.user.businessId!;

  const accounts = await prisma.ledgerAccount.findMany({
    where: { businessId, isActive: true },
    orderBy: [{ group: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      group: true,
      isSystem: true,
      openingBalance: true,
      openingBalType: true,
      openingBalDate: true,
    },
  });

  const grouped = GROUP_ORDER.reduce<
    Record<string, typeof accounts>
  >((acc, g) => {
    acc[g] = accounts.filter((a) => a.group === g);
    return acc;
  }, {});

  return (
    <OpeningBalancesClient grouped={grouped} groupOrder={GROUP_ORDER} />
  );
}

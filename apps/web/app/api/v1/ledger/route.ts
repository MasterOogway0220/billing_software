import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { ok, err } from "../../../../lib/api";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.businessId) {
    return NextResponse.json(err("UNAUTHORIZED", "Unauthorized"), { status: 401 });
  }

  const businessId = session.user.businessId;
  const { searchParams } = new URL(req.url);

  const accountId = searchParams.get("accountId") ?? undefined;
  const dateFrom = searchParams.get("dateFrom") ?? undefined;
  const dateTo = searchParams.get("dateTo") ?? undefined;
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "50");

  const where = {
    businessId,
    ...(accountId ? { accountId } : {}),
    ...(dateFrom || dateTo
      ? {
          entryDate: {
            ...(dateFrom ? { gte: new Date(dateFrom) } : {}),
            ...(dateTo ? { lte: new Date(dateTo) } : {}),
          },
        }
      : {}),
  };

  const [entries, total] = await Promise.all([
    prisma.ledgerEntry.findMany({
      where,
      include: {
        account: { select: { name: true, group: true } },
      },
      orderBy: [{ entryDate: "asc" }, { createdAt: "asc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.ledgerEntry.count({ where }),
  ]);

  // Compute running balance across the returned page
  // If accountId is specified we maintain a single running balance;
  // otherwise running balance is per-account and we track each separately.
  let runningBalance = 0;

  // If filtering by a single account, seed with opening balance first
  if (accountId) {
    const account = await prisma.ledgerAccount.findFirst({
      where: { id: accountId, businessId },
    });
    if (account) {
      const openingDebit =
        account.openingBalType === "DEBIT" ? Number(account.openingBalance) : 0;
      const openingCredit =
        account.openingBalType === "CREDIT" ? Number(account.openingBalance) : 0;

      // Sum all entries before the current page
      if (page > 1) {
        const prevSums = await prisma.ledgerEntry.aggregate({
          where: {
            ...where,
          },
          _sum: { debit: true, credit: true },
        });
        // We only want entries before current page — compute from all then subtract current page
        // Simpler: compute the sum of the first (skip) entries
        const prevEntries = await prisma.ledgerEntry.findMany({
          where,
          orderBy: [{ entryDate: "asc" }, { createdAt: "asc" }],
          take: (page - 1) * limit,
          select: { debit: true, credit: true },
        });
        const prevDebit = prevEntries.reduce((s, e) => s + Number(e.debit), 0);
        const prevCredit = prevEntries.reduce((s, e) => s + Number(e.credit), 0);
        runningBalance = openingDebit - openingCredit + prevDebit - prevCredit;
      } else {
        runningBalance = openingDebit - openingCredit;
      }
    }
  }

  const entriesWithBalance = entries.map((entry) => {
    runningBalance += Number(entry.debit) - Number(entry.credit);
    return { ...entry, runningBalance };
  });

  return NextResponse.json(
    ok(entriesWithBalance, { page, limit, total, totalPages: Math.ceil(total / limit) })
  );
}

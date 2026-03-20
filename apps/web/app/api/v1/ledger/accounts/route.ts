import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";
import { ok, err } from "../../../../../lib/api";
import { AccountGroup } from "@repo/db";

const createAccountSchema = z.object({
  name: z.string().min(1, "Name is required"),
  group: z.nativeEnum(AccountGroup),
  code: z.string().optional(),
  subGroup: z.string().optional(),
});

export async function GET(_req: NextRequest) {
  const session = await auth();
  if (!session?.user?.businessId) {
    return NextResponse.json(err("UNAUTHORIZED", "Unauthorized"), { status: 401 });
  }

  const businessId = session.user.businessId;

  const accounts = await prisma.ledgerAccount.findMany({
    where: { businessId },
    include: { _count: { select: { entries: true } } },
    orderBy: [{ group: "asc" }, { name: "asc" }],
  });

  // Compute running balance per account from ledger entries
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
    const balance =
      openingDebit + sums.debit - openingCredit - sums.credit;
    return { ...account, balance };
  });

  return NextResponse.json(ok(accountsWithBalance));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.businessId) {
    return NextResponse.json(err("UNAUTHORIZED", "Unauthorized"), { status: 401 });
  }

  const body = await req.json();
  const parsed = createAccountSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      err("VALIDATION_ERROR", "Invalid input", parsed.error.flatten()),
      { status: 400 }
    );
  }

  const { name, group, code, subGroup } = parsed.data;
  const businessId = session.user.businessId;

  const existing = await prisma.ledgerAccount.findUnique({
    where: { businessId_name: { businessId, name } },
  });

  if (existing) {
    return NextResponse.json(
      err("CONFLICT", "An account with this name already exists"),
      { status: 409 }
    );
  }

  const account = await prisma.ledgerAccount.create({
    data: {
      businessId,
      name,
      group,
      code: code ?? null,
      subGroup: subGroup ?? null,
      isSystem: false,
      isActive: true,
    },
  });

  return NextResponse.json(ok(account), { status: 201 });
}

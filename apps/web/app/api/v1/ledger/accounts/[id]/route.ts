import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "../../../../../../lib/auth";
import { prisma } from "../../../../../../lib/prisma";
import { ok, err } from "../../../../../../lib/api";

type Params = { params: Promise<{ id: string }> };

const updateAccountSchema = z.object({
  name: z.string().min(1, "Name is required").optional(),
  code: z.string().optional().nullable(),
  subGroup: z.string().optional().nullable(),
  openingBalance: z.number().min(0).optional(),
  openingBalType: z.enum(["DEBIT", "CREDIT"]).optional(),
  openingBalDate: z.string().optional().nullable(),
});

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.businessId) {
    return NextResponse.json(err("UNAUTHORIZED", "Unauthorized"), { status: 401 });
  }

  const { id } = await params;
  const businessId = session.user.businessId;

  const account = await prisma.ledgerAccount.findFirst({
    where: { id, businessId },
    include: { _count: { select: { entries: true } } },
  });

  if (!account) {
    return NextResponse.json(err("NOT_FOUND", "Account not found"), { status: 404 });
  }

  const entries = await prisma.ledgerEntry.findMany({
    where: { accountId: id, businessId },
    orderBy: [{ entryDate: "desc" }, { createdAt: "desc" }],
    take: 20,
  });

  // Compute overall balance
  const sums = await prisma.ledgerEntry.aggregate({
    where: { accountId: id, businessId },
    _sum: { debit: true, credit: true },
  });

  const openingDebit =
    account.openingBalType === "DEBIT" ? Number(account.openingBalance) : 0;
  const openingCredit =
    account.openingBalType === "CREDIT" ? Number(account.openingBalance) : 0;
  const balance =
    openingDebit +
    Number(sums._sum.debit ?? 0) -
    openingCredit -
    Number(sums._sum.credit ?? 0);

  return NextResponse.json(ok({ ...account, balance, recentEntries: entries }));
}

export async function PUT(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.businessId) {
    return NextResponse.json(err("UNAUTHORIZED", "Unauthorized"), { status: 401 });
  }

  const { id } = await params;
  const businessId = session.user.businessId;

  const account = await prisma.ledgerAccount.findFirst({
    where: { id, businessId },
  });

  if (!account) {
    return NextResponse.json(err("NOT_FOUND", "Account not found"), { status: 404 });
  }

  const body = await req.json();
  const parsed = updateAccountSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      err("VALIDATION_ERROR", "Invalid input", parsed.error.flatten()),
      { status: 400 }
    );
  }

  const { name, code, subGroup, openingBalance, openingBalType, openingBalDate } = parsed.data;

  // Prevent renaming system accounts if name is being changed
  if (account.isSystem && name && name !== account.name) {
    return NextResponse.json(
      err("FORBIDDEN", "Cannot rename a system account"),
      { status: 403 }
    );
  }

  // Check for name conflict if renaming
  if (name && name !== account.name) {
    const conflict = await prisma.ledgerAccount.findUnique({
      where: { businessId_name: { businessId, name } },
    });
    if (conflict) {
      return NextResponse.json(
        err("CONFLICT", "An account with this name already exists"),
        { status: 409 }
      );
    }
  }

  const updated = await prisma.ledgerAccount.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(code !== undefined ? { code } : {}),
      ...(subGroup !== undefined ? { subGroup } : {}),
      ...(openingBalance !== undefined ? { openingBalance } : {}),
      ...(openingBalType !== undefined ? { openingBalType: openingBalType as "DEBIT" | "CREDIT" } : {}),
      ...(openingBalDate !== undefined ? { openingBalDate: openingBalDate ? new Date(openingBalDate) : null } : {}),
    },
  });

  return NextResponse.json(ok(updated));
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.businessId) {
    return NextResponse.json(err("UNAUTHORIZED", "Unauthorized"), { status: 401 });
  }

  const { id } = await params;
  const businessId = session.user.businessId;

  const account = await prisma.ledgerAccount.findFirst({
    where: { id, businessId },
    include: { _count: { select: { entries: true } } },
  });

  if (!account) {
    return NextResponse.json(err("NOT_FOUND", "Account not found"), { status: 404 });
  }

  if (account._count.entries > 0) {
    return NextResponse.json(
      err("CONFLICT", "Cannot delete an account that has ledger entries"),
      { status: 409 }
    );
  }

  await prisma.ledgerAccount.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json(ok({ deleted: true }));
}

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";
import { ok, err } from "../../../../../lib/api";

const journalLineSchema = z.object({
  accountId: z.string().min(1, "Account is required"),
  debit: z.number().min(0).default(0),
  credit: z.number().min(0).default(0),
  narration: z.string().optional(),
});

const createJournalSchema = z.object({
  date: z.string().min(1, "Date is required"),
  narration: z.string().min(1, "Narration is required"),
  lines: z.array(journalLineSchema).min(2, "At least 2 lines are required"),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.businessId) {
    return NextResponse.json(err("UNAUTHORIZED", "Unauthorized"), { status: 401 });
  }

  const businessId = session.user.businessId;
  const { searchParams } = new URL(req.url);

  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "50");

  const [journals, total] = await Promise.all([
    prisma.journalEntry.findMany({
      where: { businessId },
      include: {
        lines: {
          include: {
            journal: { select: { narration: true } },
          },
        },
        _count: { select: { lines: true } },
      },
      orderBy: [{ entryDate: "desc" }, { createdAt: "desc" }],
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.journalEntry.count({ where: { businessId } }),
  ]);

  return NextResponse.json(
    ok(journals, { page, limit, total, totalPages: Math.ceil(total / limit) })
  );
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.businessId) {
    return NextResponse.json(err("UNAUTHORIZED", "Unauthorized"), { status: 401 });
  }

  const businessId = session.user.businessId;
  const body = await req.json();
  const parsed = createJournalSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      err("VALIDATION_ERROR", "Invalid input", parsed.error.flatten()),
      { status: 400 }
    );
  }

  const { date, narration, lines } = parsed.data;

  const totalDebit = lines.reduce((sum, l) => sum + l.debit, 0);
  const totalCredit = lines.reduce((sum, l) => sum + l.credit, 0);

  if (Math.abs(totalDebit - totalCredit) > 0.01) {
    return NextResponse.json(
      err(
        "UNBALANCED",
        `Journal entry is not balanced. Debit total: ${totalDebit.toFixed(2)}, Credit total: ${totalCredit.toFixed(2)}`
      ),
      { status: 400 }
    );
  }

  // Verify all accounts belong to this business
  const accountIds = lines.map((l) => l.accountId);
  const validAccounts = await prisma.ledgerAccount.findMany({
    where: { id: { in: accountIds }, businessId, isActive: true },
    select: { id: true },
  });

  if (validAccounts.length !== new Set(accountIds).size) {
    return NextResponse.json(
      err("INVALID_ACCOUNTS", "One or more accounts are invalid or inactive"),
      { status: 400 }
    );
  }

  const entryDate = new Date(date);

  const journalEntry = await prisma.$transaction(async (tx) => {
    const journal = await tx.journalEntry.create({
      data: {
        businessId,
        entryDate,
        narration,
        createdById: session.user.id,
      },
    });

    await tx.journalLine.createMany({
      data: lines.map((line) => ({
        journalId: journal.id,
        accountId: line.accountId,
        debit: line.debit,
        credit: line.credit,
        narration: line.narration ?? null,
      })),
    });

    await tx.ledgerEntry.createMany({
      data: lines.map((line) => ({
        businessId,
        accountId: line.accountId,
        entryDate,
        voucherType: "JOURNAL" as const,
        voucherId: journal.id,
        voucherNo: journal.voucherNo ?? null,
        narration: line.narration ?? narration,
        debit: line.debit,
        credit: line.credit,
        journalId: journal.id,
      })),
    });

    return journal;
  });

  return NextResponse.json(ok(journalEntry), { status: 201 });
}

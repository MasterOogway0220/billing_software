import { NextRequest, NextResponse } from "next/server";
import { auth } from "../../../../../../lib/auth";
import { prisma } from "../../../../../../lib/prisma";
import { ok, err } from "../../../../../../lib/api";

type Params = { params: Promise<{ id: string }> };

export async function GET(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (!session?.user?.businessId) {
    return NextResponse.json(err("UNAUTHORIZED", "Unauthorized"), { status: 401 });
  }

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  const party = await prisma.party.findFirst({
    where: { id, businessId: session.user.businessId },
  });

  if (!party) {
    return NextResponse.json(err("NOT_FOUND", "Client not found"), { status: 404 });
  }

  const entries = await prisma.ledgerEntry.findMany({
    where: {
      businessId: session.user.businessId,
      partyId: id,
      ...(from || to
        ? {
            entryDate: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    },
    include: {
      account: { select: { name: true, group: true } },
      invoice: { select: { invoiceNumber: true, documentType: true, grandTotal: true } },
      payment: { select: { amount: true, mode: true, referenceNo: true } },
    },
    orderBy: { entryDate: "asc" },
  });

  // Calculate running balance
  let balance = 0;
  const ledger = entries.map((e) => {
    balance += Number(e.debit) - Number(e.credit);
    return { ...e, runningBalance: balance };
  });

  return NextResponse.json(
    ok({ party, entries: ledger, closingBalance: balance })
  );
}

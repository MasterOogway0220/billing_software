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
  const type = searchParams.get("type") ?? "outstanding";

  try {
    if (type === "outstanding") {
      return NextResponse.json(ok(await getOutstandingReport(businessId)));
    }

    if (type === "pl") {
      const dateFrom = searchParams.get("dateFrom");
      const dateTo = searchParams.get("dateTo");
      return NextResponse.json(ok(await getPLReport(businessId, dateFrom, dateTo)));
    }

    if (type === "aging") {
      return NextResponse.json(ok(await getAgingReport(businessId)));
    }

    if (type === "cashflow") {
      return NextResponse.json(ok(await getCashFlowReport(businessId)));
    }

    return NextResponse.json(err("INVALID_TYPE", "Invalid report type"), { status: 400 });
  } catch (e) {
    console.error("[reports]", e);
    return NextResponse.json(err("SERVER_ERROR", "Failed to generate report"), { status: 500 });
  }
}

// ─── Outstanding (AR Aging Buckets) ───────────────────────────────────────────

async function getOutstandingReport(businessId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const invoices = await prisma.invoice.findMany({
    where: {
      businessId,
      amountDue: { gt: 0 },
      status: { notIn: ["VOID", "CANCELLED", "DRAFT"] },
    },
    select: {
      amountDue: true,
      dueDate: true,
      clientId: true,
      client: { select: { displayName: true } },
    },
  });

  const buckets = [
    { label: "Current", min: null, max: 0, count: 0, total: 0 },
    { label: "1–30 days", min: 1, max: 30, count: 0, total: 0 },
    { label: "31–60 days", min: 31, max: 60, count: 0, total: 0 },
    { label: "61–90 days", min: 61, max: 90, count: 0, total: 0 },
    { label: "90+ days", min: 91, max: null, count: 0, total: 0 },
  ];

  const clientMap = new Map<string, { clientName: string; outstanding: number }>();

  for (const inv of invoices) {
    const due = Number(inv.amountDue);

    let daysOverdue = 0;
    if (inv.dueDate) {
      const diff = today.getTime() - new Date(inv.dueDate).setHours(0, 0, 0, 0);
      daysOverdue = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
    }

    // Assign to bucket
    if (daysOverdue === 0) {
      buckets[0]!.count++;
      buckets[0]!.total += due;
    } else if (daysOverdue <= 30) {
      buckets[1]!.count++;
      buckets[1]!.total += due;
    } else if (daysOverdue <= 60) {
      buckets[2]!.count++;
      buckets[2]!.total += due;
    } else if (daysOverdue <= 90) {
      buckets[3]!.count++;
      buckets[3]!.total += due;
    } else {
      buckets[4]!.count++;
      buckets[4]!.total += due;
    }

    // Client aggregation
    const key = inv.clientId ?? "__no_client__";
    const name = inv.client?.displayName ?? "Unknown";
    const existing = clientMap.get(key);
    if (existing) {
      existing.outstanding += due;
    } else {
      clientMap.set(key, { clientName: name, outstanding: due });
    }
  }

  const topClients = Array.from(clientMap.values())
    .sort((a, b) => b.outstanding - a.outstanding)
    .slice(0, 5);

  return {
    buckets: buckets.map(({ label, count, total }) => ({ label, count, total })),
    topClients,
  };
}

// ─── P&L ──────────────────────────────────────────────────────────────────────

async function getPLReport(
  businessId: string,
  dateFrom: string | null,
  dateTo: string | null,
) {
  // Default: current financial year (April start) to today
  const today = new Date();
  const fyStart =
    today.getMonth() >= 3
      ? new Date(today.getFullYear(), 3, 1)
      : new Date(today.getFullYear() - 1, 3, 1);

  const from = dateFrom ? new Date(dateFrom) : fyStart;
  const to = dateTo ? new Date(dateTo) : today;
  to.setHours(23, 59, 59, 999);

  const [incomeAgg, expenseAgg] = await Promise.all([
    prisma.invoice.aggregate({
      where: {
        businessId,
        status: { in: ["PAID", "PARTIALLY_PAID"] },
        invoiceDate: { gte: from, lte: to },
      },
      _sum: { grandTotal: true },
    }),
    prisma.ledgerEntry.aggregate({
      where: {
        businessId,
        entryDate: { gte: from, lte: to },
        account: { group: "EXPENSES" },
      },
      _sum: { debit: true },
    }),
  ]);

  const income = Number(incomeAgg._sum.grandTotal ?? 0);
  const expenses = Number(expenseAgg._sum.debit ?? 0);
  const netProfit = income - expenses;

  return {
    income,
    expenses,
    netProfit,
    period: {
      from: from.toISOString().split("T")[0],
      to: to.toISOString().split("T")[0],
    },
  };
}

// ─── AR Aging Detail ──────────────────────────────────────────────────────────

async function getAgingReport(businessId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const invoices = await prisma.invoice.findMany({
    where: {
      businessId,
      amountDue: { gt: 0 },
      status: { notIn: ["VOID", "CANCELLED", "DRAFT"] },
    },
    select: {
      invoiceNumber: true,
      invoiceDate: true,
      dueDate: true,
      amountDue: true,
      client: { select: { displayName: true } },
    },
    orderBy: { dueDate: "asc" },
  });

  return invoices.map((inv) => {
    let daysOverdue = 0;
    if (inv.dueDate) {
      const diff = today.getTime() - new Date(inv.dueDate).setHours(0, 0, 0, 0);
      daysOverdue = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
    }

    return {
      clientName: inv.client?.displayName ?? "Unknown",
      invoiceNumber: inv.invoiceNumber,
      invoiceDate: inv.invoiceDate.toISOString().split("T")[0],
      dueDate: inv.dueDate ? inv.dueDate.toISOString().split("T")[0] : null,
      daysOverdue,
      amountDue: Number(inv.amountDue),
    };
  });
}

// ─── Cash Flow (last 6 months receipts) ──────────────────────────────────────

async function getCashFlowReport(businessId: string) {
  const today = new Date();

  // Build last 6 month windows
  const months: { label: string; from: Date; to: Date }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const from = new Date(d.getFullYear(), d.getMonth(), 1);
    const to = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    const label = from.toLocaleString("en-IN", { month: "short", year: "numeric" });
    months.push({ label, from, to });
  }

  const results = await Promise.all(
    months.map(({ label, from, to }) =>
      prisma.payment
        .aggregate({
          where: { businessId, paymentDate: { gte: from, lte: to } },
          _sum: { amount: true },
        })
        .then((agg) => ({ month: label, received: Number(agg._sum.amount ?? 0) })),
    ),
  );

  return { months: results };
}

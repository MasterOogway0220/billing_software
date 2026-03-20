import { auth } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";
import { formatCurrency, formatDate } from "../../../lib/utils";
import Link from "next/link";
import type { Metadata } from "next";
import { FileText } from "lucide-react";

export const metadata: Metadata = { title: "Invoices" };

const STATUS_STYLES: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  SENT: "bg-blue-100 text-blue-700",
  VIEWED: "bg-indigo-100 text-indigo-700",
  PARTIALLY_PAID: "bg-yellow-100 text-yellow-700",
  PAID: "bg-green-100 text-green-700",
  OVERDUE: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-500",
  VOID: "bg-gray-100 text-gray-400",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  SENT: "Sent",
  VIEWED: "Viewed",
  PARTIALLY_PAID: "Partial",
  PAID: "Paid",
  OVERDUE: "Overdue",
  CANCELLED: "Cancelled",
  VOID: "Void",
};

const FILTER_TABS = [
  { label: "All", value: "" },
  { label: "Draft", value: "DRAFT" },
  { label: "Sent", value: "SENT" },
  { label: "Overdue", value: "OVERDUE" },
  { label: "Paid", value: "PAID" },
] as const;

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

const AVATAR_COLORS: string[] = [
  "bg-blue-100 text-blue-700",
  "bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700",
  "bg-orange-100 text-orange-700",
  "bg-pink-100 text-pink-700",
  "bg-cyan-100 text-cyan-700",
  "bg-amber-100 text-amber-700",
  "bg-teal-100 text-teal-700",
];

function getAvatarColor(name: string): string {
  const code = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[code] ?? "bg-slate-100 text-slate-700";
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const session = await auth();
  const businessId = session!.user.businessId!;
  const sp = await searchParams;
  const page = parseInt(sp.page ?? "1");
  const limit = 20;

  const baseWhere = {
    businessId,
    documentType: "TAX_INVOICE" as const,
  };

  const filteredWhere = {
    ...baseWhere,
    ...(sp.status ? { status: sp.status as never } : {}),
  };

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [invoices, total, statusCounts, summaryData] = await Promise.all([
    prisma.invoice.findMany({
      where: filteredWhere,
      include: { client: { select: { displayName: true } } },
      orderBy: { invoiceDate: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.invoice.count({ where: filteredWhere }),
    // Count per status for tab badges
    prisma.invoice.groupBy({
      by: ["status"],
      where: baseWhere,
      _count: { _all: true },
    }),
    // Summary aggregations
    prisma.invoice.aggregate({
      where: {
        ...baseWhere,
        status: { notIn: ["VOID", "CANCELLED", "DRAFT"] },
      },
      _sum: { amountDue: true },
    }),
  ]);

  const totalPages = Math.ceil(total / limit);

  // Build status count map
  const statusCountMap = new Map<string, number>();
  for (const row of statusCounts) {
    statusCountMap.set(row.status, row._count._all);
  }

  const totalOutstanding = Number(summaryData._sum.amountDue ?? 0);

  // This month total from the fetched invoices is not sufficient — do a separate aggregate
  const thisMonthData = await prisma.invoice.aggregate({
    where: {
      ...baseWhere,
      invoiceDate: { gte: startOfMonth },
      status: { notIn: ["VOID", "CANCELLED"] },
    },
    _sum: { grandTotal: true },
  });
  const totalThisMonth = Number(thisMonthData._sum.grandTotal ?? 0);
  const overdueCount = statusCountMap.get("OVERDUE") ?? 0;

  const defaultCurrency = "INR";

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage tax invoices and track collections
          </p>
        </div>
        <Link
          href="/invoices/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + New Invoice
        </Link>
      </div>

      {/* Summary stat bar */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Total Outstanding
          </p>
          <p className="mt-1 text-2xl font-bold text-orange-600">
            {formatCurrency(totalOutstanding, defaultCurrency)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            This Month
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {formatCurrency(totalThisMonth, defaultCurrency)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Overdue
          </p>
          <p className="mt-1 text-2xl font-bold text-red-600">{overdueCount}</p>
        </div>
      </div>

      {/* Filter pill tabs */}
      <div className="flex gap-1 bg-white border border-slate-200 rounded-xl p-1 w-fit">
        {FILTER_TABS.map(({ label, value }) => {
          const count =
            value === ""
              ? statusCounts.reduce((s, r) => s + r._count._all, 0)
              : (statusCountMap.get(value) ?? 0);
          const isActive = (sp.status ?? "") === value;
          return (
            <Link
              key={value}
              href={value ? `/invoices?status=${value}` : "/invoices"}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isActive
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-600 hover:bg-slate-100"
              }`}
            >
              {label}
              <span
                className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full text-xs font-semibold ${
                  isActive
                    ? "bg-blue-500 text-white"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {count}
              </span>
            </Link>
          );
        })}
      </div>

      {/* Table card */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <FileText className="w-7 h-7 text-slate-400" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 mb-1">
              No invoices found
            </h3>
            <p className="text-sm text-slate-500 max-w-xs mb-5">
              {sp.status
                ? `No invoices with status "${STATUS_LABELS[sp.status] ?? sp.status}".`
                : "Create your first invoice to get started."}
            </p>
            {!sp.status && (
              <Link
                href="/invoices/new"
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                + New Invoice
              </Link>
            )}
          </div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 font-medium text-slate-500">
                    Invoice #
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">
                    Client
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">
                    Date
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">
                    Due Date
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-slate-500">
                    Amount
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-slate-500">
                    Due
                  </th>
                  <th className="text-center px-4 py-3 font-medium text-slate-500">
                    Status
                  </th>
                  <th className="text-center px-4 py-3 font-medium text-slate-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => {
                  const clientName = inv.client?.displayName ?? "";
                  return (
                    <tr
                      key={inv.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/invoices/${inv.id}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {inv.invoiceNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {clientName ? (
                            <>
                              <div
                                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${getAvatarColor(clientName)}`}
                              >
                                {getInitials(clientName)}
                              </div>
                              <span className="text-slate-700">
                                {clientName}
                              </span>
                            </>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {formatDate(inv.invoiceDate)}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {inv.dueDate ? formatDate(inv.dueDate) : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-800">
                        {formatCurrency(Number(inv.grandTotal), inv.currency)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {Number(inv.amountDue) > 0 ? (
                          <span className="font-semibold text-orange-600">
                            {formatCurrency(
                              Number(inv.amountDue),
                              inv.currency
                            )}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[inv.status] ?? "bg-slate-100 text-slate-600"}`}
                        >
                          {STATUS_LABELS[inv.status] ?? inv.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Link
                          href={`/invoices/${inv.id}`}
                          className="inline-flex items-center px-2.5 py-1 text-xs font-medium text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
                        >
                          View
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm text-slate-500">
                <span>
                  Showing {(page - 1) * limit + 1}–
                  {Math.min(page * limit, total)} of {total}
                </span>
                <div className="flex gap-2">
                  {page > 1 && (
                    <Link
                      href={`/invoices?${new URLSearchParams({ ...(sp.status ? { status: sp.status } : {}), page: String(page - 1) })}`}
                      className="px-3 py-1 border border-slate-200 rounded-md hover:bg-slate-50"
                    >
                      Previous
                    </Link>
                  )}
                  {page < totalPages && (
                    <Link
                      href={`/invoices?${new URLSearchParams({ ...(sp.status ? { status: sp.status } : {}), page: String(page + 1) })}`}
                      className="px-3 py-1 border border-slate-200 rounded-md hover:bg-slate-50"
                    >
                      Next
                    </Link>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

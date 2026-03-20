import { auth } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";
import { formatCurrency, formatDate } from "../../../lib/utils";
import Link from "next/link";
import type { Metadata } from "next";
import { FileText, Plus } from "lucide-react";

export const metadata: Metadata = { title: "Invoices" };

const STATUS_STYLES: Record<string, string> = {
  DRAFT:          "bg-slate-100 text-slate-600",
  SENT:           "bg-blue-100 text-blue-700",
  VIEWED:         "bg-indigo-100 text-indigo-700",
  PARTIALLY_PAID: "bg-amber-100 text-amber-700",
  PAID:           "bg-emerald-100 text-emerald-700",
  OVERDUE:        "bg-red-100 text-red-700",
  CANCELLED:      "bg-gray-100 text-gray-500",
  VOID:           "bg-gray-100 text-gray-400",
};

const STATUS_DOTS: Record<string, string> = {
  DRAFT:          "bg-slate-400",
  SENT:           "bg-blue-500",
  VIEWED:         "bg-indigo-500",
  PARTIALLY_PAID: "bg-amber-500",
  PAID:           "bg-emerald-500",
  OVERDUE:        "bg-red-500",
  CANCELLED:      "bg-gray-400",
  VOID:           "bg-gray-300",
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT:          "Draft",
  SENT:           "Sent",
  VIEWED:         "Viewed",
  PARTIALLY_PAID: "Partial",
  PAID:           "Paid",
  OVERDUE:        "Overdue",
  CANCELLED:      "Cancelled",
  VOID:           "Void",
};

const FILTER_TABS = [
  { label: "All",     value: "" },
  { label: "Draft",   value: "DRAFT" },
  { label: "Sent",    value: "SENT" },
  { label: "Overdue", value: "OVERDUE" },
  { label: "Paid",    value: "PAID" },
] as const;

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
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
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length] ?? "bg-slate-100 text-slate-700";
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const session    = await auth();
  const businessId = session!.user.businessId!;
  const sp         = await searchParams;
  const page       = parseInt(sp.page ?? "1");
  const limit      = 20;

  const baseWhere     = { businessId, documentType: "TAX_INVOICE" as const };
  const filteredWhere = { ...baseWhere, ...(sp.status ? { status: sp.status as never } : {}) };

  const now          = new Date();
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
    prisma.invoice.groupBy({ by: ["status"], where: baseWhere, _count: { _all: true } }),
    prisma.invoice.aggregate({
      where: { ...baseWhere, status: { notIn: ["VOID", "CANCELLED", "DRAFT"] } },
      _sum: { amountDue: true },
    }),
  ]);

  const totalPages     = Math.ceil(total / limit);
  const statusCountMap = new Map<string, number>(statusCounts.map((r) => [r.status, r._count._all]));
  const totalOutstanding = Number(summaryData._sum.amountDue ?? 0);

  const thisMonthData  = await prisma.invoice.aggregate({
    where: { ...baseWhere, invoiceDate: { gte: startOfMonth }, status: { notIn: ["VOID", "CANCELLED"] } },
    _sum: { grandTotal: true },
  });
  const totalThisMonth = Number(thisMonthData._sum.grandTotal ?? 0);
  const overdueCount   = statusCountMap.get("OVERDUE") ?? 0;
  const defaultCurrency = "INR";

  return (
    <div className="space-y-8">

      {/* ── Page header ─────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Invoices</h1>
          <p className="text-sm text-slate-500 mt-1">Manage tax invoices and track collections</p>
        </div>
        <Link
          href="/invoices/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors shadow-sm shadow-blue-200/60 shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> New Invoice
        </Link>
      </div>

      {/* ── Summary stats ───────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Outstanding</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-amber-600">
            {formatCurrency(totalOutstanding, defaultCurrency)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">This Month</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
            {formatCurrency(totalThisMonth, defaultCurrency)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Overdue</p>
          <p className={`mt-2 text-2xl font-bold tracking-tight ${overdueCount > 0 ? "text-red-600" : "text-slate-900"}`}>
            {overdueCount}
          </p>
        </div>
      </div>

      {/* ── Filter tabs ─────────────────────────────── */}
      <div className="flex items-center gap-1 bg-slate-100 rounded-xl p-1 w-fit border border-slate-200">
        {FILTER_TABS.map(({ label, value }) => {
          const count    = value === "" ? statusCounts.reduce((s, r) => s + r._count._all, 0) : (statusCountMap.get(value) ?? 0);
          const isActive = (sp.status ?? "") === value;
          return (
            <Link
              key={value}
              href={value ? `/invoices?status=${value}` : "/invoices"}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-150 cursor-pointer ${
                isActive
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700 hover:bg-white/60"
              }`}
            >
              {label}
              <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold ${
                isActive ? "bg-blue-600 text-white" : "bg-slate-200 text-slate-500"
              }`}>
                {count}
              </span>
            </Link>
          );
        })}
      </div>

      {/* ── Table ───────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-5">
              <FileText className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-base font-bold text-slate-900 mb-2">No invoices found</h3>
            <p className="text-sm text-slate-500 max-w-xs mb-6">
              {sp.status
                ? `No invoices with status "${STATUS_LABELS[sp.status] ?? sp.status}".`
                : "Create your first invoice to get started."}
            </p>
            {!sp.status && (
              <Link
                href="/invoices/new"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" /> New Invoice
              </Link>
            )}
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Invoice #</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Client</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Date</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Due Date</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="text-right px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Balance Due</th>
                  <th className="text-center px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-center px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {invoices.map((inv) => {
                  const clientName = inv.client?.displayName ?? "";
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4">
                        <Link
                          href={`/invoices/${inv.id}`}
                          className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                        >
                          {inv.invoiceNumber}
                        </Link>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2.5">
                          {clientName ? (
                            <>
                              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${getAvatarColor(clientName)}`}>
                                {getInitials(clientName)}
                              </div>
                              <span className="text-sm font-medium text-slate-800">{clientName}</span>
                            </>
                          ) : (
                            <span className="text-sm text-slate-400">—</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 hidden md:table-cell">
                        {formatDate(inv.invoiceDate)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 hidden lg:table-cell">
                        {inv.dueDate ? formatDate(inv.dueDate) : <span className="text-slate-300">—</span>}
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-semibold text-slate-800">
                        {formatCurrency(Number(inv.grandTotal), inv.currency)}
                      </td>
                      <td className="px-6 py-4 text-sm text-right hidden md:table-cell">
                        {Number(inv.amountDue) > 0 ? (
                          <span className="font-semibold text-amber-600">
                            {formatCurrency(Number(inv.amountDue), inv.currency)}
                          </span>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[inv.status] ?? "bg-slate-100 text-slate-600"}`}>
                          <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${STATUS_DOTS[inv.status] ?? "bg-slate-400"}`} />
                          {STATUS_LABELS[inv.status] ?? inv.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Link
                          href={`/invoices/${inv.id}`}
                          className="inline-flex items-center px-3 py-1.5 text-xs font-semibold text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer"
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
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100">
                <span className="text-sm text-slate-500">
                  Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}
                </span>
                <div className="flex gap-2">
                  {page > 1 && (
                    <Link
                      href={`/invoices?${new URLSearchParams({ ...(sp.status ? { status: sp.status } : {}), page: String(page - 1) })}`}
                      className="px-4 py-2 text-sm font-medium border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                    >
                      Previous
                    </Link>
                  )}
                  {page < totalPages && (
                    <Link
                      href={`/invoices?${new URLSearchParams({ ...(sp.status ? { status: sp.status } : {}), page: String(page + 1) })}`}
                      className="px-4 py-2 text-sm font-medium border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
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

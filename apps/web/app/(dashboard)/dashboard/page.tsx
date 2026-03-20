import { auth } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";
import { formatCurrency } from "../../../lib/utils";
import Link from "next/link";
import { FileText, TrendingUp, AlertCircle, CheckCircle, PlusCircle, Users, CreditCard } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Dashboard" };

async function getDashboardData(businessId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    totalOutstanding,
    totalPaidThisMonth,
    overdueCount,
    recentInvoices,
    topClients,
  ] = await Promise.all([
    prisma.invoice.aggregate({
      where: { businessId, amountDue: { gt: 0 }, status: { notIn: ["VOID", "CANCELLED", "DRAFT"] } },
      _sum: { amountDue: true },
    }),
    prisma.payment.aggregate({
      where: { businessId, paymentDate: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
    prisma.invoice.count({
      where: { businessId, status: "OVERDUE" },
    }),
    prisma.invoice.findMany({
      where: { businessId },
      include: { client: { select: { displayName: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.invoice.groupBy({
      by: ["clientId"],
      where: { businessId, clientId: { not: null }, status: { not: "DRAFT" } },
      _sum: { grandTotal: true },
      orderBy: { _sum: { grandTotal: "desc" } },
      take: 5,
    }),
  ]);

  return { totalOutstanding, totalPaidThisMonth, overdueCount, recentInvoices, topClients };
}

const statusStyles: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-600",
  SENT: "bg-blue-100 text-blue-700",
  VIEWED: "bg-indigo-100 text-indigo-700",
  PARTIALLY_PAID: "bg-yellow-100 text-yellow-700",
  PAID: "bg-green-100 text-green-700",
  OVERDUE: "bg-red-100 text-red-700",
  CANCELLED: "bg-gray-100 text-gray-500",
  VOID: "bg-gray-100 text-gray-400",
};

export default async function DashboardPage() {
  const session = await auth();
  const { totalOutstanding, totalPaidThisMonth, overdueCount, recentInvoices } =
    await getDashboardData(session!.user.businessId!);

  const outstanding = Number(totalOutstanding._sum.amountDue ?? 0);
  const paidThisMonth = Number(totalPaidThisMonth._sum.amount ?? 0);

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label="Total Outstanding"
          value={formatCurrency(outstanding)}
          icon={<TrendingUp className="w-5 h-5 text-blue-600" />}
          bg="bg-blue-50"
        />
        <KpiCard
          label="Paid This Month"
          value={formatCurrency(paidThisMonth)}
          icon={<CheckCircle className="w-5 h-5 text-green-600" />}
          bg="bg-green-50"
        />
        <KpiCard
          label="Overdue Invoices"
          value={String(overdueCount)}
          icon={<AlertCircle className="w-5 h-5 text-red-600" />}
          bg="bg-red-50"
          highlight={overdueCount > 0}
        />
        <KpiCard
          label="Total Invoices"
          value={String(recentInvoices.length)}
          icon={<FileText className="w-5 h-5 text-purple-600" />}
          bg="bg-purple-50"
        />
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Quick Actions</h2>
        <div className="flex flex-wrap gap-3">
          <QuickAction href="/invoices/new" icon={<PlusCircle className="w-4 h-4" />} label="New Invoice" primary />
          <QuickAction href="/payments/new" icon={<CreditCard className="w-4 h-4" />} label="Record Payment" />
          <QuickAction href="/clients/new" icon={<Users className="w-4 h-4" />} label="Add Client" />
        </div>
      </div>

      {/* Recent Invoices */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Recent Invoices</h2>
          <Link href="/invoices" className="text-sm text-blue-600 hover:underline">View all →</Link>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 font-medium text-slate-500">Invoice #</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Client</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Date</th>
                <th className="text-right px-4 py-3 font-medium text-slate-500">Amount</th>
                <th className="text-center px-4 py-3 font-medium text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentInvoices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                    No invoices yet.{" "}
                    <Link href="/invoices/new" className="text-blue-600 hover:underline">
                      Create your first invoice
                    </Link>
                  </td>
                </tr>
              ) : (
                recentInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <Link href={`/invoices/${inv.id}`} className="text-blue-600 font-medium hover:underline">
                        {inv.invoiceNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{inv.client?.displayName ?? "—"}</td>
                    <td className="px-4 py-3 text-slate-500">
                      {new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(inv.invoiceDate)}
                    </td>
                    <td className="px-4 py-3 text-right font-medium">
                      {formatCurrency(Number(inv.grandTotal), inv.currency)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${statusStyles[inv.status] ?? ""}`}>
                        {inv.status.replace("_", " ")}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function KpiCard({
  label, value, icon, bg, highlight = false
}: {
  label: string; value: string; icon: React.ReactNode; bg: string; highlight?: boolean;
}) {
  return (
    <div className={`bg-white rounded-xl border ${highlight ? "border-red-200" : "border-slate-200"} p-5`}>
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <div className={`w-9 h-9 ${bg} rounded-lg flex items-center justify-center`}>{icon}</div>
      </div>
      <p className={`text-2xl font-bold ${highlight ? "text-red-600" : "text-slate-800"}`}>{value}</p>
    </div>
  );
}

function QuickAction({
  href, icon, label, primary = false
}: {
  href: string; icon: React.ReactNode; label: string; primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
        primary
          ? "bg-blue-600 text-white hover:bg-blue-700"
          : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}

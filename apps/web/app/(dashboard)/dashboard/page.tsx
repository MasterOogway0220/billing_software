import { auth } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";
import { formatCurrency } from "../../../lib/utils";
import Link from "next/link";
import {
  FileText,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Plus,
  Users,
  CreditCard,
  ArrowRight,
  Settings,
  Check,
  ArrowUpRight,
} from "lucide-react";
import type { Metadata } from "next";
import { RevenueChart } from "../../../components/dashboard/RevenueChart";
import type { RevenueChartData } from "../../../components/dashboard/RevenueChart";

export const metadata: Metadata = { title: "Dashboard" };

async function getDashboardData(businessId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const sixMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 5, 1);

  const [
    totalOutstanding,
    totalPaidThisMonth,
    overdueCount,
    recentInvoices,
    topClients,
    rawPayments,
    rawInvoices,
    totalInvoiceCount,
  ] = await Promise.all([
    prisma.invoice.aggregate({
      where: { businessId, amountDue: { gt: 0 }, status: { notIn: ["VOID", "CANCELLED", "DRAFT"] } },
      _sum: { amountDue: true },
    }),
    prisma.payment.aggregate({
      where: { businessId, paymentDate: { gte: startOfMonth } },
      _sum: { amount: true },
    }),
    prisma.invoice.count({ where: { businessId, status: "OVERDUE" } }),
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
    prisma.payment.findMany({
      where: { businessId, paymentDate: { gte: sixMonthsAgo } },
      select: { paymentDate: true, amount: true },
    }),
    prisma.invoice.findMany({
      where: {
        businessId,
        invoiceDate: { gte: sixMonthsAgo },
        status: { notIn: ["DRAFT", "VOID", "CANCELLED"] },
      },
      select: { invoiceDate: true, grandTotal: true },
    }),
    prisma.invoice.count({ where: { businessId } }),
  ]);

  // Build 6-month chart data
  const monthKeys: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthKeys.push(`${d.toLocaleString("en-IN", { month: "short" })} ${d.getFullYear()}`);
  }
  const paidByMonth: Record<string, number>    = Object.fromEntries(monthKeys.map((k) => [k, 0]));
  const revenueByMonth: Record<string, number> = Object.fromEntries(monthKeys.map((k) => [k, 0]));

  for (const p of rawPayments) {
    const key = `${p.paymentDate.toLocaleString("en-IN", { month: "short" })} ${p.paymentDate.getFullYear()}`;
    if (key in paidByMonth) paidByMonth[key] = (paidByMonth[key] ?? 0) + Number(p.amount);
  }
  for (const inv of rawInvoices) {
    const key = `${inv.invoiceDate.toLocaleString("en-IN", { month: "short" })} ${inv.invoiceDate.getFullYear()}`;
    if (key in revenueByMonth) revenueByMonth[key] = (revenueByMonth[key] ?? 0) + Number(inv.grandTotal);
  }

  const chartData: RevenueChartData[] = monthKeys.map((month) => ({
    month,
    revenue: revenueByMonth[month] ?? 0,
    paid: paidByMonth[month] ?? 0,
  }));

  return { totalOutstanding, totalPaidThisMonth, overdueCount, recentInvoices, topClients, chartData, totalInvoiceCount };
}

const statusConfig: Record<string, { classes: string; dot: string; label: string }> = {
  DRAFT:          { classes: "bg-slate-100 text-slate-600",   dot: "bg-slate-400",   label: "Draft" },
  SENT:           { classes: "bg-blue-100 text-blue-700",     dot: "bg-blue-500",    label: "Sent" },
  VIEWED:         { classes: "bg-indigo-100 text-indigo-700", dot: "bg-indigo-500",  label: "Viewed" },
  PARTIALLY_PAID: { classes: "bg-amber-100 text-amber-700",   dot: "bg-amber-500",   label: "Partial" },
  PAID:           { classes: "bg-emerald-100 text-emerald-700",dot: "bg-emerald-500", label: "Paid" },
  OVERDUE:        { classes: "bg-red-100 text-red-700",       dot: "bg-red-500",     label: "Overdue" },
  CANCELLED:      { classes: "bg-gray-100 text-gray-500",     dot: "bg-gray-400",    label: "Cancelled" },
  VOID:           { classes: "bg-gray-100 text-gray-400",     dot: "bg-gray-300",    label: "Void" },
};

export default async function DashboardPage() {
  const session = await auth();
  const { totalOutstanding, totalPaidThisMonth, overdueCount, recentInvoices, chartData, totalInvoiceCount } =
    await getDashboardData(session!.user.businessId!);

  const outstanding   = Number(totalOutstanding._sum.amountDue ?? 0);
  const paidThisMonth = Number(totalPaidThisMonth._sum.amount  ?? 0);
  const showGettingStarted = totalInvoiceCount === 0;

  return (
    <div className="space-y-8">

      {/* ── KPI Cards ─────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <KpiCard
          label="Total Outstanding"
          value={formatCurrency(outstanding)}
          icon={<TrendingUp className="w-6 h-6 text-blue-600" />}
          iconBg="bg-blue-50"
          badge="+12% vs last month"
          badgeColor="text-blue-600"
        />
        <KpiCard
          label="Paid This Month"
          value={formatCurrency(paidThisMonth)}
          icon={<CheckCircle className="w-6 h-6 text-emerald-600" />}
          iconBg="bg-emerald-50"
          badge="+8% vs last month"
          badgeColor="text-emerald-600"
        />
        <KpiCard
          label="Overdue Invoices"
          value={String(overdueCount)}
          icon={<AlertCircle className="w-6 h-6 text-red-500" />}
          iconBg="bg-red-50"
          badge={overdueCount > 0 ? "Needs attention" : "All clear"}
          badgeColor={overdueCount > 0 ? "text-red-600" : "text-emerald-600"}
          highlight={overdueCount > 0}
        />
        <KpiCard
          label="Total Invoices"
          value={String(totalInvoiceCount)}
          icon={<FileText className="w-6 h-6 text-violet-600" />}
          iconBg="bg-violet-50"
          badge="All time"
          badgeColor="text-violet-600"
        />
      </div>

      {/* ── Chart ─────────────────────────────────────── */}
      <RevenueChart data={chartData} />

      {/* ── Quick Actions ─────────────────────────────── */}
      <div>
        <h2 className="text-base font-semibold text-slate-800 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <QuickAction
            href="/invoices/new"
            icon={<Plus className="w-5 h-5" />}
            label="New Invoice"
            description="Create and send a GST invoice"
            primary
          />
          <QuickAction
            href="/payments/new"
            icon={<CreditCard className="w-5 h-5" />}
            label="Record Payment"
            description="Log a received payment"
          />
          <QuickAction
            href="/clients/new"
            icon={<Users className="w-5 h-5" />}
            label="Add Client"
            description="Add a new client profile"
          />
        </div>
      </div>

      {/* ── Recent Invoices ───────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-800">Recent Invoices</h2>
          <Link
            href="/invoices"
            className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Invoice #</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Client</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden sm:table-cell">Date</th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Amount</th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Due</th>
                <th className="text-center px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentInvoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center">
                        <FileText className="w-7 h-7 text-slate-400" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-700">No invoices yet</p>
                        <p className="text-sm text-slate-400 mt-1">Create your first invoice to get started.</p>
                      </div>
                      <Link
                        href="/invoices/new"
                        className="mt-1 inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Plus className="w-4 h-4" /> New Invoice
                      </Link>
                    </div>
                  </td>
                </tr>
              ) : (
                recentInvoices.map((inv) => {
                  const cfg = statusConfig[inv.status] ?? statusConfig["DRAFT"]!;
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors group">
                      <td className="px-6 py-4">
                        <Link
                          href={`/invoices/${inv.id}`}
                          className="text-sm font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                        >
                          {inv.invoiceNumber}
                        </Link>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-700 font-medium">
                        {inv.client?.displayName ?? "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500 hidden sm:table-cell">
                        {new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(inv.invoiceDate)}
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
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold ${cfg.classes}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} shrink-0`} />
                          {cfg.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Getting Started ───────────────────────────── */}
      {showGettingStarted && (
        <div className="bg-white rounded-xl border border-slate-200 p-8">
          <div className="max-w-lg">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center shrink-0">
                <CheckCircle className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Get started with BillFlow</h3>
            </div>
            <p className="text-sm text-slate-500 mb-6 ml-[52px]">
              Complete these steps to set up your account and send your first invoice.
            </p>
            <div className="space-y-3 ml-[52px]">
              {[
                { label: "Set up your business profile", desc: "Add your logo, address, and GST details", href: "/settings", icon: <Settings className="w-4 h-4" /> },
                { label: "Add your first client",        desc: "Create a client profile before invoicing",   href: "/clients/new", icon: <Users className="w-4 h-4" /> },
                { label: "Create your first invoice",    desc: "Send a professional GST-compliant invoice",  href: "/invoices/new", icon: <FileText className="w-4 h-4" /> },
              ].map((step, i) => (
                <Link
                  key={i}
                  href={step.href}
                  className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/40 transition-all group"
                >
                  <div className="w-8 h-8 rounded-full border-2 border-slate-300 flex items-center justify-center shrink-0 group-hover:border-blue-400 transition-colors text-slate-400 group-hover:text-blue-500">
                    <Check className="w-4 h-4 opacity-0" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800">{step.label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{step.desc}</p>
                  </div>
                  <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors shrink-0" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── KPI Card ─────────────────────────────────────────────── */
function KpiCard({
  label, value, icon, iconBg, badge, badgeColor, highlight = false,
}: {
  label: string; value: string; icon: React.ReactNode; iconBg: string;
  badge: string; badgeColor: string; highlight?: boolean;
}) {
  return (
    <div className={`bg-white rounded-xl border p-6 hover:shadow-md transition-shadow ${highlight ? "border-red-200" : "border-slate-200"}`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`w-11 h-11 ${iconBg} rounded-xl flex items-center justify-center shrink-0`}>
          {icon}
        </div>
        <span className={`text-xs font-semibold ${badgeColor}`}>{badge}</span>
      </div>
      <p className={`text-3xl font-bold tracking-tight ${highlight ? "text-red-600" : "text-slate-900"}`}>
        {value}
      </p>
      <p className="text-sm text-slate-500 font-medium mt-1.5">{label}</p>
    </div>
  );
}

/* ─── Quick Action Card ────────────────────────────────────── */
function QuickAction({
  href, icon, label, description, primary = false,
}: {
  href: string; icon: React.ReactNode; label: string; description: string; primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-4 px-5 py-4 rounded-xl border font-medium transition-all duration-150 group cursor-pointer ${
        primary
          ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-200/50"
          : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:shadow-md"
      }`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
        primary ? "bg-white/20" : "bg-slate-100 group-hover:bg-slate-200"
      }`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-bold">{label}</p>
        <p className={`text-xs mt-0.5 font-normal ${primary ? "text-blue-100" : "text-slate-500"}`}>
          {description}
        </p>
      </div>
    </Link>
  );
}

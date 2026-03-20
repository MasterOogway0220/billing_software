import { auth } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";
import { formatCurrency } from "../../../lib/utils";
import Link from "next/link";
import {
  FileText,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  PlusCircle,
  Users,
  CreditCard,
  ArrowRight,
  Settings,
  Check,
} from "lucide-react";
import type { Metadata } from "next";
import { RevenueChart } from "../../../components/dashboard/RevenueChart";
import type { RevenueChartData } from "../../../components/dashboard/RevenueChart";

export const metadata: Metadata = { title: "Dashboard" };

async function getDashboardData(businessId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Six months ago (start of that month)
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
    // Raw payments for the last 6 months
    prisma.payment.findMany({
      where: { businessId, paymentDate: { gte: sixMonthsAgo } },
      select: { paymentDate: true, amount: true },
    }),
    // Raw invoices issued in the last 6 months (non-draft)
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

  // Build ordered list of the last 6 calendar months
  const monthKeys: string[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.toLocaleString("en-IN", { month: "short" })} ${d.getFullYear()}`;
    monthKeys.push(key);
  }

  const paidByMonth: Record<string, number> = {};
  const revenueByMonth: Record<string, number> = {};

  for (const key of monthKeys) {
    paidByMonth[key] = 0;
    revenueByMonth[key] = 0;
  }

  for (const p of rawPayments) {
    const d = p.paymentDate;
    const key = `${d.toLocaleString("en-IN", { month: "short" })} ${d.getFullYear()}`;
    if (key in paidByMonth) {
      paidByMonth[key] = (paidByMonth[key] ?? 0) + Number(p.amount);
    }
  }

  for (const inv of rawInvoices) {
    const d = inv.invoiceDate;
    const key = `${d.toLocaleString("en-IN", { month: "short" })} ${d.getFullYear()}`;
    if (key in revenueByMonth) {
      revenueByMonth[key] = (revenueByMonth[key] ?? 0) + Number(inv.grandTotal);
    }
  }

  const chartData: RevenueChartData[] = monthKeys.map((month) => ({
    month,
    revenue: revenueByMonth[month] ?? 0,
    paid: paidByMonth[month] ?? 0,
  }));

  return {
    totalOutstanding,
    totalPaidThisMonth,
    overdueCount,
    recentInvoices,
    topClients,
    chartData,
    totalInvoiceCount,
  };
}

const statusConfig: Record<string, { classes: string; dot: string; label: string }> = {
  DRAFT:         { classes: "bg-slate-100 text-slate-600",   dot: "bg-slate-400",   label: "Draft" },
  SENT:          { classes: "bg-blue-100 text-blue-700",     dot: "bg-blue-500",    label: "Sent" },
  VIEWED:        { classes: "bg-indigo-100 text-indigo-700", dot: "bg-indigo-500",  label: "Viewed" },
  PARTIALLY_PAID:{ classes: "bg-yellow-100 text-yellow-700", dot: "bg-yellow-500",  label: "Partial" },
  PAID:          { classes: "bg-green-100 text-green-700",   dot: "bg-green-500",   label: "Paid" },
  OVERDUE:       { classes: "bg-red-100 text-red-700",       dot: "bg-red-500",     label: "Overdue" },
  CANCELLED:     { classes: "bg-gray-100 text-gray-500",     dot: "bg-gray-400",    label: "Cancelled" },
  VOID:          { classes: "bg-gray-100 text-gray-400",     dot: "bg-gray-300",    label: "Void" },
};

export default async function DashboardPage() {
  const session = await auth();
  const {
    totalOutstanding,
    totalPaidThisMonth,
    overdueCount,
    recentInvoices,
    chartData,
    totalInvoiceCount,
  } = await getDashboardData(session!.user.businessId!);

  const outstanding = Number(totalOutstanding._sum.amountDue ?? 0);
  const paidThisMonth = Number(totalPaidThisMonth._sum.amount ?? 0);
  const showGettingStarted = totalInvoiceCount === 0;

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <KpiCard
          label="Total Outstanding"
          value={formatCurrency(outstanding)}
          icon={<TrendingUp className="w-5 h-5 text-blue-600" />}
          iconBg="bg-gradient-to-br from-blue-50 to-blue-100"
          trend="+12%"
          trendColor="text-blue-600 bg-blue-50"
        />
        <KpiCard
          label="Paid This Month"
          value={formatCurrency(paidThisMonth)}
          icon={<CheckCircle className="w-5 h-5 text-emerald-600" />}
          iconBg="bg-gradient-to-br from-emerald-50 to-emerald-100"
          trend="+8%"
          trendColor="text-emerald-600 bg-emerald-50"
        />
        <KpiCard
          label="Overdue Invoices"
          value={String(overdueCount)}
          icon={<AlertCircle className="w-5 h-5 text-red-600" />}
          iconBg="bg-gradient-to-br from-red-50 to-red-100"
          trend={overdueCount > 0 ? "Needs attention" : "All clear"}
          trendColor={overdueCount > 0 ? "text-red-600 bg-red-50" : "text-emerald-600 bg-emerald-50"}
          highlight={overdueCount > 0}
        />
        <KpiCard
          label="Total Invoices"
          value={String(totalInvoiceCount)}
          icon={<FileText className="w-5 h-5 text-violet-600" />}
          iconBg="bg-gradient-to-br from-violet-50 to-violet-100"
          trend="All time"
          trendColor="text-violet-600 bg-violet-50"
        />
      </div>

      {/* Monthly Revenue Chart */}
      <RevenueChart data={chartData} />

      {/* Quick Actions */}
      <div>
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <QuickAction
            href="/invoices/new"
            icon={<PlusCircle className="w-5 h-5" />}
            label="New Invoice"
            description="Create and send an invoice"
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

      {/* Recent Invoices */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">Recent Invoices</h2>
          <Link href="/invoices" className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1">
            View all <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 font-medium text-slate-500">Invoice #</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Client</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500 hidden sm:table-cell">Date</th>
                <th className="text-right px-4 py-3 font-medium text-slate-500">Total</th>
                <th className="text-right px-4 py-3 font-medium text-slate-500 hidden md:table-cell">Amount Due</th>
                <th className="text-center px-4 py-3 font-medium text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentInvoices.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center">
                    <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="text-slate-400 text-sm">No invoices yet.</p>
                    <Link href="/invoices/new" className="text-blue-600 hover:underline text-sm font-medium mt-1 inline-block">
                      Create your first invoice
                    </Link>
                  </td>
                </tr>
              ) : (
                recentInvoices.map((inv) => {
                  const cfg = statusConfig[inv.status] ?? statusConfig["DRAFT"]!;
                  return (
                    <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <Link href={`/invoices/${inv.id}`} className="text-blue-600 font-medium hover:underline">
                          {inv.invoiceNumber}
                        </Link>
                      </td>
                      <td className="px-4 py-3 text-slate-700">{inv.client?.displayName ?? "—"}</td>
                      <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">
                        {new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(inv.invoiceDate)}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-800">
                        {formatCurrency(Number(inv.grandTotal), inv.currency)}
                      </td>
                      <td className="px-4 py-3 text-right hidden md:table-cell">
                        {Number(inv.amountDue) > 0 ? (
                          <span className="font-medium text-amber-700">
                            {formatCurrency(Number(inv.amountDue), inv.currency)}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${cfg.classes}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.dot} flex-shrink-0`} />
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

      {/* Getting Started checklist — only shown when there are 0 invoices */}
      {showGettingStarted && (
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <CheckCircle className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-base font-bold text-slate-900 mb-0.5">Get started with BillFlow</h3>
              <p className="text-sm text-slate-500 mb-5">Complete these steps to set up your account and send your first invoice.</p>
              <div className="space-y-3">
                {[
                  {
                    label: "Set up your business profile",
                    desc: "Add your logo, address, and tax details",
                    href: "/settings",
                    icon: <Settings className="w-4 h-4 text-slate-500" />,
                    done: false,
                  },
                  {
                    label: "Add a client",
                    desc: "Create a client profile before invoicing",
                    href: "/clients/new",
                    icon: <Users className="w-4 h-4 text-slate-500" />,
                    done: false,
                  },
                  {
                    label: "Create your first invoice",
                    desc: "Send a professional GST-compliant invoice",
                    href: "/invoices/new",
                    icon: <FileText className="w-4 h-4 text-slate-500" />,
                    done: false,
                  },
                ].map((step, i) => (
                  <Link
                    key={i}
                    href={step.href}
                    className="flex items-center gap-4 p-3.5 rounded-xl border border-slate-100 hover:border-blue-200 hover:bg-blue-50/40 transition-colors group"
                  >
                    <div className={`w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      step.done
                        ? "bg-emerald-500 border-emerald-500"
                        : "border-slate-300 group-hover:border-blue-400"
                    }`}>
                      {step.done && <Check className="w-3.5 h-3.5 text-white" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium ${step.done ? "text-slate-400 line-through" : "text-slate-800"}`}>
                        {step.label}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">{step.desc}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-slate-300 group-hover:text-blue-500 transition-colors flex-shrink-0" />
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon,
  iconBg,
  trend,
  trendColor,
  highlight = false,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  iconBg: string;
  trend: string;
  trendColor: string;
  highlight?: boolean;
}) {
  return (
    <div className={`bg-white rounded-xl border ${highlight ? "border-red-200" : "border-slate-200"} p-5`}>
      <div className="flex items-center justify-between mb-4">
        <div className={`w-10 h-10 ${iconBg} rounded-xl flex items-center justify-center`}>{icon}</div>
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${trendColor}`}>{trend}</span>
      </div>
      <p className={`text-2xl font-bold ${highlight ? "text-red-600" : "text-slate-900"} mb-1`}>{value}</p>
      <p className="text-sm font-medium text-slate-500">{label}</p>
    </div>
  );
}

function QuickAction({
  href,
  icon,
  label,
  description,
  primary = false,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  description: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-4 px-5 py-4 rounded-xl border font-medium transition-colors group ${
        primary
          ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-700 hover:border-blue-700"
          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50 hover:border-slate-300"
      }`}
    >
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${
        primary ? "bg-white/20" : "bg-slate-100 group-hover:bg-slate-200"
      } transition-colors`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-semibold leading-snug">{label}</p>
        <p className={`text-xs mt-0.5 ${primary ? "text-blue-100" : "text-slate-500"}`}>{description}</p>
      </div>
    </Link>
  );
}

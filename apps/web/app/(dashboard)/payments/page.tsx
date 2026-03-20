import { auth } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";
import { formatCurrency, formatDate } from "../../../lib/utils";
import type { Metadata } from "next";
import { CreditCard } from "lucide-react";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Payments Received" };

const MODE_LABELS: Record<string, string> = {
  BANK_TRANSFER: "Bank Transfer",
  CASH: "Cash",
  CHEQUE: "Cheque",
  UPI: "UPI",
  CREDIT_CARD: "Credit Card",
  DEBIT_CARD: "Debit Card",
  ONLINE: "Online",
};

const MODE_STYLES: Record<string, string> = {
  CASH: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  BANK_TRANSFER: "bg-blue-50 text-blue-700 border border-blue-200",
  UPI: "bg-violet-50 text-violet-700 border border-violet-200",
  CHEQUE: "bg-amber-50 text-amber-700 border border-amber-200",
  CREDIT_CARD: "bg-pink-50 text-pink-700 border border-pink-200",
  DEBIT_CARD: "bg-indigo-50 text-indigo-700 border border-indigo-200",
  ONLINE: "bg-cyan-50 text-cyan-700 border border-cyan-200",
};

export default async function PaymentsPage() {
  const session = await auth();
  const businessId = session!.user.businessId!;

  const payments = await prisma.payment.findMany({
    where: { businessId },
    include: {
      invoice: {
        select: {
          invoiceNumber: true,
          client: { select: { displayName: true } },
        },
      },
    },
    orderBy: { paymentDate: "desc" },
  });

  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  let totalAllTime = 0;
  let totalThisMonth = 0;
  for (const pmt of payments) {
    const amount = Number(pmt.amount);
    totalAllTime += amount;
    if (pmt.paymentDate >= startOfMonth) {
      totalThisMonth += amount;
    }
  }

  const defaultCurrency =
    payments.length > 0 ? (payments[0]?.currency ?? "INR") : "INR";

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Payments Received
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Track all incoming payments across invoices
          </p>
        </div>
      </div>

      {/* Summary stat bar */}
      <div className="grid grid-cols-3 gap-4">
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
            All Time
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {formatCurrency(totalAllTime, defaultCurrency)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Transactions
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {payments.length}
          </p>
        </div>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {payments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <CreditCard className="w-7 h-7 text-slate-400" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 mb-1">
              No payments recorded yet
            </h3>
            <p className="text-sm text-slate-500 max-w-xs">
              Payments will appear here once you record them against invoices.
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 font-medium text-slate-500">
                  Date
                </th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">
                  Invoice #
                </th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">
                  Client
                </th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">
                  Mode
                </th>
                <th className="text-right px-4 py-3 font-medium text-slate-500">
                  Amount
                </th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">
                  Reference
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payments.map((pmt) => (
                <tr key={pmt.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-500">
                    {formatDate(pmt.paymentDate)}
                  </td>
                  <td className="px-4 py-3">
                    {pmt.invoice ? (
                      <span className="font-medium text-slate-800">
                        {pmt.invoice.invoiceNumber}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {pmt.invoice?.client?.displayName ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${MODE_STYLES[pmt.mode] ?? "bg-slate-100 text-slate-600"}`}
                    >
                      {MODE_LABELS[pmt.mode] ?? pmt.mode}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-semibold text-green-700">
                    {formatCurrency(Number(pmt.amount), pmt.currency)}
                  </td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                    {pmt.referenceNo ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

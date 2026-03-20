import { auth } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";
import { formatCurrency, formatDate } from "../../../lib/utils";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Payments Received" };

const MODE_LABELS: Record<string, string> = {
  BANK_TRANSFER: "Bank Transfer",
  CASH: "Cash",
  CHEQUE: "Cheque",
  UPI: "UPI",
  CARD: "Card",
  OTHER: "Other",
};

export default async function PaymentsPage() {
  const session = await auth();

  const payments = await prisma.payment.findMany({
    where: { businessId: session!.user.businessId! },
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-slate-900">Payments Received</h1>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-3 font-medium text-slate-500">Date</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500">Invoice #</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500">Client</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500">Mode</th>
              <th className="text-right px-4 py-3 font-medium text-slate-500">Amount</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500">Reference</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {payments.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center text-slate-400">
                  No payments recorded yet.
                </td>
              </tr>
            ) : (
              payments.map((pmt) => (
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
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
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
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

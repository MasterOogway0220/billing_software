import { auth } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";
import { formatCurrency } from "../../../lib/utils";
import Link from "next/link";
import type { Metadata } from "next";

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

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const session = await auth();
  const sp = await searchParams;
  const page = parseInt(sp.page ?? "1");
  const limit = 20;

  const where = {
    businessId: session!.user.businessId!,
    documentType: "TAX_INVOICE" as const,
    ...(sp.status ? { status: sp.status as never } : {}),
  };

  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      include: { client: { select: { displayName: true } } },
      orderBy: { invoiceDate: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.invoice.count({ where }),
  ]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div>
      {/* Filter tabs */}
      <div className="flex gap-1 mb-4 bg-white border border-slate-200 rounded-lg p-1 w-fit">
        {[
          { label: "All", value: "" },
          { label: "Draft", value: "DRAFT" },
          { label: "Sent", value: "SENT" },
          { label: "Overdue", value: "OVERDUE" },
          { label: "Paid", value: "PAID" },
        ].map(({ label, value }) => (
          <Link
            key={value}
            href={value ? `/invoices?status=${value}` : "/invoices"}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              (sp.status ?? "") === value
                ? "bg-blue-600 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-3 font-medium text-slate-500">Invoice #</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500">Client</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500">Date</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500">Due Date</th>
              <th className="text-right px-4 py-3 font-medium text-slate-500">Amount</th>
              <th className="text-right px-4 py-3 font-medium text-slate-500">Due</th>
              <th className="text-center px-4 py-3 font-medium text-slate-500">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invoices.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                  No invoices found.{" "}
                  <Link href="/invoices/new" className="text-blue-600 hover:underline">
                    Create your first invoice →
                  </Link>
                </td>
              </tr>
            ) : (
              invoices.map((inv) => (
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
                  <td className="px-4 py-3 text-slate-500">
                    {inv.dueDate
                      ? new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(inv.dueDate)
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    {formatCurrency(Number(inv.grandTotal), inv.currency)}
                  </td>
                  <td className="px-4 py-3 text-right text-orange-600 font-medium">
                    {Number(inv.amountDue) > 0
                      ? formatCurrency(Number(inv.amountDue), inv.currency)
                      : "—"}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[inv.status] ?? ""}`}>
                      {inv.status.replace("_", " ")}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 text-sm text-slate-500">
            <span>Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total}</span>
            <div className="flex gap-2">
              {page > 1 && (
                <Link href={`/invoices?${new URLSearchParams({ ...(sp.status ? { status: sp.status } : {}), page: String(page - 1) })}`}
                  className="px-3 py-1 border border-slate-200 rounded-md hover:bg-slate-50">Previous</Link>
              )}
              {page < totalPages && (
                <Link href={`/invoices?${new URLSearchParams({ ...(sp.status ? { status: sp.status } : {}), page: String(page + 1) })}`}
                  className="px-3 py-1 border border-slate-200 rounded-md hover:bg-slate-50">Next</Link>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

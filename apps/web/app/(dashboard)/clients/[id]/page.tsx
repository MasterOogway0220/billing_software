import { auth } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { formatCurrency, formatDate } from "../../../../lib/utils";
import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { Party } from "@repo/db";
import ClientDetailTabs from "./ClientDetailTabs";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const party = await prisma.party.findFirst({ where: { id }, select: { displayName: true } });
  return { title: party?.displayName ?? "Client" };
}

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

const TYPE_STYLES: Record<string, string> = {
  CLIENT: "bg-blue-100 text-blue-700",
  VENDOR: "bg-purple-100 text-purple-700",
  BOTH: "bg-teal-100 text-teal-700",
};

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;

  const [party, invoices, outstanding] = await Promise.all([
    prisma.party.findFirst({
      where: { id, businessId: session!.user.businessId! },
    }),
    prisma.invoice.findMany({
      where: { clientId: id, businessId: session!.user.businessId! },
      select: {
        id: true,
        invoiceNumber: true,
        invoiceDate: true,
        dueDate: true,
        grandTotal: true,
        amountDue: true,
        status: true,
        currency: true,
      },
      orderBy: { invoiceDate: "desc" },
      take: 10,
    }),
    prisma.invoice.aggregate({
      where: {
        clientId: id,
        businessId: session!.user.businessId!,
        status: { not: "VOID" },
      },
      _sum: { amountDue: true, grandTotal: true, amountPaid: true },
      _count: { id: true },
    }),
  ]);

  if (!party) notFound();

  const p = party as Party;

  const totalInvoiced = Number(outstanding._sum.grandTotal ?? 0);
  const totalOutstanding = Number(outstanding._sum.amountDue ?? 0);
  const totalReceived = Number(outstanding._sum.amountPaid ?? 0);
  const invoiceCount = outstanding._count.id;

  const stats = [
    { label: "Total Invoiced", value: formatCurrency(totalInvoiced, p.defaultCurrency) },
    { label: "Amount Received", value: formatCurrency(totalReceived, p.defaultCurrency) },
    { label: "Outstanding", value: formatCurrency(totalOutstanding, p.defaultCurrency), highlight: totalOutstanding > 0 },
    { label: "Invoice Count", value: String(invoiceCount) },
  ];

  const invoicesTab = (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50">
            <th className="text-left px-4 py-3 font-medium text-slate-500">Invoice #</th>
            <th className="text-left px-4 py-3 font-medium text-slate-500">Date</th>
            <th className="text-right px-4 py-3 font-medium text-slate-500">Amount</th>
            <th className="text-center px-4 py-3 font-medium text-slate-500">Status</th>
            <th className="text-right px-4 py-3 font-medium text-slate-500">Due</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {invoices.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                No invoices yet.{" "}
                <Link href="/invoices/new" className="text-blue-600 hover:underline">
                  Create invoice →
                </Link>
              </td>
            </tr>
          ) : (
            invoices.map((inv) => (
              <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <Link
                    href={`/invoices/${inv.id}`}
                    className="text-blue-600 font-medium hover:underline"
                  >
                    {inv.invoiceNumber}
                  </Link>
                </td>
                <td className="px-4 py-3 text-slate-500">
                  {formatDate(inv.invoiceDate)}
                </td>
                <td className="px-4 py-3 text-right font-medium">
                  {formatCurrency(Number(inv.grandTotal), inv.currency)}
                </td>
                <td className="px-4 py-3 text-center">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[inv.status] ?? ""}`}
                  >
                    {inv.status.replace("_", " ")}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-orange-600 font-medium">
                  {Number(inv.amountDue) > 0
                    ? formatCurrency(Number(inv.amountDue), inv.currency)
                    : "—"}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );

  const detailsTab = (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Identity */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
          Identity
        </h3>
        <dl className="space-y-3 text-sm">
          <DetailRow label="Display Name" value={p.displayName} />
          <DetailRow label="Legal Name" value={p.legalName} />
          <DetailRow label="GSTIN" value={p.gstin} mono />
          <DetailRow label="PAN" value={p.pan} mono />
        </dl>
      </div>

      {/* Contact */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
          Contact
        </h3>
        <dl className="space-y-3 text-sm">
          <DetailRow label="Contact Person" value={p.contactName} />
          <DetailRow label="Email" value={p.contactEmail} />
          <DetailRow label="Phone" value={p.contactPhone} />
        </dl>
      </div>

      {/* Billing Address */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
          Billing Address
        </h3>
        <dl className="space-y-3 text-sm">
          <DetailRow label="Address Line 1" value={p.billingAddressLine1} />
          <DetailRow label="Address Line 2" value={p.billingAddressLine2} />
          <DetailRow label="City" value={p.billingCity} />
          <DetailRow label="State" value={p.billingState} />
          <DetailRow label="Pincode" value={p.billingPincode} />
          <DetailRow label="Country" value={p.billingCountry} />
        </dl>
      </div>

      {/* Terms & Notes */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">
          Terms & Notes
        </h3>
        <dl className="space-y-3 text-sm">
          <DetailRow
            label="Payment Terms"
            value={p.defaultPaymentTerms ? `Net ${p.defaultPaymentTerms} days` : null}
          />
          <DetailRow label="Default Currency" value={p.defaultCurrency} />
          <DetailRow label="Notes" value={p.notes} />
        </dl>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">{p.displayName}</h1>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${TYPE_STYLES[p.type] ?? ""}`}
              >
                {p.type}
              </span>
              {!p.isActive && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-600">
                  Inactive
                </span>
              )}
            </div>
            {p.legalName && (
              <p className="text-sm text-slate-500 mt-0.5">{p.legalName}</p>
            )}
          </div>
        </div>
        <Link
          href={`/clients/${p.id}/edit`}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-slate-200 rounded-lg bg-white text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Edit
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map((s) => (
          <div
            key={s.label}
            className={`bg-white rounded-xl border p-4 ${
              s.highlight ? "border-orange-200" : "border-slate-200"
            }`}
          >
            <p className="text-xs font-medium text-slate-500 mb-1">{s.label}</p>
            <p
              className={`text-xl font-bold ${s.highlight ? "text-orange-600" : "text-slate-800"}`}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <ClientDetailTabs invoicesTab={invoicesTab} detailsTab={detailsTab} />
    </div>
  );
}

function DetailRow({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-slate-500 shrink-0">{label}</dt>
      <dd className={`text-slate-800 text-right ${mono ? "font-mono text-xs" : ""}`}>
        {value ?? <span className="text-slate-300">—</span>}
      </dd>
    </div>
  );
}

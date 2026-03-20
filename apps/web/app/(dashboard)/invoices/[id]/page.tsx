import { auth } from "../../../../lib/auth";
import { prisma } from "../../../../lib/prisma";
import { formatCurrency, formatDate } from "../../../../lib/utils";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import type { Invoice, InvoiceLineItem, Party, Payment } from "@repo/db";
import { InvoiceDetailActions } from "../../../../components/invoice/InvoiceDetailActions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Invoice Detail" };

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

const SUPPLY_TYPE_LABELS: Record<string, string> = {
  INTRA_STATE: "Intra-State",
  INTER_STATE: "Inter-State",
  EXPORT: "Export",
};

const DOC_TYPE_LABELS: Record<string, string> = {
  TAX_INVOICE: "Tax Invoice",
  PROFORMA: "Proforma Invoice",
  QUOTATION: "Quotation",
  CREDIT_NOTE: "Credit Note",
  DEBIT_NOTE: "Debit Note",
  PURCHASE_ORDER: "Purchase Order",
  DELIVERY_CHALLAN: "Delivery Challan",
  PAYMENT_RECEIPT: "Payment Receipt",
};

const PAYMENT_MODE_LABELS: Record<string, string> = {
  CASH: "Cash",
  BANK_TRANSFER: "Bank Transfer",
  UPI: "UPI",
  CHEQUE: "Cheque",
  CREDIT_CARD: "Credit Card",
  DEBIT_CARD: "Debit Card",
  ONLINE: "Online",
};

type InvoiceWithRelations = Invoice & {
  lineItems: InvoiceLineItem[];
  client: Party | null;
  payments: Payment[];
};

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;

  const invoice = await prisma.invoice.findFirst({
    where: { id, businessId: session!.user.businessId! },
    include: {
      lineItems: { orderBy: { sortOrder: "asc" } },
      client: true,
      payments: { orderBy: { paymentDate: "desc" } },
    },
  }) as InvoiceWithRelations | null;

  if (!invoice) {
    redirect("/invoices");
  }

  const canEdit = invoice.status === "DRAFT";
  const canVoid = invoice.status === "SENT" || invoice.status === "PARTIALLY_PAID";
  const canRecordPayment =
    invoice.status !== "PAID" &&
    invoice.status !== "VOID" &&
    invoice.status !== "CANCELLED";

  const totalCGST = Number(invoice.totalCGST);
  const totalSGST = Number(invoice.totalSGST);
  const totalIGST = Number(invoice.totalIGST);
  const totalCess = Number(invoice.totalCess);
  const totalDiscount = Number(invoice.totalDiscount);
  const subtotal = Number(invoice.subtotal);
  const totalTaxable = Number(invoice.totalTaxable);
  const roundOff = Number(invoice.roundOff);
  const grandTotal = Number(invoice.grandTotal);
  const amountPaid = Number(invoice.amountPaid);
  const amountDue = Number(invoice.amountDue);

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          <Link
            href="/invoices"
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            ← Invoices
          </Link>
          <span className="text-slate-300">/</span>
          <h1 className="text-xl font-semibold text-slate-800">
            {invoice.invoiceNumber}
          </h1>
          <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
              STATUS_STYLES[invoice.status] ?? ""
            }`}
          >
            {invoice.status.replace(/_/g, " ")}
          </span>
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
            {DOC_TYPE_LABELS[invoice.documentType] ?? invoice.documentType}
          </span>
        </div>

        <InvoiceDetailActions
          invoiceId={id}
          invoiceNumber={invoice.invoiceNumber}
          status={invoice.status}
          amountDue={amountDue}
          currency={invoice.currency}
          canEdit={canEdit}
          canVoid={canVoid}
          canRecordPayment={canRecordPayment}
          canSend={invoice.status !== "VOID" && invoice.status !== "CANCELLED" && invoice.status !== "PAID"}
        />
      </div>

      {/* Two-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
        {/* LEFT: Invoice details */}
        <div className="lg:col-span-2 space-y-4">
          {/* Client info card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Bill To
            </h2>
            {invoice.client ? (
              <div className="space-y-1">
                <p className="font-semibold text-slate-800">
                  {invoice.client.displayName}
                </p>
                {invoice.client.legalName &&
                  invoice.client.legalName !== invoice.client.displayName && (
                    <p className="text-sm text-slate-500">
                      {invoice.client.legalName}
                    </p>
                  )}
                {invoice.client.gstin && (
                  <p className="text-sm text-slate-500">
                    GSTIN: {invoice.client.gstin}
                  </p>
                )}
                {invoice.client.contactEmail && (
                  <p className="text-sm text-slate-500">
                    {invoice.client.contactEmail}
                  </p>
                )}
                {invoice.client.contactPhone && (
                  <p className="text-sm text-slate-500">
                    {invoice.client.contactPhone}
                  </p>
                )}
                {invoice.client.billingAddressLine1 && (
                  <div className="text-sm text-slate-500 pt-1">
                    <p>{invoice.client.billingAddressLine1}</p>
                    {invoice.client.billingAddressLine2 && (
                      <p>{invoice.client.billingAddressLine2}</p>
                    )}
                    {(invoice.client.billingCity ||
                      invoice.client.billingState) && (
                      <p>
                        {[
                          invoice.client.billingCity,
                          invoice.client.billingState,
                          invoice.client.billingPincode,
                        ]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-slate-400 italic">No client assigned</p>
            )}
          </div>

          {/* Dates & details card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Invoice Details
            </h2>
            <dl className="space-y-2">
              <div className="flex justify-between text-sm">
                <dt className="text-slate-500">Invoice Date</dt>
                <dd className="font-medium text-slate-700">
                  {formatDate(invoice.invoiceDate)}
                </dd>
              </div>
              {invoice.dueDate && (
                <div className="flex justify-between text-sm">
                  <dt className="text-slate-500">Due Date</dt>
                  <dd className="font-medium text-slate-700">
                    {formatDate(invoice.dueDate)}
                  </dd>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <dt className="text-slate-500">Supply Type</dt>
                <dd className="font-medium text-slate-700">
                  {SUPPLY_TYPE_LABELS[invoice.supplyType] ?? invoice.supplyType}
                </dd>
              </div>
              {invoice.placeOfSupply && (
                <div className="flex justify-between text-sm">
                  <dt className="text-slate-500">Place of Supply</dt>
                  <dd className="font-medium text-slate-700">
                    {invoice.placeOfSupply}
                  </dd>
                </div>
              )}
              {invoice.currency !== "INR" && (
                <div className="flex justify-between text-sm">
                  <dt className="text-slate-500">Currency</dt>
                  <dd className="font-medium text-slate-700">
                    {invoice.currency} @ {Number(invoice.fxRate).toFixed(4)}
                  </dd>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <dt className="text-slate-500">Created</dt>
                <dd className="font-medium text-slate-700">
                  {formatDate(invoice.createdAt)}
                </dd>
              </div>
              {invoice.sentAt && (
                <div className="flex justify-between text-sm">
                  <dt className="text-slate-500">Sent</dt>
                  <dd className="font-medium text-slate-700">
                    {formatDate(invoice.sentAt)}
                  </dd>
                </div>
              )}
              {invoice.paidAt && (
                <div className="flex justify-between text-sm">
                  <dt className="text-slate-500">Paid</dt>
                  <dd className="font-medium text-slate-700">
                    {formatDate(invoice.paidAt)}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {/* Notes & Terms */}
          {(invoice.notes || invoice.terms) && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
              {invoice.notes && (
                <div>
                  <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Notes
                  </h2>
                  <p className="text-sm text-slate-600 whitespace-pre-line">
                    {invoice.notes}
                  </p>
                </div>
              )}
              {invoice.terms && (
                <div>
                  <h2 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                    Terms & Conditions
                  </h2>
                  <p className="text-sm text-slate-600 whitespace-pre-line">
                    {invoice.terms}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* RIGHT: Line items + tax summary */}
        <div className="lg:col-span-3 space-y-4">
          {/* Line items table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-700">
                Line Items
              </h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-left px-4 py-2.5 font-medium text-slate-500">
                      Item
                    </th>
                    <th className="text-right px-4 py-2.5 font-medium text-slate-500">
                      Qty
                    </th>
                    <th className="text-right px-4 py-2.5 font-medium text-slate-500">
                      Rate
                    </th>
                    <th className="text-right px-4 py-2.5 font-medium text-slate-500">
                      Tax
                    </th>
                    <th className="text-right px-4 py-2.5 font-medium text-slate-500">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {invoice.lineItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/50">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-800">
                          {item.itemName}
                        </p>
                        {item.description && (
                          <p className="text-xs text-slate-400 mt-0.5">
                            {item.description}
                          </p>
                        )}
                        {item.hsnSacCode && (
                          <p className="text-xs text-slate-400">
                            HSN/SAC: {item.hsnSacCode}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {Number(item.quantity)} {item.unit}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {formatCurrency(Number(item.rate), invoice.currency)}
                        {Number(item.discountValue) > 0 && (
                          <p className="text-xs text-slate-400">
                            -{item.discountType === "PERCENT"
                              ? `${Number(item.discountValue)}%`
                              : formatCurrency(
                                  Number(item.discountValue),
                                  invoice.currency
                                )}
                          </p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-600">
                        {Number(item.taxRate)}%
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-800">
                        {formatCurrency(Number(item.lineTotal), invoice.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Tax summary */}
            <div className="border-t border-slate-100 px-5 py-4">
              <dl className="space-y-1.5 max-w-xs ml-auto">
                <div className="flex justify-between text-sm text-slate-600">
                  <dt>Subtotal</dt>
                  <dd>{formatCurrency(subtotal, invoice.currency)}</dd>
                </div>
                {totalDiscount > 0 && (
                  <div className="flex justify-between text-sm text-slate-600">
                    <dt>Discount</dt>
                    <dd className="text-red-600">
                      -{formatCurrency(totalDiscount, invoice.currency)}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between text-sm text-slate-600">
                  <dt>Taxable Amount</dt>
                  <dd>{formatCurrency(totalTaxable, invoice.currency)}</dd>
                </div>
                {totalCGST > 0 && (
                  <div className="flex justify-between text-sm text-slate-600">
                    <dt>CGST</dt>
                    <dd>{formatCurrency(totalCGST, invoice.currency)}</dd>
                  </div>
                )}
                {totalSGST > 0 && (
                  <div className="flex justify-between text-sm text-slate-600">
                    <dt>SGST</dt>
                    <dd>{formatCurrency(totalSGST, invoice.currency)}</dd>
                  </div>
                )}
                {totalIGST > 0 && (
                  <div className="flex justify-between text-sm text-slate-600">
                    <dt>IGST</dt>
                    <dd>{formatCurrency(totalIGST, invoice.currency)}</dd>
                  </div>
                )}
                {totalCess > 0 && (
                  <div className="flex justify-between text-sm text-slate-600">
                    <dt>Cess</dt>
                    <dd>{formatCurrency(totalCess, invoice.currency)}</dd>
                  </div>
                )}
                {roundOff !== 0 && (
                  <div className="flex justify-between text-sm text-slate-600">
                    <dt>Round Off</dt>
                    <dd>{roundOff > 0 ? "+" : ""}{formatCurrency(roundOff, invoice.currency)}</dd>
                  </div>
                )}
                <div className="flex justify-between text-base font-semibold text-slate-800 border-t border-slate-200 pt-2 mt-2">
                  <dt>Grand Total</dt>
                  <dd>{formatCurrency(grandTotal, invoice.currency)}</dd>
                </div>
                {amountPaid > 0 && (
                  <>
                    <div className="flex justify-between text-sm text-green-600">
                      <dt>Amount Paid</dt>
                      <dd>{formatCurrency(amountPaid, invoice.currency)}</dd>
                    </div>
                    <div className="flex justify-between text-sm font-semibold text-orange-600">
                      <dt>Amount Due</dt>
                      <dd>{formatCurrency(amountDue, invoice.currency)}</dd>
                    </div>
                  </>
                )}
              </dl>
            </div>
          </div>
        </div>
      </div>

      {/* Payment History */}
      {invoice.payments.length > 0 && (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-slate-100">
            <h2 className="text-sm font-semibold text-slate-700">
              Payment History
            </h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-4 py-2.5 font-medium text-slate-500">
                  Date
                </th>
                <th className="text-left px-4 py-2.5 font-medium text-slate-500">
                  Mode
                </th>
                <th className="text-left px-4 py-2.5 font-medium text-slate-500">
                  Reference
                </th>
                <th className="text-right px-4 py-2.5 font-medium text-slate-500">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {invoice.payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 text-slate-700">
                    {formatDate(payment.paymentDate)}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {PAYMENT_MODE_LABELS[payment.mode] ?? payment.mode}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {payment.referenceNo ?? payment.chequeNo ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-green-700">
                    {formatCurrency(Number(payment.amount), payment.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}


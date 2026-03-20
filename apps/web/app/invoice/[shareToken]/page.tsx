import { prisma } from "../../../lib/prisma";
import { formatCurrency, formatDate } from "../../../lib/utils";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import type { Invoice, InvoiceLineItem, Party, Business } from "@repo/db";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ shareToken: string }>;
}): Promise<Metadata> {
  const { shareToken } = await params;
  const invoice = await prisma.invoice.findUnique({
    where: { shareToken },
    select: { invoiceNumber: true },
  });
  return {
    title: invoice ? `Invoice ${invoice.invoiceNumber}` : "Invoice",
  };
}

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

type InvoiceWithRelations = Invoice & {
  lineItems: InvoiceLineItem[];
  client: Party | null;
  business: Business;
};

export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ shareToken: string }>;
}) {
  const { shareToken } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { shareToken },
    include: {
      lineItems: { orderBy: { sortOrder: "asc" } },
      client: true,
      business: true,
    },
  }) as InvoiceWithRelations | null;

  if (!invoice) {
    notFound();
  }

  // Mark as VIEWED if it was SENT
  if (invoice.status === "SENT") {
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: "VIEWED" },
    });
  }

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

  const docTypeLabel =
    DOC_TYPE_LABELS[invoice.documentType] ?? invoice.documentType;
  const statusLabel = invoice.status.replace(/_/g, " ");
  const statusStyle = STATUS_STYLES[invoice.status] ?? "bg-slate-100 text-slate-600";

  const isPayable =
    invoice.status !== "PAID" &&
    invoice.status !== "VOID" &&
    invoice.status !== "CANCELLED" &&
    amountDue > 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 sm:px-6">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div className="flex items-center gap-2">
          <span className="text-lg font-bold text-slate-800">BillFlow</span>
        </div>
        <button
          onClick={() => window.print()}
          className="px-4 py-2 text-sm font-medium rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Print / Save PDF
        </button>
      </div>

      {/* Invoice card */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {/* Invoice header */}
        <div className="px-8 py-6 border-b border-slate-100">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                {invoice.invoiceNumber}
              </h1>
              <p className="text-sm text-slate-500 mt-1">{docTypeLabel}</p>
            </div>
            <div className="text-right">
              <span
                className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusStyle}`}
              >
                {statusLabel}
              </span>
              <p className="text-2xl font-bold text-slate-900 mt-2">
                {formatCurrency(grandTotal, invoice.currency)}
              </p>
              {invoice.dueDate && (
                <p className="text-sm text-slate-500 mt-1">
                  Due {formatDate(invoice.dueDate)}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* From / To */}
        <div className="px-8 py-6 border-b border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* From: Business */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              From
            </p>
            <p className="font-semibold text-slate-800">
              {invoice.business.name}
            </p>
            {invoice.business.legalName &&
              invoice.business.legalName !== invoice.business.name && (
                <p className="text-sm text-slate-500">
                  {invoice.business.legalName}
                </p>
              )}
            {invoice.business.gstin && (
              <p className="text-sm text-slate-500">
                GSTIN: {invoice.business.gstin}
              </p>
            )}
            {invoice.business.email && (
              <p className="text-sm text-slate-500">{invoice.business.email}</p>
            )}
            {invoice.business.phone && (
              <p className="text-sm text-slate-500">{invoice.business.phone}</p>
            )}
            {invoice.business.addressLine1 && (
              <div className="text-sm text-slate-500 mt-1">
                <p>{invoice.business.addressLine1}</p>
                {invoice.business.addressLine2 && (
                  <p>{invoice.business.addressLine2}</p>
                )}
                {(invoice.business.city || invoice.business.state) && (
                  <p>
                    {[
                      invoice.business.city,
                      invoice.business.state,
                      invoice.business.pincode,
                    ]
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* To: Client */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Bill To
            </p>
            {invoice.client ? (
              <>
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
                  <div className="text-sm text-slate-500 mt-1">
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
              </>
            ) : (
              <p className="text-sm text-slate-400 italic">
                No client assigned
              </p>
            )}
          </div>
        </div>

        {/* Invoice meta */}
        <div className="px-8 py-4 border-b border-slate-100 flex flex-wrap gap-x-8 gap-y-2">
          <div>
            <span className="text-xs text-slate-400 uppercase tracking-wider">
              Invoice Date
            </span>
            <p className="text-sm font-medium text-slate-700">
              {formatDate(invoice.invoiceDate)}
            </p>
          </div>
          {invoice.dueDate && (
            <div>
              <span className="text-xs text-slate-400 uppercase tracking-wider">
                Due Date
              </span>
              <p className="text-sm font-medium text-slate-700">
                {formatDate(invoice.dueDate)}
              </p>
            </div>
          )}
          {invoice.placeOfSupply && (
            <div>
              <span className="text-xs text-slate-400 uppercase tracking-wider">
                Place of Supply
              </span>
              <p className="text-sm font-medium text-slate-700">
                {invoice.placeOfSupply}
              </p>
            </div>
          )}
          {invoice.currency !== "INR" && (
            <div>
              <span className="text-xs text-slate-400 uppercase tracking-wider">
                Currency
              </span>
              <p className="text-sm font-medium text-slate-700">
                {invoice.currency} @ {Number(invoice.fxRate).toFixed(4)}
              </p>
            </div>
          )}
        </div>

        {/* Line items */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100">
                <th className="text-left px-6 py-3 font-semibold text-slate-500 uppercase tracking-wider text-xs">
                  Item
                </th>
                <th className="text-right px-4 py-3 font-semibold text-slate-500 uppercase tracking-wider text-xs">
                  Qty
                </th>
                <th className="text-right px-4 py-3 font-semibold text-slate-500 uppercase tracking-wider text-xs">
                  Rate
                </th>
                <th className="text-right px-4 py-3 font-semibold text-slate-500 uppercase tracking-wider text-xs">
                  Tax
                </th>
                <th className="text-right px-6 py-3 font-semibold text-slate-500 uppercase tracking-wider text-xs">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {invoice.lineItems.map((item) => (
                <tr key={item.id}>
                  <td className="px-6 py-4">
                    <p className="font-medium text-slate-800">{item.itemName}</p>
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
                  <td className="px-4 py-4 text-right text-slate-600">
                    {Number(item.quantity)} {item.unit}
                  </td>
                  <td className="px-4 py-4 text-right text-slate-600">
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
                  <td className="px-4 py-4 text-right text-slate-600">
                    {Number(item.taxRate)}%
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-slate-800">
                    {formatCurrency(Number(item.lineTotal), invoice.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals */}
        <div className="border-t border-slate-100 px-6 py-5">
          <dl className="space-y-2 max-w-xs ml-auto">
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
                <dd>
                  {roundOff > 0 ? "+" : ""}
                  {formatCurrency(roundOff, invoice.currency)}
                </dd>
              </div>
            )}
            <div className="flex justify-between text-base font-bold text-slate-900 border-t border-slate-200 pt-3 mt-2">
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

        {/* Bank details / payment */}
        {(invoice.business.bankName ||
          invoice.business.bankAccount ||
          invoice.business.upiId) && (
          <div className="border-t border-slate-100 px-8 py-5">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
              Payment Details
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-600">
              {invoice.business.bankName && (
                <div>
                  <span className="text-xs text-slate-400">Bank</span>
                  <p className="font-medium text-slate-700">
                    {invoice.business.bankName}
                  </p>
                </div>
              )}
              {invoice.business.bankAccount && (
                <div>
                  <span className="text-xs text-slate-400">Account No.</span>
                  <p className="font-medium text-slate-700">
                    {invoice.business.bankAccount}
                  </p>
                </div>
              )}
              {invoice.business.bankIfsc && (
                <div>
                  <span className="text-xs text-slate-400">IFSC</span>
                  <p className="font-medium text-slate-700">
                    {invoice.business.bankIfsc}
                  </p>
                </div>
              )}
              {invoice.business.upiId && (
                <div>
                  <span className="text-xs text-slate-400">UPI ID</span>
                  <p className="font-medium text-slate-700">
                    {invoice.business.upiId}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Notes & Terms */}
        {(invoice.notes || invoice.terms || invoice.business.invoiceFooter) && (
          <div className="border-t border-slate-100 px-8 py-5 space-y-4">
            {invoice.notes && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Notes
                </p>
                <p className="text-sm text-slate-600 whitespace-pre-line">
                  {invoice.notes}
                </p>
              </div>
            )}
            {invoice.terms && (
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Terms & Conditions
                </p>
                <p className="text-sm text-slate-600 whitespace-pre-line">
                  {invoice.terms}
                </p>
              </div>
            )}
            {invoice.business.invoiceFooter && (
              <p className="text-xs text-slate-400 text-center pt-2">
                {invoice.business.invoiceFooter}
              </p>
            )}
          </div>
        )}

        {/* Pay Now CTA */}
        {isPayable && (
          <div className="border-t border-slate-100 px-8 py-6 bg-slate-50 print:hidden">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="font-semibold text-slate-800">
                  Amount Due:{" "}
                  <span className="text-orange-600">
                    {formatCurrency(amountDue, invoice.currency)}
                  </span>
                </p>
                {invoice.dueDate && (
                  <p className="text-sm text-slate-500">
                    Due by {formatDate(invoice.dueDate)}
                  </p>
                )}
              </div>
              <button
                disabled
                className="px-6 py-2.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Online payments coming soon"
              >
                Pay Now
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <p className="text-center text-xs text-slate-400 mt-6 print:hidden">
        Powered by BillFlow &mdash; Professional Invoicing for Indian Businesses
      </p>
    </div>
  );
}

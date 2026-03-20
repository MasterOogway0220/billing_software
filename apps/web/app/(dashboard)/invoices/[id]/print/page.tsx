export const dynamic = "force-dynamic";

import { auth } from "../../../../../lib/auth";
import { prisma } from "../../../../../lib/prisma";
import { formatCurrency, formatDate, numberToWords } from "../../../../../lib/utils";
import { redirect } from "next/navigation";
import type { Invoice, InvoiceLineItem, Party, Payment, Business } from "@repo/db";
import PrintButton from "./PrintButton";

const DOC_TYPE_LABELS: Record<string, string> = {
  TAX_INVOICE: "TAX INVOICE",
  PROFORMA: "PROFORMA INVOICE",
  QUOTATION: "QUOTATION",
  CREDIT_NOTE: "CREDIT NOTE",
  DEBIT_NOTE: "DEBIT NOTE",
  PURCHASE_ORDER: "PURCHASE ORDER",
  DELIVERY_CHALLAN: "DELIVERY CHALLAN",
  PAYMENT_RECEIPT: "PAYMENT RECEIPT",
};

const SUPPLY_TYPE_LABELS: Record<string, string> = {
  INTRA_STATE: "Intra-State",
  INTER_STATE: "Inter-State",
  EXPORT: "Export",
};

type InvoiceWithRelations = Invoice & {
  lineItems: InvoiceLineItem[];
  client: Party | null;
  payments: Payment[];
};

export default async function InvoicePrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await auth();
  const { id } = await params;

  const [invoice, business] = await Promise.all([
    prisma.invoice.findFirst({
      where: { id, businessId: session!.user.businessId! },
      include: {
        lineItems: { orderBy: { sortOrder: "asc" } },
        client: true,
        payments: { orderBy: { paymentDate: "desc" } },
      },
    }) as Promise<InvoiceWithRelations | null>,
    prisma.business.findUnique({
      where: { id: session!.user.businessId! },
    }) as Promise<Business | null>,
  ]);

  if (!invoice || !business) {
    redirect("/invoices");
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

  const isIntraState = invoice.supplyType === "INTRA_STATE";

  return (
    <html>
      <head>
        <title>{invoice.invoiceNumber}</title>
        <meta charSet="utf-8" />
        <style>{`
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: Arial, sans-serif; font-size: 12px; color: #1e293b; background: white; }
          .page { max-width: 794px; margin: 0 auto; padding: 32px; }
          table { width: 100%; border-collapse: collapse; }
          th, td { padding: 6px 10px; text-align: left; }
          .border-table th, .border-table td { border: 1px solid #e2e8f0; }
          .text-right { text-align: right; }
          .text-center { text-align: center; }
          .font-bold { font-weight: 700; }
          .text-sm { font-size: 11px; }
          .text-xs { font-size: 10px; }
          .text-lg { font-size: 16px; }
          .text-xl { font-size: 20px; }
          .text-gray { color: #64748b; }
          .bg-gray { background-color: #f8fafc; }
          .divider { border-top: 1px solid #e2e8f0; margin: 12px 0; }
          .print-btn {
            position: fixed; top: 16px; right: 16px;
            background: #2563eb; color: white;
            border: none; padding: 8px 16px;
            border-radius: 6px; cursor: pointer;
            font-size: 13px; font-weight: 600;
            z-index: 1000;
          }
          .print-btn:hover { background: #1d4ed8; }
          @media print {
            .print-btn { display: none; }
            body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          }
        `}</style>
      </head>
      <body>
        <PrintButton />

        <div className="page">
          {/* Header: Business info + doc type */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 }}>
            <div>
              {business.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={business.logoUrl}
                  alt={business.name}
                  style={{ maxHeight: 56, maxWidth: 160, marginBottom: 8, objectFit: "contain" }}
                />
              )}
              <div className="font-bold text-lg">{business.name}</div>
              {business.legalName && business.legalName !== business.name && (
                <div className="text-sm text-gray">{business.legalName}</div>
              )}
              {business.addressLine1 && (
                <div className="text-sm text-gray" style={{ marginTop: 4 }}>
                  {business.addressLine1}
                  {business.addressLine2 && <>, {business.addressLine2}</>}
                  <br />
                  {[business.city, business.state, business.pincode].filter(Boolean).join(", ")}
                </div>
              )}
              {business.gstin && (
                <div className="text-sm" style={{ marginTop: 4 }}>
                  GSTIN: <span className="font-bold">{business.gstin}</span>
                </div>
              )}
              {business.pan && (
                <div className="text-sm">PAN: {business.pan}</div>
              )}
              {business.phone && (
                <div className="text-sm text-gray">{business.phone}</div>
              )}
              {business.email && (
                <div className="text-sm text-gray">{business.email}</div>
              )}
            </div>

            <div style={{ textAlign: "right" }}>
              <div className="text-xl font-bold" style={{ color: "#2563eb", letterSpacing: 1 }}>
                {DOC_TYPE_LABELS[invoice.documentType] ?? invoice.documentType}
              </div>
              <div style={{ marginTop: 8 }}>
                <div className="text-sm text-gray">Invoice No.</div>
                <div className="font-bold">{invoice.invoiceNumber}</div>
              </div>
              <div style={{ marginTop: 6 }}>
                <div className="text-sm text-gray">Invoice Date</div>
                <div className="font-bold">{formatDate(invoice.invoiceDate)}</div>
              </div>
              {invoice.dueDate && (
                <div style={{ marginTop: 6 }}>
                  <div className="text-sm text-gray">Due Date</div>
                  <div className="font-bold">{formatDate(invoice.dueDate)}</div>
                </div>
              )}
            </div>
          </div>

          <div className="divider" />

          {/* Bill To */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 20 }}>
            <div>
              <div className="text-xs text-gray font-bold" style={{ textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                Bill To
              </div>
              {invoice.client ? (
                <>
                  <div className="font-bold">{invoice.client.displayName}</div>
                  {invoice.client.legalName && invoice.client.legalName !== invoice.client.displayName && (
                    <div className="text-sm text-gray">{invoice.client.legalName}</div>
                  )}
                  {invoice.client.gstin && (
                    <div className="text-sm">GSTIN: {invoice.client.gstin}</div>
                  )}
                  {invoice.client.pan && (
                    <div className="text-sm">PAN: {invoice.client.pan}</div>
                  )}
                  {invoice.client.billingAddressLine1 && (
                    <div className="text-sm text-gray" style={{ marginTop: 4 }}>
                      {invoice.client.billingAddressLine1}
                      {invoice.client.billingAddressLine2 && (
                        <>, {invoice.client.billingAddressLine2}</>
                      )}
                      <br />
                      {[
                        invoice.client.billingCity,
                        invoice.client.billingState,
                        invoice.client.billingPincode,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                  )}
                  {invoice.client.contactEmail && (
                    <div className="text-sm text-gray">{invoice.client.contactEmail}</div>
                  )}
                  {invoice.client.contactPhone && (
                    <div className="text-sm text-gray">{invoice.client.contactPhone}</div>
                  )}
                </>
              ) : (
                <div className="text-sm text-gray">No client assigned</div>
              )}
            </div>

            <div>
              <div className="text-xs text-gray font-bold" style={{ textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                Supply Details
              </div>
              <div className="text-sm">
                <span className="text-gray">Supply Type: </span>
                {SUPPLY_TYPE_LABELS[invoice.supplyType] ?? invoice.supplyType}
              </div>
              {invoice.placeOfSupply && (
                <div className="text-sm">
                  <span className="text-gray">Place of Supply: </span>
                  {invoice.placeOfSupply}
                </div>
              )}
              {invoice.currency !== "INR" && (
                <div className="text-sm">
                  <span className="text-gray">Currency: </span>
                  {invoice.currency} @ {Number(invoice.fxRate).toFixed(4)}
                </div>
              )}
            </div>
          </div>

          <div className="divider" />

          {/* Line items table */}
          <table className="border-table" style={{ marginBottom: 16 }}>
            <thead>
              <tr className="bg-gray">
                <th style={{ width: 30 }}>#</th>
                <th>Item / Description</th>
                <th className="text-right" style={{ width: 80 }}>HSN/SAC</th>
                <th className="text-right" style={{ width: 60 }}>Qty</th>
                <th className="text-right" style={{ width: 80 }}>Rate</th>
                <th className="text-right" style={{ width: 70 }}>Discount</th>
                <th className="text-right" style={{ width: 90 }}>Taxable</th>
                {isIntraState ? (
                  <>
                    <th className="text-right" style={{ width: 80 }}>CGST</th>
                    <th className="text-right" style={{ width: 80 }}>SGST</th>
                  </>
                ) : (
                  <th className="text-right" style={{ width: 80 }}>IGST</th>
                )}
                {totalCess > 0 && (
                  <th className="text-right" style={{ width: 70 }}>Cess</th>
                )}
                <th className="text-right" style={{ width: 90 }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {invoice.lineItems.map((item, idx) => (
                <tr key={item.id}>
                  <td className="text-center text-gray">{idx + 1}</td>
                  <td>
                    <div className="font-bold">{item.itemName}</div>
                    {item.description && (
                      <div className="text-xs text-gray">{item.description}</div>
                    )}
                  </td>
                  <td className="text-right text-gray">{item.hsnSacCode ?? "—"}</td>
                  <td className="text-right">
                    {Number(item.quantity)} {item.unit}
                  </td>
                  <td className="text-right">
                    {formatCurrency(Number(item.rate), invoice.currency)}
                  </td>
                  <td className="text-right text-gray">
                    {Number(item.discountValue) > 0
                      ? item.discountType === "PERCENT"
                        ? `${Number(item.discountValue)}%`
                        : formatCurrency(Number(item.discountValue), invoice.currency)
                      : "—"}
                  </td>
                  <td className="text-right">
                    {formatCurrency(Number(item.taxableAmount), invoice.currency)}
                  </td>
                  {isIntraState ? (
                    <>
                      <td className="text-right">
                        <div>{formatCurrency(Number(item.cgstAmount), invoice.currency)}</div>
                        <div className="text-xs text-gray">{Number(item.cgstRate)}%</div>
                      </td>
                      <td className="text-right">
                        <div>{formatCurrency(Number(item.sgstAmount), invoice.currency)}</div>
                        <div className="text-xs text-gray">{Number(item.sgstRate)}%</div>
                      </td>
                    </>
                  ) : (
                    <td className="text-right">
                      <div>{formatCurrency(Number(item.igstAmount), invoice.currency)}</div>
                      <div className="text-xs text-gray">{Number(item.igstRate)}%</div>
                    </td>
                  )}
                  {totalCess > 0 && (
                    <td className="text-right">
                      {formatCurrency(Number(item.cessAmount), invoice.currency)}
                    </td>
                  )}
                  <td className="text-right font-bold">
                    {formatCurrency(Number(item.lineTotal), invoice.currency)}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray">
                <td colSpan={6} className="font-bold text-right">Totals</td>
                <td className="text-right font-bold">
                  {formatCurrency(totalTaxable, invoice.currency)}
                </td>
                {isIntraState ? (
                  <>
                    <td className="text-right font-bold">
                      {formatCurrency(totalCGST, invoice.currency)}
                    </td>
                    <td className="text-right font-bold">
                      {formatCurrency(totalSGST, invoice.currency)}
                    </td>
                  </>
                ) : (
                  <td className="text-right font-bold">
                    {formatCurrency(totalIGST, invoice.currency)}
                  </td>
                )}
                {totalCess > 0 && (
                  <td className="text-right font-bold">
                    {formatCurrency(totalCess, invoice.currency)}
                  </td>
                )}
                <td className="text-right font-bold">
                  {formatCurrency(grandTotal, invoice.currency)}
                </td>
              </tr>
            </tfoot>
          </table>

          {/* Totals summary + amount in words */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 20 }}>
            <div>
              <div className="text-sm font-bold" style={{ marginBottom: 4 }}>
                Amount in Words
              </div>
              <div className="text-sm text-gray" style={{ fontStyle: "italic" }}>
                {numberToWords(grandTotal)}
              </div>

              {/* Payment History in print */}
              {invoice.payments.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div className="text-xs font-bold text-gray" style={{ textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                    Payments Received
                  </div>
                  <table style={{ width: "100%" }}>
                    <thead>
                      <tr className="text-gray text-xs">
                        <th style={{ textAlign: "left", paddingBottom: 4 }}>Date</th>
                        <th style={{ textAlign: "left", paddingBottom: 4 }}>Mode</th>
                        <th style={{ textAlign: "right", paddingBottom: 4 }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.payments.map((p) => (
                        <tr key={p.id} className="text-sm">
                          <td>{formatDate(p.paymentDate)}</td>
                          <td>{p.mode}</td>
                          <td className="text-right">
                            {formatCurrency(Number(p.amount), p.currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div style={{ textAlign: "right" }}>
              <table style={{ marginLeft: "auto", minWidth: 220 }}>
                <tbody>
                  <tr>
                    <td className="text-gray text-sm" style={{ paddingBottom: 4, paddingRight: 16 }}>Subtotal</td>
                    <td className="text-right text-sm">{formatCurrency(subtotal, invoice.currency)}</td>
                  </tr>
                  {totalDiscount > 0 && (
                    <tr>
                      <td className="text-gray text-sm" style={{ paddingBottom: 4, paddingRight: 16 }}>Discount</td>
                      <td className="text-right text-sm" style={{ color: "#dc2626" }}>
                        -{formatCurrency(totalDiscount, invoice.currency)}
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td className="text-gray text-sm" style={{ paddingBottom: 4, paddingRight: 16 }}>Taxable Amount</td>
                    <td className="text-right text-sm">{formatCurrency(totalTaxable, invoice.currency)}</td>
                  </tr>
                  {totalCGST > 0 && (
                    <tr>
                      <td className="text-gray text-sm" style={{ paddingBottom: 4, paddingRight: 16 }}>CGST</td>
                      <td className="text-right text-sm">{formatCurrency(totalCGST, invoice.currency)}</td>
                    </tr>
                  )}
                  {totalSGST > 0 && (
                    <tr>
                      <td className="text-gray text-sm" style={{ paddingBottom: 4, paddingRight: 16 }}>SGST</td>
                      <td className="text-right text-sm">{formatCurrency(totalSGST, invoice.currency)}</td>
                    </tr>
                  )}
                  {totalIGST > 0 && (
                    <tr>
                      <td className="text-gray text-sm" style={{ paddingBottom: 4, paddingRight: 16 }}>IGST</td>
                      <td className="text-right text-sm">{formatCurrency(totalIGST, invoice.currency)}</td>
                    </tr>
                  )}
                  {totalCess > 0 && (
                    <tr>
                      <td className="text-gray text-sm" style={{ paddingBottom: 4, paddingRight: 16 }}>Cess</td>
                      <td className="text-right text-sm">{formatCurrency(totalCess, invoice.currency)}</td>
                    </tr>
                  )}
                  {roundOff !== 0 && (
                    <tr>
                      <td className="text-gray text-sm" style={{ paddingBottom: 4, paddingRight: 16 }}>Round Off</td>
                      <td className="text-right text-sm">{formatCurrency(roundOff, invoice.currency)}</td>
                    </tr>
                  )}
                  <tr style={{ borderTop: "2px solid #e2e8f0" }}>
                    <td className="font-bold" style={{ paddingTop: 8, paddingRight: 16 }}>Grand Total</td>
                    <td className="text-right font-bold" style={{ paddingTop: 8 }}>
                      {formatCurrency(grandTotal, invoice.currency)}
                    </td>
                  </tr>
                  {amountPaid > 0 && (
                    <>
                      <tr>
                        <td className="text-sm" style={{ paddingTop: 6, paddingRight: 16, color: "#16a34a" }}>Amount Paid</td>
                        <td className="text-right text-sm" style={{ paddingTop: 6, color: "#16a34a" }}>
                          {formatCurrency(amountPaid, invoice.currency)}
                        </td>
                      </tr>
                      <tr>
                        <td className="font-bold text-sm" style={{ paddingTop: 4, paddingRight: 16, color: "#ea580c" }}>Balance Due</td>
                        <td className="text-right font-bold text-sm" style={{ paddingTop: 4, color: "#ea580c" }}>
                          {formatCurrency(amountDue, invoice.currency)}
                        </td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Bank Details */}
          {(business.bankName || business.upiId) && (
            <>
              <div className="divider" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 16 }}>
                {business.bankName && (
                  <div>
                    <div className="text-xs font-bold text-gray" style={{ textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                      Bank Details
                    </div>
                    <div className="text-sm">
                      <div>{business.bankName}</div>
                      {business.bankAccount && <div>A/C: {business.bankAccount}</div>}
                      {business.bankIfsc && <div>IFSC: {business.bankIfsc}</div>}
                      {business.bankBranch && <div>Branch: {business.bankBranch}</div>}
                    </div>
                  </div>
                )}
                {business.upiId && (
                  <div>
                    <div className="text-xs font-bold text-gray" style={{ textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 }}>
                      UPI
                    </div>
                    <div className="text-sm">{business.upiId}</div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Notes & Terms */}
          {(invoice.notes || invoice.terms || business.invoiceFooter) && (
            <>
              <div className="divider" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 16 }}>
                {invoice.notes && (
                  <div>
                    <div className="text-xs font-bold text-gray" style={{ textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                      Notes
                    </div>
                    <div className="text-sm text-gray" style={{ whiteSpace: "pre-line" }}>{invoice.notes}</div>
                  </div>
                )}
                {(invoice.terms || business.invoiceFooter) && (
                  <div>
                    <div className="text-xs font-bold text-gray" style={{ textTransform: "uppercase", letterSpacing: 1, marginBottom: 4 }}>
                      Terms & Conditions
                    </div>
                    <div className="text-sm text-gray" style={{ whiteSpace: "pre-line" }}>
                      {invoice.terms ?? business.invoiceFooter}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}

          {/* Signature */}
          <div className="divider" />
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 32 }}>
            <div style={{ textAlign: "center", minWidth: 160 }}>
              {business.signatureUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={business.signatureUrl}
                  alt="Signature"
                  style={{ maxHeight: 60, maxWidth: 160, objectFit: "contain", marginBottom: 8 }}
                />
              )}
              <div style={{ borderTop: "1px solid #e2e8f0", paddingTop: 6 }}>
                <div className="text-sm font-bold">{business.name}</div>
                <div className="text-xs text-gray">Authorised Signatory</div>
              </div>
            </div>
          </div>
        </div>

      </body>
    </html>
  );
}

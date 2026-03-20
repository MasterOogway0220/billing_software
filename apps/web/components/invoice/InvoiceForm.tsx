"use client";

import { useState, useCallback } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2, ChevronDown } from "lucide-react";
import { createInvoiceSchema, type CreateInvoiceInput } from "../../schemas/invoice.schema";
import { calculateLineItem, calculateInvoiceTotals } from "../../lib/gst";
import { formatCurrency, numberToWords } from "../../lib/utils";
import { api } from "../../lib/api";

interface Props {
  clients: { id: string; displayName: string; gstin?: string | null; billingState?: string | null; billingStateCode?: string | null }[];
  numberConfig: { prefix?: string | null; separator: string; paddingDigits: number; currentCounter: number; startingNumber: number } | null;
}

const TAX_RATES = [0, 5, 12, 18, 28];

const UNITS = ["pcs", "hrs", "kg", "mt", "ltr", "box", "set", "month", "year"];

export function InvoiceForm({ clients, numberConfig }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [sending, setSending] = useState(false);

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CreateInvoiceInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(createInvoiceSchema) as any,
    defaultValues: {
      documentType: "TAX_INVOICE",
      invoiceDate: new Date().toISOString().split("T")[0],
      currency: "INR",
      fxRate: 1,
      supplyType: "INTRA_STATE",
      applyRoundOff: false,
      lineItems: [
        {
          itemName: "",
          unit: "pcs",
          quantity: 1,
          rate: 0,
          discountType: "PERCENT",
          discountValue: 0,
          taxRate: 18,
          sortOrder: 0,
        },
      ],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "lineItems" });
  const watchedItems = watch("lineItems");
  const supplyType = watch("supplyType");
  const applyRoundOff = watch("applyRoundOff");

  const calculatedItems = watchedItems.map((item) =>
    calculateLineItem({
      quantity: Number(item.quantity) || 0,
      rate: Number(item.rate) || 0,
      discountType: item.discountType,
      discountValue: Number(item.discountValue) || 0,
      taxRate: Number(item.taxRate) || 0,
      supplyType,
    })
  );

  const totals = calculateInvoiceTotals(calculatedItems, applyRoundOff);

  const addLine = useCallback(() => {
    append({
      itemName: "",
      unit: "pcs",
      quantity: 1,
      rate: 0,
      discountType: "PERCENT",
      discountValue: 0,
      taxRate: 18,
      sortOrder: fields.length,
    });
  }, [append, fields.length]);

  async function submit(data: CreateInvoiceInput, asDraft: boolean) {
    if (asDraft) setSaving(true);
    else setSending(true);

    try {
      const res = await api.post<{ id: string }>("/api/v1/invoices", data);
      toast.success(`Invoice ${asDraft ? "saved as draft" : "created"}`);
      router.push(`/invoices/${res.data.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save invoice");
    } finally {
      setSaving(false);
      setSending(false);
    }
  }

  // Predict next invoice number
  const nextNum = (() => {
    if (!numberConfig) return "";
    const counter = Math.max(numberConfig.currentCounter + 1, numberConfig.startingNumber);
    const num = String(counter).padStart(numberConfig.paddingDigits, "0");
    return [numberConfig.prefix, num].filter(Boolean).join(numberConfig.separator);
  })();

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Document Type</label>
          <select
            {...register("documentType")}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
          >
            <option value="TAX_INVOICE">Tax Invoice</option>
            <option value="PROFORMA">Proforma Invoice</option>
            <option value="QUOTATION">Quotation</option>
            <option value="CREDIT_NOTE">Credit Note</option>
            <option value="DEBIT_NOTE">Debit Note</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">
            Invoice Number
            {nextNum && <span className="ml-1 text-blue-500">(next: {nextNum})</span>}
          </label>
          <input
            {...register("invoiceNumber")}
            placeholder="Auto-generated if empty"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Bill To (Client)</label>
          <select
            {...register("clientId")}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
          >
            <option value="">— Select client —</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.displayName}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Invoice Date</label>
          <input
            {...register("invoiceDate")}
            type="date"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Due Date</label>
          <input
            {...register("dueDate")}
            type="date"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-500 mb-1">Supply Type</label>
          <select
            {...register("supplyType")}
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
          >
            <option value="INTRA_STATE">Intra-state (CGST + SGST)</option>
            <option value="INTER_STATE">Inter-state (IGST)</option>
            <option value="EXPORT">Export (Zero-rated)</option>
          </select>
        </div>
      </div>

      {/* Line Items */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50">
          <h3 className="text-sm font-semibold text-slate-700">Line Items</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-3 py-2 font-medium text-slate-500 w-1/4">Item / Service</th>
                <th className="text-left px-3 py-2 font-medium text-slate-500 w-16">HSN/SAC</th>
                <th className="text-left px-3 py-2 font-medium text-slate-500 w-20">Unit</th>
                <th className="text-right px-3 py-2 font-medium text-slate-500 w-20">Qty</th>
                <th className="text-right px-3 py-2 font-medium text-slate-500 w-24">Rate</th>
                <th className="text-right px-3 py-2 font-medium text-slate-500 w-24">Discount</th>
                <th className="text-right px-3 py-2 font-medium text-slate-500 w-20">Tax %</th>
                <th className="text-right px-3 py-2 font-medium text-slate-500 w-28">Amount</th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {fields.map((field, idx) => {
                const calc = calculatedItems[idx];
                return (
                  <tr key={field.id}>
                    <td className="px-2 py-2">
                      <input
                        {...register(`lineItems.${idx}.itemName`)}
                        placeholder="Item name"
                        className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                      <input
                        {...register(`lineItems.${idx}.description`)}
                        placeholder="Description (optional)"
                        className="w-full px-2 py-1 text-xs text-slate-400 placeholder-slate-300 border-0 focus:outline-none mt-0.5"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        {...register(`lineItems.${idx}.hsnSacCode`)}
                        placeholder="HSN"
                        className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <select
                        {...register(`lineItems.${idx}.unit`)}
                        className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm"
                      >
                        {UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-2">
                      <input
                        {...register(`lineItems.${idx}.quantity`, { valueAsNumber: true })}
                        type="number"
                        min="0"
                        step="any"
                        className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm text-right focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <input
                        {...register(`lineItems.${idx}.rate`, { valueAsNumber: true })}
                        type="number"
                        min="0"
                        step="any"
                        className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm text-right focus:ring-1 focus:ring-blue-500 focus:outline-none"
                      />
                    </td>
                    <td className="px-2 py-2">
                      <div className="flex gap-1">
                        <select
                          {...register(`lineItems.${idx}.discountType`)}
                          className="px-1 py-1.5 border border-slate-200 rounded text-xs"
                        >
                          <option value="PERCENT">%</option>
                          <option value="FLAT">₹</option>
                        </select>
                        <input
                          {...register(`lineItems.${idx}.discountValue`, { valueAsNumber: true })}
                          type="number"
                          min="0"
                          step="any"
                          className="w-14 px-2 py-1.5 border border-slate-200 rounded text-sm text-right focus:ring-1 focus:ring-blue-500 focus:outline-none"
                        />
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <select
                        {...register(`lineItems.${idx}.taxRate`, { valueAsNumber: true })}
                        className="w-full px-2 py-1.5 border border-slate-200 rounded text-sm"
                      >
                        {TAX_RATES.map((r) => <option key={r} value={r}>{r}%</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-2 text-right font-medium text-slate-700">
                      {formatCurrency(calc?.lineTotal ?? 0)}
                    </td>
                    <td className="px-1 py-2 text-center">
                      {fields.length > 1 && (
                        <button
                          type="button"
                          onClick={() => remove(idx)}
                          className="text-slate-300 hover:text-red-500 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-slate-100">
          <button
            type="button"
            onClick={addLine}
            className="flex items-center gap-1.5 text-sm text-blue-600 font-medium hover:text-blue-800"
          >
            <Plus className="w-4 h-4" />
            Add line item
          </button>
        </div>
      </div>

      {/* Totals + Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-3">Notes & Terms</h3>
            <textarea
              {...register("notes")}
              rows={3}
              placeholder="Notes to client (e.g. payment instructions, thank you message)"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:ring-1 focus:ring-blue-500 focus:outline-none"
            />
            <textarea
              {...register("terms")}
              rows={2}
              placeholder="Terms & conditions"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:ring-1 focus:ring-blue-500 focus:outline-none mt-2"
            />
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Summary</h3>
          <div className="space-y-2 text-sm">
            <Row label="Subtotal" value={formatCurrency(totals.subtotal)} />
            {totals.totalDiscount > 0 && (
              <Row label="Total Discount" value={`-${formatCurrency(totals.totalDiscount)}`} className="text-green-600" />
            )}
            <Row label="Taxable Amount" value={formatCurrency(totals.totalTaxable)} />
            {totals.totalCGST > 0 && <Row label="CGST" value={formatCurrency(totals.totalCGST)} />}
            {totals.totalSGST > 0 && <Row label="SGST" value={formatCurrency(totals.totalSGST)} />}
            {totals.totalIGST > 0 && <Row label="IGST" value={formatCurrency(totals.totalIGST)} />}
            {totals.totalCess > 0 && <Row label="Cess" value={formatCurrency(totals.totalCess)} />}

            <div className="flex items-center gap-2 text-xs text-slate-500">
              <input
                type="checkbox"
                id="roundOff"
                {...register("applyRoundOff")}
                className="rounded"
              />
              <label htmlFor="roundOff">Apply round-off ({totals.roundOff >= 0 ? "+" : ""}{totals.roundOff.toFixed(2)})</label>
            </div>

            <div className="border-t border-slate-200 pt-2 mt-2">
              <Row
                label="Grand Total"
                value={formatCurrency(totals.grandTotal)}
                bold
              />
            </div>
            <p className="text-xs text-slate-400 italic mt-1">
              {totals.grandTotal > 0 ? numberToWords(totals.grandTotal) : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 sticky bottom-6 bg-transparent">
        <button
          type="button"
          onClick={handleSubmit((data) => submit(data, true))}
          disabled={saving || sending}
          className="px-5 py-2.5 border border-slate-300 bg-white text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-60"
        >
          {saving ? "Saving…" : "Save as Draft"}
        </button>
        <button
          type="button"
          onClick={handleSubmit((data) => submit(data, false))}
          disabled={saving || sending}
          className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
        >
          {sending ? "Creating…" : "Create Invoice"}
        </button>
      </div>
    </div>
  );
}

function Row({
  label, value, bold = false, className = ""
}: {
  label: string; value: string; bold?: boolean; className?: string;
}) {
  return (
    <div className={`flex justify-between ${className}`}>
      <span className={`text-slate-500 ${bold ? "font-semibold text-slate-800" : ""}`}>{label}</span>
      <span className={bold ? "font-bold text-slate-800" : "text-slate-700"}>{value}</span>
    </div>
  );
}

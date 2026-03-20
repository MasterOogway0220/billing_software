"use client";

import { useState } from "react";
import { formatCurrency } from "../../lib/utils";

type PaymentMode = "BANK_TRANSFER" | "CASH" | "CHEQUE" | "UPI" | "CREDIT_CARD" | "DEBIT_CARD" | "ONLINE";

interface RecordPaymentFormData {
  amount: number;
  paymentDate: string;
  mode: PaymentMode;
  reference: string;
  notes: string;
}

interface RecordPaymentModalProps {
  invoiceId: string;
  invoiceNumber: string;
  amountDue: number;
  currency: string;
  onSuccess: () => void;
}

const MODE_OPTIONS: { value: PaymentMode; label: string }[] = [
  { value: "BANK_TRANSFER", label: "Bank Transfer" },
  { value: "CASH", label: "Cash" },
  { value: "CHEQUE", label: "Cheque" },
  { value: "UPI", label: "UPI" },
  { value: "CREDIT_CARD", label: "Credit Card" },
  { value: "DEBIT_CARD", label: "Debit Card" },
  { value: "ONLINE", label: "Online" },
];

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function RecordPaymentModal({
  invoiceId,
  invoiceNumber,
  amountDue,
  currency,
  onSuccess,
  open,
  onClose,
}: RecordPaymentModalProps & { open: boolean; onClose: () => void }) {
  const [form, setForm] = useState<RecordPaymentFormData>({
    amount: amountDue,
    paymentDate: todayISO(),
    mode: "BANK_TRANSFER",
    reference: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === "amount" ? parseFloat(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (form.amount <= 0) {
      setError("Amount must be greater than 0.");
      return;
    }
    if (form.amount > amountDue + 0.01) {
      setError(`Amount cannot exceed the amount due (${formatCurrency(amountDue, currency)}).`);
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceId,
          amount: form.amount,
          paymentDate: form.paymentDate,
          mode: form.mode,
          referenceNo: form.reference || undefined,
          notes: form.notes || undefined,
          tdsAmount: 0,
        }),
      });
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.message ?? "Failed to record payment.");
        return;
      }
      onSuccess();
      onClose();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Record Payment</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Invoice {invoiceNumber} — Due:{" "}
              <span className="font-medium text-orange-600">
                {formatCurrency(amountDue, currency)}
              </span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-1"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {/* Amount */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Amount *
            </label>
            <input
              name="amount"
              type="number"
              step="0.01"
              min="0.01"
              max={amountDue}
              value={form.amount}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
            />
          </div>

          {/* Payment Date */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Payment Date *
            </label>
            <input
              name="paymentDate"
              type="date"
              value={form.paymentDate}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
            />
          </div>

          {/* Payment Mode */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Payment Mode *
            </label>
            <select
              name="mode"
              value={form.mode}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 bg-white"
            >
              {MODE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Reference # */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Reference # <span className="text-slate-400">(optional)</span>
            </label>
            <input
              name="reference"
              type="text"
              value={form.reference}
              onChange={handleChange}
              placeholder="UTR / Cheque / Transaction ID"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Notes <span className="text-slate-400">(optional)</span>
            </label>
            <textarea
              name="notes"
              value={form.notes}
              onChange={handleChange}
              rows={2}
              placeholder="Any remarks…"
              className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 resize-none"
            />
          </div>

          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-sm font-medium border border-slate-200 rounded-lg text-slate-700 bg-white hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2 text-sm font-semibold rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60 transition-colors"
            >
              {submitting ? "Recording…" : "Record Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function useRecordPayment(props: RecordPaymentModalProps) {
  const [open, setOpen] = useState(false);

  const modal = (
    <RecordPaymentModal
      {...props}
      open={open}
      onClose={() => setOpen(false)}
    />
  );

  return { open, setOpen, modal };
}

export default RecordPaymentModal;

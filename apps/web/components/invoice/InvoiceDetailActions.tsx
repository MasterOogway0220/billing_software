"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import Link from "next/link";
import { api } from "../../lib/api";
import { RecordPaymentModal } from "./RecordPaymentModal";

interface Props {
  invoiceId: string;
  invoiceNumber: string;
  status: string;
  amountDue: number;
  currency: string;
  canEdit: boolean;
  canVoid: boolean;
  canRecordPayment: boolean;
  canSend: boolean;
}

export function InvoiceDetailActions({
  invoiceId,
  invoiceNumber,
  status,
  amountDue,
  currency,
  canEdit,
  canVoid,
  canRecordPayment,
  canSend,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);

  async function handleShare() {
    setLoading("share");
    try {
      const res = await api.post<{ shareToken: string }>(
        `/api/v1/invoices/${invoiceId}/share`,
        {}
      );
      const shareUrl = `${window.location.origin}/invoice/${res.data.shareToken}`;
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Share link copied to clipboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to get share link");
    } finally {
      setLoading(null);
    }
  }

  async function handleVoid() {
    if (!confirm("Are you sure you want to void this invoice? This cannot be undone.")) return;
    setLoading("void");
    try {
      await api.post(`/api/v1/invoices/${invoiceId}/void`, {});
      toast.success("Invoice voided");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to void invoice");
    } finally {
      setLoading(null);
    }
  }

  async function handleDuplicate() {
    setLoading("duplicate");
    try {
      const res = await api.post<{ id: string }>(`/api/v1/invoices/${invoiceId}/duplicate`, {});
      toast.success("Invoice duplicated");
      router.push(`/invoices/${res.data.id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to duplicate invoice");
    } finally {
      setLoading(null);
    }
  }

  async function handleSend() {
    setLoading("send");
    try {
      await api.post(`/api/v1/invoices/${invoiceId}/send`, {});
      toast.success("Invoice marked as sent");
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to update status");
    } finally {
      setLoading(null);
    }
  }

  const btnBase =
    "px-3 py-1.5 text-sm font-medium rounded-lg transition-colors disabled:opacity-60";

  return (
    <>
      <div className="flex items-center gap-2 flex-wrap">
        {canEdit && (
          <Link
            href={`/invoices/${invoiceId}/edit`}
            className={`${btnBase} bg-white border border-slate-200 text-slate-700 hover:bg-slate-50`}
          >
            Edit
          </Link>
        )}

        {canRecordPayment && (
          <button
            onClick={() => setPaymentOpen(true)}
            className={`${btnBase} bg-white border border-slate-200 text-slate-700 hover:bg-slate-50`}
          >
            Record Payment
          </button>
        )}

        {canVoid && (
          <button
            onClick={handleVoid}
            disabled={loading === "void"}
            className={`${btnBase} bg-white border border-red-200 text-red-600 hover:bg-red-50`}
          >
            {loading === "void" ? "Voiding…" : "Void"}
          </button>
        )}

        <button
          onClick={handleDuplicate}
          disabled={loading === "duplicate"}
          className={`${btnBase} bg-white border border-slate-200 text-slate-700 hover:bg-slate-50`}
        >
          {loading === "duplicate" ? "Duplicating…" : "Duplicate"}
        </button>

        <Link
          href={`/invoices/${invoiceId}/print`}
          target="_blank"
          className={`${btnBase} bg-white border border-slate-200 text-slate-700 hover:bg-slate-50`}
        >
          Download PDF
        </Link>

        <button
          onClick={handleShare}
          disabled={loading === "share"}
          className={`${btnBase} bg-white border border-slate-200 text-slate-700 hover:bg-slate-50`}
        >
          {loading === "share" ? "Copying…" : "Copy Share Link"}
        </button>

        {canSend && (
          <button
            onClick={handleSend}
            disabled={loading === "send"}
            className={`${btnBase} bg-blue-600 text-white hover:bg-blue-700`}
          >
            {loading === "send" ? "Sending…" : status === "DRAFT" ? "Mark as Sent" : "Resend"}
          </button>
        )}
      </div>

      <RecordPaymentModal
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        invoiceId={invoiceId}
        invoiceNumber={invoiceNumber}
        amountDue={amountDue}
        currency={currency}
        onSuccess={() => {
          setPaymentOpen(false);
          router.refresh();
        }}
      />
    </>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { api } from "../../../lib/api";
import type { BusinessProfileInput } from "../../../schemas/business.schema";

const DOCUMENT_TYPES = [
  { value: "TAX_INVOICE", label: "Tax Invoice" },
  { value: "PROFORMA", label: "Proforma Invoice" },
  { value: "QUOTATION", label: "Quotation" },
  { value: "CREDIT_NOTE", label: "Credit Note" },
  { value: "DEBIT_NOTE", label: "Debit Note" },
] as const;

const TABS = [
  { key: "profile", label: "Business Profile" },
  { key: "numbering", label: "Invoice Numbering" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

type NumberConfig = {
  id: string;
  documentType: string;
  prefix: string | null;
  currentCounter: number;
  separator: string;
  paddingDigits: number;
};

type Business = {
  id: string;
  name: string;
  legalName?: string | null;
  type: string;
  gstin?: string | null;
  pan?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  state?: string | null;
  stateCode?: string | null;
  pincode?: string | null;
  country?: string | null;
  bankName?: string | null;
  bankAccount?: string | null;
  bankIfsc?: string | null;
  upiId?: string | null;
  invoiceFooter?: string | null;
  financialYearStart?: string;
  defaultCurrency?: string;
};

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("profile");

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Settings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your business profile and preferences
        </p>
      </div>

      {/* Horizontal tab nav with bottom border indicator */}
      <div className="border-b border-slate-200">
        <nav className="flex gap-0 -mb-px">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.key
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {activeTab === "profile" && <BusinessProfileTab />}
      {activeTab === "numbering" && <InvoiceNumberingTab />}
    </div>
  );
}

/* ─── Business Profile Tab ─── */

function BusinessProfileTab() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BusinessProfileInput>();

  useEffect(() => {
    api
      .get<Business>("/api/v1/business")
      .then((res) => {
        const d = res.data;
        reset({
          name: d.name ?? "",
          legalName: d.legalName ?? "",
          type: (d.type as BusinessProfileInput["type"]) ?? "COMPANY",
          gstin: d.gstin ?? "",
          pan: d.pan ?? "",
          phone: d.phone ?? "",
          email: d.email ?? "",
          website: d.website ?? "",
          addressLine1: d.addressLine1 ?? "",
          addressLine2: d.addressLine2 ?? "",
          city: d.city ?? "",
          state: d.state ?? "",
          stateCode: d.stateCode ?? "",
          pincode: d.pincode ?? "",
          country: d.country ?? "India",
          bankName: d.bankName ?? "",
          bankAccount: d.bankAccount ?? "",
          bankIfsc: d.bankIfsc ?? "",
          upiId: d.upiId ?? "",
          invoiceFooter: d.invoiceFooter ?? "",
          financialYearStart:
            (d.financialYearStart as BusinessProfileInput["financialYearStart"]) ?? "APRIL",
          defaultCurrency: d.defaultCurrency ?? "INR",
        });
      })
      .catch(() => setError("Failed to load business profile."))
      .finally(() => setLoading(false));
  }, [reset]);

  const onSubmit = async (data: BusinessProfileInput) => {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      await api.put("/api/v1/business", data);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="py-16 flex items-center justify-center gap-3 text-slate-400">
        <svg
          className="w-5 h-5 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        <span className="text-sm">Loading profile…</span>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      {/* Basic Info */}
      <Section title="Basic Information">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Business Name *" error={errors.name?.message}>
            <input
              {...register("name", { required: "Name is required", minLength: { value: 2, message: "Min 2 chars" } })}
              className={inputCls(!!errors.name)}
              placeholder="Acme Pvt Ltd"
            />
          </Field>
          <Field label="Legal Name" error={errors.legalName?.message}>
            <input
              {...register("legalName")}
              className={inputCls(false)}
              placeholder="Full legal name"
            />
          </Field>
          <Field label="Entity Type *" error={errors.type?.message}>
            <select
              {...register("type", { required: true })}
              className={inputCls(!!errors.type)}
            >
              <option value="INDIVIDUAL">Individual</option>
              <option value="PROPRIETORSHIP">Proprietorship</option>
              <option value="PARTNERSHIP">Partnership</option>
              <option value="LLP">LLP</option>
              <option value="COMPANY">Company</option>
            </select>
          </Field>
          <Field label="Default Currency">
            <input
              {...register("defaultCurrency")}
              className={inputCls(false)}
              placeholder="INR"
            />
          </Field>
        </div>
      </Section>

      {/* Contact */}
      <Section title="Contact Details">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Email" error={errors.email?.message}>
            <input
              {...register("email")}
              type="email"
              className={inputCls(!!errors.email)}
              placeholder="hello@company.com"
            />
          </Field>
          <Field label="Phone">
            <input
              {...register("phone")}
              className={inputCls(false)}
              placeholder="+91 98765 43210"
            />
          </Field>
          <Field label="Website" error={errors.website?.message}>
            <input
              {...register("website")}
              className={inputCls(!!errors.website)}
              placeholder="https://company.com"
            />
          </Field>
        </div>
      </Section>

      {/* Tax */}
      <Section title="Tax Details">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="GSTIN" error={errors.gstin?.message}>
            <input
              {...register("gstin")}
              className={`${inputCls(!!errors.gstin)} font-mono uppercase`}
              placeholder="22AAAAA0000A1Z5"
              maxLength={15}
            />
          </Field>
          <Field label="PAN" error={errors.pan?.message}>
            <input
              {...register("pan")}
              className={`${inputCls(!!errors.pan)} font-mono uppercase`}
              placeholder="AAAPL1234C"
              maxLength={10}
            />
          </Field>
        </div>
      </Section>

      {/* Address */}
      <Section title="Address">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Address Line 1">
            <input {...register("addressLine1")} className={inputCls(false)} placeholder="Street / Building" />
          </Field>
          <Field label="Address Line 2">
            <input {...register("addressLine2")} className={inputCls(false)} placeholder="Area / Locality" />
          </Field>
          <Field label="City">
            <input {...register("city")} className={inputCls(false)} placeholder="Mumbai" />
          </Field>
          <Field label="State">
            <input {...register("state")} className={inputCls(false)} placeholder="Maharashtra" />
          </Field>
          <Field label="State Code">
            <input {...register("stateCode")} className={inputCls(false)} placeholder="27" maxLength={2} />
          </Field>
          <Field label="Pincode">
            <input {...register("pincode")} className={inputCls(false)} placeholder="400001" maxLength={6} />
          </Field>
          <Field label="Country">
            <input {...register("country")} className={inputCls(false)} placeholder="India" />
          </Field>
        </div>
      </Section>

      {/* Bank */}
      <Section title="Bank Details">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Field label="Bank Name">
            <input {...register("bankName")} className={inputCls(false)} placeholder="HDFC Bank" />
          </Field>
          <Field label="Account Number">
            <input {...register("bankAccount")} className={`${inputCls(false)} font-mono`} placeholder="XXXXXXXXXXXX" />
          </Field>
          <Field label="IFSC Code">
            <input {...register("bankIfsc")} className={`${inputCls(false)} font-mono uppercase`} placeholder="HDFC0001234" />
          </Field>
          <Field label="UPI ID">
            <input {...register("upiId")} className={inputCls(false)} placeholder="company@upi" />
          </Field>
        </div>
      </Section>

      {/* Invoice Footer */}
      <Section title="Invoice Footer">
        <Field label="Footer Text">
          <textarea
            {...register("invoiceFooter")}
            rows={3}
            className={`${inputCls(false)} resize-none`}
            placeholder="Thank you for your business!"
          />
        </Field>
      </Section>

      {/* Actions */}
      <div className="flex items-center gap-4 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-60 transition-colors"
        >
          {saving && (
            <svg
              className="w-4 h-4 animate-spin"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              />
            </svg>
          )}
          {saving ? "Saving..." : "Save Changes"}
        </button>
        {saved && (
          <span className="text-sm text-green-600 font-medium flex items-center gap-1.5">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            Saved successfully
          </span>
        )}
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </form>
  );
}

/* ─── Invoice Numbering Tab ─── */

function InvoiceNumberingTab() {
  const [configs, setConfigs] = useState<NumberConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/v1/invoice-number-configs")
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setConfigs(res.data as NumberConfig[]);
        else setError("Failed to load configurations.");
      })
      .catch(() => setError("Failed to load configurations."))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="py-16 flex items-center justify-center gap-3 text-slate-400">
        <svg
          className="w-5 h-5 animate-spin"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        <span className="text-sm">Loading…</span>
      </div>
    );
  }

  if (error) {
    return <div className="py-8 text-center text-red-500 text-sm">{error}</div>;
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Configuration</p>
        <h2 className="font-semibold text-slate-800">Document Number Sequences</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Configure prefix, separator, and counter for each document type.
        </p>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50">
            <th className="text-left px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Document Type</th>
            <th className="text-left px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Prefix</th>
            <th className="text-left px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Separator</th>
            <th className="text-right px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Counter</th>
            <th className="text-center px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Action</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {DOCUMENT_TYPES.map((dt) => {
            const cfg = configs.find((c) => c.documentType === dt.value);
            return (
              <tr key={dt.value} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3.5 font-medium text-slate-800">{dt.label}</td>
                <td className="px-5 py-3.5 font-mono text-slate-600">
                  {cfg?.prefix ?? <span className="text-slate-300">—</span>}
                </td>
                <td className="px-5 py-3.5 font-mono text-slate-600">
                  {cfg?.separator ?? "-"}
                </td>
                <td className="px-5 py-3.5 text-right font-mono text-slate-600">
                  {cfg ? String(cfg.currentCounter).padStart(cfg.paddingDigits, "0") : "—"}
                </td>
                <td className="px-5 py-3.5 text-center">
                  <button
                    disabled
                    className="px-3 py-1 text-xs font-medium border border-slate-200 rounded-md text-slate-400 cursor-not-allowed"
                    title="Edit coming soon"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Helpers ─── */

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-4">{title}</p>
      {children}
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

function inputCls(hasError: boolean) {
  return `w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 transition-colors ${
    hasError
      ? "border-red-300 focus:ring-red-500/20 focus:border-red-500"
      : "border-slate-200 focus:ring-blue-500/30 focus:border-blue-500"
  }`;
}

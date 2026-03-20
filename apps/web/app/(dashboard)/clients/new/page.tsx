"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { partySchema, type PartyInput } from "../../../../schemas/client.schema";
import { api } from "../../../../lib/api";
import { useState } from "react";

export default function NewClientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, formState: { errors } } = useForm<PartyInput>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(partySchema) as any,
    defaultValues: { type: "CLIENT", billingCountry: "India", defaultPaymentTerms: 30, defaultCurrency: "INR" },
  });

  async function onSubmit(data: PartyInput) {
    setLoading(true);
    try {
      await api.post("/api/v1/clients", data);
      toast.success("Client added successfully");
      router.push("/clients");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to add client");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h2 className="text-lg font-semibold text-slate-800 mb-5">Add Client</h2>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-600">Basic Info</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">Display Name *</label>
              <input {...register("displayName")} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none" />
              {errors.displayName && <p className="mt-1 text-xs text-red-600">{errors.displayName.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Legal Name</label>
              <input {...register("legalName")} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Type</label>
              <select {...register("type")} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                <option value="CLIENT">Client</option>
                <option value="VENDOR">Vendor</option>
                <option value="BOTH">Both</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">GSTIN</label>
              <input {...register("gstin")} placeholder="27AABCU9603R1ZX" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-1 focus:ring-blue-500 focus:outline-none" />
              {errors.gstin && <p className="mt-1 text-xs text-red-600">{errors.gstin.message}</p>}
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">PAN</label>
              <input {...register("pan")} placeholder="AABCU9603R" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-1 focus:ring-blue-500 focus:outline-none" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-600">Contact</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Contact Name</label>
              <input {...register("contactName")} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Phone</label>
              <input {...register("contactPhone")} type="tel" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div className="col-span-2">
              <label className="block text-xs font-medium text-slate-500 mb-1">Email</label>
              <input {...register("contactEmail")} type="email" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
          <h3 className="text-sm font-semibold text-slate-600">Billing Address</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <input {...register("billingAddressLine1")} placeholder="Address Line 1" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <input {...register("billingCity")} placeholder="City" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <input {...register("billingState")} placeholder="State" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <input {...register("billingPincode")} placeholder="Pincode" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none" />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-600 mb-3">Preferences</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Payment Terms (days)</label>
              <input {...register("defaultPaymentTerms", { valueAsNumber: true })} type="number" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-1 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Currency</label>
              <select {...register("defaultCurrency")} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                <option value="INR">INR (₹)</option>
                <option value="USD">USD ($)</option>
                <option value="EUR">EUR (€)</option>
              </select>
            </div>
          </div>
          <div className="mt-3">
            <label className="block text-xs font-medium text-slate-500 mb-1">Notes</label>
            <textarea {...register("notes")} rows={2} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm resize-none focus:ring-1 focus:ring-blue-500 focus:outline-none" />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2.5 border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60"
          >
            {loading ? "Saving…" : "Add Client"}
          </button>
        </div>
      </form>
    </div>
  );
}

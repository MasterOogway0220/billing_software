"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { businessProfileSchema, type BusinessProfileInput } from "../../../schemas/business.schema";
import { api } from "../../../lib/api";
import { validateGSTIN, getStateFromGSTIN } from "../../../lib/utils";

const STEPS = ["Business Details", "Tax & Address", "Preferences"];

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const { register, handleSubmit, watch, setValue, formState: { errors } } =
    useForm<BusinessProfileInput>({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      resolver: zodResolver(businessProfileSchema) as any,
      defaultValues: {
        type: "COMPANY",
        financialYearStart: "APRIL",
        defaultCurrency: "INR",
        country: "India",
      },
    });

  const gstinValue = watch("gstin");

  function handleGSTINBlur() {
    if (gstinValue && validateGSTIN(gstinValue)) {
      const state = getStateFromGSTIN(gstinValue);
      setValue("state", state);
      setValue("stateCode", gstinValue.slice(0, 2));
    }
  }

  async function onSubmit(data: BusinessProfileInput) {
    setLoading(true);
    try {
      await api.put("/api/v1/business", data);
      toast.success("Business profile saved!");
      router.push("/dashboard");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Step indicator */}
      <div className="flex items-center gap-2 mb-6">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-2 flex-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
              i < step ? "bg-green-500 text-white" :
              i === step ? "bg-blue-600 text-white" :
              "bg-slate-200 text-slate-500"
            }`}>
              {i < step ? "✓" : i + 1}
            </div>
            <span className={`text-xs hidden sm:block ${i === step ? "text-slate-700 font-medium" : "text-slate-400"}`}>{s}</span>
            {i < STEPS.length - 1 && <div className={`flex-1 h-0.5 ${i < step ? "bg-green-400" : "bg-slate-200"}`} />}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Step 0: Business Details */}
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-800">Tell us about your business</h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Business Name *</label>
              <input {...register("name")} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Business Type</label>
              <select {...register("type")} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                <option value="INDIVIDUAL">Individual</option>
                <option value="PROPRIETORSHIP">Proprietorship</option>
                <option value="PARTNERSHIP">Partnership</option>
                <option value="LLP">LLP</option>
                <option value="COMPANY">Private Limited / Public</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Phone</label>
              <input {...register("phone")} type="tel" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Business Email</label>
              <input {...register("email")} type="email" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="w-full py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700"
            >
              Continue →
            </button>
          </div>
        )}

        {/* Step 1: Tax & Address */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-800">Tax & Address Details</h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">GSTIN (optional)</label>
              <input
                {...register("gstin")}
                onBlur={handleGSTINBlur}
                placeholder="27AABCU9603R1ZX"
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
              {errors.gstin && <p className="mt-1 text-xs text-red-600">{errors.gstin.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">PAN (optional)</label>
              <input {...register("pan")} placeholder="AABCU9603R" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              {errors.pan && <p className="mt-1 text-xs text-red-600">{errors.pan.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">City</label>
                <input {...register("city")} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">State</label>
                <input {...register("state")} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Pincode</label>
                <input {...register("pincode")} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Address</label>
              <input {...register("addressLine1")} placeholder="Address Line 1" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(0)} className="flex-1 py-2.5 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50">← Back</button>
              <button type="button" onClick={() => setStep(2)} className="flex-1 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700">Continue →</button>
            </div>
          </div>
        )}

        {/* Step 2: Preferences */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-slate-800">Preferences</h2>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Financial Year Start</label>
              <select {...register("financialYearStart")} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                <option value="APRIL">April (India standard)</option>
                <option value="JANUARY">January (Calendar year)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Default Currency</label>
              <select {...register("defaultCurrency")} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm">
                <option value="INR">INR — Indian Rupee (₹)</option>
                <option value="USD">USD — US Dollar ($)</option>
                <option value="EUR">EUR — Euro (€)</option>
                <option value="GBP">GBP — British Pound (£)</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Bank Account Number</label>
              <input {...register("bankAccount")} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Bank IFSC Code</label>
              <input {...register("bankIfsc")} className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">UPI ID</label>
              <input {...register("upiId")} placeholder="yourname@upi" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none" />
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={() => setStep(1)} className="flex-1 py-2.5 border border-slate-300 text-slate-700 font-medium rounded-lg hover:bg-slate-50">← Back</button>
              <button type="submit" disabled={loading} className="flex-1 py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-60">
                {loading ? "Saving…" : "Finish Setup 🎉"}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}

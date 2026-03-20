"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Building2, MapPin, Settings2, AlertCircle } from "lucide-react";
import { businessProfileSchema, type BusinessProfileInput } from "../../../schemas/business.schema";
import { api } from "../../../lib/api";
import { validateGSTIN, getStateFromGSTIN } from "../../../lib/utils";

const STEPS = [
  { label: "Business Details", icon: Building2, description: "Name, type, contact info" },
  { label: "Tax & Address",    icon: MapPin,     description: "GSTIN, PAN, location" },
  { label: "Preferences",      icon: Settings2,  description: "Currency, bank details" },
];

const inputClass =
  "w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 hover:border-slate-300";
const inputErrorClass =
  "w-full px-3.5 py-2.5 border border-red-300 bg-red-50 rounded-xl text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400";
const labelClass = "block text-sm font-medium text-slate-700 mb-1.5";

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<BusinessProfileInput>({
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
      {/* Header */}
      <div className="mb-7">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Set up your business</h1>
        <p className="text-slate-500 text-sm mt-1">Just a few details to get you invoicing in minutes.</p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center gap-0">
          {STEPS.map((s, i) => {
            const isCompleted = i < step;
            const isCurrent = i === step;
            const StepIcon = s.icon;
            return (
              <div key={i} className="flex items-center flex-1 last:flex-none">
                {/* Step bubble */}
                <div className="flex flex-col items-center">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${
                      isCompleted
                        ? "bg-emerald-500 text-white shadow-sm shadow-emerald-200"
                        : isCurrent
                        ? "bg-blue-600 text-white shadow-sm shadow-blue-200"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="w-4 h-4" />
                    ) : (
                      <StepIcon className="w-4 h-4" />
                    )}
                  </div>
                  <div className="mt-1.5 text-center">
                    <p className={`text-xs font-semibold leading-none ${isCurrent ? "text-slate-800" : isCompleted ? "text-emerald-600" : "text-slate-400"}`}>
                      {s.label}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">{s.description}</p>
                  </div>
                </div>
                {/* Connector line */}
                {i < STEPS.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-2 mb-6 rounded-full transition-all ${i < step ? "bg-emerald-400" : "bg-slate-200"}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Form Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Step 0: Business Details */}
          {step === 0 && (
            <div className="space-y-4">
              <div className="mb-5">
                <h2 className="text-base font-bold text-slate-900">Tell us about your business</h2>
                <p className="text-sm text-slate-500 mt-0.5">Basic information for your invoices and documents.</p>
              </div>

              <div>
                <label className={labelClass}>Business Name <span className="text-red-500">*</span></label>
                <input
                  {...register("name")}
                  placeholder="Acme Pvt. Ltd."
                  className={errors.name ? inputErrorClass : inputClass}
                />
                {errors.name && (
                  <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <label className={labelClass}>Business Type</label>
                <select {...register("type")} className={inputClass}>
                  <option value="INDIVIDUAL">Individual</option>
                  <option value="PROPRIETORSHIP">Proprietorship</option>
                  <option value="PARTNERSHIP">Partnership</option>
                  <option value="LLP">LLP</option>
                  <option value="COMPANY">Private Limited / Public</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Phone</label>
                  <input
                    {...register("phone")}
                    type="tel"
                    placeholder="+91 98765 43210"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={labelClass}>Business Email</label>
                  <input
                    {...register("email")}
                    type="email"
                    placeholder="billing@company.com"
                    className={errors.email ? inputErrorClass : inputClass}
                  />
                  {errors.email && (
                    <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      {errors.email.message}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setStep(1)}
                className="w-full py-2.5 bg-blue-600 text-white font-semibold text-sm rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm shadow-blue-200 mt-2"
              >
                Continue
              </button>
            </div>
          )}

          {/* Step 1: Tax & Address */}
          {step === 1 && (
            <div className="space-y-4">
              <div className="mb-5">
                <h2 className="text-base font-bold text-slate-900">Tax &amp; Address Details</h2>
                <p className="text-sm text-slate-500 mt-0.5">Used for GST calculations and invoice footer.</p>
              </div>

              <div>
                <label className={labelClass}>GSTIN <span className="text-slate-400 font-normal">(optional)</span></label>
                <input
                  {...register("gstin")}
                  onBlur={handleGSTINBlur}
                  placeholder="27AABCU9603R1ZX"
                  className={`${errors.gstin ? inputErrorClass : inputClass} font-mono`}
                />
                {errors.gstin && (
                  <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    {errors.gstin.message}
                  </p>
                )}
                <p className="mt-1 text-xs text-slate-400">State and state code will be auto-filled from a valid GSTIN.</p>
              </div>

              <div>
                <label className={labelClass}>PAN <span className="text-slate-400 font-normal">(optional)</span></label>
                <input
                  {...register("pan")}
                  placeholder="AABCU9603R"
                  className={`${errors.pan ? inputErrorClass : inputClass} font-mono`}
                />
                {errors.pan && (
                  <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 flex-shrink-0" />
                    {errors.pan.message}
                  </p>
                )}
              </div>

              <div>
                <label className={labelClass}>Address</label>
                <input
                  {...register("addressLine1")}
                  placeholder="Street / locality"
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>City</label>
                  <input {...register("city")} placeholder="Mumbai" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>State</label>
                  <input {...register("state")} placeholder="Maharashtra" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Pincode</label>
                  <input {...register("pincode")} placeholder="400001" className={inputClass} />
                </div>
              </div>

              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setStep(0)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-700 font-semibold text-sm rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex-1 py-2.5 bg-blue-600 text-white font-semibold text-sm rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm shadow-blue-200"
                >
                  Continue
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Preferences */}
          {step === 2 && (
            <div className="space-y-4">
              <div className="mb-5">
                <h2 className="text-base font-bold text-slate-900">Preferences &amp; Payment Info</h2>
                <p className="text-sm text-slate-500 mt-0.5">These appear on your invoices for easy payment collection.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Financial Year Start</label>
                  <select {...register("financialYearStart")} className={inputClass}>
                    <option value="APRIL">April (India standard)</option>
                    <option value="JANUARY">January (Calendar year)</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Default Currency</label>
                  <select {...register("defaultCurrency")} className={inputClass}>
                    <option value="INR">INR — Indian Rupee (₹)</option>
                    <option value="USD">USD — US Dollar ($)</option>
                    <option value="EUR">EUR — Euro (€)</option>
                    <option value="GBP">GBP — British Pound (£)</option>
                  </select>
                </div>
              </div>

              <div className="pt-1 pb-1">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Bank Details (optional)</p>
                <div className="space-y-3">
                  <div>
                    <label className={labelClass}>Account Number</label>
                    <input
                      {...register("bankAccount")}
                      placeholder="0000 0000 0000 0000"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>IFSC Code</label>
                    <input
                      {...register("bankIfsc")}
                      placeholder="HDFC0000001"
                      className={`${inputClass} font-mono`}
                    />
                  </div>
                  <div>
                    <label className={labelClass}>UPI ID</label>
                    <input
                      {...register("upiId")}
                      placeholder="yourname@upi"
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-700 font-semibold text-sm rounded-xl hover:bg-slate-50 transition-colors"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 bg-blue-600 text-white font-semibold text-sm rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm shadow-blue-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Saving…
                    </>
                  ) : (
                    "Finish Setup"
                  )}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>

      <p className="text-center text-xs text-slate-400 mt-5">
        You can update all these details later in{" "}
        <span className="font-medium text-slate-500">Settings</span>.
      </p>
    </div>
  );
}

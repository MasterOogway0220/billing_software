"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Mail, Lock, User, Building2, AlertCircle } from "lucide-react";
import { registerSchema, type RegisterInput } from "../../../schemas/user.schema";
import { api } from "../../../lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const password = watch("password", "");

  const passwordStrength =
    password.length === 0 ? 0 :
    password.length < 6 ? 1 :
    /[A-Z]/.test(password) && /[0-9]/.test(password) && password.length >= 8 ? 3 : 2;

  const strengthLabel = ["", "Weak", "Fair", "Strong"];
  const strengthColors = ["", "bg-red-500", "bg-yellow-500", "bg-green-500"];
  const strengthTextColors = ["", "text-red-600", "text-yellow-600", "text-green-600"];

  async function onSubmit(data: RegisterInput) {
    setLoading(true);
    setServerError(null);
    try {
      await api.post("/api/v1/auth/register", data);
      router.push("/login?registered=1");
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Create your account</h1>
        <p className="text-slate-500 text-sm mt-1">Start invoicing in minutes — no credit card needed</p>
      </div>

      {serverError && (
        <div className="flex items-start gap-3 p-3.5 mb-5 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500" />
          {serverError}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Full name</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              {...register("name")}
              type="text"
              placeholder="Rahul Sharma"
              className={`w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 ${
                errors.name ? "border-red-300 bg-red-50" : "border-slate-200 hover:border-slate-300"
              }`}
            />
          </div>
          {errors.name && (
            <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />{errors.name.message}
            </p>
          )}
        </div>

        {/* Business Name */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Business name</label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              {...register("businessName")}
              type="text"
              placeholder="Rahul Consulting Pvt Ltd"
              className={`w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 ${
                errors.businessName ? "border-red-300 bg-red-50" : "border-slate-200 hover:border-slate-300"
              }`}
            />
          </div>
          {errors.businessName && (
            <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />{errors.businessName.message}
            </p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Email address</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              {...register("email")}
              type="email"
              placeholder="you@example.com"
              className={`w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 ${
                errors.email ? "border-red-300 bg-red-50" : "border-slate-200 hover:border-slate-300"
              }`}
            />
          </div>
          {errors.email && (
            <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />{errors.email.message}
            </p>
          )}
        </div>

        {/* Password */}
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              {...register("password")}
              type={showPassword ? "text" : "password"}
              placeholder="Minimum 8 characters"
              className={`w-full pl-10 pr-11 py-2.5 border rounded-xl text-sm bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 ${
                errors.password ? "border-red-300 bg-red-50" : "border-slate-200 hover:border-slate-300"
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              tabIndex={-1}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Password strength */}
          {password.length > 0 && (
            <div className="mt-2 space-y-1">
              <div className="flex gap-1">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full transition-colors ${
                      i <= passwordStrength ? strengthColors[passwordStrength] ?? "bg-slate-200" : "bg-slate-200"
                    }`}
                  />
                ))}
              </div>
              <p className={`text-xs font-medium ${strengthTextColors[passwordStrength] ?? ""}`}>
                {strengthLabel[passwordStrength]}
              </p>
            </div>
          )}
          {errors.password && (
            <p className="mt-1.5 text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />{errors.password.message}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 px-4 bg-blue-600 text-white font-semibold text-sm rounded-xl hover:bg-blue-700 active:bg-blue-800 transition-colors disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-sm shadow-blue-200 mt-2"
        >
          {loading ? (
            <>
              <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Creating account…
            </>
          ) : (
            "Create account"
          )}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="text-blue-600 font-semibold hover:text-blue-700">
          Sign in
        </Link>
      </p>
    </div>
  );
}

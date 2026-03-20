"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { registerSchema, type RegisterInput } from "../../../schemas/user.schema";
import { api } from "../../../lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterInput>({ resolver: zodResolver(registerSchema) });

  const password = watch("password", "");

  async function onSubmit(data: RegisterInput) {
    setLoading(true);
    try {
      await api.post("/api/v1/auth/register", data);
      toast.success("Account created! Please sign in.");
      router.push("/login");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  const passwordStrength =
    password.length === 0 ? 0 :
    password.length < 6 ? 1 :
    /[A-Z]/.test(password) && /[0-9]/.test(password) && password.length >= 8 ? 3 : 2;

  const strengthLabel = ["", "Weak", "Fair", "Strong"];
  const strengthColor = ["", "bg-red-500", "bg-yellow-500", "bg-green-500"];

  return (
    <div>
      <h2 className="text-2xl font-semibold text-slate-800 mb-1">Create your account</h2>
      <p className="text-slate-500 text-sm mb-6">Start managing your invoices for free</p>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Your name</label>
          <input
            {...register("name")}
            type="text"
            placeholder="Rahul Sharma"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Business name</label>
          <input
            {...register("businessName")}
            type="text"
            placeholder="Rahul Consulting"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.businessName && <p className="mt-1 text-xs text-red-600">{errors.businessName.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Email</label>
          <input
            {...register("email")}
            type="email"
            placeholder="you@example.com"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Password</label>
          <input
            {...register("password")}
            type="password"
            placeholder="Minimum 8 characters"
            className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {password.length > 0 && (
            <div className="mt-1.5 flex items-center gap-2">
              <div className="flex gap-1 flex-1">
                {[1, 2, 3].map((i) => (
                  <div
                    key={i}
                    className={`h-1 flex-1 rounded-full ${i <= passwordStrength ? strengthColor[passwordStrength] : "bg-slate-200"}`}
                  />
                ))}
              </div>
              <span className="text-xs text-slate-500">{strengthLabel[passwordStrength]}</span>
            </div>
          )}
          {errors.password && <p className="mt-1 text-xs text-red-600">{errors.password.message}</p>}
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-60"
        >
          {loading ? "Creating account…" : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/login" className="text-blue-600 font-medium hover:text-blue-800">
          Sign in
        </Link>
      </p>
    </div>
  );
}

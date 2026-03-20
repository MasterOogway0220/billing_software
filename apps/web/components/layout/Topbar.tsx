"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Plus, Search } from "lucide-react";

const pageTitles: Record<
  string,
  { title: string; subtitle?: string; action?: { label: string; href: string } }
> = {
  "/dashboard": { title: "Dashboard",           subtitle: "Welcome back! Here's your business overview." },
  "/invoices":  { title: "Invoices",            subtitle: "Manage and track all your invoices", action: { label: "New Invoice",      href: "/invoices/new" } },
  "/clients":   { title: "Clients",             subtitle: "Manage your client directory",        action: { label: "Add Client",       href: "/clients/new"  } },
  "/payments":  { title: "Payments",            subtitle: "Track payments and collections",      action: { label: "Record Payment",   href: "/payments/new" } },
  "/ledger":    { title: "Ledger",              subtitle: "Double-entry accounting ledger" },
  "/reports":   { title: "Reports & Analytics", subtitle: "Financial insights for your business" },
  "/settings":  { title: "Settings",            subtitle: "Business profile and preferences" },
};

export function Topbar() {
  const pathname = usePathname();
  const base = "/" + (pathname.split("/")[1] ?? "");
  const page = pageTitles[base] ?? { title: "" };

  return (
    <header
      className="bg-white border-b border-slate-200 flex items-center justify-between px-8 gap-6"
      style={{ height: "var(--topbar-height)" }}
    >
      {/* Left: page title */}
      <div className="min-w-0 shrink-0">
        <h1 className="text-lg font-bold text-slate-900 leading-tight tracking-tight">
          {page.title}
        </h1>
        {page.subtitle && (
          <p className="text-sm text-slate-400 leading-tight hidden sm:block mt-0.5">
            {page.subtitle}
          </p>
        )}
      </div>

      {/* Center: search bar */}
      <div className="flex-1 max-w-md hidden lg:block">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Search invoices, clients…"
            className="w-full pl-10 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* Right: notification + CTA */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Bell */}
        <button
          type="button"
          aria-label="Notifications"
          className="relative w-10 h-10 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
          </svg>
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-white" />
        </button>

        {page.action && (
          <Link
            href={page.action.href}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-semibold rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors shadow-sm shadow-blue-200/60 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{page.action.label}</span>
            <span className="sm:hidden">New</span>
          </Link>
        )}
      </div>
    </header>
  );
}

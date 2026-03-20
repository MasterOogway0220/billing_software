"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { PlusCircle } from "lucide-react";

const pageTitles: Record<
  string,
  { title: string; subtitle?: string; action?: { label: string; href: string } }
> = {
  "/dashboard": { title: "Dashboard", subtitle: "Overview of your business" },
  "/invoices": {
    title: "Invoices",
    subtitle: "Manage and track your invoices",
    action: { label: "New Invoice", href: "/invoices/new" },
  },
  "/clients": {
    title: "Clients",
    subtitle: "Your client directory",
    action: { label: "Add Client", href: "/clients/new" },
  },
  "/payments": {
    title: "Payments",
    subtitle: "Payment records and history",
    action: { label: "Record Payment", href: "/payments/new" },
  },
  "/ledger": { title: "Ledger", subtitle: "Account ledger entries" },
  "/reports": { title: "Reports & Analytics", subtitle: "Financial insights" },
  "/settings": { title: "Settings", subtitle: "Business profile and preferences" },
};

export function Topbar() {
  const pathname = usePathname();
  const base = "/" + (pathname.split("/")[1] ?? "");
  const page = pageTitles[base] ?? { title: "" };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
      {/* Left: page title */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="min-w-0">
          <h1 className="text-base font-semibold text-slate-800 leading-tight truncate">
            {page.title}
          </h1>
          {page.subtitle && (
            <p className="text-xs text-slate-400 leading-tight hidden sm:block">
              {page.subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right: notification bell + action */}
      <div className="flex items-center gap-3 shrink-0">
        {/* Notification bell (placeholder) */}
        <button
          type="button"
          aria-label="Notifications"
          className="relative w-9 h-9 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.75}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
            />
          </svg>
          {/* Unread dot (placeholder) */}
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-blue-500 ring-2 ring-white" />
        </button>

        {page.action && (
          <Link
            href={page.action.href}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            <span className="hidden sm:inline">{page.action.label}</span>
            <span className="sm:hidden">New</span>
          </Link>
        )}
      </div>
    </header>
  );
}

"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { PlusCircle } from "lucide-react";

const pageTitles: Record<string, { title: string; action?: { label: string; href: string } }> = {
  "/dashboard": { title: "Dashboard" },
  "/invoices": { title: "Invoices", action: { label: "New Invoice", href: "/invoices/new" } },
  "/clients": { title: "Clients", action: { label: "Add Client", href: "/clients/new" } },
  "/payments": { title: "Payments", action: { label: "Record Payment", href: "/payments/new" } },
  "/ledger": { title: "Ledger" },
  "/reports": { title: "Reports" },
  "/settings": { title: "Settings" },
};

export function Topbar() {
  const pathname = usePathname();
  const base = "/" + (pathname.split("/")[1] ?? "");
  const page = pageTitles[base] ?? { title: "" };

  return (
    <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6">
      <h1 className="text-lg font-semibold text-slate-800">{page.title}</h1>
      {page.action && (
        <Link
          href={page.action.href}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusCircle className="w-4 h-4" />
          {page.action.label}
        </Link>
      )}
    </header>
  );
}

"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import {
  LayoutDashboard,
  FileText,
  Users,
  CreditCard,
  BookOpen,
  BarChart2,
  Settings,
  LogOut,
  Receipt,
  Menu,
  X,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/invoices", label: "Invoices", icon: FileText },
  { href: "/clients", label: "Clients", icon: Users },
  { href: "/payments", label: "Payments", icon: CreditCard },
  { href: "/ledger", label: "Ledger", icon: BookOpen },
  { href: "/reports", label: "Reports", icon: BarChart2 },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function MobileSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  const userInitial = session?.user?.name?.[0]?.toUpperCase() ?? "U";
  const userName = session?.user?.name ?? "User";
  const userEmail = session?.user?.email ?? "";

  return (
    <>
      {/* Mobile header bar */}
      <header className="md:hidden fixed top-0 inset-x-0 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-40" style={{ height: "var(--topbar-height)" }}>
        <button
          onClick={() => setIsOpen(true)}
          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
            <Receipt className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="font-bold text-slate-800 text-[15px] tracking-tight">BillFlow</span>
        </div>
        <div className="w-9" />
      </header>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/40 backdrop-blur-[1px] z-40"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Drawer */}
      <aside
        className={`md:hidden fixed inset-y-0 left-0 w-64 flex flex-col z-50 transform transition-transform duration-200 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ background: "var(--sidebar-bg)", borderRight: "1px solid var(--sidebar-border)" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 border-b" style={{ height: "var(--topbar-height)", borderColor: "var(--sidebar-border)" }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <Receipt className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-slate-800 text-[15px] tracking-tight">BillFlow</span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-3">
          <div className="px-3 mb-1">
            <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest px-2 pb-1.5">
              Main Menu
            </p>
          </div>
          <ul className="space-y-0.5 px-2">
            {navItems.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(href + "/");
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-150 border-l-2 ${
                      active
                        ? "border-l-blue-600 bg-blue-50 text-blue-700"
                        : "border-l-transparent text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    }`}
                  >
                    <Icon className={`w-4 h-4 flex-shrink-0 ${active ? "text-blue-600" : "text-slate-400"}`} />
                    <span>{label}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* User footer */}
        <div className="px-3 py-3 border-t" style={{ borderColor: "var(--sidebar-border)" }}>
          <div className="flex items-center gap-2.5 p-2 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold text-xs flex-shrink-0">
              {userInitial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-slate-700 truncate leading-tight">{userName}</p>
              <p className="text-[11px] text-slate-400 truncate leading-tight mt-0.5">{userEmail}</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="p-1.5 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors flex-shrink-0"
              title="Sign out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

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
  { href: "/invoices",  label: "Invoices",  icon: FileText },
  { href: "/clients",   label: "Clients",   icon: Users },
  { href: "/payments",  label: "Payments",  icon: CreditCard },
  { href: "/ledger",    label: "Ledger",    icon: BookOpen },
  { href: "/reports",   label: "Reports",   icon: BarChart2 },
  { href: "/settings",  label: "Settings",  icon: Settings },
];

export function MobileSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();
  const { data: session } = useSession();

  useEffect(() => { setIsOpen(false); }, [pathname]);

  const userInitial = session?.user?.name?.[0]?.toUpperCase() ?? "U";
  const userName    = session?.user?.name  ?? "User";
  const userEmail   = session?.user?.email ?? "";

  return (
    <>
      {/* Mobile header bar */}
      <header
        className="md:hidden fixed top-0 inset-x-0 bg-white border-b border-slate-200 flex items-center justify-between px-4 z-40"
        style={{ height: "var(--topbar-height)" }}
      >
        <button
          onClick={() => setIsOpen(true)}
          className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
            <Receipt className="w-4 h-4 text-white" />
          </div>
          <span className="text-base font-bold text-slate-800 tracking-tight">BillFlow</span>
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
        className={`md:hidden fixed inset-y-0 left-0 w-72 flex flex-col z-50 transform transition-transform duration-200 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{ background: "var(--sidebar-bg)", borderRight: "1px solid var(--sidebar-border)" }}
      >
        {/* Drawer header */}
        <div
          className="flex items-center justify-between px-6 shrink-0"
          style={{ height: "var(--topbar-height)", borderBottom: "1px solid var(--sidebar-border)" }}
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm">
              <Receipt className="w-5 h-5 text-white" />
            </div>
            <span className="text-base font-bold text-slate-800 tracking-tight">BillFlow</span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-widest px-3 mb-2">
              Main Menu
            </p>
            <ul className="space-y-1">
              {navItems.map(({ href, label, icon: Icon }) => {
                const active = pathname === href || pathname.startsWith(href + "/");
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors duration-150 ${
                        active
                          ? "bg-blue-600 text-white shadow-sm"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <Icon className={`w-[18px] h-[18px] shrink-0 ${active ? "text-white" : "text-slate-400"}`} />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>

        {/* User footer */}
        <div
          className="px-4 py-4 shrink-0"
          style={{ borderTop: "1px solid var(--sidebar-border)" }}
        >
          <div className="flex items-center gap-3 p-2 rounded-lg">
            <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-sm shrink-0 select-none">
              {userInitial}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-800 truncate">{userName}</p>
              <p className="text-xs text-slate-400 truncate mt-0.5">{userEmail}</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="p-2 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0 cursor-pointer"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}

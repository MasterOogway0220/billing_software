import { Receipt } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Left branding panel — hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-indigo-700 flex-col justify-between p-12 text-white">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm">
            <Receipt className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">BillFlow</span>
        </div>

        <div className="space-y-6">
          <h2 className="text-4xl font-bold leading-tight">
            Professional invoicing<br />for Indian businesses.
          </h2>
          <p className="text-blue-100 text-lg leading-relaxed">
            GST-compliant invoices, payments, ledger — everything you need to get paid faster.
          </p>

          <div className="grid grid-cols-2 gap-4 pt-4">
            {[
              { label: "GST Compliant", desc: "CGST, SGST & IGST auto-calculated" },
              { label: "Multi-currency", desc: "INR, USD, EUR and more" },
              { label: "Smart Ledger", desc: "Double-entry bookkeeping" },
              { label: "Instant Reports", desc: "P&L, aging, cash flow" },
            ].map((f) => (
              <div key={f.label} className="bg-white/10 rounded-xl p-4 backdrop-blur-sm">
                <p className="font-semibold text-sm">{f.label}</p>
                <p className="text-blue-200 text-xs mt-0.5">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-blue-200 text-sm">
          © {new Date().getFullYear()} BillFlow. Built for Indian SMEs.
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16 xl:px-24">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-10">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Receipt className="w-4 h-4 text-white" />
          </div>
          <span className="text-lg font-bold text-slate-800">BillFlow</span>
        </div>

        <div className="w-full max-w-md">
          {children}
        </div>
      </div>
    </div>
  );
}

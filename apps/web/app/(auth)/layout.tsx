import { Receipt, Zap, Shield, BookOpen, BarChart2 } from "lucide-react";

const features = [
  {
    icon: Zap,
    label: "GST Compliant",
    desc: "CGST, SGST & IGST auto-calculated",
  },
  {
    icon: Shield,
    label: "Multi-currency",
    desc: "INR, USD, EUR and more",
  },
  {
    icon: BookOpen,
    label: "Smart Ledger",
    desc: "Double-entry bookkeeping",
  },
  {
    icon: BarChart2,
    label: "Instant Reports",
    desc: "P&L, aging, cash flow",
  },
];

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex" style={{ background: "var(--background)" }}>
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-[44%] bg-slate-900 flex-col justify-between p-10 text-white relative overflow-hidden">
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)`,
            backgroundSize: "32px 32px",
          }}
        />
        {/* Blue accent blob */}
        <div className="absolute -top-24 -right-24 w-72 h-72 bg-blue-600 rounded-full opacity-20 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-72 h-72 bg-indigo-600 rounded-full opacity-20 blur-3xl pointer-events-none" />

        {/* Logo */}
        <div className="relative flex items-center gap-3">
          <div className="w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
            <Receipt className="w-5 h-5 text-white" />
          </div>
          <span className="text-[17px] font-bold tracking-tight">BillFlow</span>
        </div>

        {/* Headline */}
        <div className="relative space-y-5">
          <div>
            <h2 className="text-[32px] font-bold leading-tight text-white">
              Professional invoicing<br />for Indian businesses.
            </h2>
            <p className="text-slate-400 text-[14px] leading-relaxed mt-3">
              GST-compliant invoices, payments, ledger — everything<br />you need to get paid faster.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2">
            {features.map((f) => (
              <div
                key={f.label}
                className="bg-white/5 border border-white/10 rounded-xl p-3.5"
              >
                <div className="flex items-center gap-2 mb-1">
                  <f.icon className="w-3.5 h-3.5 text-blue-400" />
                  <p className="font-semibold text-[12px] text-white">{f.label}</p>
                </div>
                <p className="text-slate-500 text-[11px]">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="relative text-slate-600 text-[11px]">
          © {new Date().getFullYear()} BillFlow. Built for Indian SMEs.
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12 sm:px-10 lg:px-14 xl:px-20 bg-white">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2.5 mb-10">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Receipt className="w-4 h-4 text-white" />
          </div>
          <span className="text-[16px] font-bold text-slate-800 tracking-tight">BillFlow</span>
        </div>

        <div className="w-full max-w-[400px]">
          {children}
        </div>
      </div>
    </div>
  );
}

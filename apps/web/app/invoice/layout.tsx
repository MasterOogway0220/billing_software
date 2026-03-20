import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Invoice", template: "%s | BillFlow" },
};

export default function InvoicePublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-50">
      {children}
    </div>
  );
}

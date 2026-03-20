import { auth } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";
import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "Clients" };

export default async function ClientsPage() {
  const session = await auth();

  const clients = await prisma.party.findMany({
    where: {
      businessId: session!.user.businessId!,
      type: { in: ["CLIENT", "BOTH"] },
      isActive: true,
    },
    orderBy: { displayName: "asc" },
  });

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50">
            <th className="text-left px-4 py-3 font-medium text-slate-500">Name</th>
            <th className="text-left px-4 py-3 font-medium text-slate-500">GSTIN</th>
            <th className="text-left px-4 py-3 font-medium text-slate-500">Contact</th>
            <th className="text-left px-4 py-3 font-medium text-slate-500">City</th>
            <th className="text-left px-4 py-3 font-medium text-slate-500">Payment Terms</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {clients.length === 0 ? (
            <tr>
              <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                No clients yet.{" "}
                <Link href="/clients/new" className="text-blue-600 hover:underline">
                  Add your first client →
                </Link>
              </td>
            </tr>
          ) : (
            clients.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3">
                  <Link href={`/clients/${c.id}`} className="font-medium text-blue-600 hover:underline">
                    {c.displayName}
                  </Link>
                  {c.legalName && <p className="text-xs text-slate-400">{c.legalName}</p>}
                </td>
                <td className="px-4 py-3 text-slate-600 font-mono text-xs">{c.gstin ?? "—"}</td>
                <td className="px-4 py-3 text-slate-500">
                  {c.contactPhone ?? c.contactEmail ?? "—"}
                </td>
                <td className="px-4 py-3 text-slate-500">{c.billingCity ?? "—"}</td>
                <td className="px-4 py-3 text-slate-500">
                  {c.defaultPaymentTerms ? `Net ${c.defaultPaymentTerms}` : "—"}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

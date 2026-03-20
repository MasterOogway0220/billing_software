import { auth } from "../../../lib/auth";
import { prisma } from "../../../lib/prisma";
import { formatCurrency } from "../../../lib/utils";
import Link from "next/link";
import type { Metadata } from "next";
import type { Party } from "@repo/db";
import { Users } from "lucide-react";

export const metadata: Metadata = { title: "Clients" };

const AVATAR_COLORS: string[] = [
  "bg-blue-100 text-blue-700",
  "bg-violet-100 text-violet-700",
  "bg-emerald-100 text-emerald-700",
  "bg-orange-100 text-orange-700",
  "bg-pink-100 text-pink-700",
  "bg-cyan-100 text-cyan-700",
  "bg-amber-100 text-amber-700",
  "bg-teal-100 text-teal-700",
];

function getAvatarColor(name: string): string {
  const code = name.charCodeAt(0) % AVATAR_COLORS.length;
  return AVATAR_COLORS[code] ?? "bg-slate-100 text-slate-700";
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

const TYPE_STYLES: Record<string, string> = {
  CLIENT: "bg-blue-50 text-blue-700 border border-blue-200",
  VENDOR: "bg-amber-50 text-amber-700 border border-amber-200",
  BOTH: "bg-violet-50 text-violet-700 border border-violet-200",
};

const TYPE_LABELS: Record<string, string> = {
  CLIENT: "Client",
  VENDOR: "Vendor",
  BOTH: "Both",
};

export default async function ClientsPage() {
  const session = await auth();
  const businessId = session!.user.businessId!;

  const [clients, outstandingGroups] = await Promise.all([
    prisma.party.findMany({
      where: {
        businessId,
        type: { in: ["CLIENT", "BOTH"] },
        isActive: true,
      },
      orderBy: { displayName: "asc" },
    }),
    prisma.invoice.groupBy({
      by: ["clientId"],
      where: {
        businessId,
        status: { notIn: ["VOID", "CANCELLED", "DRAFT"] },
      },
      _sum: { amountDue: true },
    }),
  ]);

  const outstandingMap = new Map<string, number>();
  for (const row of outstandingGroups) {
    if (row.clientId) {
      outstandingMap.set(row.clientId, Number(row._sum.amountDue ?? 0));
    }
  }

  const withOutstanding = clients.filter(
    (c) => (outstandingMap.get(c.id) ?? 0) > 0
  ).length;

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Manage your clients and their outstanding balances
          </p>
        </div>
        <Link
          href="/clients/new"
          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + Add Client
        </Link>
      </div>

      {/* Summary stat bar */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-2">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            Total Clients
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {clients.length}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
            With Outstanding Balance
          </p>
          <p className="mt-1 text-2xl font-bold text-orange-600">
            {withOutstanding}
          </p>
        </div>
      </div>

      {/* Table card */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {clients.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mb-4">
              <Users className="w-7 h-7 text-slate-400" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 mb-1">
              No clients yet
            </h3>
            <p className="text-sm text-slate-500 max-w-xs mb-5">
              Add your first client to start creating invoices and tracking
              payments.
            </p>
            <Link
              href="/clients/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              + Add Client
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 font-medium text-slate-500">
                  Name
                </th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">
                  Type
                </th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">
                  GSTIN
                </th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">
                  Contact
                </th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">
                  City
                </th>
                <th className="text-right px-4 py-3 font-medium text-slate-500">
                  Outstanding
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {clients.map((c: Party) => {
                const outstanding = outstandingMap.get(c.id) ?? 0;
                return (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 ${getAvatarColor(c.displayName)}`}
                        >
                          {getInitials(c.displayName)}
                        </div>
                        <div>
                          <Link
                            href={`/clients/${c.id}`}
                            className="font-medium text-blue-600 hover:underline"
                          >
                            {c.displayName}
                          </Link>
                          {c.legalName && (
                            <p className="text-xs text-slate-400">
                              {c.legalName}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${TYPE_STYLES[c.type] ?? "bg-slate-100 text-slate-600"}`}
                      >
                        {TYPE_LABELS[c.type] ?? c.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 font-mono text-xs">
                      {c.gstin ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {c.contactPhone ?? c.contactEmail ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {c.billingCity ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {outstanding > 0 ? (
                        <span className="font-semibold text-orange-600">
                          {formatCurrency(outstanding)}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

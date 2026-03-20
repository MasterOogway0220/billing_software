"use client";

import { useState, useEffect } from "react";
import type { ReactNode } from "react";

interface LedgerEntry {
  id: string;
  entryDate: string;
  voucherType: string;
  narration: string | null;
  debit: number;
  credit: number;
  runningBalance: number;
}

interface Props {
  invoicesTab: ReactNode;
  detailsTab: ReactNode;
  clientId: string;
}

export default function ClientDetailTabs({ invoicesTab, detailsTab, clientId }: Props) {
  const [activeTab, setActiveTab] = useState<"invoices" | "details" | "ledger">("invoices");
  const [ledgerEntries, setLedgerEntries] = useState<LedgerEntry[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerFetched, setLedgerFetched] = useState(false);

  useEffect(() => {
    if (activeTab !== "ledger" || ledgerFetched) return;

    setLedgerLoading(true);
    fetch(`/api/v1/clients/${clientId}/ledger`)
      .then((res) => res.json())
      .then((json) => {
        const entries: LedgerEntry[] = (json?.data?.entries ?? []).map(
          (e: {
            id: string;
            entryDate: string;
            voucherType: string;
            narration: string | null;
            debit: number;
            credit: number;
            runningBalance: number;
          }) => ({
            id: e.id,
            entryDate: e.entryDate,
            voucherType: e.voucherType,
            narration: e.narration,
            debit: Number(e.debit),
            credit: Number(e.credit),
            runningBalance: Number(e.runningBalance),
          })
        );
        setLedgerEntries(entries);
        setLedgerFetched(true);
      })
      .catch(() => {
        setLedgerFetched(true);
      })
      .finally(() => {
        setLedgerLoading(false);
      });
  }, [activeTab, clientId, ledgerFetched]);

  const tabs: { key: "invoices" | "details" | "ledger"; label: string }[] = [
    { key: "invoices", label: "Invoices" },
    { key: "details", label: "Details" },
    { key: "ledger", label: "Ledger" },
  ];

  const formatAmount = (n: number) =>
    n === 0 ? "—" : n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

  const ledgerTab = (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      {ledgerLoading ? (
        <div className="px-4 py-10 text-center text-slate-400 text-sm">Loading ledger…</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-3 font-medium text-slate-500">Date</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500">Voucher Type</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500">Narration</th>
              <th className="text-right px-4 py-3 font-medium text-slate-500">Debit</th>
              <th className="text-right px-4 py-3 font-medium text-slate-500">Credit</th>
              <th className="text-right px-4 py-3 font-medium text-slate-500">Balance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {ledgerEntries.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  No ledger entries found.
                </td>
              </tr>
            ) : (
              ledgerEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                    {formatDate(entry.entryDate)}
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-700 whitespace-nowrap">
                    {entry.voucherType}
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {entry.narration ?? <span className="text-slate-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-red-600 font-medium tabular-nums">
                    {formatAmount(entry.debit)}
                  </td>
                  <td className="px-4 py-3 text-right text-green-600 font-medium tabular-nums">
                    {formatAmount(entry.credit)}
                  </td>
                  <td
                    className={`px-4 py-3 text-right font-semibold tabular-nums ${
                      entry.runningBalance > 0
                        ? "text-orange-600"
                        : entry.runningBalance < 0
                        ? "text-green-700"
                        : "text-slate-500"
                    }`}
                  >
                    {Math.abs(entry.runningBalance).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                    {entry.runningBalance !== 0 && (
                      <span className="ml-1 text-xs font-normal">
                        {entry.runningBalance > 0 ? "Dr" : "Cr"}
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      )}
    </div>
  );

  return (
    <div>
      {/* Tab bar */}
      <div className="flex gap-1 mb-4 bg-white border border-slate-200 rounded-lg p-1 w-fit">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-blue-600 text-white"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === "invoices"
          ? invoicesTab
          : activeTab === "details"
          ? detailsTab
          : ledgerTab}
      </div>
    </div>
  );
}

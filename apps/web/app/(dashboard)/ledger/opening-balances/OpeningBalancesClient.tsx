"use client";

import { useState } from "react";
import Link from "next/link";
import { api } from "../../../../lib/api";

type BalanceRow = {
  id: string;
  name: string;
  group: string;
  isSystem: boolean;
  openingBalance: unknown;
  openingBalType: string;
  openingBalDate: Date | null;
};

interface Props {
  grouped: Record<string, BalanceRow[]>;
  groupOrder: string[];
}

type SaveState = "idle" | "saving" | "saved" | "error";

interface RowState {
  amount: string;
  type: "DEBIT" | "CREDIT";
  saveState: SaveState;
}

const GROUP_LABELS: Record<string, string> = {
  ASSETS: "Assets",
  LIABILITIES: "Liabilities",
  EQUITY: "Equity",
  INCOME: "Income",
  EXPENSES: "Expenses",
};

export function OpeningBalancesClient({ grouped, groupOrder }: Props) {
  const [rows, setRows] = useState<Record<string, RowState>>(() => {
    const initial: Record<string, RowState> = {};
    for (const accounts of Object.values(grouped)) {
      for (const a of accounts) {
        initial[a.id] = {
          amount: Number(a.openingBalance) === 0 ? "" : String(Number(a.openingBalance)),
          type: (a.openingBalType ?? "DEBIT") as "DEBIT" | "CREDIT",
          saveState: "idle",
        };
      }
    }
    return initial;
  });

  function updateRow(id: string, field: keyof Pick<RowState, "amount" | "type">, value: string) {
    setRows((prev) => ({
      ...prev,
      [id]: { ...prev[id]!, [field]: value, saveState: "idle" },
    }));
  }

  async function saveRow(id: string) {
    const row = rows[id];
    if (!row) return;
    setRows((prev) => ({ ...prev, [id]: { ...row, saveState: "saving" } }));
    try {
      await api.put(`/api/v1/ledger/accounts/${id}`, {
        openingBalance: parseFloat(row.amount) || 0,
        openingBalType: row.type,
      });
      setRows((prev) => ({ ...prev, [id]: { ...row, saveState: "saved" } }));
      setTimeout(() => {
        setRows((prev) => ({ ...prev, [id]: { ...prev[id]!, saveState: "idle" } }));
      }, 2000);
    } catch {
      setRows((prev) => ({ ...prev, [id]: { ...row, saveState: "error" } }));
    }
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Opening Balances</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Set the opening balance for each account at the start of your accounting period.
          </p>
        </div>
        <Link
          href="/ledger"
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          ← Back to Ledger
        </Link>
      </div>

      {groupOrder.map((group) => {
        const accounts = grouped[group] ?? [];
        if (accounts.length === 0) return null;
        return (
          <div key={group} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
              <h2 className="text-sm font-semibold text-slate-700">
                {GROUP_LABELS[group] ?? group}
              </h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="text-left px-5 py-2.5 font-medium text-slate-500">Account</th>
                  <th className="text-right px-4 py-2.5 font-medium text-slate-500 w-40">Amount</th>
                  <th className="text-center px-4 py-2.5 font-medium text-slate-500 w-32">Dr / Cr</th>
                  <th className="w-24 px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {accounts.map((account) => {
                  const row = rows[account.id];
                  if (!row) return null;
                  return (
                    <tr key={account.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-3">
                        <span className="text-slate-800 font-medium">{account.name}</span>
                        {account.isSystem && (
                          <span className="ml-2 text-xs text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            system
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={row.amount}
                          onChange={(e) => updateRow(account.id, "amount", e.target.value)}
                          placeholder="0.00"
                          className="w-full px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-right font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <select
                          value={row.type}
                          onChange={(e) => updateRow(account.id, "type", e.target.value)}
                          className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="DEBIT">Debit</option>
                          <option value="CREDIT">Credit</option>
                        </select>
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() => saveRow(account.id)}
                          disabled={row.saveState === "saving"}
                          className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                            row.saveState === "saved"
                              ? "bg-green-50 text-green-700 border border-green-200"
                              : row.saveState === "error"
                              ? "bg-red-50 text-red-600 border border-red-200"
                              : "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
                          }`}
                        >
                          {row.saveState === "saving"
                            ? "Saving…"
                            : row.saveState === "saved"
                            ? "Saved ✓"
                            : row.saveState === "error"
                            ? "Error"
                            : "Save"}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

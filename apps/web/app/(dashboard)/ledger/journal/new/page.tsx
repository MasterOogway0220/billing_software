"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api } from "../../../../../lib/api";

type AccountGroup = "ASSETS" | "LIABILITIES" | "EQUITY" | "INCOME" | "EXPENSES";

interface Account {
  id: string;
  name: string;
  group: AccountGroup;
  isActive: boolean;
}

interface JournalLine {
  accountId: string;
  narration: string;
  debit: string;
  credit: string;
}

const GROUP_LABELS: Record<AccountGroup, string> = {
  ASSETS: "Assets",
  LIABILITIES: "Liabilities",
  EQUITY: "Equity",
  INCOME: "Income",
  EXPENSES: "Expenses",
};

const EMPTY_LINE: JournalLine = {
  accountId: "",
  narration: "",
  debit: "",
  credit: "",
};

function todayString(): string {
  return new Date().toISOString().split("T")[0] ?? "";
}

function parseAmount(val: string): number {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

export default function NewJournalEntryPage() {
  const router = useRouter();

  const [date, setDate] = useState<string>(todayString());
  const [narration, setNarration] = useState<string>("");
  const [lines, setLines] = useState<JournalLine[]>([
    { ...EMPTY_LINE },
    { ...EMPTY_LINE },
  ]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Account[]>("/api/v1/ledger/accounts")
      .then((res) => setAccounts(res.data))
      .catch(() => {});
  }, []);

  const totalDebit = lines.reduce((s, l) => s + parseAmount(l.debit), 0);
  const totalCredit = lines.reduce((s, l) => s + parseAmount(l.credit), 0);
  const isBalanced =
    totalDebit > 0 &&
    totalCredit > 0 &&
    Math.abs(totalDebit - totalCredit) <= 0.01;

  function updateLine(index: number, field: keyof JournalLine, value: string) {
    setLines((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  function addLine() {
    setLines((prev) => [...prev, { ...EMPTY_LINE }]);
  }

  function removeLine(index: number) {
    if (lines.length <= 2) return;
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isBalanced) return;

    setLoading(true);
    setError(null);

    try {
      const payload = {
        date,
        narration,
        lines: lines
          .filter((l) => l.accountId)
          .map((l) => ({
            accountId: l.accountId,
            narration: l.narration || undefined,
            debit: parseAmount(l.debit),
            credit: parseAmount(l.credit),
          })),
      };

      await api.post("/api/v1/ledger/journal", payload);
      router.push("/ledger");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create journal entry");
    } finally {
      setLoading(false);
    }
  }

  // Group accounts for select options
  const groupOrder: AccountGroup[] = [
    "ASSETS",
    "LIABILITIES",
    "EQUITY",
    "INCOME",
    "EXPENSES",
  ];

  const accountsByGroup = groupOrder.reduce<Record<string, Account[]>>(
    (acc, g) => {
      acc[g] = accounts.filter((a) => a.group === g && a.isActive);
      return acc;
    },
    {}
  );

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">New Journal Entry</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Create a manual double-entry journal voucher
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header fields */}
        <div className="bg-white rounded-xl border border-slate-200 p-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Narration <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={narration}
                onChange={(e) => setNarration(e.target.value)}
                required
                placeholder="Brief description of this entry"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Line items */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-700">
              Journal Lines
            </h3>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100">
                <th className="text-left px-4 py-3 font-medium text-slate-500 w-1/3">
                  Account <span className="text-red-400">*</span>
                </th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">
                  Description
                </th>
                <th className="text-right px-4 py-3 font-medium text-slate-500 w-28">
                  Debit
                </th>
                <th className="text-right px-4 py-3 font-medium text-slate-500 w-28">
                  Credit
                </th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {lines.map((line, i) => (
                <tr key={i}>
                  <td className="px-4 py-2">
                    <select
                      value={line.accountId}
                      onChange={(e) => updateLine(i, "accountId", e.target.value)}
                      className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select account</option>
                      {groupOrder.map((group) => {
                        const groupAccounts = accountsByGroup[group] ?? [];
                        if (groupAccounts.length === 0) return null;
                        return (
                          <optgroup
                            key={group}
                            label={GROUP_LABELS[group]}
                          >
                            {groupAccounts.map((a) => (
                              <option key={a.id} value={a.id}>
                                {a.name}
                              </option>
                            ))}
                          </optgroup>
                        );
                      })}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="text"
                      value={line.narration}
                      onChange={(e) => updateLine(i, "narration", e.target.value)}
                      placeholder="Optional"
                      className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      value={line.debit}
                      onChange={(e) => updateLine(i, "debit", e.target.value)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-right font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      value={line.credit}
                      onChange={(e) => updateLine(i, "credit", e.target.value)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="w-full border border-slate-200 rounded-lg px-2 py-1.5 text-sm text-right font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-2 py-2">
                    <button
                      type="button"
                      onClick={() => removeLine(i)}
                      disabled={lines.length <= 2}
                      className="text-slate-400 hover:text-red-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                      title="Remove line"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-slate-200 bg-slate-50">
                <td className="px-4 py-3 text-sm font-semibold text-slate-700">
                  Total
                </td>
                <td />
                <td className="px-4 py-3 text-right font-mono font-semibold text-slate-800">
                  {totalDebit.toFixed(2)}
                </td>
                <td className="px-4 py-3 text-right font-mono font-semibold text-slate-800">
                  {totalCredit.toFixed(2)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>

          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
            <button
              type="button"
              onClick={addLine}
              className="text-sm text-blue-600 hover:underline font-medium"
            >
              + Add Line
            </button>

            {/* Balance indicator */}
            <div
              className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg ${
                isBalanced
                  ? "bg-green-50 text-green-700"
                  : totalDebit === 0 && totalCredit === 0
                  ? "bg-slate-50 text-slate-400"
                  : "bg-red-50 text-red-600"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isBalanced
                    ? "bg-green-500"
                    : totalDebit === 0 && totalCredit === 0
                    ? "bg-slate-300"
                    : "bg-red-500"
                }`}
              />
              {isBalanced
                ? "Balanced"
                : totalDebit === 0 && totalCredit === 0
                ? "Enter amounts"
                : `Difference: ${Math.abs(totalDebit - totalCredit).toFixed(2)}`}
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-600">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 justify-end">
          <button
            type="button"
            onClick={() => router.push("/ledger")}
            className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isBalanced || loading || !narration.trim()}
            className="px-6 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "Saving..." : "Save Journal Entry"}
          </button>
        </div>
      </form>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { api } from "../../../lib/api";

type AccountGroup = "ASSETS" | "LIABILITIES" | "EQUITY" | "INCOME" | "EXPENSES";

interface AccountSummary {
  id: string;
  name: string;
  group: AccountGroup;
  code: string | null;
  subGroup: string | null;
  isSystem: boolean;
  isActive: boolean;
  entryCount: number;
  balance: number;
}

interface LedgerEntryRow {
  id: string;
  entryDate: string;
  account: { name: string; group: string };
  narration: string | null;
  voucherType: string;
  voucherId: string | null;
  debit: number;
  credit: number;
  runningBalance: number;
}

interface Props {
  grouped: Record<string, AccountSummary[]>;
  groupOrder: AccountGroup[];
}

const GROUP_LABELS: Record<AccountGroup, string> = {
  ASSETS: "Assets",
  LIABILITIES: "Liabilities",
  EQUITY: "Equity",
  INCOME: "Income",
  EXPENSES: "Expenses",
};

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function LedgerPageClient({ grouped, groupOrder }: Props) {
  const [activeTab, setActiveTab] = useState<"chart" | "general">("chart");

  // General ledger state
  const [accounts, setAccounts] = useState<AccountSummary[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [entries, setEntries] = useState<LedgerEntryRow[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);
  const [ledgerTotal, setLedgerTotal] = useState(0);
  const [ledgerPage, setLedgerPage] = useState(1);

  // Flatten accounts from grouped
  useEffect(() => {
    const all = Object.values(grouped).flat();
    setAccounts(all);
  }, [grouped]);

  const fetchLedgerEntries = useCallback(
    async (page: number) => {
      setLedgerLoading(true);
      try {
        const params = new URLSearchParams({ page: String(page), limit: "50" });
        if (selectedAccountId) params.set("accountId", selectedAccountId);
        if (dateFrom) params.set("dateFrom", dateFrom);
        if (dateTo) params.set("dateTo", dateTo);

        const res = await api.get<LedgerEntryRow[]>(
          `/api/v1/ledger?${params.toString()}`
        );
        setEntries(res.data);
        setLedgerTotal(res.meta?.total ?? 0);
      } catch {
        // ignore
      } finally {
        setLedgerLoading(false);
      }
    },
    [selectedAccountId, dateFrom, dateTo]
  );

  useEffect(() => {
    if (activeTab === "general") {
      fetchLedgerEntries(ledgerPage);
    }
  }, [activeTab, fetchLedgerEntries, ledgerPage]);

  const handleLedgerFilter = () => {
    setLedgerPage(1);
    fetchLedgerEntries(1);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Ledger</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Chart of accounts and general ledger entries
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/ledger/opening-balances"
            className="px-4 py-2 border border-slate-200 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors"
          >
            Opening Balances
          </Link>
          <Link
            href="/ledger/journal/new"
            className="px-4 py-2 bg-slate-800 text-white text-sm font-medium rounded-lg hover:bg-slate-700 transition-colors"
          >
            New Journal Entry
          </Link>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("chart")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "chart"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Chart of Accounts
        </button>
        <button
          onClick={() => setActiveTab("general")}
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "general"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          General Ledger
        </button>
      </div>

      {/* Chart of Accounts */}
      {activeTab === "chart" && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <Link
              href="/ledger/accounts/new"
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              New Account
            </Link>
          </div>

          {groupOrder.map((group) => {
            const groupAccounts = grouped[group] ?? [];
            if (groupAccounts.length === 0) return null;

            return (
              <div
                key={group}
                className="bg-white rounded-xl border border-slate-200 overflow-hidden"
              >
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-100">
                  <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
                    {GROUP_LABELS[group]}
                  </h3>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left px-4 py-3 font-medium text-slate-500">
                        Account Name
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-slate-500">
                        Code
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-slate-500">
                        Sub-Group
                      </th>
                      <th className="text-right px-4 py-3 font-medium text-slate-500">
                        Balance
                      </th>
                      <th className="text-center px-4 py-3 font-medium text-slate-500">
                        System
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-slate-500">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {groupAccounts.map((account) => (
                      <tr
                        key={account.id}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {account.name}
                        </td>
                        <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                          {account.code ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {account.subGroup ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-slate-800">
                          {formatCurrency(account.balance)}
                        </td>
                        <td className="px-4 py-3 text-center">
                          {account.isSystem ? (
                            <span className="inline-block px-2 py-0.5 bg-slate-100 text-slate-500 text-xs rounded-full">
                              System
                            </span>
                          ) : (
                            <span className="text-slate-300">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {!account.isSystem && (
                            <Link
                              href={`/ledger/accounts/${account.id}/edit`}
                              className="text-blue-600 hover:underline text-xs"
                            >
                              Edit
                            </Link>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}
        </div>
      )}

      {/* General Ledger */}
      {activeTab === "general" && (
        <div className="space-y-4">
          {/* Filter bar */}
          <div className="bg-white rounded-xl border border-slate-200 p-4">
            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  Account
                </label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Accounts</option>
                  {accounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {GROUP_LABELS[a.group]} — {a.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  From
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">
                  To
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={handleLedgerFilter}
                className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Apply
              </button>
            </div>
          </div>

          {/* Entries table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 font-medium text-slate-500">
                    Date
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">
                    Account
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">
                    Description
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-slate-500">
                    Debit
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-slate-500">
                    Credit
                  </th>
                  <th className="text-right px-4 py-3 font-medium text-slate-500">
                    Balance
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">
                    Source
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {ledgerLoading ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-12 text-center text-slate-400"
                    >
                      Loading...
                    </td>
                  </tr>
                ) : entries.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-12 text-center text-slate-400"
                    >
                      No entries found.
                    </td>
                  </tr>
                ) : (
                  entries.map((entry) => (
                    <tr
                      key={entry.id}
                      className="hover:bg-slate-50 transition-colors"
                    >
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                        {formatDate(entry.entryDate)}
                      </td>
                      <td className="px-4 py-3 text-slate-800 font-medium">
                        {entry.account.name}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {entry.narration ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-800">
                        {Number(entry.debit) > 0
                          ? formatCurrency(Number(entry.debit))
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-800">
                        {Number(entry.credit) > 0
                          ? formatCurrency(Number(entry.credit))
                          : "—"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-800">
                        {formatCurrency(entry.runningBalance)}
                      </td>
                      <td className="px-4 py-3">
                        {entry.voucherType === "INVOICE" && entry.voucherId ? (
                          <Link
                            href={`/invoices/${entry.voucherId}`}
                            className="text-blue-600 hover:underline text-xs"
                          >
                            Invoice
                          </Link>
                        ) : entry.voucherType === "PAYMENT" && entry.voucherId ? (
                          <Link
                            href={`/payments/${entry.voucherId}`}
                            className="text-blue-600 hover:underline text-xs"
                          >
                            Payment
                          </Link>
                        ) : entry.voucherType === "JOURNAL" ? (
                          <span className="text-xs text-slate-500">Journal</span>
                        ) : (
                          <span className="text-xs text-slate-400">
                            {entry.voucherType}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {/* Pagination */}
            {ledgerTotal > 50 && (
              <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between">
                <p className="text-xs text-slate-500">
                  {ledgerTotal} total entries
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const p = Math.max(1, ledgerPage - 1);
                      setLedgerPage(p);
                      fetchLedgerEntries(p);
                    }}
                    disabled={ledgerPage === 1}
                    className="px-3 py-1 text-xs border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40"
                  >
                    Previous
                  </button>
                  <span className="px-3 py-1 text-xs text-slate-500">
                    Page {ledgerPage} of {Math.ceil(ledgerTotal / 50)}
                  </span>
                  <button
                    onClick={() => {
                      const p = ledgerPage + 1;
                      setLedgerPage(p);
                      fetchLedgerEntries(p);
                    }}
                    disabled={ledgerPage >= Math.ceil(ledgerTotal / 50)}
                    className="px-3 py-1 text-xs border border-slate-200 rounded hover:bg-slate-50 disabled:opacity-40"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency, formatDate } from "../../../lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

type OutstandingData = {
  buckets: { label: string; count: number; total: number }[];
  topClients: { clientName: string; outstanding: number }[];
};

type AgingRow = {
  clientName: string;
  invoiceNumber: string;
  invoiceDate: string;
  dueDate: string | null;
  daysOverdue: number;
  amountDue: number;
};

type PLData = {
  income: number;
  expenses: number;
  netProfit: number;
  period: { from: string; to: string };
};

type CashFlowData = {
  months: { month: string; received: number }[];
};

type TabKey = "outstanding" | "aging" | "pl" | "cashflow";

const REPORT_CARDS: {
  key: TabKey;
  label: string;
  description: string;
  icon: React.ReactNode;
}[] = [
  {
    key: "outstanding",
    label: "Outstanding",
    description: "Unpaid invoices grouped by age",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    key: "pl",
    label: "Profit & Loss",
    description: "Revenue vs expenses over a period",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
      </svg>
    ),
  },
  {
    key: "aging",
    label: "AR Aging",
    description: "Detailed view of overdue invoices",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
      </svg>
    ),
  },
  {
    key: "cashflow",
    label: "Cash Flow",
    description: "Monthly receipts over the last 6 months",
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
      </svg>
    ),
  },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().split("T")[0]!;
}

function fyStartISO() {
  const today = new Date();
  const year =
    today.getMonth() >= 3 ? today.getFullYear() : today.getFullYear() - 1;
  return `${year}-04-01`;
}

async function fetchJSON<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const json = (await res.json()) as { success: boolean; data: T; error?: { message: string } };
  if (!json.success) throw new Error(json.error?.message ?? "Request failed");
  return json.data;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReportsPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("outstanding");
  const [outstandingData, setOutstandingData] = useState<OutstandingData | null>(null);
  const [outstandingLoading, setOutstandingLoading] = useState(true);
  const [outstandingError, setOutstandingError] = useState<string | null>(null);

  // Top stat cards always come from outstanding report
  useEffect(() => {
    setOutstandingLoading(true);
    setOutstandingError(null);
    fetchJSON<OutstandingData>("/api/v1/reports?type=outstanding")
      .then(setOutstandingData)
      .catch((e: unknown) =>
        setOutstandingError(e instanceof Error ? e.message : "Failed to load"),
      )
      .finally(() => setOutstandingLoading(false));
  }, []);

  const totalOutstanding = outstandingData
    ? outstandingData.buckets.reduce((s, b) => s + b.total, 0)
    : 0;
  const overdueTotal = outstandingData
    ? outstandingData.buckets
        .filter((b) => b.label !== "Current")
        .reduce((s, b) => s + b.total, 0)
    : 0;
  const overdueCount = outstandingData
    ? outstandingData.buckets
        .filter((b) => b.label !== "Current")
        .reduce((s, b) => s + b.count, 0)
    : 0;
  const totalInvoices = outstandingData
    ? outstandingData.buckets.reduce((s, b) => s + b.count, 0)
    : 0;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reports & Analytics</h1>
        <p className="text-sm text-slate-500 mt-1">
          Track outstanding balances, receivables, and financial performance
        </p>
      </div>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Total Outstanding"
          value={outstandingLoading ? null : formatCurrency(totalOutstanding)}
          color="blue"
        />
        <StatCard
          label="Overdue Amount"
          value={outstandingLoading ? null : formatCurrency(overdueTotal)}
          color="red"
          highlight={overdueTotal > 0}
        />
        <StatCard
          label="Overdue Invoices"
          value={outstandingLoading ? null : String(overdueCount)}
          color="orange"
          highlight={overdueCount > 0}
        />
        <StatCard
          label="Open Invoices"
          value={outstandingLoading ? null : String(totalInvoices)}
          color="purple"
        />
      </div>

      {outstandingError && (
        <p className="text-sm text-red-500">{outstandingError}</p>
      )}

      {/* Report Type Selector */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">
          Select Report
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {REPORT_CARDS.map((card) => (
            <button
              key={card.key}
              onClick={() => setActiveTab(card.key)}
              className={`text-left p-4 rounded-xl border transition-all ${
                activeTab === card.key
                  ? "border-blue-500 bg-blue-50 ring-1 ring-blue-500/30"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${
                  activeTab === card.key
                    ? "bg-blue-100 text-blue-600"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {card.icon}
              </div>
              <p
                className={`text-sm font-semibold ${
                  activeTab === card.key ? "text-blue-700" : "text-slate-800"
                }`}
              >
                {card.label}
              </p>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                {card.description}
              </p>
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "outstanding" && (
        <OutstandingTab data={outstandingData} loading={outstandingLoading} />
      )}
      {activeTab === "aging" && <AgingTab />}
      {activeTab === "pl" && <PLTab />}
      {activeTab === "cashflow" && <CashFlowTab />}
    </div>
  );
}

// ─── Outstanding Tab ──────────────────────────────────────────────────────────

function OutstandingTab({
  data,
  loading,
}: {
  data: OutstandingData | null;
  loading: boolean;
}) {
  if (loading) return <LoadingState />;
  if (!data) return null;

  const bucketColors: Record<string, string> = {
    Current: "bg-slate-100 text-slate-700 border-slate-200",
    "1–30 days": "bg-yellow-50 text-yellow-800 border-yellow-200",
    "31–60 days": "bg-orange-50 text-orange-800 border-orange-200",
    "61–90 days": "bg-red-50 text-red-800 border-red-200",
    "90+ days": "bg-red-100 text-red-900 border-red-300",
  };

  return (
    <div className="space-y-5">
      {/* Buckets */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-5 gap-4">
        {data.buckets.map((bucket) => (
          <div
            key={bucket.label}
            className={`rounded-xl border p-4 ${bucketColors[bucket.label] ?? "bg-white border-slate-200"}`}
          >
            <p className="text-xs font-medium opacity-70 mb-1">{bucket.label}</p>
            <p className="text-lg font-bold">{formatCurrency(bucket.total)}</p>
            <p className="text-xs mt-1 opacity-60">
              {bucket.count} invoice{bucket.count !== 1 ? "s" : ""}
            </p>
          </div>
        ))}
      </div>

      {/* Top Clients */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Clients</p>
          <h2 className="font-semibold text-slate-800">Top 5 by Outstanding Balance</h2>
        </div>
        {data.topClients.length === 0 ? (
          <p className="px-5 py-10 text-center text-slate-400 text-sm">No outstanding invoices.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.topClients.map((client, idx) => (
              <li key={idx} className="flex items-center justify-between px-5 py-3.5 hover:bg-slate-50 transition-colors">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-blue-50 text-blue-600 text-xs font-bold flex items-center justify-center">
                    {idx + 1}
                  </span>
                  <span className="text-sm font-medium text-slate-800">{client.clientName}</span>
                </div>
                <span className="text-sm font-semibold text-slate-900">
                  {formatCurrency(client.outstanding)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

// ─── Aging Tab ────────────────────────────────────────────────────────────────

function AgingTab() {
  const [data, setData] = useState<AgingRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchJSON<AgingRow[]>("/api/v1/reports?type=aging")
      .then(setData)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Failed to load"),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;

  const rowColor = (days: number) => {
    if (days === 0) return "";
    if (days <= 30) return "bg-yellow-50";
    if (days <= 60) return "bg-orange-50";
    return "bg-red-50";
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Detail</p>
        <h2 className="font-semibold text-slate-800">AR Aging Report</h2>
        <p className="text-xs text-slate-500 mt-0.5">All invoices with outstanding balance</p>
      </div>
      {!data || data.length === 0 ? (
        <p className="px-5 py-10 text-center text-slate-400 text-sm">No outstanding invoices.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Client</th>
                <th className="text-left px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Invoice #</th>
                <th className="text-left px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Invoice Date</th>
                <th className="text-left px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Due Date</th>
                <th className="text-right px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Days Overdue</th>
                <th className="text-right px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Amount Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((row, idx) => (
                <tr key={idx} className={`transition-colors ${rowColor(row.daysOverdue)}`}>
                  <td className="px-5 py-3.5 font-medium text-slate-800">{row.clientName}</td>
                  <td className="px-5 py-3.5 font-mono text-slate-700">{row.invoiceNumber}</td>
                  <td className="px-5 py-3.5 text-slate-600">{formatDate(row.invoiceDate)}</td>
                  <td className="px-5 py-3.5 text-slate-600">
                    {row.dueDate ? formatDate(row.dueDate) : "—"}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {row.daysOverdue === 0 ? (
                      <span className="text-slate-400">Current</span>
                    ) : (
                      <span
                        className={`font-semibold ${
                          row.daysOverdue <= 30
                            ? "text-yellow-700"
                            : row.daysOverdue <= 60
                            ? "text-orange-700"
                            : "text-red-700"
                        }`}
                      >
                        {row.daysOverdue}d
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-right font-semibold text-slate-900">
                    {formatCurrency(row.amountDue)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── P&L Tab ──────────────────────────────────────────────────────────────────

function PLTab() {
  const [dateFrom, setDateFrom] = useState(fyStartISO());
  const [dateTo, setDateTo] = useState(todayISO());
  const [data, setData] = useState<PLData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchJSON<PLData>(
      `/api/v1/reports?type=pl&dateFrom=${dateFrom}&dateTo=${dateTo}`,
    )
      .then(setData)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Failed to load"),
      )
      .finally(() => setLoading(false));
  }, [dateFrom, dateTo]);

  useEffect(() => {
    load();
  }, [load]);

  const margin =
    data && data.income > 0
      ? ((data.netProfit / data.income) * 100).toFixed(1)
      : "0.0";

  return (
    <div className="space-y-5">
      {/* Date range selector */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3">Date Range</p>
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1.5">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2.5 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30 transition-colors"
            />
          </div>
        </div>
      </div>

      {loading && <LoadingState />}
      {error && <ErrorState message={error} onRetry={load} />}

      {!loading && data && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            label="Total Revenue"
            value={formatCurrency(data.income)}
            color="green"
          />
          <StatCard
            label="Total Expenses"
            value={formatCurrency(data.expenses)}
            color="red"
          />
          <StatCard
            label="Net Profit"
            value={formatCurrency(data.netProfit)}
            color={data.netProfit >= 0 ? "blue" : "red"}
            highlight={data.netProfit < 0}
          />
          <StatCard
            label="Profit Margin"
            value={`${margin}%`}
            color={data.netProfit >= 0 ? "purple" : "red"}
          />
        </div>
      )}
    </div>
  );
}

// ─── Cash Flow Tab ────────────────────────────────────────────────────────────

function CashFlowTab() {
  const [data, setData] = useState<CashFlowData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    fetchJSON<CashFlowData>("/api/v1/reports?type=cashflow")
      .then(setData)
      .catch((e: unknown) =>
        setError(e instanceof Error ? e.message : "Failed to load"),
      )
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) return <LoadingState />;
  if (error) return <ErrorState message={error} onRetry={load} />;
  if (!data) return null;

  return (
    <div className="space-y-5">
      {/* Bar Chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Trend</p>
        <h2 className="font-semibold text-slate-800 mb-4">Monthly Receipts – Last 6 Months</h2>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data.months} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: "#64748b" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) =>
                  v >= 100000
                    ? `₹${(v / 100000).toFixed(1)}L`
                    : v >= 1000
                    ? `₹${(v / 1000).toFixed(0)}K`
                    : `₹${v}`
                }
                width={56}
              />
              <Tooltip
                formatter={(value: number) => [formatCurrency(value), "Received"]}
                contentStyle={{
                  fontSize: 12,
                  borderRadius: 8,
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
                }}
              />
              <Bar dataKey="received" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Monthly Breakdown Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-0.5">Breakdown</p>
          <h2 className="font-semibold text-slate-800">Monthly Summary</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Month</th>
              <th className="text-right px-5 py-3 font-medium text-slate-500 text-xs uppercase tracking-wide">Amount Received</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.months.map((row) => (
              <tr key={row.month} className="hover:bg-slate-50 transition-colors">
                <td className="px-5 py-3.5 text-slate-700">{row.month}</td>
                <td className="px-5 py-3.5 text-right font-semibold text-slate-900">
                  {formatCurrency(row.received)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200 bg-slate-50">
              <td className="px-5 py-3.5 font-semibold text-slate-700">Total</td>
              <td className="px-5 py-3.5 text-right font-bold text-slate-900">
                {formatCurrency(data.months.reduce((s, r) => s + r.received, 0))}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ─── Shared UI Components ─────────────────────────────────────────────────────

const colorMap: Record<string, { card: string; value: string }> = {
  blue: { card: "border-blue-100 bg-blue-50", value: "text-blue-700" },
  green: { card: "border-green-100 bg-green-50", value: "text-green-700" },
  red: { card: "border-red-200 bg-red-50", value: "text-red-700" },
  orange: { card: "border-orange-100 bg-orange-50", value: "text-orange-700" },
  purple: { card: "border-purple-100 bg-purple-50", value: "text-purple-700" },
};

function StatCard({
  label,
  value,
  color,
  highlight = false,
}: {
  label: string;
  value: string | null;
  color: string;
  highlight?: boolean;
}) {
  const c = colorMap[color] ?? colorMap["blue"]!;
  return (
    <div
      className={`rounded-xl border p-5 ${highlight ? "border-red-300 bg-red-50" : `${c.card} bg-white`}`}
    >
      <p className="text-xs font-medium text-slate-500 mb-2">{label}</p>
      {value === null ? (
        <div className="flex items-center gap-2 mt-1">
          <svg
            className="w-4 h-4 animate-spin text-slate-300"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-slate-300 text-2xl font-bold">—</span>
        </div>
      ) : (
        <p className={`text-2xl font-bold ${highlight ? "text-red-700" : c.value}`}>{value}</p>
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="py-16 flex items-center justify-center gap-3 text-slate-400">
      <svg
        className="w-5 h-5 animate-spin"
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
      >
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      <span className="text-sm">Loading report…</span>
    </div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="py-10 text-center space-y-3">
      <p className="text-sm text-red-500">{message}</p>
      <button
        onClick={onRetry}
        className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
      >
        Try again
      </button>
    </div>
  );
}

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

const TABS: { key: TabKey; label: string }[] = [
  { key: "outstanding", label: "Outstanding" },
  { key: "aging", label: "Aging" },
  { key: "pl", label: "P&L" },
  { key: "cashflow", label: "Cash Flow" },
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
      <h1 className="text-xl font-bold text-slate-900">Reports</h1>

      {/* Top KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          label="Total Outstanding"
          value={outstandingLoading ? "…" : formatCurrency(totalOutstanding)}
          color="blue"
        />
        <StatCard
          label="Overdue Amount"
          value={outstandingLoading ? "…" : formatCurrency(overdueTotal)}
          color="red"
          highlight={overdueTotal > 0}
        />
        <StatCard
          label="Overdue Invoices"
          value={outstandingLoading ? "…" : String(overdueCount)}
          color="orange"
          highlight={overdueCount > 0}
        />
        <StatCard
          label="Open Invoices"
          value={outstandingLoading ? "…" : String(totalInvoices)}
          color="purple"
        />
      </div>

      {outstandingError && (
        <p className="text-sm text-red-500">{outstandingError}</p>
      )}

      {/* Tab Bar */}
      <div className="flex gap-1 bg-white border border-slate-200 rounded-lg p-1 w-fit">
        {TABS.map((tab) => (
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
    <div className="space-y-6">
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
          <h2 className="font-semibold text-slate-800">Top 5 Clients by Outstanding</h2>
        </div>
        {data.topClients.length === 0 ? (
          <p className="px-5 py-8 text-center text-slate-400 text-sm">No outstanding invoices.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.topClients.map((client, idx) => (
              <li key={idx} className="flex items-center justify-between px-5 py-3">
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
        <h2 className="font-semibold text-slate-800">AR Aging Detail</h2>
        <p className="text-xs text-slate-500 mt-0.5">All invoices with outstanding balance</p>
      </div>
      {!data || data.length === 0 ? (
        <p className="px-5 py-8 text-center text-slate-400 text-sm">No outstanding invoices.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 font-medium text-slate-500">Client</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Invoice #</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Invoice Date</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Due Date</th>
                <th className="text-right px-4 py-3 font-medium text-slate-500">Days Overdue</th>
                <th className="text-right px-4 py-3 font-medium text-slate-500">Amount Due</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.map((row, idx) => (
                <tr key={idx} className={`transition-colors ${rowColor(row.daysOverdue)}`}>
                  <td className="px-4 py-3 font-medium text-slate-800">{row.clientName}</td>
                  <td className="px-4 py-3 font-mono text-slate-700">{row.invoiceNumber}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(row.invoiceDate)}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {row.dueDate ? formatDate(row.dueDate) : "—"}
                  </td>
                  <td className="px-4 py-3 text-right">
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
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">
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
    <div className="space-y-6">
      {/* Date range selector */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <div className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">To</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 text-sm border border-slate-200 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
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
    <div className="space-y-6">
      {/* Bar Chart */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
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
          <h2 className="font-semibold text-slate-800">Monthly Breakdown</h2>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-3 font-medium text-slate-500">Month</th>
              <th className="text-right px-4 py-3 font-medium text-slate-500">Amount Received</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.months.map((row) => (
              <tr key={row.month} className="hover:bg-slate-50 transition-colors">
                <td className="px-4 py-3 text-slate-700">{row.month}</td>
                <td className="px-4 py-3 text-right font-semibold text-slate-900">
                  {formatCurrency(row.received)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200 bg-slate-50">
              <td className="px-4 py-3 font-semibold text-slate-700">Total</td>
              <td className="px-4 py-3 text-right font-bold text-slate-900">
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
  value: string;
  color: string;
  highlight?: boolean;
}) {
  const c = colorMap[color] ?? colorMap["blue"]!;
  return (
    <div
      className={`rounded-xl border p-5 ${highlight ? "border-red-300 bg-red-50" : `${c.card} bg-white`}`}
    >
      <p className="text-xs font-medium text-slate-500 mb-2">{label}</p>
      <p className={`text-2xl font-bold ${highlight ? "text-red-700" : c.value}`}>{value}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="py-16 text-center text-slate-400 text-sm">Loading…</div>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="py-8 text-center space-y-2">
      <p className="text-sm text-red-500">{message}</p>
      <button
        onClick={onRetry}
        className="text-xs text-blue-600 hover:underline"
      >
        Retry
      </button>
    </div>
  );
}

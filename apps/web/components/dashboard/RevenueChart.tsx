"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { formatCurrency } from "../../lib/utils";

export type RevenueChartData = {
  month: string;
  revenue: number;
  paid: number;
};

function yAxisFormatter(v: number): string {
  if (v >= 10_000_000) return `₹${(v / 10_000_000).toFixed(1)}Cr`;
  if (v >= 100_000)    return `₹${(v / 100_000).toFixed(1)}L`;
  if (v >= 1_000)      return `₹${(v / 1_000).toFixed(0)}K`;
  return `₹${v}`;
}

export function RevenueChart({ data }: { data: RevenueChartData[] }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-base font-semibold text-slate-800">Revenue Overview</h2>
          <p className="text-sm text-slate-400 mt-0.5">Invoiced vs collected — last 6 months</p>
        </div>
      </div>

      {data.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-56 gap-3">
          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center">
            <svg className="w-6 h-6 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold text-slate-700">No data yet</p>
            <p className="text-sm text-slate-400 mt-1">Create invoices and record payments to see your chart.</p>
          </div>
        </div>
      ) : (
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.01} />
                </linearGradient>
                <linearGradient id="colorPaid" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#10b981" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.01} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis
                dataKey="month"
                tick={{ fontSize: 12, fill: "#94a3b8", fontWeight: 500 }}
                axisLine={false}
                tickLine={false}
                dy={8}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#94a3b8" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={yAxisFormatter}
                width={56}
              />
              <Tooltip
                formatter={(value: number, name: string) => [
                  formatCurrency(value),
                  name === "revenue" ? "Invoiced" : "Collected",
                ]}
                contentStyle={{
                  fontSize: 13,
                  borderRadius: 10,
                  border: "1px solid #e2e8f0",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
                  padding: "10px 14px",
                }}
                labelStyle={{ fontWeight: 600, color: "#1e293b", marginBottom: 4 }}
              />
              <Legend
                formatter={(v) => (v === "revenue" ? "Invoiced" : "Collected")}
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: 13, color: "#64748b", paddingTop: 16 }}
              />
              <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={2.5}
                fill="url(#colorRevenue)" dot={false} activeDot={{ r: 5, strokeWidth: 0, fill: "#3b82f6" }} />
              <Area type="monotone" dataKey="paid"    stroke="#10b981" strokeWidth={2.5}
                fill="url(#colorPaid)"    dot={false} activeDot={{ r: 5, strokeWidth: 0, fill: "#10b981" }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

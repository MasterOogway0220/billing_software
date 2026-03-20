"use client";

import { useState } from "react";
import type { ReactNode } from "react";

interface Props {
  invoicesTab: ReactNode;
  detailsTab: ReactNode;
}

export default function ClientDetailTabs({ invoicesTab, detailsTab }: Props) {
  const [activeTab, setActiveTab] = useState<"invoices" | "details">("invoices");

  const tabs: { key: "invoices" | "details"; label: string }[] = [
    { key: "invoices", label: "Invoices" },
    { key: "details", label: "Details" },
  ];

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
      <div>{activeTab === "invoices" ? invoicesTab : detailsTab}</div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { DataTable } from "../components/DataTable";
import { OrgChart } from "../components/OrgChart";
import { QuotesDashboard } from "../components/QuotesDashboard";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"users" | "orgchart" | "quotes">("users");

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Next.js + Node.js Monorepo</h1>
          <p className="text-gray-600">A full-stack application with data table, org chart/file explorer, and real-time quotes dashboard</p>
        </div>

        {/* Tabs */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab("users")}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "users"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Users Table
              </button>
              <button
                onClick={() => setActiveTab("orgchart")}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "orgchart"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Org Chart / File Explorer
              </button>
              <button
                onClick={() => setActiveTab("quotes")}
                className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === "quotes"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                }`}
              >
                Real-time Quotes
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === "users" ? (
              <DataTable />
            ) : activeTab === "orgchart" ? (
              <OrgChart />
            ) : (
              <QuotesDashboard 
                symbols={["AAPL", "MSFT", "GOOG", "AMZN", "META", "NVDA", "TSLA", "AMD", "NFLX", "INTC"]}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

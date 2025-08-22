"use client";

import { useState } from "react";
import { DataTable } from "../components/DataTable";
import { OrgChart } from "../components/OrgChart";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"users" | "orgchart">("users");

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Next.js + Node.js Monorepo</h1>
          <p className="text-gray-600">A full-stack application with data table and org chart/file explorer</p>
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
                Org File Explorer
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="">
            {activeTab === "users" ? (
              <DataTable />
            ) : (
              <OrgChart />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

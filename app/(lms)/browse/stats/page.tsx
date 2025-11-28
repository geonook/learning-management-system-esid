"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { BarChart3, TrendingUp, TrendingDown, Download } from "lucide-react";

export default function BrowseStatsPage() {
  return (
    <AuthGuard requiredRoles={["admin", "head", "office_member"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-500/20 rounded-lg">
              <BarChart3 className="w-6 h-6 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Statistics & Analytics</h1>
              <p className="text-sm text-white/60">View school-wide performance metrics (read-only)</p>
            </div>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white/70 hover:bg-white/10 transition-colors">
            <Download className="w-4 h-4" />
            <span>Export Report</span>
          </button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">School Average</span>
              <TrendingUp className="w-4 h-4 text-green-400" />
            </div>
            <div className="text-2xl font-bold text-white">-</div>
            <div className="text-xs text-green-400">+2.3% from last semester</div>
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">Completion Rate</span>
              <TrendingDown className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-white">-</div>
            <div className="text-xs text-amber-400">- pending</div>
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">Total Students</span>
            </div>
            <div className="text-2xl font-bold text-white">-</div>
            <div className="text-xs text-white/40">across all grades</div>
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">At Risk</span>
            </div>
            <div className="text-2xl font-bold text-red-400">-</div>
            <div className="text-xs text-white/40">need intervention</div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-2 gap-6">
          {/* Grade Distribution */}
          <div className="bg-white/5 rounded-xl border border-white/10 p-6">
            <h3 className="text-lg font-medium text-white mb-4">Grade Distribution by Level</h3>
            <div className="h-64 flex items-center justify-center text-white/40">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Chart will be displayed here</p>
              </div>
            </div>
          </div>

          {/* Performance Trends */}
          <div className="bg-white/5 rounded-xl border border-white/10 p-6">
            <h3 className="text-lg font-medium text-white mb-4">Performance Trends</h3>
            <div className="h-64 flex items-center justify-center text-white/40">
              <div className="text-center">
                <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Trend chart will be displayed here</p>
              </div>
            </div>
          </div>
        </div>

        {/* Grade Breakdown Table */}
        <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <h3 className="text-lg font-medium text-white">Performance by Grade</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-4 text-sm font-medium text-white/60">Grade</th>
                <th className="text-left p-4 text-sm font-medium text-white/60">Students</th>
                <th className="text-left p-4 text-sm font-medium text-white/60">LT Avg</th>
                <th className="text-left p-4 text-sm font-medium text-white/60">IT Avg</th>
                <th className="text-left p-4 text-sm font-medium text-white/60">KCFS Avg</th>
                <th className="text-left p-4 text-sm font-medium text-white/60">Overall</th>
              </tr>
            </thead>
            <tbody>
              {["G1", "G2", "G3", "G4", "G5", "G6"].map((grade) => (
                <tr key={grade} className="border-b border-white/5 hover:bg-white/5">
                  <td className="p-4 text-white font-medium">{grade}</td>
                  <td className="p-4 text-white/60">-</td>
                  <td className="p-4 text-white/60">-</td>
                  <td className="p-4 text-white/60">-</td>
                  <td className="p-4 text-white/60">-</td>
                  <td className="p-4 text-white/60">-</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Info */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
          <h3 className="text-blue-400 font-medium mb-2">About Analytics</h3>
          <p className="text-white/60 text-sm">
            Statistics are calculated from all teacher-entered grades using the standardized formula.
            Data updates in real-time as teachers input scores. Charts use ECharts for visualization.
          </p>
        </div>
      </div>
    </AuthGuard>
  );
}

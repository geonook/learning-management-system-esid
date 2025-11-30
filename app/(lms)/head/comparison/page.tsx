"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { GitCompare } from "lucide-react";

export default function ClassComparisonPage() {
  return (
    <AuthGuard requiredRoles={["admin", "head"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-500/20 rounded-lg">
            <GitCompare className="w-6 h-6 text-violet-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Class Comparison</h1>
            <p className="text-sm text-white/60">Compare performance across classes in your grade</p>
          </div>
        </div>

        {/* Class Selection */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <label className="text-sm text-white/60 mb-2 block">Select First Class</label>
            <select className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white">
              <option value="">Choose a class...</option>
              <option value="1">G4 Seekers</option>
              <option value="2">G4 Navigators</option>
              <option value="3">G4 Pioneers</option>
            </select>
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <label className="text-sm text-white/60 mb-2 block">Select Second Class</label>
            <select className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white">
              <option value="">Choose a class...</option>
              <option value="1">G4 Seekers</option>
              <option value="2">G4 Navigators</option>
              <option value="3">G4 Pioneers</option>
            </select>
          </div>
        </div>

        {/* Comparison Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">LT Average</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1 text-center">
                <div className="text-xl font-bold text-white">-</div>
                <div className="text-xs text-white/40">Class A</div>
              </div>
              <div className="text-white/20">vs</div>
              <div className="flex-1 text-center">
                <div className="text-xl font-bold text-white">-</div>
                <div className="text-xs text-white/40">Class B</div>
              </div>
            </div>
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">IT Average</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1 text-center">
                <div className="text-xl font-bold text-white">-</div>
                <div className="text-xs text-white/40">Class A</div>
              </div>
              <div className="text-white/20">vs</div>
              <div className="flex-1 text-center">
                <div className="text-xl font-bold text-white">-</div>
                <div className="text-xs text-white/40">Class B</div>
              </div>
            </div>
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">KCFS Average</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1 text-center">
                <div className="text-xl font-bold text-white">-</div>
                <div className="text-xs text-white/40">Class A</div>
              </div>
              <div className="text-white/20">vs</div>
              <div className="flex-1 text-center">
                <div className="text-xl font-bold text-white">-</div>
                <div className="text-xs text-white/40">Class B</div>
              </div>
            </div>
          </div>
        </div>

        {/* Comparison Chart Placeholder */}
        <div className="bg-white/5 rounded-xl border border-white/10 p-8 text-center">
          <GitCompare className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Comparison Chart</h3>
          <p className="text-white/40 max-w-md mx-auto">
            Select two classes above to see a side-by-side comparison of their performance
            across all assessment types (FA, SA, Final).
          </p>
        </div>

        {/* Assessment Breakdown */}
        <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
          <div className="p-4 border-b border-white/10">
            <h3 className="text-lg font-medium text-white">Assessment Breakdown</h3>
          </div>
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-4 text-sm font-medium text-white/60">Assessment</th>
                <th className="text-center p-4 text-sm font-medium text-white/60">Class A</th>
                <th className="text-center p-4 text-sm font-medium text-white/60">Class B</th>
                <th className="text-center p-4 text-sm font-medium text-white/60">Difference</th>
              </tr>
            </thead>
            <tbody>
              {["FA1", "FA2", "FA3", "FA4", "SA1", "SA2", "FINAL"].map((assessment) => (
                <tr key={assessment} className="border-b border-white/5 hover:bg-white/5">
                  <td className="p-4 text-white">{assessment}</td>
                  <td className="p-4 text-center text-white/60">-</td>
                  <td className="p-4 text-center text-white/60">-</td>
                  <td className="p-4 text-center">
                    <span className="text-white/40">-</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Info */}
        <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-4">
          <h3 className="text-violet-400 font-medium mb-2">About Class Comparison</h3>
          <p className="text-white/60 text-sm">
            Use this tool to identify performance gaps between classes and inform teaching strategies.
            Comparisons are based on the same assessment periods and scoring criteria.
          </p>
        </div>
      </div>
    </AuthGuard>
  );
}

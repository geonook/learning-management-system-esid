"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { LayoutDashboard, TrendingUp, TrendingDown } from "lucide-react";

export default function GradeOverviewPage() {
  return (
    <AuthGuard requiredRoles={["admin", "head"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-emerald-500/20 rounded-lg">
            <LayoutDashboard className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Grade Overview</h1>
            <p className="text-sm text-white/60">View performance across your grade level</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">Classes</span>
              <span className="text-emerald-400 text-xs">G1-G6</span>
            </div>
            <div className="text-2xl font-bold text-white">14</div>
            <div className="text-xs text-white/40">per grade</div>
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">Avg Score</span>
              <TrendingUp className="w-4 h-4 text-green-400" />
            </div>
            <div className="text-2xl font-bold text-white">78.5</div>
            <div className="text-xs text-green-400">+2.3% from last semester</div>
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">Completion</span>
              <TrendingDown className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-bold text-white">89%</div>
            <div className="text-xs text-amber-400">11% pending</div>
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">At Risk</span>
            </div>
            <div className="text-2xl font-bold text-red-400">12</div>
            <div className="text-xs text-white/40">students need attention</div>
          </div>
        </div>

        {/* Placeholder */}
        <div className="bg-white/5 rounded-xl border border-white/10 p-8 text-center">
          <LayoutDashboard className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Grade Analytics Coming Soon</h3>
          <p className="text-white/40 max-w-md mx-auto">
            This page will show detailed analytics for your grade level,
            including class comparisons, student progress tracking, and performance trends.
          </p>
        </div>
      </div>
    </AuthGuard>
  );
}

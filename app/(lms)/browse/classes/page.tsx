"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { School, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function BrowseClassesPage() {
  return (
    <AuthGuard requiredRoles={["admin", "head", "office_member"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <School className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Browse Classes</h1>
              <p className="text-sm text-white/60">View all classes across grades (read-only)</p>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input
              placeholder="Search classes..."
              className="pl-10 bg-white/5 border-white/10 text-white"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white/70 hover:bg-white/10 transition-colors">
            <Filter className="w-4 h-4" />
            <span>Filter</span>
          </button>
        </div>

        {/* Grade Tabs */}
        <div className="flex gap-2">
          {["All", "G1", "G2", "G3", "G4", "G5", "G6"].map((grade) => (
            <button
              key={grade}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                grade === "All"
                  ? "bg-blue-500 text-white"
                  : "bg-white/5 text-white/60 hover:bg-white/10"
              }`}
            >
              {grade}
            </button>
          ))}
        </div>

        {/* Classes Grid */}
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-white/5 rounded-xl border border-white/10 p-6 hover:bg-white/[0.07] transition-colors"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                  G{i}
                </span>
                <span className="text-xs text-white/40">14 students</span>
              </div>
              <h3 className="text-lg font-medium text-white mb-1">Class {i} Placeholder</h3>
              <p className="text-sm text-white/50 mb-4">Level: E{(i % 3) + 1}</p>
              <div className="flex items-center gap-2 text-xs text-white/40">
                <span>LT: -</span>
                <span>•</span>
                <span>IT: -</span>
                <span>•</span>
                <span>KCFS: -</span>
              </div>
            </div>
          ))}
        </div>

        {/* Info */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
          <h3 className="text-blue-400 font-medium mb-2">Read-Only Access</h3>
          <p className="text-white/60 text-sm">
            You have view-only access to class information. Contact an administrator
            if you need to make changes.
          </p>
        </div>
      </div>
    </AuthGuard>
  );
}

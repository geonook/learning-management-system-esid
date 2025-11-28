"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { Users, Search, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function BrowseTeachersPage() {
  return (
    <AuthGuard requiredRoles={["admin", "head", "office_member"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <Users className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Browse Teachers</h1>
              <p className="text-sm text-white/60">View all teachers and their assignments (read-only)</p>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input
              placeholder="Search teachers..."
              className="pl-10 bg-white/5 border-white/10 text-white"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white/70 hover:bg-white/10 transition-colors">
            <Filter className="w-4 h-4" />
            <span>Filter</span>
          </button>
        </div>

        {/* Type Tabs */}
        <div className="flex gap-2">
          {["All", "LT", "IT", "KCFS"].map((type) => (
            <button
              key={type}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                type === "All"
                  ? "bg-emerald-500 text-white"
                  : "bg-white/5 text-white/60 hover:bg-white/10"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Teachers Table */}
        <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-4 text-sm font-medium text-white/60">Name</th>
                <th className="text-left p-4 text-sm font-medium text-white/60">Type</th>
                <th className="text-left p-4 text-sm font-medium text-white/60">Grade</th>
                <th className="text-left p-4 text-sm font-medium text-white/60">Classes</th>
                <th className="text-left p-4 text-sm font-medium text-white/60">Email</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/5 hover:bg-white/5">
                <td className="p-4 text-white" colSpan={5}>
                  <div className="text-center text-white/40 py-8">
                    Teacher data will be displayed here once imported.
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="text-2xl font-bold text-white">-</div>
            <div className="text-xs text-white/40">Total Teachers</div>
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="text-2xl font-bold text-blue-400">-</div>
            <div className="text-xs text-white/40">LT Teachers</div>
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="text-2xl font-bold text-purple-400">-</div>
            <div className="text-xs text-white/40">IT Teachers</div>
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="text-2xl font-bold text-amber-400">-</div>
            <div className="text-xs text-white/40">KCFS Teachers</div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}

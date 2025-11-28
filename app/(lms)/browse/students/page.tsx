"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { GraduationCap, Search, Filter, Download } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function BrowseStudentsPage() {
  return (
    <AuthGuard requiredRoles={["admin", "head", "office_member"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <GraduationCap className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Browse Students</h1>
              <p className="text-sm text-white/60">View all student records (read-only)</p>
            </div>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white/70 hover:bg-white/10 transition-colors">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input
              placeholder="Search by name or student ID..."
              className="pl-10 bg-white/5 border-white/10 text-white"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white/70 hover:bg-white/10 transition-colors">
            <Filter className="w-4 h-4" />
            <span>Filter</span>
          </button>
        </div>

        {/* Grade and Level Filters */}
        <div className="flex gap-6">
          <div className="flex gap-2 items-center">
            <span className="text-sm text-white/40">Grade:</span>
            {["All", "G1", "G2", "G3", "G4", "G5", "G6"].map((grade) => (
              <button
                key={grade}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  grade === "All"
                    ? "bg-purple-500 text-white"
                    : "bg-white/5 text-white/60 hover:bg-white/10"
                }`}
              >
                {grade}
              </button>
            ))}
          </div>
          <div className="flex gap-2 items-center">
            <span className="text-sm text-white/40">Level:</span>
            {["All", "E1", "E2", "E3"].map((level) => (
              <button
                key={level}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  level === "All"
                    ? "bg-purple-500 text-white"
                    : "bg-white/5 text-white/60 hover:bg-white/10"
                }`}
              >
                {level}
              </button>
            ))}
          </div>
        </div>

        {/* Students Table */}
        <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-4 text-sm font-medium text-white/60">Student ID</th>
                <th className="text-left p-4 text-sm font-medium text-white/60">Name</th>
                <th className="text-left p-4 text-sm font-medium text-white/60">Grade</th>
                <th className="text-left p-4 text-sm font-medium text-white/60">Level</th>
                <th className="text-left p-4 text-sm font-medium text-white/60">Class</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/5 hover:bg-white/5">
                <td className="p-4 text-white" colSpan={5}>
                  <div className="text-center text-white/40 py-8">
                    Student data will be displayed here once imported.
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
            <div className="text-xs text-white/40">Total Students</div>
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="text-2xl font-bold text-green-400">-</div>
            <div className="text-xs text-white/40">Level E1</div>
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="text-2xl font-bold text-amber-400">-</div>
            <div className="text-xs text-white/40">Level E2</div>
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="text-2xl font-bold text-red-400">-</div>
            <div className="text-xs text-white/40">Level E3</div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}

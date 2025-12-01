"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { BookOpen, Search, Filter, Download } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function BrowseGradebookPage() {
  return (
    <AuthGuard requiredRoles={["admin", "head", "office_member"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-lg">
              <BookOpen className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Browse Gradebook</h1>
              <p className="text-sm text-white/60">View all grades and assessments (read-only)</p>
            </div>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white/70 hover:bg-white/10 transition-colors">
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input
              placeholder="Search by class or student..."
              className="pl-10 bg-white/5 border-white/10 text-white"
            />
          </div>
          <select className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white/70">
            <option value="">All Grades</option>
            <option value="G1">Grade 1</option>
            <option value="G2">Grade 2</option>
            <option value="G3">Grade 3</option>
            <option value="G4">Grade 4</option>
            <option value="G5">Grade 5</option>
            <option value="G6">Grade 6</option>
          </select>
          <select className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white/70">
            <option value="">All Course Types</option>
            <option value="LT">LT (Local Teacher)</option>
            <option value="IT">IT (International Teacher)</option>
            <option value="KCFS">KCFS</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white/70 hover:bg-white/10 transition-colors">
            <Filter className="w-4 h-4" />
            <span>More Filters</span>
          </button>
        </div>

        {/* Assessment Type Tabs */}
        <div className="flex gap-2">
          {["All", "Formative (FA)", "Summative (SA)", "Final"].map((type) => (
            <button
              key={type}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                type === "All"
                  ? "bg-amber-500 text-white"
                  : "bg-white/5 text-white/60 hover:bg-white/10"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Gradebook Placeholder */}
        <div className="bg-white/5 rounded-xl border border-white/10 p-8 text-center">
          <BookOpen className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Gradebook Data</h3>
          <p className="text-white/40 max-w-md mx-auto mb-6">
            This page will display all assessment scores entered by teachers.
            Select a class or search for a student to view their grades.
          </p>
          <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto">
            <div className="bg-white/5 rounded-lg p-4">
              <div className="text-2xl font-bold text-amber-400">FA1-8</div>
              <div className="text-xs text-white/40">Formative</div>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <div className="text-2xl font-bold text-blue-400">SA1-4</div>
              <div className="text-xs text-white/40">Summative</div>
            </div>
            <div className="bg-white/5 rounded-lg p-4">
              <div className="text-2xl font-bold text-purple-400">FINAL</div>
              <div className="text-xs text-white/40">Final Exam</div>
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
          <h3 className="text-blue-400 font-medium mb-2">Read-Only Access</h3>
          <p className="text-white/60 text-sm">
            You have view-only access to gradebook data. Teachers enter scores through their own interface.
            Formula: Semester = (Formative×0.15 + Summative×0.20 + Final×0.10) ÷ 0.45
          </p>
        </div>
      </div>
    </AuthGuard>
  );
}

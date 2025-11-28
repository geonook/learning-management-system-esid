"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { MessageSquare, Search, Filter, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";

export default function BrowseCommsPage() {
  return (
    <AuthGuard requiredRoles={["admin", "head", "office_member"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-cyan-500/20 rounded-lg">
              <MessageSquare className="w-6 h-6 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Browse Communications</h1>
              <p className="text-sm text-white/60">View all teacher-parent communications (read-only)</p>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input
              placeholder="Search communications..."
              className="pl-10 bg-white/5 border-white/10 text-white"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white/70 hover:bg-white/10 transition-colors">
            <Calendar className="w-4 h-4" />
            <span>Date Range</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white/70 hover:bg-white/10 transition-colors">
            <Filter className="w-4 h-4" />
            <span>Filter</span>
          </button>
        </div>

        {/* Communication Types */}
        <div className="flex gap-2">
          {["All", "Announcements", "Progress Reports", "Feedback", "Meetings"].map((type) => (
            <button
              key={type}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                type === "All"
                  ? "bg-cyan-500 text-white"
                  : "bg-white/5 text-white/60 hover:bg-white/10"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Communications List Placeholder */}
        <div className="bg-white/5 rounded-xl border border-white/10 p-8 text-center">
          <MessageSquare className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Communications Archive</h3>
          <p className="text-white/40 max-w-md mx-auto">
            This page will display all communications between teachers and parents,
            including announcements, progress reports, and feedback.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="text-2xl font-bold text-white">-</div>
            <div className="text-xs text-white/40">Total Messages</div>
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="text-2xl font-bold text-cyan-400">-</div>
            <div className="text-xs text-white/40">This Week</div>
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="text-2xl font-bold text-green-400">-</div>
            <div className="text-xs text-white/40">Response Rate</div>
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="text-2xl font-bold text-amber-400">-</div>
            <div className="text-xs text-white/40">Pending</div>
          </div>
        </div>

        {/* Info */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
          <h3 className="text-blue-400 font-medium mb-2">Read-Only Access</h3>
          <p className="text-white/60 text-sm">
            You have view-only access to all communications. This helps maintain oversight
            of teacher-parent interactions across the school.
          </p>
        </div>
      </div>
    </AuthGuard>
  );
}

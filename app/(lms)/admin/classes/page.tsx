"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { School, Search, Plus, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function ClassManagementPage() {
  return (
    <AuthGuard requiredRoles={["admin"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-500/20 rounded-lg">
              <School className="w-6 h-6 text-purple-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">Class Management</h1>
              <p className="text-sm text-white/60">Manage classes and course assignments</p>
            </div>
          </div>
          <Button className="bg-purple-600 hover:bg-purple-700">
            <Plus className="w-4 h-4 mr-2" />
            Add Class
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input
              placeholder="Search classes..."
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
            />
          </div>
          <Button variant="outline" className="border-white/10 text-white/70">
            <Filter className="w-4 h-4 mr-2" />
            Grade
          </Button>
          <Button variant="outline" className="border-white/10 text-white/70">
            <Filter className="w-4 h-4 mr-2" />
            Level
          </Button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="text-2xl font-bold text-white">84</div>
            <div className="text-sm text-white/60">Total Classes</div>
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="text-2xl font-bold text-white">252</div>
            <div className="text-sm text-white/60">Total Courses</div>
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="text-2xl font-bold text-white">6</div>
            <div className="text-sm text-white/60">Grades (G1-G6)</div>
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="text-2xl font-bold text-white">3</div>
            <div className="text-sm text-white/60">Course Types</div>
          </div>
        </div>

        {/* Placeholder Message */}
        <div className="bg-white/5 rounded-xl border border-white/10 p-8 text-center">
          <School className="w-12 h-12 text-white/20 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">Class Management Coming Soon</h3>
          <p className="text-white/40 max-w-md mx-auto">
            This page will allow you to view all classes, assign teachers to courses,
            and manage the one-class-three-teachers structure (LT, IT, KCFS).
          </p>
        </div>
      </div>
    </AuthGuard>
  );
}

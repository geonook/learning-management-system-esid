"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { Users, Search, Plus, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function UserManagementPage() {
  return (
    <AuthGuard requiredRoles={["admin"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Users className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">User Management</h1>
              <p className="text-sm text-white/60">Manage system users and their roles</p>
            </div>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700">
            <Plus className="w-4 h-4 mr-2" />
            Add User
          </Button>
        </div>

        {/* Search and Filters */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input
              placeholder="Search users by name or email..."
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
            />
          </div>
          <Button variant="outline" className="border-white/10 text-white/70">
            Filter by Role
          </Button>
        </div>

        {/* User Table */}
        <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-4 text-sm font-medium text-white/60">User</th>
                <th className="text-left p-4 text-sm font-medium text-white/60">Email</th>
                <th className="text-left p-4 text-sm font-medium text-white/60">Role</th>
                <th className="text-left p-4 text-sm font-medium text-white/60">Status</th>
                <th className="text-right p-4 text-sm font-medium text-white/60">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-white/5 hover:bg-white/5">
                <td className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-medium">
                      T
                    </div>
                    <span className="text-white">Coming Soon</span>
                  </div>
                </td>
                <td className="p-4 text-white/60">-</td>
                <td className="p-4">
                  <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                    -
                  </span>
                </td>
                <td className="p-4">
                  <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                    -
                  </span>
                </td>
                <td className="p-4 text-right">
                  <Button variant="ghost" size="sm" className="text-white/40">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Placeholder Message */}
        <div className="text-center py-8 text-white/40">
          <p>User management functionality coming soon.</p>
          <p className="text-sm mt-1">This page will allow you to view, edit, and manage user accounts.</p>
        </div>
      </div>
    </AuthGuard>
  );
}

"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { Users, CheckCircle, Clock, AlertCircle } from "lucide-react";

const mockTeachers = [
  { name: "Coming Soon", type: "LT", classes: 0, completion: 0, status: "pending" },
];

export default function TeacherProgressPage() {
  return (
    <AuthGuard requiredRoles={["admin", "head"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Users className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Teacher Progress</h1>
            <p className="text-sm text-white/60">Monitor score entry progress for your grade</p>
          </div>
        </div>

        {/* Progress Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-white/60 text-sm">Completed</span>
            </div>
            <div className="text-2xl font-bold text-green-400">-</div>
            <div className="text-xs text-white/40">teachers on track</div>
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="text-white/60 text-sm">In Progress</span>
            </div>
            <div className="text-2xl font-bold text-amber-400">-</div>
            <div className="text-xs text-white/40">teachers working</div>
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span className="text-white/60 text-sm">Needs Attention</span>
            </div>
            <div className="text-2xl font-bold text-red-400">-</div>
            <div className="text-xs text-white/40">teachers behind</div>
          </div>
        </div>

        {/* Teacher Table */}
        <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-4 text-sm font-medium text-white/60">Teacher</th>
                <th className="text-left p-4 text-sm font-medium text-white/60">Type</th>
                <th className="text-left p-4 text-sm font-medium text-white/60">Classes</th>
                <th className="text-left p-4 text-sm font-medium text-white/60">Completion</th>
                <th className="text-left p-4 text-sm font-medium text-white/60">Status</th>
              </tr>
            </thead>
            <tbody>
              {mockTeachers.map((teacher, i) => (
                <tr key={i} className="border-b border-white/5 hover:bg-white/5">
                  <td className="p-4 text-white">{teacher.name}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                      {teacher.type}
                    </span>
                  </td>
                  <td className="p-4 text-white/60">{teacher.classes}</td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-500 rounded-full"
                          style={{ width: `${teacher.completion}%` }}
                        />
                      </div>
                      <span className="text-white/60 text-sm">{teacher.completion}%</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-amber-500/20 text-amber-400 text-xs rounded-full">
                      {teacher.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Info */}
        <div className="text-center py-4 text-white/40">
          <p>Teacher progress tracking will be available once teachers are assigned to classes.</p>
        </div>
      </div>
    </AuthGuard>
  );
}

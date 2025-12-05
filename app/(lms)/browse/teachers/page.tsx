"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { AuthGuard } from "@/components/auth/auth-guard";
import { Users, Search, Loader2, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  getTeachersWithCourses,
  getTeacherTypeStatistics,
  type TeacherWithCourses,
  type TeacherType,
} from "@/lib/api/users";
import { PageHeader } from "@/components/layout/PageHeader";

type TypeFilter = "All" | "LT" | "IT" | "KCFS";

export default function BrowseTeachersPage() {
  const [teachers, setTeachers] = useState<TeacherWithCourses[]>([]);
  const [stats, setStats] = useState<{ total: number; lt: number; it: number; kcfs: number; head: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<TypeFilter>("All");
  const [searchQuery, setSearchQuery] = useState("");

  const fetchTeachers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getTeachersWithCourses({
        teacherType: selectedType === "All" ? undefined : selectedType as TeacherType,
        search: searchQuery || undefined,
      });
      setTeachers(data);
    } catch (err) {
      console.error("Failed to fetch teachers:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch teachers");
    } finally {
      setLoading(false);
    }
  }, [selectedType, searchQuery]);

  const fetchStats = useCallback(async () => {
    try {
      const result = await getTeacherTypeStatistics();
      setStats(result);
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  }, []);

  useEffect(() => {
    fetchTeachers();
  }, [fetchTeachers]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTeachers();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, fetchTeachers]);

  // Get type badge color
  const getTypeBadgeColor = (type: string | null, role: string) => {
    if (role === "head") return "bg-amber-500/20 text-amber-400";
    switch (type) {
      case "LT":
        return "bg-green-500/20 text-green-400";
      case "IT":
        return "bg-blue-500/20 text-blue-400";
      case "KCFS":
        return "bg-purple-500/20 text-purple-400";
      default:
        return "bg-white/10 text-white/40";
    }
  };

  return (
    <AuthGuard requiredRoles={["admin", "head", "office_member"]}>
      <div className="space-y-6">
        {/* Header */}
        <PageHeader
          title="Browse Teachers"
          subtitle={`View all teachers and their assignments (${teachers.length} teachers)`}
          breadcrumbs={[
            { label: "Dashboard", href: "/dashboard" },
            { label: "Browse Data", href: "/browse/classes" },
            { label: "All Teachers" },
          ]}
          backHref="/dashboard"
          backLabel="Dashboard"
        />

        {/* Search */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 text-white"
            />
          </div>
        </div>

        {/* Type Tabs */}
        <div className="flex gap-2">
          {(["All", "LT", "IT", "KCFS"] as TypeFilter[]).map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                selectedType === type
                  ? "bg-emerald-500 text-white"
                  : "bg-white/5 text-white/60 hover:bg-white/10"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
            <p className="text-red-400">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && teachers.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-white/20 mx-auto mb-4" />
            <p className="text-white/60">No teachers found</p>
          </div>
        )}

        {/* Teachers Table */}
        {!loading && !error && teachers.length > 0 && (
          <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left p-4 text-sm font-medium text-white/60">Name</th>
                  <th className="text-left p-4 text-sm font-medium text-white/60">Role/Type</th>
                  <th className="text-left p-4 text-sm font-medium text-white/60">Grade</th>
                  <th className="text-left p-4 text-sm font-medium text-white/60">Classes</th>
                  <th className="text-left p-4 text-sm font-medium text-white/60">Email</th>
                  <th className="text-right p-4 text-sm font-medium text-white/60 w-16"></th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((teacher) => (
                  <Link
                    key={teacher.id}
                    href={`/teacher/${teacher.id}`}
                    className="contents group"
                  >
                    <tr className="border-b border-white/5 hover:bg-white/5 cursor-pointer transition-colors">
                      <td className="p-4 text-white font-medium group-hover:text-emerald-400 transition-colors">{teacher.full_name}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${getTypeBadgeColor(teacher.teacher_type, teacher.role)}`}>
                          {teacher.role === "head" ? "Head" : teacher.teacher_type || "-"}
                        </span>
                      </td>
                      <td className="p-4 text-white/60">
                        {teacher.grade ? `G${teacher.grade}` : "-"}
                      </td>
                      <td className="p-4">
                        {teacher.assigned_classes.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {teacher.assigned_classes.slice(0, 3).map((cls) => (
                              <span
                                key={cls}
                                className="px-2 py-0.5 bg-white/10 text-white/60 text-xs rounded"
                              >
                                {cls}
                              </span>
                            ))}
                            {teacher.assigned_classes.length > 3 && (
                              <span className="px-2 py-0.5 bg-white/5 text-white/40 text-xs rounded">
                                +{teacher.assigned_classes.length - 3} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-white/40 text-sm">No assignments</span>
                        )}
                      </td>
                      <td className="p-4 text-white/40 text-sm">{teacher.email}</td>
                      <td className="p-4 text-right">
                        <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/60 transition-colors inline-block" />
                      </td>
                    </tr>
                  </Link>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-5 gap-4">
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="text-2xl font-bold text-white">{stats?.total || 0}</div>
            <div className="text-xs text-white/40">Total</div>
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="text-2xl font-bold text-green-400">{stats?.lt || 0}</div>
            <div className="text-xs text-white/40">LT Teachers</div>
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="text-2xl font-bold text-blue-400">{stats?.it || 0}</div>
            <div className="text-xs text-white/40">IT Teachers</div>
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="text-2xl font-bold text-purple-400">{stats?.kcfs || 0}</div>
            <div className="text-xs text-white/40">KCFS Teachers</div>
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="text-2xl font-bold text-amber-400">{stats?.head || 0}</div>
            <div className="text-xs text-white/40">Head Teachers</div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}

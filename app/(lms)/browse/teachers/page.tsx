"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AuthGuard } from "@/components/auth/auth-guard";
import { useAuthReady } from "@/hooks/useAuthReady";
import { useGlobalFilters, GlobalFilterBar } from "@/components/filters/GlobalFilterBar";
import { Users, Search, Loader2, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  getTeachersWithCourses,
  getTeacherTypeStatistics,
  type TeacherWithCourses,
  type TeacherType,
} from "@/lib/api/users";
import { SimpleHeader } from "@/components/layout/SimpleHeader";

type TypeFilter = "All" | "LT" | "IT" | "KCFS";

export default function BrowseTeachersPage() {
  const { userId, isReady } = useAuthReady();
  const { academicYear } = useGlobalFilters();
  const [teachers, setTeachers] = useState<TeacherWithCourses[]>([]);
  const [stats, setStats] = useState<{ total: number; lt: number; it: number; kcfs: number; head: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<TypeFilter>("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Debounced search state - only search input needs debouncing
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Debounce search input only
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Single effect for all data fetching - follows Dashboard pattern
  useEffect(() => {
    // Wait for auth to be ready
    if (!isReady || !userId) {
      console.log("[BrowseTeachers] Auth not ready, waiting...");
      return;
    }

    console.log("[BrowseTeachers] Fetching data...", { selectedType, debouncedSearch, academicYear });

    let isCancelled = false;

    async function fetchData() {
      setLoading(true);
      setError(null);
      try {
        const data = await getTeachersWithCourses({
          teacherType: selectedType === "All" ? undefined : selectedType as TeacherType,
          search: debouncedSearch || undefined,
          academicYear: academicYear,
        });
        if (!isCancelled) {
          console.log("[BrowseTeachers] Data received:", data?.length);
          setTeachers(data);
          setLoading(false);
        }
      } catch (err) {
        if (!isCancelled) {
          console.error("[BrowseTeachers] Failed to fetch teachers:", err);
          setError(err instanceof Error ? err.message : "Failed to fetch teachers");
          setLoading(false);
        }
      }
    }

    fetchData();

    return () => {
      isCancelled = true;
    };
  }, [isReady, userId, selectedType, debouncedSearch, academicYear]);

  // Fetch stats only once when user is available
  useEffect(() => {
    if (!userId) return;

    async function fetchStats() {
      try {
        const result = await getTeacherTypeStatistics();
        setStats(result);
      } catch (err) {
        console.error("Failed to fetch stats:", err);
      }
    }
    fetchStats();
  }, [userId]);

  // Get type badge color
  const getTypeBadgeColor = (type: string | null, role: string) => {
    if (role === "head") return "bg-amber-500/20 text-amber-500 dark:text-amber-400";
    switch (type) {
      case "LT":
        return "bg-green-500/20 text-green-600 dark:text-green-400";
      case "IT":
        return "bg-blue-500/20 text-blue-600 dark:text-blue-400";
      case "KCFS":
        return "bg-purple-500/20 text-purple-600 dark:text-purple-400";
      default:
        return "bg-surface-secondary text-text-tertiary";
    }
  };

  return (
    <AuthGuard requiredRoles={["admin", "head", "office_member"]}>
      <div className="space-y-6">
        {/* Header */}
        <SimpleHeader
          icon={<Users className="w-6 h-6 text-emerald-500 dark:text-emerald-400" />}
          iconBgColor="bg-emerald-500/20"
          title="Browse Teachers"
          subtitle={`View all teachers and their assignments (${teachers.length} teachers)`}
        />

        {/* Academic Year Filter - No Term needed for teacher listing */}
        <GlobalFilterBar showYear showTerm={false} compact className="mb-2" />

        {/* Search */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-surface-secondary border-border-default text-text-primary placeholder:text-text-tertiary"
            />
          </div>
        </div>

        {/* Type Tabs */}
        <div className="flex gap-2">
          {(["All", "LT", "IT", "KCFS"] as TypeFilter[]).map((type) => (
            <button
              key={type}
              onClick={() => setSelectedType(type)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-normal ease-apple ${
                selectedType === type
                  ? "bg-emerald-500 text-white dark:text-white"
                  : "bg-surface-tertiary text-text-secondary hover:bg-surface-hover"
              }`}
            >
              {type}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-emerald-500 dark:text-emerald-400 animate-spin" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
            <p className="text-red-500 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && teachers.length === 0 && (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-border-subtle mx-auto mb-4" />
            <p className="text-text-secondary">No teachers found</p>
          </div>
        )}

        {/* Teachers Table */}
        {!loading && !error && teachers.length > 0 && (
          <div className="bg-surface-secondary rounded-xl border border-border-default overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-default">
                  <th className="text-left p-4 text-sm font-medium text-text-secondary">Name</th>
                  <th className="text-left p-4 text-sm font-medium text-text-secondary">Role/Type</th>
                  <th className="text-left p-4 text-sm font-medium text-text-secondary">Grade</th>
                  <th className="text-left p-4 text-sm font-medium text-text-secondary">Classes</th>
                  <th className="text-left p-4 text-sm font-medium text-text-secondary">Email</th>
                  <th className="text-right p-4 text-sm font-medium text-text-secondary w-16"></th>
                </tr>
              </thead>
              <tbody>
                {teachers.map((teacher) => (
                  <Link
                    key={teacher.id}
                    href={`/teacher/${teacher.id}`}
                    className="contents group"
                  >
                    <tr className="border-b border-border-subtle hover:bg-surface-hover cursor-pointer transition-colors">
                      <td className="p-4 text-text-primary font-medium group-hover:text-emerald-500 dark:group-hover:text-emerald-400 transition-colors">{teacher.full_name}</td>
                      <td className="p-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${getTypeBadgeColor(teacher.teacher_type, teacher.role)}`}>
                          {teacher.role === "head" ? "Head" : teacher.teacher_type || "-"}
                        </span>
                      </td>
                      <td className="p-4 text-text-secondary">
                        {teacher.grade ? `G${teacher.grade}` : "-"}
                      </td>
                      <td className="p-4">
                        {teacher.assigned_classes.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {teacher.assigned_classes.slice(0, 3).map((cls: string) => (
                              <span
                                key={cls}
                                className="px-2 py-0.5 bg-surface-tertiary text-text-secondary text-xs rounded"
                              >
                                {cls}
                              </span>
                            ))}
                            {teacher.assigned_classes.length > 3 && (
                              <span className="px-2 py-0.5 bg-surface-secondary text-text-tertiary text-xs rounded">
                                +{teacher.assigned_classes.length - 3} more
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-text-tertiary text-sm">No assignments</span>
                        )}
                      </td>
                      <td className="p-4 text-text-tertiary text-sm">{teacher.email}</td>
                      <td className="p-4 text-right">
                        <ChevronRight className="w-4 h-4 text-border-subtle group-hover:text-text-secondary transition-colors inline-block" />
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
          <div className="bg-surface-secondary rounded-xl border border-border-default p-4">
            <div className="text-2xl font-bold text-text-primary">{stats?.total || 0}</div>
            <div className="text-xs text-text-tertiary">Total</div>
          </div>
          <div className="bg-surface-secondary rounded-xl border border-border-default p-4">
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats?.lt || 0}</div>
            <div className="text-xs text-text-tertiary">LT Teachers</div>
          </div>
          <div className="bg-surface-secondary rounded-xl border border-border-default p-4">
            <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats?.it || 0}</div>
            <div className="text-xs text-text-tertiary">IT Teachers</div>
          </div>
          <div className="bg-surface-secondary rounded-xl border border-border-default p-4">
            <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats?.kcfs || 0}</div>
            <div className="text-xs text-text-tertiary">KCFS Teachers</div>
          </div>
          <div className="bg-surface-secondary rounded-xl border border-border-default p-4">
            <div className="text-2xl font-bold text-amber-500 dark:text-amber-400">{stats?.head || 0}</div>
            <div className="text-xs text-text-tertiary">Head Teachers</div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}

"use client";

import { useState, useEffect, useMemo } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { useAuthReady } from "@/hooks/useAuthReady";
import { Users, CheckCircle, Clock, AlertCircle, BookOpen, GraduationCap, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { GlobalFilterBar, useGlobalFilters } from "@/components/filters";
import { getTeachersProgress, type TeacherProgress, type TeacherProgressStats } from "@/lib/api/teacher-progress";

export default function TeacherProgressPage() {
  const { userId, permissions: userPermissions } = useAuthReady();
  const { academicYear, termForApi } = useGlobalFilters();
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState<TeacherProgress[]>([]);
  const [stats, setStats] = useState<TeacherProgressStats>({
    total_teachers: 0,
    completed: 0,
    in_progress: 0,
    needs_attention: 0,
  });
  const [searchQuery, setSearchQuery] = useState("");

  const gradeBand = userPermissions?.grade || "1";
  const courseType = (userPermissions?.track as "LT" | "IT" | "KCFS") || undefined;

  // Parse grade band to display string
  const getGradeDisplay = (band: string) => {
    if (band.includes("-")) {
      return `G${band}`;
    }
    return `G${band}`;
  };

  useEffect(() => {
    // Wait for user to be available
    if (!userId) {
      return;
    }

    async function fetchTeachers() {
      setLoading(true);
      try {
        const result = await getTeachersProgress({
          academic_year: academicYear,
          term: termForApi,
          grade_band: gradeBand,
          course_type: courseType,
        });

        setTeachers(result.data);
        setStats(result.stats);
      } catch (error) {
        console.error("Failed to fetch teachers:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchTeachers();
  }, [userId, gradeBand, courseType, academicYear, termForApi]);

  // Filter teachers based on search
  const filteredTeachers = useMemo(() => {
    return teachers.filter((teacher) => {
      if (!searchQuery) return true;
      return (
        teacher.teacher_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        teacher.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [teachers, searchQuery]);

  // When a single course_type is selected, all teachers go into that type group
  // When no course_type filter, group by teacher_type (fallback to "other")
  const teachersByType = useMemo(() => {
    const groups: { LT: TeacherProgress[]; IT: TeacherProgress[]; KCFS: TeacherProgress[]; other: TeacherProgress[] } = {
      LT: [],
      IT: [],
      KCFS: [],
      other: [],
    };

    filteredTeachers.forEach((teacher) => {
      // If courseType filter is active, all teachers teaching that course type
      // should be shown in that category (regardless of their teacher_type)
      if (courseType) {
        groups[courseType].push(teacher);
      } else {
        // No filter: group by teacher_type, or "other" if null
        const type = teacher.teacher_type;
        if (type === "LT") {
          groups.LT.push(teacher);
        } else if (type === "IT") {
          groups.IT.push(teacher);
        } else if (type === "KCFS") {
          groups.KCFS.push(teacher);
        } else {
          groups.other.push(teacher);
        }
      }
    });

    return groups;
  }, [filteredTeachers, courseType]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500/20 text-green-600 dark:text-green-400";
      case "in_progress":
        return "bg-amber-500/20 text-amber-600 dark:text-amber-400";
      case "needs_attention":
        return "bg-red-500/20 text-red-600 dark:text-red-400";
      default:
        return "bg-surface-secondary text-text-tertiary";
    }
  };

  const getProgressBarColor = (rate: number) => {
    if (rate >= 90) return "bg-green-500";
    if (rate >= 50) return "bg-amber-500";
    return "bg-red-500";
  };

  return (
    <AuthGuard requiredRoles={["admin", "head"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Users className="w-6 h-6 text-blue-500 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Teacher Progress</h1>
              <p className="text-sm text-text-secondary">
                {getGradeDisplay(gradeBand)} Teachers
                {courseType ? ` • ${courseType} Track` : ""}
              </p>
            </div>
          </div>
        </div>

        {/* Global Filter Bar */}
        <GlobalFilterBar showYear showTerm compact />

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
          <Input
            placeholder="Search teachers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-surface-secondary border-border-default text-text-primary placeholder:text-text-tertiary"
          />
        </div>

        {/* Progress Summary */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-surface-secondary rounded-xl border border-border-default p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-text-secondary text-sm">Teachers</span>
              <Users className="w-4 h-4 text-blue-500 dark:text-blue-400" />
            </div>
            {loading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-bold text-text-primary">{stats.total_teachers}</div>
            )}
            <div className="text-xs text-text-tertiary">in grade band</div>
          </div>
          <div className="bg-surface-secondary rounded-xl border border-border-default p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-text-secondary text-sm">Completed</span>
              <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            {loading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.completed}</div>
            )}
            <div className="text-xs text-text-tertiary">≥90% complete</div>
          </div>
          <div className="bg-surface-secondary rounded-xl border border-border-default p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-text-secondary text-sm">In Progress</span>
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            {loading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.in_progress}</div>
            )}
            <div className="text-xs text-text-tertiary">50-89% complete</div>
          </div>
          <div className="bg-surface-secondary rounded-xl border border-border-default p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-text-secondary text-sm">Attention</span>
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
            </div>
            {loading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{stats.needs_attention}</div>
            )}
            <div className="text-xs text-text-tertiary">&lt;50% complete</div>
          </div>
        </div>

        {/* Teachers by Type */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-surface-secondary rounded-xl border border-border-default p-6">
                <Skeleton className="h-6 w-32 mb-4" />
                <div className="space-y-3">
                  {[1, 2].map((j) => (
                    <div key={j} className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-32 mb-2" />
                        <Skeleton className="h-3 w-48" />
                      </div>
                      <Skeleton className="h-8 w-24" />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {/* LT Teachers */}
            {teachersByType.LT.length > 0 && (
              <div className="bg-surface-secondary rounded-xl border border-border-default overflow-hidden">
                <div className="p-4 border-b border-border-default flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-500 dark:text-blue-400" />
                  <h3 className="text-lg font-medium text-text-primary">
                    LT Teachers ({teachersByType.LT.length})
                  </h3>
                  <span className="text-text-tertiary text-sm">Local Teachers - ELA</span>
                </div>
                <TeacherTable teachers={teachersByType.LT} getStatusColor={getStatusColor} getProgressBarColor={getProgressBarColor} />
              </div>
            )}

            {/* IT Teachers */}
            {teachersByType.IT.length > 0 && (
              <div className="bg-surface-secondary rounded-xl border border-border-default overflow-hidden">
                <div className="p-4 border-b border-border-default flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-green-600 dark:text-green-400" />
                  <h3 className="text-lg font-medium text-text-primary">
                    IT Teachers ({teachersByType.IT.length})
                  </h3>
                  <span className="text-text-tertiary text-sm">International Teachers - ELA</span>
                </div>
                <TeacherTable teachers={teachersByType.IT} getStatusColor={getStatusColor} getProgressBarColor={getProgressBarColor} />
              </div>
            )}

            {/* KCFS Teachers */}
            {teachersByType.KCFS.length > 0 && (
              <div className="bg-surface-secondary rounded-xl border border-border-default overflow-hidden">
                <div className="p-4 border-b border-border-default flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  <h3 className="text-lg font-medium text-text-primary">
                    KCFS Teachers ({teachersByType.KCFS.length})
                  </h3>
                  <span className="text-text-tertiary text-sm">Kang Chiao Future Skills</span>
                </div>
                <TeacherTable teachers={teachersByType.KCFS} getStatusColor={getStatusColor} getProgressBarColor={getProgressBarColor} />
              </div>
            )}

            {/* Other Teachers (no teacher_type set) - only show when no filter applied */}
            {teachersByType.other.length > 0 && !courseType && (
              <div className="bg-surface-secondary rounded-xl border border-border-default overflow-hidden">
                <div className="p-4 border-b border-border-default flex items-center gap-2">
                  <Users className="w-5 h-5 text-slate-500 dark:text-slate-400" />
                  <h3 className="text-lg font-medium text-text-primary">
                    Other Teachers ({teachersByType.other.length})
                  </h3>
                  <span className="text-text-tertiary text-sm">Teachers without specific type assigned</span>
                </div>
                <TeacherTable teachers={teachersByType.other} getStatusColor={getStatusColor} getProgressBarColor={getProgressBarColor} />
              </div>
            )}

            {/* No teachers found */}
            {filteredTeachers.length === 0 && (
              <div className="bg-surface-secondary rounded-xl border border-border-default p-8 text-center">
                <Users className="w-12 h-12 text-text-tertiary opacity-50 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-text-primary mb-2">No Teachers Found</h3>
                <p className="text-text-tertiary max-w-md mx-auto">
                  {searchQuery
                    ? "No teachers match your search criteria."
                    : "No teachers are currently assigned to classes in your grade band."}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Info */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
          <h3 className="text-blue-600 dark:text-blue-400 font-medium mb-2">About Progress Tracking</h3>
          <p className="text-text-secondary text-sm">
            Progress is calculated based on actual score entries. Formula: (scores entered) / (students × expected assessments) × 100%.
            Expected assessments are configured in the Expectations settings for each grade level.
            Teachers are grouped by their course type (LT, IT, KCFS) for easier management.
          </p>
        </div>
      </div>
    </AuthGuard>
  );
}

// Teacher table component
function TeacherTable({
  teachers,
  getStatusColor,
  getProgressBarColor,
}: {
  teachers: TeacherProgress[];
  getStatusColor: (status: string) => string;
  getProgressBarColor: (rate: number) => string;
}) {
  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-border-default">
          <th className="text-left p-4 text-sm font-medium text-text-secondary">Teacher</th>
          <th className="text-left p-4 text-sm font-medium text-text-secondary">Classes</th>
          <th className="text-left p-4 text-sm font-medium text-text-secondary">Progress</th>
          <th className="text-left p-4 text-sm font-medium text-text-secondary">Status</th>
        </tr>
      </thead>
      <tbody>
        {teachers.map((teacher) => (
          <tr key={teacher.teacher_id} className="border-b border-border-subtle hover:bg-surface-hover">
            <td className="p-4">
              <div className="text-text-primary font-medium">{teacher.teacher_name}</div>
              <div className="text-text-tertiary text-sm">{teacher.email}</div>
            </td>
            <td className="p-4">
              <div className="text-text-secondary">{teacher.course_count} courses</div>
              {teacher.assigned_classes.length > 0 && (
                <div className="text-text-tertiary text-xs mt-1">
                  {teacher.assigned_classes.slice(0, 3).join(", ")}
                  {teacher.assigned_classes.length > 3 && ` +${teacher.assigned_classes.length - 3} more`}
                </div>
              )}
            </td>
            <td className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-surface-secondary rounded-full overflow-hidden max-w-[120px]">
                  <div
                    className={`h-full rounded-full ${getProgressBarColor(teacher.completion_rate)}`}
                    style={{ width: `${teacher.completion_rate}%` }}
                  />
                </div>
                <span className="text-text-secondary text-sm w-12">{teacher.completion_rate}%</span>
              </div>
              <div className="text-text-tertiary text-xs mt-1">
                {teacher.scores_entered} / {teacher.scores_expected} scores
              </div>
            </td>
            <td className="p-4">
              <span className={`px-2 py-1 text-xs rounded-full ${getStatusColor(teacher.status)}`}>
                {teacher.status === "completed"
                  ? "On Track"
                  : teacher.status === "in_progress"
                  ? "In Progress"
                  : "Needs Attention"}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

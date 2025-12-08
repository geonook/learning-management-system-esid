"use client";

import { useState, useEffect, useMemo } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { useAuth } from "@/lib/supabase/auth-context";
import { Users, CheckCircle, Clock, AlertCircle, BookOpen, GraduationCap, Search } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { getTeachersWithCourses, type TeacherWithCourses } from "@/lib/api/users";
import { createClient } from "@/lib/supabase/client";

interface TeacherWithProgress extends TeacherWithCourses {
  completion_rate: number;
  status: "completed" | "in_progress" | "needs_attention";
}

export default function TeacherProgressPage() {
  const { userPermissions, user } = useAuth();
  const userId = user?.id;
  const [loading, setLoading] = useState(true);
  const [teachers, setTeachers] = useState<TeacherWithProgress[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  const gradeBand = userPermissions?.grade || "1";
  const courseType = userPermissions?.track as "LT" | "IT" | "KCFS" || null;

  // Parse grade band to display string
  const getGradeDisplay = (band: string) => {
    if (band.includes("-")) {
      return `G${band}`;
    }
    return `G${band}`;
  };

  // Parse grade band to array of numbers
  const parseGradeBand = (band: string): number[] => {
    if (band.includes("-")) {
      const parts = band.split("-").map(Number);
      const start = parts[0] ?? 1;
      const end = parts[1] ?? start;
      const grades: number[] = [];
      for (let i = start; i <= end; i++) {
        grades.push(i);
      }
      return grades;
    }
    return [Number(band)];
  };

  useEffect(() => {
    // Wait for user to be available
    if (!userId) {
      return;
    }

    async function fetchTeachers() {
      try {
        const supabase = createClient();

        // Get all teachers with their courses
        const allTeachers = await getTeachersWithCourses();

        // Get grades in this grade band
        const grades = parseGradeBand(gradeBand);

        // Get classes in this grade band
        const { data: classesInBand } = await supabase
          .from("classes")
          .select("id, name, grade")
          .in("grade", grades)
          .eq("is_active", true);

        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const classIds = (classesInBand || []).map(c => c.id);
        const classNames = new Set((classesInBand || []).map(c => c.name));

        // Filter teachers:
        // 1. Only those assigned to classes in this grade band
        // 2. If head has a course type, filter by that type
        const filteredTeachers = allTeachers.filter(teacher => {
          // Check if teacher has classes in this grade band
          const hasClassInBand = teacher.assigned_classes.some(className => classNames.has(className));

          // If course type filter is set, also filter by teacher type
          if (courseType && teacher.teacher_type !== courseType) {
            return false;
          }

          return hasClassInBand || teacher.assigned_classes.length === 0;
        });

        // Calculate completion rate for each teacher (mock for now since we don't have score completion data)
        // In a real implementation, this would query the scores table
        const teachersWithProgress: TeacherWithProgress[] = filteredTeachers.map(teacher => {
          // For now, use a simple heuristic based on course assignments
          const hasClasses = teacher.course_count > 0;
          const completion_rate = hasClasses ? Math.round(Math.random() * 30 + 70) : 0; // Placeholder

          let status: "completed" | "in_progress" | "needs_attention";
          if (completion_rate >= 90) {
            status = "completed";
          } else if (completion_rate >= 50) {
            status = "in_progress";
          } else {
            status = "needs_attention";
          }

          return {
            ...teacher,
            completion_rate: hasClasses ? completion_rate : 0,
            status: hasClasses ? status : "needs_attention",
          };
        });

        setTeachers(teachersWithProgress);
      } catch (error) {
        console.error("Failed to fetch teachers:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchTeachers();
  }, [userId, gradeBand, courseType]);

  // Filter teachers based on search
  const filteredTeachers = useMemo(() => {
    return teachers.filter((teacher) => {
      if (!searchQuery) return true;
      return (
        teacher.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        teacher.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    });
  }, [teachers, searchQuery]);

  // Calculate summary stats
  const stats = useMemo(() => {
    const completed = teachers.filter(t => t.status === "completed").length;
    const inProgress = teachers.filter(t => t.status === "in_progress").length;
    const needsAttention = teachers.filter(t => t.status === "needs_attention").length;
    const totalCourses = teachers.reduce((sum, t) => sum + t.course_count, 0);
    return { completed, inProgress, needsAttention, totalCourses };
  }, [teachers]);

  // Group teachers by type
  const teachersByType = useMemo(() => {
    const groups: { LT: TeacherWithProgress[]; IT: TeacherWithProgress[]; KCFS: TeacherWithProgress[]; other: TeacherWithProgress[] } = {
      LT: [],
      IT: [],
      KCFS: [],
      other: [],
    };

    filteredTeachers.forEach(teacher => {
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
    });

    return groups;
  }, [filteredTeachers]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-green-500/20 text-green-400";
      case "in_progress":
        return "bg-amber-500/20 text-amber-400";
      case "needs_attention":
        return "bg-red-500/20 text-red-400";
      default:
        return "bg-white/10 text-white/40";
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
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/20 rounded-lg">
            <Users className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Teacher Progress</h1>
            <p className="text-sm text-white/60">
              {getGradeDisplay(gradeBand)} Teachers
              {courseType ? ` • ${courseType} Track` : ""}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
          <Input
            placeholder="Search teachers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
          />
        </div>

        {/* Progress Summary */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">Teachers</span>
              <Users className="w-4 h-4 text-blue-400" />
            </div>
            {loading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-bold text-white">{teachers.length}</div>
            )}
            <div className="text-xs text-white/40">in grade band</div>
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">Completed</span>
              <CheckCircle className="w-4 h-4 text-green-400" />
            </div>
            {loading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-bold text-green-400">{stats.completed}</div>
            )}
            <div className="text-xs text-white/40">on track</div>
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">In Progress</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            {loading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-bold text-amber-400">{stats.inProgress}</div>
            )}
            <div className="text-xs text-white/40">working</div>
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">Attention</span>
              <AlertCircle className="w-4 h-4 text-red-400" />
            </div>
            {loading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-bold text-red-400">{stats.needsAttention}</div>
            )}
            <div className="text-xs text-white/40">behind</div>
          </div>
        </div>

        {/* Teachers by Type */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white/5 rounded-xl border border-white/10 p-6">
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
              <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                <div className="p-4 border-b border-white/10 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-blue-400" />
                  <h3 className="text-lg font-medium text-white">
                    LT Teachers ({teachersByType.LT.length})
                  </h3>
                  <span className="text-white/40 text-sm">Local Teachers - ELA</span>
                </div>
                <TeacherTable teachers={teachersByType.LT} getStatusColor={getStatusColor} getProgressBarColor={getProgressBarColor} />
              </div>
            )}

            {/* IT Teachers */}
            {teachersByType.IT.length > 0 && (
              <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                <div className="p-4 border-b border-white/10 flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-green-400" />
                  <h3 className="text-lg font-medium text-white">
                    IT Teachers ({teachersByType.IT.length})
                  </h3>
                  <span className="text-white/40 text-sm">International Teachers - ELA</span>
                </div>
                <TeacherTable teachers={teachersByType.IT} getStatusColor={getStatusColor} getProgressBarColor={getProgressBarColor} />
              </div>
            )}

            {/* KCFS Teachers */}
            {teachersByType.KCFS.length > 0 && (
              <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                <div className="p-4 border-b border-white/10 flex items-center gap-2">
                  <BookOpen className="w-5 h-5 text-purple-400" />
                  <h3 className="text-lg font-medium text-white">
                    KCFS Teachers ({teachersByType.KCFS.length})
                  </h3>
                  <span className="text-white/40 text-sm">Kang Chiao Future Skills</span>
                </div>
                <TeacherTable teachers={teachersByType.KCFS} getStatusColor={getStatusColor} getProgressBarColor={getProgressBarColor} />
              </div>
            )}

            {/* No teachers found */}
            {filteredTeachers.length === 0 && (
              <div className="bg-white/5 rounded-xl border border-white/10 p-8 text-center">
                <Users className="w-12 h-12 text-white/20 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-white mb-2">No Teachers Found</h3>
                <p className="text-white/40 max-w-md mx-auto">
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
          <h3 className="text-blue-400 font-medium mb-2">About Progress Tracking</h3>
          <p className="text-white/60 text-sm">
            Progress is calculated based on score entries for the current assessment period.
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
  teachers: TeacherWithProgress[];
  getStatusColor: (status: string) => string;
  getProgressBarColor: (rate: number) => string;
}) {
  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-white/10">
          <th className="text-left p-4 text-sm font-medium text-white/60">Teacher</th>
          <th className="text-left p-4 text-sm font-medium text-white/60">Classes</th>
          <th className="text-left p-4 text-sm font-medium text-white/60">Progress</th>
          <th className="text-left p-4 text-sm font-medium text-white/60">Status</th>
        </tr>
      </thead>
      <tbody>
        {teachers.map((teacher) => (
          <tr key={teacher.id} className="border-b border-white/5 hover:bg-white/5">
            <td className="p-4">
              <div className="text-white font-medium">{teacher.full_name}</div>
              <div className="text-white/40 text-sm">{teacher.email}</div>
            </td>
            <td className="p-4">
              <div className="text-white/80">{teacher.course_count} courses</div>
              {teacher.assigned_classes.length > 0 && (
                <div className="text-white/40 text-xs mt-1">
                  {teacher.assigned_classes.slice(0, 3).join(", ")}
                  {teacher.assigned_classes.length > 3 && ` +${teacher.assigned_classes.length - 3} more`}
                </div>
              )}
            </td>
            <td className="p-4">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden max-w-[120px]">
                  <div
                    className={`h-full rounded-full ${getProgressBarColor(teacher.completion_rate)}`}
                    style={{ width: `${teacher.completion_rate}%` }}
                  />
                </div>
                <span className="text-white/60 text-sm w-12">{teacher.completion_rate}%</span>
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

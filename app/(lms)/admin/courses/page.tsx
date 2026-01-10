"use client";

import { useState, useEffect, useMemo } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { useAuthReady } from "@/hooks/useAuthReady";
import { useGlobalFilters, GlobalFilterBar } from "@/components/filters/GlobalFilterBar";
import {
  BookOpen,
  Search,
  Filter,
  ChevronDown,
  Users,
  Check,
  X,
  Loader2,
  UserPlus,
  UserMinus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { createClient } from "@/lib/supabase/client";
import {
  assignTeacherToCourse,
  unassignTeacherFromCourse,
  getCourseStatistics,
} from "@/lib/api/courses";

interface CourseRow {
  id: string;
  course_type: "LT" | "IT" | "KCFS";
  teacher_id: string | null;
  class_id: string;
  academic_year: string;
  class_name: string;
  grade: number;
  teacher_name: string | null;
  teacher_email: string | null;
}

interface TeacherOption {
  id: string;
  full_name: string;
  email: string;
  teacher_type: "LT" | "IT" | "KCFS";
}

export default function CourseAssignmentPage() {
  const { isReady } = useAuthReady();
  const { academicYear } = useGlobalFilters();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState<number | null>(null);
  const [typeFilter, setTypeFilter] = useState<"LT" | "IT" | "KCFS" | null>(null);
  const [showGradeDropdown, setShowGradeDropdown] = useState(false);
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  const [stats, setStats] = useState<{
    total: number;
    assigned: number;
    unassigned: number;
    byType: Record<string, { total: number; assigned: number }>;
  } | null>(null);

  // Assignment dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState<CourseRow | null>(null);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [loadingTeachers, setLoadingTeachers] = useState(false);
  const [assigning, setAssigning] = useState(false);

  // Fetch courses
  useEffect(() => {
    if (!isReady) return;

    async function fetchCourses() {
      try {
        const supabase = createClient();

        // Fetch courses with class and teacher info
        const { data, error } = await supabase
          .from("courses")
          .select(`
            id,
            course_type,
            teacher_id,
            class_id,
            academic_year,
            classes:class_id (
              name,
              grade
            ),
            users:teacher_id (
              full_name,
              email
            )
          `)
          .eq("is_active", true)
          .eq("academic_year", academicYear)
          .order("course_type");

        if (error) throw error;

        // Map to flat structure
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped: CourseRow[] = (data || []).map((c: any) => ({
          id: c.id,
          course_type: c.course_type as "LT" | "IT" | "KCFS",
          teacher_id: c.teacher_id,
          class_id: c.class_id,
          academic_year: c.academic_year,
          class_name: c.classes?.name || "",
          grade: c.classes?.grade || 0,
          teacher_name: c.users?.full_name || null,
          teacher_email: c.users?.email || null,
        }));

        // Sort by grade, then class name, then course type
        mapped.sort((a, b) => {
          if (a.grade !== b.grade) return a.grade - b.grade;
          if (a.class_name !== b.class_name) return a.class_name.localeCompare(b.class_name);
          return a.course_type.localeCompare(b.course_type);
        });

        setCourses(mapped);

        // Fetch statistics
        const statsData = await getCourseStatistics(academicYear);
        setStats(statsData);
      } catch (err) {
        console.error("Failed to fetch courses:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchCourses();
  }, [isReady, academicYear]);

  // Fetch teachers when opening dialog
  useEffect(() => {
    if (!dialogOpen || !selectedCourse) return;

    const courseType = selectedCourse.course_type;

    async function fetchTeachers() {
      setLoadingTeachers(true);
      try {
        const supabase = createClient();

        const { data, error } = await supabase
          .from("users")
          .select("id, full_name, email, teacher_type")
          .eq("teacher_type", courseType)
          .in("role", ["teacher", "head"])
          .order("full_name");

        if (error) throw error;

        setTeachers((data || []) as TeacherOption[]);
      } catch (err) {
        console.error("Failed to fetch teachers:", err);
      } finally {
        setLoadingTeachers(false);
      }
    }

    fetchTeachers();
  }, [dialogOpen, selectedCourse]);

  // Filter courses
  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      const matchesSearch = searchQuery
        ? c.class_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          c.teacher_name?.toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      const matchesGrade = gradeFilter !== null ? c.grade === gradeFilter : true;
      const matchesType = typeFilter !== null ? c.course_type === typeFilter : true;
      return matchesSearch && matchesGrade && matchesType;
    });
  }, [courses, searchQuery, gradeFilter, typeFilter]);

  // Handle assign teacher
  const handleAssign = async (teacherId: string) => {
    if (!selectedCourse) return;

    setAssigning(true);
    try {
      await assignTeacherToCourse(selectedCourse.id, teacherId);

      // Update local state
      const teacher = teachers.find((t) => t.id === teacherId);
      setCourses((prev) =>
        prev.map((c) =>
          c.id === selectedCourse.id
            ? { ...c, teacher_id: teacherId, teacher_name: teacher?.full_name || null, teacher_email: teacher?.email || null }
            : c
        )
      );

      // Update stats
      if (stats && !selectedCourse.teacher_id) {
        const currentByType = stats.byType[selectedCourse.course_type];
        if (currentByType) {
          setStats({
            ...stats,
            assigned: stats.assigned + 1,
            unassigned: stats.unassigned - 1,
            byType: {
              ...stats.byType,
              [selectedCourse.course_type]: {
                total: currentByType.total,
                assigned: currentByType.assigned + 1,
              },
            },
          });
        }
      }

      setDialogOpen(false);
    } catch (err) {
      console.error("Failed to assign teacher:", err);
      alert("Failed to assign teacher. Please try again.");
    } finally {
      setAssigning(false);
    }
  };

  // Handle unassign teacher
  const handleUnassign = async () => {
    if (!selectedCourse) return;

    setAssigning(true);
    try {
      await unassignTeacherFromCourse(selectedCourse.id);

      // Update local state
      setCourses((prev) =>
        prev.map((c) =>
          c.id === selectedCourse.id
            ? { ...c, teacher_id: null, teacher_name: null, teacher_email: null }
            : c
        )
      );

      // Update stats
      if (stats && selectedCourse.teacher_id) {
        const currentByType = stats.byType[selectedCourse.course_type];
        if (currentByType) {
          setStats({
            ...stats,
            assigned: stats.assigned - 1,
            unassigned: stats.unassigned + 1,
            byType: {
              ...stats.byType,
              [selectedCourse.course_type]: {
                total: currentByType.total,
                assigned: currentByType.assigned - 1,
              },
            },
          });
        }
      }

      setDialogOpen(false);
    } catch (err) {
      console.error("Failed to unassign teacher:", err);
      alert("Failed to unassign teacher. Please try again.");
    } finally {
      setAssigning(false);
    }
  };

  const openAssignDialog = (course: CourseRow) => {
    setSelectedCourse(course);
    setDialogOpen(true);
  };

  const getTypeColor = (type: "LT" | "IT" | "KCFS") => {
    switch (type) {
      case "LT":
        return "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30";
      case "IT":
        return "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
      case "KCFS":
        return "bg-purple-500/20 text-purple-600 dark:text-purple-400 border-purple-500/30";
    }
  };

  return (
    <AuthGuard requiredRoles={["admin"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-surface-tertiary rounded-lg">
              <BookOpen className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">Course Assignments</h1>
              <p className="text-sm text-text-secondary">
                Assign teachers to courses for each class
              </p>
            </div>
          </div>
        </div>

        {/* Academic Year Filter */}
        <GlobalFilterBar showYear compact className="mb-2" />

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
            <Input
              placeholder="Search by class or teacher name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-surface-secondary border-border-default text-text-primary placeholder:text-text-tertiary"
            />
          </div>

          {/* Grade Filter */}
          <div className="relative">
            <Button
              variant="outline"
              className="border-border-default text-text-secondary"
              onClick={() => {
                setShowGradeDropdown(!showGradeDropdown);
                setShowTypeDropdown(false);
              }}
            >
              <Filter className="w-4 h-4 mr-2" />
              {gradeFilter !== null ? `G${gradeFilter}` : "All Grades"}
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
            {showGradeDropdown && (
              <div className="absolute top-full mt-2 right-0 bg-surface-elevated border border-border-default rounded-lg shadow-notion z-10 py-1 min-w-[120px]">
                <button
                  className="w-full px-4 py-2 text-left text-text-secondary hover:bg-surface-hover text-sm"
                  onClick={() => {
                    setGradeFilter(null);
                    setShowGradeDropdown(false);
                  }}
                >
                  All Grades
                </button>
                {[1, 2, 3, 4, 5, 6].map((grade) => (
                  <button
                    key={grade}
                    className="w-full px-4 py-2 text-left text-text-secondary hover:bg-surface-hover text-sm"
                    onClick={() => {
                      setGradeFilter(grade);
                      setShowGradeDropdown(false);
                    }}
                  >
                    Grade {grade}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Type Filter */}
          <div className="relative">
            <Button
              variant="outline"
              className="border-border-default text-text-secondary"
              onClick={() => {
                setShowTypeDropdown(!showTypeDropdown);
                setShowGradeDropdown(false);
              }}
            >
              <BookOpen className="w-4 h-4 mr-2" />
              {typeFilter || "All Types"}
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
            {showTypeDropdown && (
              <div className="absolute top-full mt-2 right-0 bg-surface-elevated border border-border-default rounded-lg shadow-notion z-10 py-1 min-w-[120px]">
                <button
                  className="w-full px-4 py-2 text-left text-text-secondary hover:bg-surface-hover text-sm"
                  onClick={() => {
                    setTypeFilter(null);
                    setShowTypeDropdown(false);
                  }}
                >
                  All Types
                </button>
                {(["LT", "IT", "KCFS"] as const).map((type) => (
                  <button
                    key={type}
                    className="w-full px-4 py-2 text-left text-text-secondary hover:bg-surface-hover text-sm"
                    onClick={() => {
                      setTypeFilter(type);
                      setShowTypeDropdown(false);
                    }}
                  >
                    {type}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-surface-secondary rounded-xl border border-border-default p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-text-secondary text-sm">Total Courses</span>
              <BookOpen className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
            </div>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-text-primary">{stats?.total || 0}</div>
            )}
          </div>
          <div className="bg-surface-secondary rounded-xl border border-border-default p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-text-secondary text-sm">Assigned</span>
              <Check className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
            </div>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats?.assigned || 0}</div>
            )}
          </div>
          <div className="bg-surface-secondary rounded-xl border border-border-default p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-text-secondary text-sm">Unassigned</span>
              <X className="w-4 h-4 text-amber-500 dark:text-amber-400" />
            </div>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats?.unassigned || 0}</div>
            )}
          </div>
          <div className="bg-surface-secondary rounded-xl border border-border-default p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-text-secondary text-sm">Assignment Rate</span>
              <Users className="w-4 h-4 text-blue-500 dark:text-blue-400" />
            </div>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-text-primary">
                {stats && stats.total > 0
                  ? `${Math.round((stats.assigned / stats.total) * 100)}%`
                  : "0%"}
              </div>
            )}
          </div>
        </div>

        {/* Courses Table */}
        <div className="bg-surface-secondary rounded-xl border border-border-default overflow-hidden">
          <div className="table-responsive">
          <table className="min-w-[700px] w-full">
            <thead>
              <tr className="border-b border-border-default">
                <th className="text-left p-4 text-sm font-medium text-text-secondary">Class</th>
                <th className="text-left p-4 text-sm font-medium text-text-secondary">Grade</th>
                <th className="text-left p-4 text-sm font-medium text-text-secondary">Course</th>
                <th className="text-left p-4 text-sm font-medium text-text-secondary">Teacher</th>
                <th className="text-left p-4 text-sm font-medium text-text-secondary">Status</th>
                <th className="text-right p-4 text-sm font-medium text-text-secondary">Action</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="border-b border-border-subtle">
                    <td className="p-4"><Skeleton className="h-5 w-32" /></td>
                    <td className="p-4"><Skeleton className="h-5 w-12" /></td>
                    <td className="p-4"><Skeleton className="h-5 w-16" /></td>
                    <td className="p-4"><Skeleton className="h-5 w-40" /></td>
                    <td className="p-4"><Skeleton className="h-5 w-20" /></td>
                    <td className="p-4"><Skeleton className="h-8 w-20 ml-auto" /></td>
                  </tr>
                ))
              ) : filteredCourses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-text-tertiary">
                    No courses found
                  </td>
                </tr>
              ) : (
                filteredCourses.map((course) => (
                  <tr
                    key={course.id}
                    className="border-b border-border-subtle hover:bg-surface-hover transition-colors"
                  >
                    <td className="p-4 text-text-primary font-medium">{course.class_name}</td>
                    <td className="p-4 text-text-secondary">G{course.grade}</td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-full border ${getTypeColor(
                          course.course_type
                        )}`}
                      >
                        {course.course_type}
                      </span>
                    </td>
                    <td className="p-4">
                      {course.teacher_name ? (
                        <div>
                          <div className="text-text-primary">{course.teacher_name}</div>
                          <div className="text-xs text-text-tertiary">{course.teacher_email}</div>
                        </div>
                      ) : (
                        <span className="text-text-tertiary">Unassigned</span>
                      )}
                    </td>
                    <td className="p-4">
                      {course.teacher_id ? (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                          <Check className="w-3 h-3" />
                          Assigned
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
                          <X className="w-3 h-3" />
                          Pending
                        </span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-border-default text-text-secondary hover:text-text-primary hover:border-border-emphasis"
                        onClick={() => openAssignDialog(course)}
                      >
                        {course.teacher_id ? (
                          <>
                            <UserMinus className="w-4 h-4 mr-1" />
                            Change
                          </>
                        ) : (
                          <>
                            <UserPlus className="w-4 h-4 mr-1" />
                            Assign
                          </>
                        )}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>

        {/* Showing count */}
        {!loading && (
          <div className="text-sm text-text-tertiary text-center">
            Showing {filteredCourses.length} of {courses.length} courses
          </div>
        )}
      </div>

      {/* Assignment Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-surface-elevated border-border-default text-text-primary">
          <DialogHeader>
            <DialogTitle>
              {selectedCourse?.teacher_id ? "Change Teacher" : "Assign Teacher"}
            </DialogTitle>
          </DialogHeader>

          <div className="py-4">
            {/* Course Info */}
            <div className="mb-4 p-3 bg-surface-secondary rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full border ${
                    selectedCourse ? getTypeColor(selectedCourse.course_type) : ""
                  }`}
                >
                  {selectedCourse?.course_type}
                </span>
                <span className="text-text-secondary">•</span>
                <span className="text-text-primary">{selectedCourse?.class_name}</span>
                <span className="text-text-secondary">•</span>
                <span className="text-text-secondary">G{selectedCourse?.grade}</span>
              </div>
              {selectedCourse?.teacher_name && (
                <div className="text-sm text-text-secondary">
                  Current: {selectedCourse.teacher_name}
                </div>
              )}
            </div>

            {/* Teacher List */}
            <div className="text-sm text-text-secondary mb-2">
              Select a {selectedCourse?.course_type} teacher:
            </div>

            {loadingTeachers ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-text-tertiary" />
              </div>
            ) : teachers.length === 0 ? (
              <div className="text-center py-8 text-text-tertiary">
                No {selectedCourse?.course_type} teachers available
              </div>
            ) : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {teachers.map((teacher) => (
                  <button
                    key={teacher.id}
                    className={`w-full p-3 rounded-lg text-left transition-colors ${
                      selectedCourse?.teacher_id === teacher.id
                        ? "bg-indigo-500/20 border border-indigo-500/50"
                        : "bg-surface-secondary hover:bg-surface-hover border border-transparent"
                    }`}
                    onClick={() => handleAssign(teacher.id)}
                    disabled={assigning}
                  >
                    <div className="font-medium text-text-primary">{teacher.full_name}</div>
                    <div className="text-xs text-text-tertiary">{teacher.email}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="gap-2">
            {selectedCourse?.teacher_id && (
              <Button
                variant="outline"
                className="border-red-500/50 text-red-500 dark:text-red-400 hover:bg-red-500/20"
                onClick={handleUnassign}
                disabled={assigning}
              >
                {assigning ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                ) : (
                  <UserMinus className="w-4 h-4 mr-2" />
                )}
                Remove Teacher
              </Button>
            )}
            <Button
              variant="outline"
              className="border-border-default"
              onClick={() => setDialogOpen(false)}
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AuthGuard>
  );
}

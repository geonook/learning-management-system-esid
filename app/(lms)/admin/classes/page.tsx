"use client";

import { useState, useEffect, useMemo } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { School, Search, Plus, Filter, Users, BookOpen, GraduationCap, ChevronDown, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getClassesWithDetails, type ClassWithDetails } from "@/lib/api/classes";
import Link from "next/link";

export default function ClassManagementPage() {
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<ClassWithDetails[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState<number | null>(null);
  const [showGradeDropdown, setShowGradeDropdown] = useState(false);

  useEffect(() => {
    async function fetchClasses() {
      console.log('[AdminClasses] Starting to fetch classes...');
      try {
        const data = await getClassesWithDetails({
          academicYear: "2025-2026",
        });
        console.log('[AdminClasses] Fetched classes:', data?.length ?? 0);
        setClasses(data);
      } catch (error) {
        console.error("[AdminClasses] Failed to fetch classes:", error);
      } finally {
        console.log('[AdminClasses] Setting loading to false');
        setLoading(false);
      }
    }
    fetchClasses();
  }, []);

  // Filter classes based on search and grade
  const filteredClasses = useMemo(() => {
    return classes.filter((cls) => {
      const matchesSearch = searchQuery
        ? cls.name.toLowerCase().includes(searchQuery.toLowerCase())
        : true;
      const matchesGrade = gradeFilter !== null ? cls.grade === gradeFilter : true;
      return matchesSearch && matchesGrade;
    });
  }, [classes, searchQuery, gradeFilter]);

  // Calculate statistics
  const stats = useMemo(() => {
    const totalClasses = classes.length;
    const totalCourses = classes.reduce((sum, cls) => sum + cls.courses.length, 0);
    const totalStudents = classes.reduce((sum, cls) => sum + cls.student_count, 0);
    const uniqueGrades = new Set(classes.map((cls) => cls.grade)).size;
    return { totalClasses, totalCourses, totalStudents, uniqueGrades };
  }, [classes]);

  // Check if a course type has an assigned teacher
  const hasTeacher = (courses: ClassWithDetails["courses"], type: "LT" | "IT" | "KCFS") => {
    const course = courses.find((c) => c.course_type === type);
    return course?.teacher !== null;
  };

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
              <p className="text-sm text-white/60">
                Manage classes and course assignments • 2025-2026
              </p>
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
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-white/40"
            />
          </div>
          <div className="relative">
            <Button
              variant="outline"
              className="border-white/10 text-white/70"
              onClick={() => setShowGradeDropdown(!showGradeDropdown)}
            >
              <Filter className="w-4 h-4 mr-2" />
              {gradeFilter !== null ? `Grade ${gradeFilter}` : "All Grades"}
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
            {showGradeDropdown && (
              <div className="absolute top-full mt-2 right-0 bg-slate-800 border border-white/10 rounded-lg shadow-lg z-10 py-1 min-w-[120px]">
                <button
                  className="w-full px-4 py-2 text-left text-white/70 hover:bg-white/10 text-sm"
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
                    className="w-full px-4 py-2 text-left text-white/70 hover:bg-white/10 text-sm"
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
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">Classes</span>
              <School className="w-4 h-4 text-purple-400" />
            </div>
            {loading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-bold text-white">{stats.totalClasses}</div>
            )}
            <div className="text-xs text-white/40">total active</div>
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">Courses</span>
              <BookOpen className="w-4 h-4 text-blue-400" />
            </div>
            {loading ? (
              <Skeleton className="h-8 w-12" />
            ) : (
              <div className="text-2xl font-bold text-white">{stats.totalCourses}</div>
            )}
            <div className="text-xs text-white/40">LT + IT + KCFS</div>
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">Students</span>
              <Users className="w-4 h-4 text-green-400" />
            </div>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <div className="text-2xl font-bold text-white">
                {stats.totalStudents.toLocaleString()}
              </div>
            )}
            <div className="text-xs text-white/40">enrolled</div>
          </div>
          <div className="bg-white/5 rounded-xl border border-white/10 p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-white/60 text-sm">Grades</span>
              <GraduationCap className="w-4 h-4 text-amber-400" />
            </div>
            {loading ? (
              <Skeleton className="h-8 w-8" />
            ) : (
              <div className="text-2xl font-bold text-white">{stats.uniqueGrades}</div>
            )}
            <div className="text-xs text-white/40">G1-G6</div>
          </div>
        </div>

        {/* Classes Table */}
        <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left p-4 text-sm font-medium text-white/60">Class</th>
                <th className="text-left p-4 text-sm font-medium text-white/60">Grade</th>
                <th className="text-left p-4 text-sm font-medium text-white/60">Level</th>
                <th className="text-left p-4 text-sm font-medium text-white/60">Students</th>
                <th className="text-center p-4 text-sm font-medium text-white/60">LT</th>
                <th className="text-center p-4 text-sm font-medium text-white/60">IT</th>
                <th className="text-center p-4 text-sm font-medium text-white/60">KCFS</th>
                <th className="text-left p-4 text-sm font-medium text-white/60">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="border-b border-white/5">
                    <td className="p-4">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-4 w-8" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-4 w-12" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-4 w-8" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-4 w-6 mx-auto" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-4 w-6 mx-auto" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-4 w-6 mx-auto" />
                    </td>
                    <td className="p-4">
                      <Skeleton className="h-4 w-16" />
                    </td>
                  </tr>
                ))
              ) : filteredClasses.length > 0 ? (
                filteredClasses.map((cls) => (
                  <tr key={cls.id} className="border-b border-white/5 hover:bg-white/5">
                    <td className="p-4 text-white font-medium">{cls.name}</td>
                    <td className="p-4 text-white/80">G{cls.grade}</td>
                    <td className="p-4">
                      <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                        {cls.level || "N/A"}
                      </span>
                    </td>
                    <td className="p-4 text-white/80">{cls.student_count}</td>
                    <td className="p-4 text-center">
                      {hasTeacher(cls.courses, "LT") ? (
                        <Check className="w-4 h-4 text-green-400 mx-auto" />
                      ) : (
                        <X className="w-4 h-4 text-red-400/50 mx-auto" />
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {hasTeacher(cls.courses, "IT") ? (
                        <Check className="w-4 h-4 text-green-400 mx-auto" />
                      ) : (
                        <X className="w-4 h-4 text-red-400/50 mx-auto" />
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {hasTeacher(cls.courses, "KCFS") ? (
                        <Check className="w-4 h-4 text-green-400 mx-auto" />
                      ) : (
                        <X className="w-4 h-4 text-red-400/50 mx-auto" />
                      )}
                    </td>
                    <td className="p-4">
                      <Link
                        href={`/class/${cls.id}/gradebook`}
                        className="text-purple-400 hover:text-purple-300 text-sm"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-white/40">
                    {searchQuery || gradeFilter !== null
                      ? "No classes match your filters"
                      : "No classes found"}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Summary */}
        {!loading && filteredClasses.length > 0 && (
          <div className="text-sm text-white/40 text-center">
            Showing {filteredClasses.length} of {classes.length} classes
          </div>
        )}

        {/* Info */}
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-xl p-4">
          <h3 className="text-purple-400 font-medium mb-2">One Class, Three Teachers</h3>
          <p className="text-white/60 text-sm">
            Each class has three course slots: LT (Local Teacher), IT (International Teacher), and
            KCFS (Kang Chiao Future Skill). A checkmark indicates a teacher has been assigned to
            that course.
          </p>
        </div>
      </div>
    </AuthGuard>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AuthGuard } from "@/components/auth/auth-guard";
import { supabase } from "@/lib/supabase/client";
import {
  Users,
  Loader2,
  Mail,
  BookOpen,
  GraduationCap,
  School,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";

interface TeacherDetails {
  id: string;
  full_name: string;
  email: string;
  role: string;
  teacher_type: string | null;
  grade_band: string | null;
  track: string | null;
  courses: {
    id: string;
    course_type: string;
    class_id: string;
    class_name: string;
    class_grade: number;
    student_count: number;
  }[];
}

export default function TeacherDetailPage() {
  const params = useParams();
  const teacherId = params?.id as string;

  const [teacher, setTeacher] = useState<TeacherDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTeacher() {
      setLoading(true);
      setError(null);
      try {
        // Fetch teacher info
        const { data: userData, error: userError } = await supabase
          .from("users")
          .select("id, full_name, email, role, teacher_type, grade_band, track")
          .eq("id", teacherId)
          .single();

        if (userError) throw userError;
        if (!userData) throw new Error("Teacher not found");

        // Fetch courses with class info
        const { data: coursesData, error: coursesError } = await supabase
          .from("courses")
          .select(`
            id,
            course_type,
            class_id,
            classes (
              id,
              name,
              grade
            )
          `)
          .eq("teacher_id", teacherId);

        if (coursesError) throw coursesError;

        // Get student counts for each class
        const classIds = coursesData?.map(c => c.class_id).filter(Boolean) || [];
        let studentCounts: Record<string, number> = {};

        if (classIds.length > 0) {
          const { data: students } = await supabase
            .from("students")
            .select("class_id")
            .in("class_id", classIds);

          if (students) {
            studentCounts = students.reduce((acc, s) => {
              acc[s.class_id] = (acc[s.class_id] || 0) + 1;
              return acc;
            }, {} as Record<string, number>);
          }
        }

        // Transform courses data
        const courses = (coursesData || []).map(c => {
          // Handle the case where classes could be an array or single object
          const classData = Array.isArray(c.classes) ? c.classes[0] : c.classes;
          return {
            id: c.id,
            course_type: c.course_type,
            class_id: c.class_id,
            class_name: classData?.name || "Unknown",
            class_grade: classData?.grade || 0,
            student_count: studentCounts[c.class_id] || 0,
          };
        });

        setTeacher({
          ...userData,
          courses,
        });
      } catch (err) {
        console.error("Failed to fetch teacher:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch teacher");
      } finally {
        setLoading(false);
      }
    }

    if (teacherId) {
      fetchTeacher();
    }
  }, [teacherId]);

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

  // Calculate stats
  const totalClasses = teacher?.courses.length || 0;
  const totalStudents = teacher?.courses.reduce((sum, c) => sum + c.student_count, 0) || 0;
  const uniqueGrades = [...new Set(teacher?.courses.map(c => c.class_grade))].sort();

  // Build breadcrumbs based on loaded teacher
  const breadcrumbs = teacher
    ? [
        { label: "Browse Data", href: "/dashboard" },
        { label: "All Teachers", href: "/browse/teachers" },
        { label: teacher.full_name },
      ]
    : [
        { label: "Browse Data", href: "/dashboard" },
        { label: "All Teachers", href: "/browse/teachers" },
        { label: "Loading..." },
      ];

  return (
    <AuthGuard requiredRoles={["admin", "head", "office_member"]}>
      <div className="space-y-6">
        {/* Page Header with Breadcrumbs */}
        <PageHeader
          title={teacher?.full_name || "Teacher Details"}
          subtitle={teacher ? `${teacher.role === "head" ? "Head Teacher" : teacher.teacher_type || "Teacher"} • ${teacher.email}` : undefined}
          breadcrumbs={breadcrumbs}
          backHref="/browse/teachers"
          backLabel="Back to Teachers"
        />

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

        {/* Teacher Details */}
        {!loading && !error && teacher && (
          <>
            {/* Header */}
            <div className="bg-white/5 rounded-xl border border-white/10 p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-emerald-500/20 rounded-xl">
                  <Users className="w-8 h-8 text-emerald-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl font-bold text-white">{teacher.full_name}</h1>
                    <span className={`px-3 py-1 text-sm rounded-full ${getTypeBadgeColor(teacher.teacher_type, teacher.role)}`}>
                      {teacher.role === "head" ? "Head Teacher" : teacher.teacher_type || "Teacher"}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-white/60">
                    <span className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      {teacher.email}
                    </span>
                    {teacher.grade_band && (
                      <span className="flex items-center gap-2">
                        <GraduationCap className="w-4 h-4" />
                        Grade Band: {teacher.grade_band}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white/5 rounded-xl border border-white/10 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <School className="w-5 h-5 text-blue-400" />
                  <span className="text-white/60">Classes</span>
                </div>
                <div className="text-3xl font-bold text-white">{totalClasses}</div>
              </div>
              <div className="bg-white/5 rounded-xl border border-white/10 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <Users className="w-5 h-5 text-emerald-400" />
                  <span className="text-white/60">Students</span>
                </div>
                <div className="text-3xl font-bold text-white">{totalStudents}</div>
              </div>
              <div className="bg-white/5 rounded-xl border border-white/10 p-6">
                <div className="flex items-center gap-3 mb-2">
                  <BookOpen className="w-5 h-5 text-purple-400" />
                  <span className="text-white/60">Grades</span>
                </div>
                <div className="text-3xl font-bold text-white">
                  {uniqueGrades.length > 0 ? uniqueGrades.map(g => `G${g}`).join(", ") : "-"}
                </div>
              </div>
            </div>

            {/* Assigned Classes */}
            <div className="bg-white/5 rounded-xl border border-white/10">
              <div className="p-4 border-b border-white/10">
                <h2 className="text-lg font-semibold text-white">Assigned Classes</h2>
              </div>
              {teacher.courses.length === 0 ? (
                <div className="p-8 text-center">
                  <School className="w-12 h-12 text-white/20 mx-auto mb-4" />
                  <p className="text-white/60">No classes assigned</p>
                </div>
              ) : (
                <div className="divide-y divide-white/5">
                  {teacher.courses.map((course) => (
                    <Link
                      key={course.id}
                      href={`/class/${course.class_id}`}
                      className="flex items-center justify-between p-4 hover:bg-white/5 transition-colors group"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-white/5 rounded-lg">
                          <School className="w-5 h-5 text-white/60" />
                        </div>
                        <div>
                          <div className="text-white font-medium group-hover:text-emerald-400 transition-colors">
                            {course.class_name}
                          </div>
                          <div className="text-sm text-white/40">
                            Grade {course.class_grade} • {course.student_count} students
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`px-2 py-1 text-xs rounded-full ${getTypeBadgeColor(course.course_type, "teacher")}`}>
                          {course.course_type}
                        </span>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AuthGuard>
  );
}

"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { AuthGuard } from "@/components/auth/auth-guard";
import { useAuth } from "@/lib/supabase/auth-context";
import { supabase } from "@/lib/supabase/client";
import {
  GraduationCap,
  Loader2,
  School,
  BookOpen,
  BarChart3,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";

interface StudentDetails {
  id: string;
  student_id: string;
  full_name: string;
  grade: number;
  level: string | null;
  class_id: string | null;
  class_name: string | null;
  courses: {
    id: string;
    course_type: string;
    teacher_name: string | null;
  }[];
  grade_averages: {
    course_type: string;
    average: number | null;
  }[];
}

export default function StudentDetailPage() {
  const { user } = useAuth();
  const userId = user?.id;
  const params = useParams();
  const studentId = params?.id as string;

  const [student, setStudent] = useState<StudentDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Wait for user to be available
    if (!userId) {
      return;
    }

    async function fetchStudent() {
      setLoading(true);
      setError(null);
      try {
        // Fetch student info with class
        const { data: studentData, error: studentError } = await supabase
          .from("students")
          .select(`
            id,
            student_id,
            full_name,
            grade,
            level,
            class_id,
            classes (
              id,
              name
            )
          `)
          .eq("id", studentId)
          .single();

        if (studentError) throw studentError;
        if (!studentData) throw new Error("Student not found");

        // Fetch courses for this student's class
        let courses: StudentDetails["courses"] = [];
        if (studentData.class_id) {
          const { data: coursesData, error: coursesError } = await supabase
            .from("courses")
            .select(`
              id,
              course_type,
              teacher:users (
                full_name
              )
            `)
            .eq("class_id", studentData.class_id);

          if (!coursesError && coursesData) {
            courses = coursesData.map(c => {
              // Handle the case where teacher could be an array or single object
              const teacherData = Array.isArray(c.teacher) ? c.teacher[0] : c.teacher;
              return {
                id: c.id,
                course_type: c.course_type,
                teacher_name: teacherData?.full_name || null,
              };
            });
          }
        }

        // Calculate grade averages per course type
        // Since exams.course_id may not exist, we get all scores for the student's class
        // and then infer course type from exam name
        const gradeAverages: StudentDetails["grade_averages"] = [];

        // First, get all scores for this student with exam info
        const { data: allScoresData } = await supabase
          .from("scores")
          .select(`
            score,
            exams!inner (
              name,
              class_id
            )
          `)
          .eq("student_id", studentId)
          .eq("exams.class_id", studentData.class_id);

        // Group scores by inferred course type
        const scoresByCourseType: Record<string, number[]> = { LT: [], IT: [], KCFS: [] };

        if (allScoresData) {
          for (const scoreData of allScoresData) {
            if (scoreData.score == null || scoreData.score <= 0) continue;
            // Handle both array and single object cases from Supabase
            const examData = scoreData.exams as unknown as { name: string; class_id: string } | Array<{ name: string; class_id: string }>;
            const exam = Array.isArray(examData) ? examData[0] : examData;
            const examName = (exam?.name || "").toUpperCase();

            let courseType: string | null = null;
            if (examName.startsWith("LT ") || examName.includes(" LT")) {
              courseType = "LT";
            } else if (examName.startsWith("IT ") || examName.includes(" IT")) {
              courseType = "IT";
            } else if (examName.startsWith("KCFS ") || examName.includes(" KCFS")) {
              courseType = "KCFS";
            }

            if (courseType) {
              const scores = scoresByCourseType[courseType];
              if (scores) {
                scores.push(scoreData.score);
              }
            }
          }
        }

        // Calculate averages for each course type
        for (const course of courses) {
          const scoresForType = scoresByCourseType[course.course_type] || [];
          const avg = scoresForType.length > 0
            ? scoresForType.reduce((sum, s) => sum + s, 0) / scoresForType.length
            : null;
          gradeAverages.push({
            course_type: course.course_type,
            average: avg ? Math.round(avg * 10) / 10 : null,
          });
        }

        // Handle the case where classes could be an array or single object
        const classData = Array.isArray(studentData.classes) ? studentData.classes[0] : studentData.classes;

        setStudent({
          id: studentData.id,
          student_id: studentData.student_id,
          full_name: studentData.full_name,
          grade: studentData.grade,
          level: studentData.level,
          class_id: studentData.class_id,
          class_name: classData?.name || null,
          courses,
          grade_averages: gradeAverages,
        });
      } catch (err) {
        console.error("Failed to fetch student:", err);
        setError(err instanceof Error ? err.message : "Failed to fetch student");
      } finally {
        setLoading(false);
      }
    }

    if (studentId) {
      fetchStudent();
    }
  }, [userId, studentId]);

  const getLevelBadgeColor = (level: string | null) => {
    if (!level) return "bg-surface-tertiary text-text-tertiary";
    if (level.includes("E1")) return "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400";
    if (level.includes("E2")) return "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400";
    if (level.includes("E3")) return "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400";
    return "bg-surface-tertiary text-text-tertiary";
  };

  const getCourseTypeColor = (type: string) => {
    switch (type) {
      case "LT":
        return "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400";
      case "IT":
        return "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400";
      case "KCFS":
        return "bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400";
      default:
        return "bg-surface-tertiary text-text-tertiary";
    }
  };

  const getScoreColor = (score: number | null) => {
    if (score === null) return "text-text-tertiary";
    if (score >= 80) return "text-green-700 dark:text-green-400";
    if (score >= 60) return "text-amber-700 dark:text-amber-400";
    return "text-red-700 dark:text-red-400";
  };

  // Build breadcrumbs based on loaded student
  const breadcrumbs = student
    ? [
        { label: "Browse Data", href: "/dashboard" },
        { label: "All Students", href: "/browse/students" },
        { label: student.full_name },
      ]
    : [
        { label: "Browse Data", href: "/dashboard" },
        { label: "All Students", href: "/browse/students" },
        { label: "Loading..." },
      ];

  return (
    <AuthGuard requiredRoles={["admin", "head", "office_member"]}>
      <div className="space-y-6">
        {/* Page Header with Breadcrumbs */}
        <PageHeader
          title={student?.full_name || "Student Details"}
          subtitle={student ? `ID: ${student.student_id} • Grade ${student.grade}${student.class_name ? ` • ${student.class_name}` : ""}` : undefined}
          breadcrumbs={breadcrumbs}
          backHref="/browse/students"
          backLabel="Back to Students"
        />

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-purple-500 dark:text-purple-400 animate-spin" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-4">
            <p className="text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* Student Details */}
        {!loading && !error && student && (
          <>
            {/* Header */}
            <div className="bg-surface-elevated rounded-xl border border-border-default p-6 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-500/20 rounded-xl">
                  <GraduationCap className="w-8 h-8 text-purple-500 dark:text-purple-400" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl font-bold text-text-primary">{student.full_name}</h1>
                    <span className={`px-3 py-1 text-sm rounded-full ${getLevelBadgeColor(student.level)}`}>
                      {student.level || "No Level"}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 text-text-secondary">
                    <span className="flex items-center gap-2 font-mono">
                      ID: {student.student_id}
                    </span>
                    <span className="flex items-center gap-2">
                      <School className="w-4 h-4" />
                      Grade {student.grade}
                    </span>
                    {student.class_name && (
                      <Link
                        href={`/class/${student.class_id}`}
                        className="flex items-center gap-2 hover:text-purple-500 dark:hover:text-purple-400 transition-colors duration-normal ease-apple"
                      >
                        <Users className="w-4 h-4" />
                        {student.class_name}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4">
              {student.grade_averages.map((ga) => (
                <div key={ga.course_type} className="bg-surface-elevated rounded-xl border border-border-default p-6 shadow-sm">
                  <div className="flex items-center gap-3 mb-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${getCourseTypeColor(ga.course_type)}`}>
                      {ga.course_type}
                    </span>
                    <span className="text-text-secondary text-sm">Average</span>
                  </div>
                  <div className={`text-3xl font-bold ${getScoreColor(ga.average)}`}>
                    {ga.average !== null ? ga.average : "N/A"}
                  </div>
                </div>
              ))}
              {student.grade_averages.length === 0 && (
                <div className="col-span-3 bg-surface-elevated rounded-xl border border-border-default p-6 text-center shadow-sm">
                  <BarChart3 className="w-8 h-8 text-text-tertiary mx-auto mb-2" />
                  <p className="text-text-tertiary">No grades available</p>
                </div>
              )}
            </div>

            {/* Enrolled Courses */}
            <div className="bg-surface-elevated rounded-xl border border-border-default shadow-sm">
              <div className="p-4 border-b border-border-default">
                <h2 className="text-lg font-semibold text-text-primary">Enrolled Courses</h2>
              </div>
              {student.courses.length === 0 ? (
                <div className="p-8 text-center">
                  <BookOpen className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
                  <p className="text-text-secondary">Not enrolled in any courses</p>
                </div>
              ) : (
                <div className="divide-y divide-border-subtle">
                  {student.courses.map((course) => (
                    <div
                      key={course.id}
                      className="flex items-center justify-between p-4 hover:bg-surface-hover transition-colors duration-normal ease-apple"
                    >
                      <div className="flex items-center gap-4">
                        <div className="p-2 bg-surface-tertiary rounded-lg">
                          <BookOpen className="w-5 h-5 text-text-secondary" />
                        </div>
                        <div>
                          <div className="text-text-primary font-medium">
                            {course.course_type === "LT" && "Local Teacher ELA"}
                            {course.course_type === "IT" && "International Teacher ELA"}
                            {course.course_type === "KCFS" && "Kang Chiao Future Skill"}
                          </div>
                          <div className="text-sm text-text-tertiary">
                            Teacher: {course.teacher_name || "Not assigned"}
                          </div>
                        </div>
                      </div>
                      <span className={`px-2 py-1 text-xs rounded-full ${getCourseTypeColor(course.course_type)}`}>
                        {course.course_type}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            {student.class_id && (
              <div className="flex gap-4">
                <Link
                  href={`/class/${student.class_id}/gradebook`}
                  className="flex-1 flex items-center justify-center gap-2 p-4 bg-surface-elevated rounded-xl border border-border-default hover:bg-surface-hover transition-colors duration-normal ease-apple text-text-primary shadow-sm"
                >
                  <BarChart3 className="w-5 h-5" />
                  View Class Gradebook
                </Link>
                <Link
                  href={`/class/${student.class_id}`}
                  className="flex-1 flex items-center justify-center gap-2 p-4 bg-surface-elevated rounded-xl border border-border-default hover:bg-surface-hover transition-colors duration-normal ease-apple text-text-primary shadow-sm"
                >
                  <Users className="w-5 h-5" />
                  View Class Details
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </AuthGuard>
  );
}

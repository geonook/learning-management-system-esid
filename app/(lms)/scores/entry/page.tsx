"use client";

import { useState, useEffect } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { useAuth } from "@/lib/supabase/auth-context";
import { supabase } from "@/lib/supabase/client";
import { Zap, BookOpen, Users, ChevronRight, Loader2 } from "lucide-react";
import Link from "next/link";

interface TeacherClass {
  id: string;
  name: string;
  grade: number;
  studentCount: number;
  courseType: "LT" | "IT" | "KCFS";
}

export default function QuickScoreEntryPage() {
  const { user, loading: authLoading } = useAuth();
  const [classes, setClasses] = useState<TeacherClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Wait for auth to be ready before fetching
    if (authLoading || !user) {
      return;
    }

    async function fetchTeacherClasses() {
      if (!user?.id) return;

      try {
        setLoading(true);
        setError(null);

        // Get courses assigned to this teacher
        const { data: courses, error: courseError } = await supabase
          .from("courses")
          .select(
            `
            id,
            course_type,
            class_id,
            classes!inner (
              id,
              name,
              grade
            )
          `
          )
          .eq("teacher_id", user.id)
          .eq("is_active", true);

        if (courseError) throw courseError;

        if (!courses || courses.length === 0) {
          setClasses([]);
          setLoading(false);
          return;
        }

        // Get student counts for each class
        const classIds = courses.map((c) => c.class_id);
        const { data: students, error: studentError } = await supabase
          .from("students")
          .select("class_id")
          .in("class_id", classIds)
          .eq("is_active", true);

        if (studentError) throw studentError;

        // Count students per class
        const countMap: Record<string, number> = {};
        students?.forEach((s) => {
          countMap[s.class_id] = (countMap[s.class_id] || 0) + 1;
        });

        // Map to TeacherClass format
        const teacherClasses: TeacherClass[] = courses.map((course) => {
          const cls = course.classes as unknown as {
            id: string;
            name: string;
            grade: number;
          };
          return {
            id: cls.id,
            name: cls.name,
            grade: cls.grade,
            studentCount: countMap[cls.id] || 0,
            courseType: course.course_type as "LT" | "IT" | "KCFS",
          };
        });

        // Sort by grade then name
        teacherClasses.sort((a, b) => {
          if (a.grade !== b.grade) return a.grade - b.grade;
          return a.name.localeCompare(b.name);
        });

        setClasses(teacherClasses);
      } catch (err) {
        console.error("Failed to fetch classes:", err);
        setError("Failed to load your classes. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    fetchTeacherClasses();
  }, [authLoading, user]);

  return (
    <AuthGuard requiredRoles={["admin", "head", "teacher", "office_member"]}>
      <div className="h-full flex flex-col bg-white dark:bg-slate-950 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center shadow-lg">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-slate-800 dark:text-white">
                Quick Score Entry
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Select a class to enter scores quickly
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-64 text-red-500">
              <p>{error}</p>
            </div>
          ) : classes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64">
              <BookOpen className="w-12 h-12 text-slate-300 dark:text-slate-600 mb-4" />
              <h3 className="text-lg font-medium text-slate-600 dark:text-slate-400 mb-2">
                No Classes Assigned
              </h3>
              <p className="text-sm text-slate-400 dark:text-slate-500 text-center max-w-md">
                You don&apos;t have any classes assigned to you yet. Contact
                your administrator if you believe this is an error.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {classes.map((cls) => (
                <Link
                  key={`${cls.id}-${cls.courseType}`}
                  href={`/class/${cls.id}/gradebook`}
                  className="group block p-4 rounded-xl border border-gray-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span
                          className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                            cls.courseType === "LT"
                              ? "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
                              : cls.courseType === "IT"
                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
                                : "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300"
                          }`}
                        >
                          {cls.courseType}
                        </span>
                        <span className="text-xs text-slate-400">
                          G{cls.grade}
                        </span>
                      </div>
                      <h3 className="font-medium text-slate-800 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                        {cls.name}
                      </h3>
                      <div className="flex items-center gap-1 mt-2 text-sm text-slate-500 dark:text-slate-400">
                        <Users className="w-4 h-4" />
                        <span>{cls.studentCount} students</span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-300 dark:text-slate-600 group-hover:text-blue-500 transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Status Bar */}
        <div className="h-7 bg-gray-50/80 dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 flex items-center px-4 text-[11px] text-gray-500 dark:text-gray-400 justify-between">
          <span>
            {loading
              ? "Loading..."
              : `${classes.length} class${classes.length !== 1 ? "es" : ""} assigned`}
          </span>
          <span>Click a class to enter scores</span>
        </div>
      </div>
    </AuthGuard>
  );
}

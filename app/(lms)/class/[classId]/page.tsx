"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { AuthGuard } from "@/components/auth/auth-guard";
import { supabase } from "@/lib/supabase/client";
import { useAuthReady } from "@/hooks/useAuthReady";
import { PageHeader } from "@/components/layout/PageHeader";
import { CourseKanban } from "@/components/class/CourseKanban";
import { getClassCourses } from "@/lib/api/course-tasks";

interface ClassInfo {
  id: string;
  name: string;
  grade: number;
}

interface CourseInfo {
  id: string;
  course_type: string;
  teacher_id: string | null;
  teacher_name: string | null;
}

export default function ClassOverviewPage() {
  const params = useParams();
  const { userId, role, track, isReady } = useAuthReady();
  const classId = params?.classId as string;
  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [isMyClass, setIsMyClass] = useState<boolean | null>(null);
  const [myCourseId, setMyCourseId] = useState<string | null>(null);
  const [allCourses, setAllCourses] = useState<CourseInfo[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);

  const isAdminOrOffice = role === "admin" || role === "office_member";
  const isHeadTeacher = role === "head";

  useEffect(() => {
    async function fetchData() {
      if (!classId || !isReady) return;

      // Fetch class info
      const { data: classData } = await supabase
        .from("classes")
        .select("id, name, grade")
        .eq("id", classId)
        .single();
      if (classData) setClassInfo(classData);

      // Check if this is user's class and get course ID
      if (userId) {
        const { data: courseData } = await supabase
          .from("courses")
          .select("id, course_type")
          .eq("class_id", classId)
          .eq("teacher_id", userId)
          .maybeSingle();

        if (courseData) {
          setIsMyClass(true);
          setMyCourseId(courseData.id);
          setSelectedCourseId(courseData.id);
        } else {
          setIsMyClass(false);
        }
      } else {
        setIsMyClass(false);
      }

      // For admin/office/head, fetch courses for this class
      if (isAdminOrOffice || isHeadTeacher) {
        try {
          let courses = await getClassCourses(classId);

          // Head Teacher: only show courses matching their track
          if (isHeadTeacher && track) {
            courses = courses.filter(c => c.course_type === track);
          }

          setAllCourses(courses);
          // Default to first course if no course selected
          if (courses.length > 0 && !selectedCourseId && courses[0]) {
            setSelectedCourseId(courses[0].id);
          }
        } catch (err) {
          console.error("Failed to fetch courses:", err);
        }
      }
    }
    fetchData();
  }, [classId, userId, isReady, isAdminOrOffice, isHeadTeacher, track, selectedCourseId]);

  // Determine breadcrumb path based on whether this is user's class
  const breadcrumbs = classInfo
    ? isMyClass
      ? [
          { label: "My Classes", href: "/dashboard" },
          { label: classInfo.name },
        ]
      : [
          { label: "Browse Data", href: "/dashboard" },
          { label: "All Classes", href: "/browse/classes" },
          { label: classInfo.name },
        ]
    : [
        { label: "Loading...", href: "/dashboard" },
      ];

  // Determine back navigation
  const backHref = isMyClass ? "/dashboard" : "/browse/classes";
  const backLabel = isMyClass ? "Back to Dashboard" : "Back to Classes";

  return (
    <AuthGuard requiredRoles={["admin", "head", "teacher", "office_member"]}>
      <div className="space-y-6">
        <PageHeader
          title={classInfo?.name || "Class Overview"}
          subtitle={classInfo ? `Grade ${classInfo.grade}` : undefined}
          breadcrumbs={breadcrumbs}
          backHref={backHref}
          backLabel={backLabel}
        />

        {/* Course Selector for Admin/Office */}
        {isAdminOrOffice && allCourses.length > 0 && (
          <div className="flex items-center gap-3 mb-4">
            <span className="text-sm text-text-secondary">View course:</span>
            <div className="flex gap-2">
              {allCourses.map((course) => (
                <button
                  key={course.id}
                  onClick={() => setSelectedCourseId(course.id)}
                  className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${
                    selectedCourseId === course.id
                      ? "bg-blue-600 text-white"
                      : "bg-surface-secondary text-text-secondary hover:bg-surface-hover"
                  }`}
                >
                  {course.course_type}
                  {course.teacher_name && (
                    <span className="ml-1 opacity-70">({course.teacher_name})</span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Course Kanban */}
        {selectedCourseId && classInfo && userId ? (
          <CourseKanban
            courseId={selectedCourseId}
            className={classInfo.name}
            teacherId={userId}
            readOnly={isAdminOrOffice && myCourseId !== selectedCourseId}
          />
        ) : !isMyClass && !isAdminOrOffice ? (
          <div className="bg-surface-elevated rounded-xl p-6 border border-border-default">
            <div className="flex flex-col items-center justify-center py-8 text-text-tertiary">
              <p className="text-sm">You are not assigned to teach this class.</p>
              <p className="text-xs mt-1">Contact an administrator to be assigned.</p>
            </div>
          </div>
        ) : null}
      </div>
    </AuthGuard>
  );
}

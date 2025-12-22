"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useAuthReady } from "@/hooks/useAuthReady";
import { createClient } from "@/lib/supabase/client";
import { AttendanceSheet } from "@/components/attendance";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, BookOpen } from "lucide-react";

interface Course {
  id: string;
  name: string;
  course_type: string;
  teacher_id: string;
  teacher?: {
    display_name: string | null;
  };
}

interface ClassInfo {
  id: string;
  name: string;
  grade: number;
}

export default function ClassAttendancePage() {
  const params = useParams();
  const classId = params?.classId as string | undefined;
  const { userId, isReady, role } = useAuthReady();

  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isReady || !classId) return;

    async function loadData() {
      const supabase = createClient();

      // Get class info
      const { data: classData } = await supabase
        .from("classes")
        .select("id, name, grade")
        .eq("id", classId)
        .single();

      if (classData) {
        setClassInfo(classData);
      }

      // Get courses for this class
      // Filter based on role: admin/head sees all, teacher sees only their courses
      let query = supabase
        .from("courses")
        .select(
          `
          id,
          name,
          course_type,
          teacher_id,
          teacher:users!courses_teacher_id_fkey(display_name)
        `
        )
        .eq("class_id", classId)
        .order("course_type");

      // Teachers only see their own courses
      if (role === "teacher" && userId) {
        query = query.eq("teacher_id", userId);
      }

      const { data: coursesData } = await query;

      if (coursesData) {
        setCourses(coursesData as unknown as Course[]);

        // Auto-select first course if only one, or teacher's course
        if (coursesData.length === 1 && coursesData[0]) {
          setSelectedCourseId(coursesData[0].id);
        } else if (role === "teacher" && userId) {
          const teacherCourse = coursesData.find(
            (c) => c.teacher_id === userId
          );
          if (teacherCourse) {
            setSelectedCourseId(teacherCourse.id);
          }
        }
      }

      setLoading(false);
    }

    loadData();
  }, [classId, isReady, userId, role]);

  const selectedCourse = courses.find((c) => c.id === selectedCourseId);

  const getCourseTypeLabel = (type: string) => {
    switch (type) {
      case "LT":
        return "Lead Teacher";
      case "IT":
        return "Int'l Teacher";
      case "KCFS":
        return "KCFS";
      default:
        return type;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (courses.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <BookOpen className="w-12 h-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium mb-2">No Courses Available</h3>
          <p className="text-sm text-muted-foreground text-center">
            {role === "teacher"
              ? "You don't have any courses assigned in this class."
              : "No courses found for this class."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Course Selector */}
      {courses.length > 1 && (
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">Course:</span>
          <Select
            value={selectedCourseId || ""}
            onValueChange={setSelectedCourseId}
          >
            <SelectTrigger className="w-[300px]">
              <SelectValue placeholder="Select a course" />
            </SelectTrigger>
            <SelectContent>
              {courses.map((course) => (
                <SelectItem key={course.id} value={course.id}>
                  <span className="flex items-center gap-2">
                    <span
                      className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                        course.course_type === "LT"
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                          : course.course_type === "IT"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400"
                      }`}
                    >
                      {course.course_type}
                    </span>
                    {course.name}
                    {course.teacher?.display_name && (
                      <span className="text-muted-foreground">
                        - {course.teacher.display_name}
                      </span>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Attendance Sheet */}
      {selectedCourseId && selectedCourse ? (
        <AttendanceSheet
          courseId={selectedCourseId}
          courseName={`${getCourseTypeLabel(selectedCourse.course_type)} - ${selectedCourse.name}`}
          className={classInfo?.name || ""}
        />
      ) : (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <BookOpen className="w-12 h-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">Select a Course</h3>
            <p className="text-sm text-muted-foreground">
              Choose a course from the dropdown above to start taking attendance.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

import React from "react";
import { getGradebookData, CourseType } from "@/lib/actions/gradebook";
import { GradeRow } from "@/lib/gradebook/FormulaEngine";
import { AuthGuard } from "@/components/auth/auth-guard";
import { GradebookHeader } from "./GradebookHeader";
import { GradebookClient } from "./GradebookClient";

interface PageProps {
  params: {
    classId: string;
  };
  searchParams: {
    course?: string;
  };
}

export default async function ClassGradebookPage({ params, searchParams }: PageProps) {
  const classId = params.classId;
  const requestedCourseType = searchParams.course as CourseType | undefined;

  let initialData: GradeRow[] = [];
  let availableCourseTypes: CourseType[] = [];
  let currentCourseType: CourseType | null = null;
  let error = null;

  if (classId) {
    try {
      const result = await getGradebookData(classId, requestedCourseType);
      initialData = result.students.map((s) => ({
        id: s.id,
        studentName: s.full_name,
        studentId: s.student_id,
        scores: s.scores,
      }));
      availableCourseTypes = result.availableCourseTypes;
      currentCourseType = result.currentCourseType;
    } catch (e) {
      console.error("Failed to load gradebook data:", e);
      error = "Failed to load data. Please try again.";
    }
  }

  return (
    <AuthGuard requiredRoles={["admin", "head", "teacher", "office_member"]}>
      <div className="h-full flex flex-col">
        <GradebookHeader classId={classId} courseType={currentCourseType} />

        {error ? (
          <div className="flex-1 flex items-center justify-center text-red-600 dark:text-red-400 bg-surface-primary rounded-xl border border-border-default mt-4">
            {error}
          </div>
        ) : (
          <div className="flex-1 mt-4 relative">
            <GradebookClient
              classId={classId}
              initialData={initialData}
              availableCourseTypes={availableCourseTypes}
              initialCourseType={currentCourseType}
            />
          </div>
        )}
      </div>
    </AuthGuard>
  );
}

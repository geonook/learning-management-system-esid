import React from "react";
import { Toolbar } from "@/components/gradebook/Toolbar";
import { Spreadsheet } from "@/components/gradebook/Spreadsheet";
import { getGradebookData } from "@/lib/actions/gradebook";
import { GradeRow } from "@/lib/gradebook/FormulaEngine";
import { AuthGuard } from "@/components/auth/auth-guard";
import { GradebookHeader } from "./GradebookHeader";

interface PageProps {
  params: {
    classId: string;
  };
}

export default async function ClassGradebookPage({ params }: PageProps) {
  const classId = params.classId;
  let initialData: GradeRow[] = [];
  let error = null;

  if (classId) {
    try {
      const result = await getGradebookData(classId);
      initialData = result.students.map((s) => ({
        id: s.id,
        studentName: s.full_name,
        studentId: s.student_id,
        scores: s.scores,
      }));
    } catch (e) {
      console.error("Failed to load gradebook data:", e);
      error = "Failed to load data. Please try again.";
    }
  }

  return (
    <AuthGuard requiredRoles={["admin", "head", "teacher", "office_member"]}>
    <div className="h-full flex flex-col">
      <GradebookHeader classId={classId} />
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-950 rounded-xl border border-gray-100 dark:border-slate-800 shadow-sm overflow-hidden mt-4">
      <Toolbar />
      {error ? (
        <div className="flex-1 flex items-center justify-center text-red-500 dark:text-red-400">
          {error}
        </div>
      ) : (
        <div className="flex-1 overflow-hidden relative">
          <Spreadsheet classId={classId} initialData={initialData} />
        </div>
      )}

      {/* Status Bar - Notion Style */}
      <div className="h-7 bg-gray-50/80 dark:bg-slate-900 border-t border-gray-100 dark:border-slate-800 flex items-center px-4 text-[11px] text-gray-500 dark:text-gray-400 justify-between">
        <span>{classId ? "Ready" : "No Class Selected"}</span>
        <span className="text-gray-400 dark:text-gray-500">Sum: 0</span>
      </div>
      </div>
    </div>
    </AuthGuard>
  );
}

import React from "react";
import { Toolbar } from "@/components/gradebook/Toolbar";
import { Spreadsheet } from "@/components/gradebook/Spreadsheet";
import { getGradebookData } from "@/lib/actions/gradebook";
import { GradeRow } from "@/lib/gradebook/FormulaEngine";

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
    <div className="h-full flex flex-col bg-white dark:bg-black/20 rounded-lg border border-white/10 shadow-sm overflow-hidden">
      <Toolbar />
      {error ? (
        <div className="flex-1 flex items-center justify-center text-red-500">
          {error}
        </div>
      ) : (
        <div className="flex-1 overflow-hidden relative">
          <Spreadsheet classId={classId} initialData={initialData} />
        </div>
      )}

      {/* Status Bar */}
      <div className="h-6 bg-[#f3f3f3] dark:bg-black/40 border-t border-[#d1d1d1] dark:border-white/10 flex items-center px-4 text-[10px] text-gray-600 dark:text-gray-400 justify-between">
        <span>{classId ? "Ready" : "No Class Selected"}</span>
        <span>Sum: 0</span>
      </div>
    </div>
  );
}

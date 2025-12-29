import React from "react";
import { Window } from "@/components/os/Window";
import { Toolbar } from "@/components/gradebook/Toolbar";
import { Spreadsheet } from "@/components/gradebook/Spreadsheet";
import { getGradebookData } from "@/lib/actions/gradebook";
import { GradeRow } from "@/lib/gradebook/FormulaEngine";
import { AuthGuard } from "@/components/auth/auth-guard";

interface PageProps {
  searchParams: {
    classId?: string;
    className?: string;
  };
}

export default async function GradebookPage({ searchParams }: PageProps) {
  const classId = searchParams.classId || "";
  const className = searchParams.className || "Gradebook";

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
      <div className="h-full w-full p-4 flex items-center justify-center">
        <Window
          title={`${className} - Gradebook`}
          className="w-[95%] h-[90%] max-w-7xl flex flex-col bg-surface-primary text-text-primary"
        >
          <Toolbar />
          {error ? (
            <div className="flex-1 flex items-center justify-center text-red-600 dark:text-red-400">
              {error}
            </div>
          ) : (
            <Spreadsheet classId={classId} initialData={initialData} />
          )}

          {/* Status Bar */}
          <div className="h-6 bg-surface-secondary border-t border-border-default flex items-center px-4 text-[10px] text-text-secondary justify-between">
            <span>{classId ? "Ready" : "No Class Selected"}</span>
            <span>Sum: 0</span>
          </div>
        </Window>
      </div>
    </AuthGuard>
  );
}

import React from "react";
import { Window } from "@/components/os/Window";
import { Toolbar } from "@/components/gradebook/Toolbar";
import { Spreadsheet } from "@/components/gradebook/Spreadsheet";
import { getGradebookData } from "@/lib/actions/gradebook";
import { GradeRow } from "@/lib/gradebook/FormulaEngine";

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
    <div className="h-full w-full p-4 flex items-center justify-center">
      <Window
        title={`${className} - Gradebook`}
        className="w-[95%] h-[90%] max-w-7xl flex flex-col bg-white text-black"
      >
        {/* <Toolbar /> */}
        {error ? (
          <div className="flex-1 flex items-center justify-center text-red-500">
            {error}
          </div>
        ) : (
          // <Spreadsheet classId={classId} initialData={initialData} />
          <div className="p-10">Test Gradebook Page</div>
        )}

        {/* Status Bar */}
        <div className="h-6 bg-[#f3f3f3] border-t border-[#d1d1d1] flex items-center px-4 text-[10px] text-gray-600 justify-between">
          <span>{classId ? "Ready" : "No Class Selected"}</span>
          <span>Sum: 0</span>
        </div>
      </Window>
    </div>
  );
}

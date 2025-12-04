"use client";

import React, { useState, useTransition } from "react";
import { FormulaEngine, GradeRow } from "@/lib/gradebook/FormulaEngine";
import { cn } from "@/lib/utils";

// Score color coding helper
function getScoreColor(score: number | null | undefined): string {
  if (score === null || score === undefined) return "";
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 60) return "text-amber-600 dark:text-amber-500";
  return "text-red-600 dark:text-red-400";
}
import { FocusGradeInput } from "./FocusGradeInput";
import { updateScore } from "@/lib/actions/gradebook";
import { Loader2, AlertCircle } from "lucide-react";

interface SpreadsheetProps {
  classId: string;
  initialData: GradeRow[];
}

export function Spreadsheet({ classId, initialData }: SpreadsheetProps) {
  const [data, setData] = useState<GradeRow[]>(initialData);
  const [focusModeCode, setFocusModeCode] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isPending, startTransition] = useTransition();
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "error">(
    "saved"
  );

  // Columns Configuration
  const ASSESSMENT_COLS = [
    { code: "MID", label: "Midterm", weight: "10%" },
    ...Array.from({ length: 8 }, (_, i) => ({
      code: `FA${i + 1}`,
      label: `F.A.${i + 1}`,
      weight: "Formative",
    })),
    ...Array.from({ length: 4 }, (_, i) => ({
      code: `SA${i + 1}`,
      label: `S.A.${i + 1}`,
      weight: "Summative",
    })),
  ];

  const handleScoreUpdate = (
    studentId: string,
    code: string,
    value: number | null
  ) => {
    // 1. Optimistic Update
    setSaveStatus("saving");
    setData((prev) =>
      prev.map((row) => {
        if (row.id === studentId) {
          const newScores = { ...row.scores, [code]: value };
          return { ...row, scores: newScores };
        }
        return row;
      })
    );

    // 2. Server Action
    startTransition(async () => {
      try {
        await updateScore(classId, studentId, code, value);
        setSaveStatus("saved");
      } catch (error) {
        console.error("Failed to save score:", error);
        setSaveStatus("error");
      }
    });
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#f0f0f0]">
      {/* Toolbar / Status Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-2 flex justify-between items-center h-12 shrink-0">
        <div className="text-sm text-gray-500">{data.length} Students</div>
        <div className="flex items-center space-x-2">
          {saveStatus === "saving" && (
            <span className="text-xs text-blue-600 flex items-center">
              <Loader2 className="w-3 h-3 mr-1 animate-spin" /> Saving...
            </span>
          )}
          {saveStatus === "saved" && (
            <span className="text-xs text-green-600">All changes saved</span>
          )}
          {saveStatus === "error" && (
            <span className="text-xs text-red-600 flex items-center">
              <AlertCircle className="w-3 h-3 mr-1" /> Save failed
            </span>
          )}
        </div>
      </div>

      {/* Main Grid */}
      <div className="flex-1 overflow-auto p-8">
        <div className="bg-white shadow-sm border border-gray-300 rounded-sm inline-block min-w-full">
          {/* Header Row */}
          <div className="flex border-b border-gray-300 bg-[#f5f5f5] sticky top-0 z-10">
            {/* Fixed Columns */}
            <div className="sticky left-0 z-20 flex shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
              <div className="w-12 border-r border-gray-300 p-2 text-center text-xs font-bold text-gray-500 bg-[#f5f5f5] flex items-center justify-center">
                #
              </div>
              <div className="w-48 border-r border-gray-300 p-2 text-sm font-bold text-gray-700 bg-[#f5f5f5] flex items-center">
                English Name
              </div>
              <div className="w-24 border-r border-gray-300 p-2 text-sm font-bold text-gray-700 bg-[#f5f5f5] flex items-center">
                ID
              </div>
              <div className="w-24 border-r border-gray-300 p-2 text-sm font-bold text-blue-700 bg-blue-50 flex items-center justify-center">
                Term Grade
              </div>
            </div>

            {/* Scrollable Assessment Columns */}
            <div className="flex">
              <div className="w-24 border-r border-gray-300 p-2 text-xs font-bold text-gray-600 bg-[#f5f5f5] flex flex-col justify-center items-center">
                Formative
                <br />
                Avg (15%)
              </div>
              <div className="w-24 border-r border-gray-300 p-2 text-xs font-bold text-gray-600 bg-[#f5f5f5] flex flex-col justify-center items-center">
                Summative
                <br />
                Avg (20%)
              </div>

              {ASSESSMENT_COLS.map((col) => (
                <div
                  key={col.code}
                  className="w-24 border-r border-gray-300 p-1 text-sm font-bold text-gray-700 bg-[#f5f5f5] hover:bg-blue-100 cursor-pointer transition-colors group relative"
                  onClick={() => setFocusModeCode(col.code)}
                  title="Click to enter Focus Mode"
                >
                  <div className="h-full flex flex-col justify-center items-center">
                    <span>{col.label}</span>
                    <span className="text-[10px] font-normal text-gray-500 mt-0.5">
                      {col.weight}
                    </span>
                    <div className="absolute inset-0 bg-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-[10px] text-blue-700 font-bold bg-white/80 px-1 rounded">
                        FOCUS
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Data Rows */}
          {data.map((row, index) => {
            const termGrade = FormulaEngine.calculateTermGrade(row.scores);
            const formativeAvg = FormulaEngine.getFormativeAverage(row.scores);
            const summativeAvg = FormulaEngine.getSummativeAverage(row.scores);

            return (
              <div
                key={row.id}
                className="flex border-b border-gray-200 hover:bg-blue-50/50 dark:hover:bg-blue-900/20 transition-colors duration-150 group"
              >
                {/* Fixed Columns */}
                <div className="sticky left-0 z-20 flex shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                  <div className="w-12 border-r border-gray-300 bg-[#f9f9f9] p-2 text-center text-xs text-gray-500 flex items-center justify-center">
                    {index + 1}
                  </div>
                  <div className="w-48 border-r border-gray-200 bg-white p-2 text-sm font-medium text-gray-900 flex items-center truncate">
                    {row.studentName}
                  </div>
                  <div className="w-24 border-r border-gray-200 bg-white p-2 text-xs text-gray-500 flex items-center">
                    {row.studentId}
                  </div>
                  <div className="w-24 border-r border-gray-200 bg-blue-50/50 p-2 text-sm font-bold text-blue-700 flex items-center justify-center">
                    {termGrade ?? "-"}
                  </div>
                </div>

                {/* Scrollable Columns */}
                <div className="flex">
                  {/* Averages */}
                  <div className="w-24 border-r border-gray-200 bg-gray-50/50 p-2 text-sm text-gray-600 flex items-center justify-center font-medium">
                    {formativeAvg ?? "-"}
                  </div>
                  <div className="w-24 border-r border-gray-200 bg-gray-50/50 p-2 text-sm text-gray-600 flex items-center justify-center font-medium">
                    {summativeAvg ?? "-"}
                  </div>

                  {/* Inputs */}
                  {ASSESSMENT_COLS.map((col) => (
                    <div
                      key={col.code}
                      className="w-24 border-r border-gray-200 p-0 relative"
                    >
                      <input
                        type="number"
                        className={cn(
                          "w-full h-full px-2 py-1 text-center text-sm outline-none bg-transparent transition-all duration-200",
                          "focus:bg-blue-100 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500",
                          row.scores[col.code] !== undefined &&
                            row.scores[col.code] !== null &&
                            "font-medium",
                          getScoreColor(row.scores[col.code])
                        )}
                        placeholder="-"
                        value={row.scores[col.code] ?? ""}
                        onChange={(e) => {
                          const val =
                            e.target.value === ""
                              ? null
                              : Number(e.target.value);
                          handleScoreUpdate(row.id, col.code, val);
                        }}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Focus Mode Modal */}
      {focusModeCode && (
        <FocusGradeInput
          assessmentCode={focusModeCode}
          students={data}
          onClose={() => setFocusModeCode(null)}
          onUpdateScore={(studentId, score) =>
            handleScoreUpdate(studentId, focusModeCode, score)
          }
        />
      )}
    </div>
  );
}

"use client";

import React, { useState, useTransition, useEffect } from "react";
import { FormulaEngine, GradeRow } from "@/lib/gradebook/FormulaEngine";
import { cn } from "@/lib/utils";
import { FocusGradeInput } from "./FocusGradeInput";
import { updateScore } from "@/lib/actions/gradebook";

export type SaveStatus = "saved" | "saving" | "error";

// Notion + Apple unified design tokens
const NOTION_STYLES = {
  // Backgrounds
  bg: "bg-surface-primary",
  bgCard: "bg-surface-elevated",
  bgMuted: "bg-surface-secondary",
  bgHeader: "bg-surface-secondary",
  bgHover: "hover:bg-[rgb(var(--surface-hover))]",
  bgRowHover: "hover:bg-[rgb(var(--surface-hover))]",
  // Borders
  border: "border-[rgb(var(--border-default))]",
  borderMuted: "border-[rgb(var(--border-subtle))]",
  // Text
  text: "text-text-primary",
  textMuted: "text-text-secondary",
  textLight: "text-text-tertiary",
};

// Score color coding helper - improved with null state
function getScoreColor(score: number | null | undefined): string {
  if (score === null || score === undefined) return "text-text-tertiary";
  if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 60) return "text-amber-600 dark:text-amber-500";
  return "text-red-600 dark:text-red-400";
}

interface SpreadsheetProps {
  classId: string;
  initialData: GradeRow[];
  courseType?: string | null;
  onSaveStatusChange?: (status: SaveStatus) => void;
}

export function Spreadsheet({ classId, initialData, courseType, onSaveStatusChange }: SpreadsheetProps) {
  const [data, setData] = useState<GradeRow[]>(initialData);
  const [focusModeCode, setFocusModeCode] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isPending, startTransition] = useTransition();
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");

  // Update data when initialData changes (e.g., course type switch)
  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  // Notify parent of save status changes
  useEffect(() => {
    onSaveStatusChange?.(saveStatus);
  }, [saveStatus, onSaveStatusChange]);

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
    <div className={cn("flex-1 flex flex-col h-full overflow-hidden", NOTION_STYLES.bg)}>
      {/* Main Grid - Status bar moved to parent component */}
      <div className="flex-1 overflow-auto p-4">
        <div className={cn(
          "shadow-sm rounded-xl inline-block min-w-full overflow-hidden",
          NOTION_STYLES.bgCard,
          "border",
          NOTION_STYLES.border
        )}>
          {/* Header Row - Notion Style */}
          <div className={cn(
            "flex sticky top-0 z-10",
            "border-b",
            NOTION_STYLES.border,
            NOTION_STYLES.bgHeader
          )}>
            {/* Fixed Columns */}
            <div className="sticky left-0 z-20 flex shadow-[2px_0_8px_-4px_rgba(0,0,0,0.08)] dark:shadow-[2px_0_8px_-4px_rgba(0,0,0,0.3)]">
              <div className={cn(
                "w-12 p-2.5 text-center text-xs font-medium flex items-center justify-center",
                "border-r",
                NOTION_STYLES.border,
                NOTION_STYLES.bgHeader,
                NOTION_STYLES.textLight
              )}>
                #
              </div>
              <div className={cn(
                "w-48 p-2.5 text-sm font-medium flex items-center",
                "border-r",
                NOTION_STYLES.border,
                NOTION_STYLES.bgHeader,
                NOTION_STYLES.textMuted
              )}>
                Name
              </div>
              <div className={cn(
                "w-24 p-2.5 text-sm font-medium flex items-center",
                "border-r",
                NOTION_STYLES.border,
                NOTION_STYLES.bgHeader,
                NOTION_STYLES.textMuted
              )}>
                ID
              </div>
              <div className={cn(
                "w-24 p-2.5 text-sm font-semibold flex items-center justify-center",
                "border-r",
                NOTION_STYLES.border,
                "bg-blue-50/80 dark:bg-blue-900/30",
                "text-blue-700 dark:text-blue-300"
              )}>
                Term
              </div>
            </div>

            {/* Scrollable Assessment Columns */}
            <div className="flex">
              <div className={cn(
                "w-24 p-2 text-xs font-medium flex flex-col justify-center items-center",
                "border-r",
                NOTION_STYLES.border,
                NOTION_STYLES.bgHeader,
                NOTION_STYLES.textMuted
              )}>
                <span>Formative</span>
                <span className={NOTION_STYLES.textLight}>15%</span>
              </div>
              <div className={cn(
                "w-24 p-2 text-xs font-medium flex flex-col justify-center items-center",
                "border-r",
                NOTION_STYLES.border,
                NOTION_STYLES.bgHeader,
                NOTION_STYLES.textMuted
              )}>
                <span>Summative</span>
                <span className={NOTION_STYLES.textLight}>20%</span>
              </div>

              {ASSESSMENT_COLS.map((col) => (
                <div
                  key={col.code}
                  className={cn(
                    "w-24 p-2 text-sm font-medium cursor-pointer transition-colors duration-100 group relative",
                    "border-r",
                    NOTION_STYLES.border,
                    NOTION_STYLES.bgHeader,
                    NOTION_STYLES.textMuted,
                    "hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  )}
                  onClick={() => setFocusModeCode(col.code)}
                  title="Click to enter Focus Mode"
                >
                  <div className="h-full flex flex-col justify-center items-center">
                    <span>{col.label}</span>
                    <span className={cn("text-[10px] font-normal mt-0.5", NOTION_STYLES.textLight)}>
                      {col.weight}
                    </span>
                    <div className="absolute inset-0 bg-blue-500/5 dark:bg-blue-400/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold bg-white/90 dark:bg-slate-800/90 px-1.5 py-0.5 rounded">
                        FOCUS
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Data Rows - Notion Style */}
          {data.map((row, index) => {
            const termGrade = FormulaEngine.calculateTermGrade(row.scores);
            const formativeAvg = FormulaEngine.getFormativeAverage(row.scores);
            const summativeAvg = FormulaEngine.getSummativeAverage(row.scores);

            return (
              <div
                key={row.id}
                className={cn(
                  "flex transition-colors duration-100 group",
                  "border-b",
                  NOTION_STYLES.borderMuted,
                  NOTION_STYLES.bgRowHover
                )}
              >
                {/* Fixed Columns */}
                <div className="sticky left-0 z-20 flex shadow-[2px_0_8px_-4px_rgba(0,0,0,0.05)] dark:shadow-[2px_0_8px_-4px_rgba(0,0,0,0.2)]">
                  <div className={cn(
                    "w-12 p-2.5 text-center text-xs flex items-center justify-center",
                    "border-r",
                    NOTION_STYLES.border,
                    NOTION_STYLES.bgMuted,
                    NOTION_STYLES.textLight
                  )}>
                    {index + 1}
                  </div>
                  <div className={cn(
                    "w-48 p-2.5 text-sm font-medium flex items-center truncate",
                    "border-r",
                    NOTION_STYLES.borderMuted,
                    NOTION_STYLES.bgCard,
                    NOTION_STYLES.text
                  )}>
                    {row.studentName}
                  </div>
                  <div className={cn(
                    "w-24 p-2.5 text-xs flex items-center",
                    "border-r",
                    NOTION_STYLES.borderMuted,
                    NOTION_STYLES.bgCard,
                    NOTION_STYLES.textMuted
                  )}>
                    {row.studentId}
                  </div>
                  <div className={cn(
                    "w-24 p-2.5 text-sm font-semibold flex items-center justify-center",
                    "border-r",
                    NOTION_STYLES.borderMuted,
                    "bg-blue-50/50 dark:bg-blue-900/20",
                    termGrade !== null ? getScoreColor(termGrade) : "text-gray-400 dark:text-gray-500"
                  )}>
                    {termGrade !== null ? termGrade.toFixed(1) : "-"}
                  </div>
                </div>

                {/* Scrollable Columns */}
                <div className="flex">
                  {/* Averages with color coding */}
                  <div className={cn(
                    "w-24 p-2.5 text-sm flex items-center justify-center font-medium",
                    "border-r",
                    NOTION_STYLES.borderMuted,
                    NOTION_STYLES.bgMuted,
                    formativeAvg !== null ? getScoreColor(formativeAvg) : NOTION_STYLES.textLight
                  )}>
                    {formativeAvg !== null ? formativeAvg.toFixed(1) : "-"}
                  </div>
                  <div className={cn(
                    "w-24 p-2.5 text-sm flex items-center justify-center font-medium",
                    "border-r",
                    NOTION_STYLES.borderMuted,
                    NOTION_STYLES.bgMuted,
                    summativeAvg !== null ? getScoreColor(summativeAvg) : NOTION_STYLES.textLight
                  )}>
                    {summativeAvg !== null ? summativeAvg.toFixed(1) : "-"}
                  </div>

                  {/* Inputs - Notion Style */}
                  {ASSESSMENT_COLS.map((col) => (
                    <div
                      key={col.code}
                      className={cn(
                        "w-24 p-0 relative",
                        "border-r",
                        NOTION_STYLES.borderMuted
                      )}
                    >
                      <input
                        type="number"
                        className={cn(
                          "w-full h-full px-2 py-2.5 text-center text-sm bg-transparent",
                          "border-0 outline-none",
                          "transition-colors duration-100",
                          "hover:bg-gray-50 dark:hover:bg-slate-800/50",
                          "focus:bg-blue-50 dark:focus:bg-blue-900/20",
                          "focus:ring-1 focus:ring-inset focus:ring-blue-200 dark:focus:ring-blue-800",
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

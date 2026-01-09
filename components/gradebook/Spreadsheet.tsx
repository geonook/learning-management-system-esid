"use client";

import React, { useState, useTransition, useEffect, useMemo, useRef, useCallback } from "react";
import { FormulaEngine, GradeRow } from "@/lib/gradebook/FormulaEngine";
import { cn } from "@/lib/utils";
import { FocusGradeInput } from "./FocusGradeInput";
import { updateScore, CourseType } from "@/lib/actions/gradebook";
import { ScoreInput, ScoreInputValue, ScoreInputHandle, NavigationDirection } from "./ScoreInput";
import { KCFS_CATEGORY_NAMES, KCFSCategoryCode } from "@/types/kcfs";
import { getKCFSCategoryCodes, getKCFSWeight } from "@/lib/grade/kcfs-calculations";
import { TERM_ASSESSMENT_CODES, Term } from "@/types/academic-year";

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

// Score color coding helper - improved with null state and course type
function getScoreColor(
  score: number | null | undefined,
  courseType: CourseType = "LT",
  isAbsent: boolean = false
): string {
  if (isAbsent) return "text-orange-500 dark:text-orange-400";
  if (score === null || score === undefined) return "text-text-tertiary";

  if (courseType === "KCFS") {
    // KCFS: 0-5 scale
    if (score >= 4) return "text-emerald-600 dark:text-emerald-400";
    if (score >= 3) return "text-amber-600 dark:text-amber-500";
    return "text-red-600 dark:text-red-400";
  } else {
    // LT/IT: 0-100 scale
    if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
    if (score >= 60) return "text-amber-600 dark:text-amber-500";
    return "text-red-600 dark:text-red-400";
  }
}

// Extended GradeRow with absentFlags
export interface ExtendedGradeRow extends GradeRow {
  absentFlags?: Record<string, boolean>;
}

interface SpreadsheetProps {
  classId: string;
  initialData: ExtendedGradeRow[];
  courseType?: CourseType | null;
  classGrade?: number; // For KCFS category determination
  onSaveStatusChange?: (status: SaveStatus) => void;
  disabled?: boolean; // Disable inputs when period is locked
  term?: number | null; // Term number for period lock validation
}

// Column configuration type
interface ColumnConfig {
  code: string;
  label: string;
  weight: string;
}

// Helper functions for assessment code display
function getAssessmentLabel(code: string): string {
  if (code === "MID") return "Midterm";
  if (code === "FINAL") return "Final";
  if (code.startsWith("FA")) return `F.A.${code.slice(2)}`;
  if (code.startsWith("SA")) return `S.A.${code.slice(2)}`;
  return code;
}

function getAssessmentWeight(code: string): string {
  if (code === "MID" || code === "FINAL") return "10%";
  if (code.startsWith("FA")) return "Formative";
  if (code.startsWith("SA")) return "Summative";
  return "";
}

export function Spreadsheet({
  classId,
  initialData,
  courseType = "LT",
  classGrade = 1,
  onSaveStatusChange,
  disabled = false,
  term = null,
}: SpreadsheetProps) {
  const [data, setData] = useState<ExtendedGradeRow[]>(initialData);
  const [focusModeCode, setFocusModeCode] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isPending, startTransition] = useTransition();
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("saved");

  const effectiveCourseType: CourseType = courseType || "LT";

  // 2D ref map for keyboard navigation
  const inputRefs = useRef<Map<string, ScoreInputHandle>>(new Map());

  // Helper to generate ref key
  const getRefKey = useCallback((row: number, col: number) => `${row}-${col}`, []);

  // Helper to set ref
  const setInputRef = useCallback((row: number, col: number) => (el: ScoreInputHandle | null) => {
    const key = getRefKey(row, col);
    if (el) {
      inputRefs.current.set(key, el);
    } else {
      inputRefs.current.delete(key);
    }
  }, [getRefKey]);

  // Update data when initialData changes (e.g., course type switch)
  useEffect(() => {
    setData(initialData);
  }, [initialData]);

  // Notify parent of save status changes
  useEffect(() => {
    onSaveStatusChange?.(saveStatus);
  }, [saveStatus, onSaveStatusChange]);

  // Columns Configuration - Dynamic based on course type and term
  const ASSESSMENT_COLS = useMemo((): ColumnConfig[] => {
    if (effectiveCourseType === "KCFS") {
      // KCFS: Use grade-specific categories
      const categoryCodes = getKCFSCategoryCodes(classGrade);
      const weight = getKCFSWeight(classGrade);
      return categoryCodes.map((code) => ({
        code,
        label: KCFS_CATEGORY_NAMES[code as KCFSCategoryCode] || code,
        weight: `×${weight.toFixed(2)}`,
      }));
    } else {
      // LT/IT: Dynamic columns based on term
      // Term 1: FA1-FA4, SA1-SA2, MID
      // Term 2: FA5-FA8, SA3-SA4, FINAL
      // Term 3: FA1-FA4, SA1-SA2, MID
      // Term 4: FA5-FA8, SA3-SA4, FINAL
      // All: Show all columns
      const codes = term
        ? TERM_ASSESSMENT_CODES[term as Term]
        : [
            "MID", "FINAL",
            ...Array.from({ length: 8 }, (_, i) => `FA${i + 1}`),
            ...Array.from({ length: 4 }, (_, i) => `SA${i + 1}`),
          ];

      return codes.map((code) => ({
        code,
        label: getAssessmentLabel(code),
        weight: getAssessmentWeight(code),
      }));
    }
  }, [effectiveCourseType, classGrade, term]);

  const handleScoreUpdate = (
    studentId: string,
    code: string,
    value: number | null,
    isAbsent: boolean = false
  ) => {
    // 1. Optimistic Update
    setSaveStatus("saving");
    setData((prev) =>
      prev.map((row) => {
        if (row.id === studentId) {
          const newScores = { ...row.scores, [code]: isAbsent ? null : value };
          const newAbsentFlags = { ...(row.absentFlags || {}), [code]: isAbsent };
          return { ...row, scores: newScores, absentFlags: newAbsentFlags };
        }
        return row;
      })
    );

    // 2. Server Action
    startTransition(async () => {
      try {
        await updateScore(classId, studentId, code, value, isAbsent, effectiveCourseType, term ?? undefined);
        setSaveStatus("saved");
      } catch (error) {
        console.error("Failed to save score:", error);
        setSaveStatus("error");
      }
    });
  };

  // Handle ScoreInput change
  const handleScoreInputChange = (
    studentId: string,
    code: string,
    newValue: ScoreInputValue
  ) => {
    handleScoreUpdate(studentId, code, newValue.value, newValue.isAbsent);
  };

  // Handle keyboard navigation between cells
  const handleNavigate = useCallback((direction: NavigationDirection, row: number, col: number) => {
    const maxRow = data.length - 1;
    const maxCol = ASSESSMENT_COLS.length - 1;
    let nextRow = row;
    let nextCol = col;

    switch (direction) {
      case 'down':
        nextRow = Math.min(row + 1, maxRow);
        break;
      case 'up':
        nextRow = Math.max(row - 1, 0);
        break;
      case 'left':
        nextCol = Math.max(col - 1, 0);
        break;
      case 'right':
        nextCol = Math.min(col + 1, maxCol);
        break;
    }

    // Focus and select the next input
    const nextInput = inputRefs.current.get(getRefKey(nextRow, nextCol));
    if (nextInput) {
      nextInput.focus();
      nextInput.select();
    }
  }, [data.length, ASSESSMENT_COLS.length, getRefKey]);

  return (
    <div className={cn("flex-1 flex flex-col h-full overflow-hidden", NOTION_STYLES.bg)}>
      {/* Main Grid - Status bar moved to parent component */}
      <div className="flex-1 overflow-auto p-4">
        <div
          className={cn(
            "shadow-sm rounded-xl inline-block min-w-full overflow-hidden",
            NOTION_STYLES.bgCard,
            "border",
            NOTION_STYLES.border
          )}
        >
          {/* Header Row - Notion Style */}
          <div
            className={cn(
              "flex sticky top-0 z-10",
              "border-b",
              NOTION_STYLES.border,
              NOTION_STYLES.bgHeader
            )}
          >
            {/* Fixed Columns */}
            <div className="sticky left-0 z-20 flex shadow-[2px_0_8px_-4px_rgba(0,0,0,0.08)] dark:shadow-[2px_0_8px_-4px_rgba(0,0,0,0.3)]">
              <div
                className={cn(
                  "w-12 p-2.5 text-center text-xs font-medium flex items-center justify-center",
                  "border-r",
                  NOTION_STYLES.border,
                  NOTION_STYLES.bgHeader,
                  NOTION_STYLES.textLight
                )}
              >
                #
              </div>
              <div
                className={cn(
                  "w-48 p-2.5 text-sm font-medium flex items-center",
                  "border-r",
                  NOTION_STYLES.border,
                  NOTION_STYLES.bgHeader,
                  NOTION_STYLES.textMuted
                )}
              >
                Name
              </div>
              <div
                className={cn(
                  "w-24 p-2.5 text-sm font-medium flex items-center",
                  "border-r",
                  NOTION_STYLES.border,
                  NOTION_STYLES.bgHeader,
                  NOTION_STYLES.textMuted
                )}
              >
                ID
              </div>
              <div
                className={cn(
                  "w-24 p-2.5 text-sm font-semibold flex items-center justify-center",
                  "border-r",
                  NOTION_STYLES.border,
                  effectiveCourseType === "KCFS"
                    ? "bg-purple-50/80 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                    : "bg-blue-50/80 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                )}
              >
                Term
              </div>

            </div>

            {/* Scrollable Assessment Columns */}
            <div className="flex">
              {/* Only show summary columns for LT/IT */}
              {effectiveCourseType !== "KCFS" && (
                <>
                  <div
                    className={cn(
                      "w-24 p-2 text-xs font-medium flex flex-col justify-center items-center",
                      "border-r",
                      NOTION_STYLES.border,
                      NOTION_STYLES.bgHeader,
                      NOTION_STYLES.textMuted
                    )}
                  >
                    <span>Formative</span>
                    <span className={NOTION_STYLES.textLight}>15%</span>
                  </div>
                  <div
                    className={cn(
                      "w-24 p-2 text-xs font-medium flex flex-col justify-center items-center",
                      "border-r",
                      NOTION_STYLES.border,
                      NOTION_STYLES.bgHeader,
                      NOTION_STYLES.textMuted
                    )}
                  >
                    <span>Summative</span>
                    <span className={NOTION_STYLES.textLight}>20%</span>
                  </div>
                </>
              )}

              {ASSESSMENT_COLS.map((col) => (
                <div
                  key={col.code}
                  className={cn(
                    "w-24 p-2 text-sm font-medium transition-colors duration-100 group relative",
                    "border-r",
                    NOTION_STYLES.border,
                    NOTION_STYLES.bgHeader,
                    NOTION_STYLES.textMuted,
                    disabled
                      ? "cursor-not-allowed opacity-75"
                      : "cursor-pointer hover:bg-blue-50 dark:hover:bg-blue-900/20"
                  )}
                  onClick={() => !disabled && setFocusModeCode(col.code)}
                  title={disabled ? "Period is locked" : "Click to enter Focus Mode"}
                >
                  <div className="h-full flex flex-col justify-center items-center">
                    <span className="text-xs truncate max-w-full">{col.label}</span>
                    <span className={cn("text-[10px] font-normal mt-0.5", NOTION_STYLES.textLight)}>
                      {col.weight}
                    </span>
                    {!disabled && (
                      <div className="absolute inset-0 bg-blue-500/5 dark:bg-blue-400/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-[10px] text-blue-600 dark:text-blue-400 font-semibold bg-white/90 dark:bg-slate-800/90 px-1.5 py-0.5 rounded">
                          FOCUS
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Data Rows - Notion Style */}
          {data.map((row, index) => {
            // Calculate term grade based on course type
            let termGrade: number | null = null;
            let formativeAvg: number | null = null;
            let summativeAvg: number | null = null;

            if (effectiveCourseType === "KCFS") {
              // KCFS: Use KCFS formula
              termGrade = FormulaEngine.calculateKCFSTermGrade(
                row.scores,
                row.absentFlags || {},
                classGrade
              );
            } else {
              // LT/IT: Use standard formula
              termGrade = FormulaEngine.calculateTermGrade(row.scores);
              formativeAvg = FormulaEngine.getFormativeAverage(row.scores);
              summativeAvg = FormulaEngine.getSummativeAverage(row.scores);
            }

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
                  <div
                    className={cn(
                      "w-12 p-2.5 text-center text-xs flex items-center justify-center",
                      "border-r",
                      NOTION_STYLES.border,
                      NOTION_STYLES.bgMuted,
                      NOTION_STYLES.textLight
                    )}
                  >
                    {index + 1}
                  </div>
                  <div
                    className={cn(
                      "w-48 p-2.5 text-sm font-medium flex items-center truncate",
                      "border-r",
                      NOTION_STYLES.borderMuted,
                      NOTION_STYLES.bgCard,
                      NOTION_STYLES.text
                    )}
                  >
                    {row.studentName}
                  </div>
                  <div
                    className={cn(
                      "w-24 p-2.5 text-xs flex items-center",
                      "border-r",
                      NOTION_STYLES.borderMuted,
                      NOTION_STYLES.bgCard,
                      NOTION_STYLES.textMuted
                    )}
                  >
                    {row.studentId}
                  </div>
                  <div
                    className={cn(
                      "w-24 p-2.5 text-sm font-semibold flex items-center justify-center",
                      "border-r",
                      NOTION_STYLES.borderMuted,
                      effectiveCourseType === "KCFS"
                        ? "bg-purple-50/50 dark:bg-purple-900/20"
                        : "bg-blue-50/50 dark:bg-blue-900/20",
                      termGrade !== null
                        ? getScoreColor(termGrade, effectiveCourseType)
                        : "text-gray-400 dark:text-gray-500"
                    )}
                  >
                    {termGrade !== null ? termGrade.toFixed(1) : "-"}
                  </div>
                </div>

                {/* Scrollable Columns */}
                <div className="flex">
                  {/* Averages with color coding - Only for LT/IT */}
                  {effectiveCourseType !== "KCFS" && (
                    <>
                      <div
                        className={cn(
                          "w-24 p-2.5 text-sm flex items-center justify-center font-medium",
                          "border-r",
                          NOTION_STYLES.borderMuted,
                          NOTION_STYLES.bgMuted,
                          formativeAvg !== null
                            ? getScoreColor(formativeAvg, effectiveCourseType)
                            : NOTION_STYLES.textLight
                        )}
                      >
                        {formativeAvg !== null ? formativeAvg.toFixed(1) : "-"}
                      </div>
                      <div
                        className={cn(
                          "w-24 p-2.5 text-sm flex items-center justify-center font-medium",
                          "border-r",
                          NOTION_STYLES.borderMuted,
                          NOTION_STYLES.bgMuted,
                          summativeAvg !== null
                            ? getScoreColor(summativeAvg, effectiveCourseType)
                            : NOTION_STYLES.textLight
                        )}
                      >
                        {summativeAvg !== null ? summativeAvg.toFixed(1) : "-"}
                      </div>
                    </>
                  )}

                  {/* Score Inputs */}
                  {ASSESSMENT_COLS.map((col, colIndex) => {
                    const scoreValue = row.scores[col.code] ?? null;
                    const isAbsent = row.absentFlags?.[col.code] ?? false;

                    return (
                      <div
                        key={col.code}
                        className={cn("w-24 p-0 relative", "border-r", NOTION_STYLES.borderMuted)}
                      >
                        <ScoreInput
                          ref={setInputRef(index, colIndex)}
                          value={scoreValue}
                          isAbsent={isAbsent}
                          onChange={(newValue) =>
                            handleScoreInputChange(row.id, col.code, newValue)
                          }
                          courseType={effectiveCourseType}
                          disabled={disabled}
                          rowIndex={index}
                          colIndex={colIndex}
                          onNavigate={handleNavigate}
                        />
                      </div>
                    );
                  })}
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

"use client";

import React, { useRef } from "react";
import { GradeRow } from "@/lib/gradebook/FormulaEngine";
import { X, Save } from "lucide-react";
import { cn } from "@/lib/utils";

// Notion + Apple unified design tokens
const FOCUS_STYLES = {
  bg: "bg-surface-primary",
  bgCard: "bg-surface-elevated",
  bgSecondary: "bg-surface-secondary",
  bgHover: "hover:bg-surface-hover",
  border: "border-border-default",
  borderSubtle: "border-border-subtle",
  text: "text-text-primary",
  textMuted: "text-text-secondary",
  textLight: "text-text-tertiary",
};

interface FocusGradeInputProps {
  assessmentCode: string;
  students: GradeRow[];
  onClose: () => void;
  onUpdateScore: (studentId: string, score: number | null) => void;
}

export function FocusGradeInput({
  assessmentCode,
  students,
  onClose,
  onUpdateScore,
}: FocusGradeInputProps) {
  // Refs for inputs to handle Enter navigation
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    index: number
  ) => {
    if (e.key === "Enter") {
      e.preventDefault();
      // Move to next input
      if (index < students.length - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    }
  };

  // Statistics
  const scores = students
    .map((s) => s.scores[assessmentCode])
    .filter((s): s is number => s !== null && s !== undefined);

  const average =
    scores.length > 0
      ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
      : "-";

  const max = scores.length > 0 ? Math.max(...scores) : "-";
  const min = scores.length > 0 ? Math.min(...scores) : "-";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-sm">
      <div className={cn(
        "w-full max-w-4xl h-[80vh] rounded-xl shadow-2xl flex overflow-hidden",
        "animate-in fade-in zoom-in-95 duration-200",
        FOCUS_STYLES.bgCard
      )}>
        {/* Left: Input List */}
        <div className={cn("flex-1 flex flex-col border-r", FOCUS_STYLES.border)}>
          {/* Header */}
          <div className={cn(
            "p-6 border-b flex justify-between items-center",
            FOCUS_STYLES.border,
            FOCUS_STYLES.bgSecondary
          )}>
            <div>
              <h2 className={cn("text-2xl font-bold", FOCUS_STYLES.text)}>Focus Mode</h2>
              <p className={cn("text-sm mt-1", FOCUS_STYLES.textMuted)}>
                Entering grades for{" "}
                <span className="font-bold text-blue-600 dark:text-blue-400">
                  {assessmentCode}
                </span>
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className={cn("text-xs", FOCUS_STYLES.textLight)}>
                Press{" "}
                <kbd className={cn(
                  "px-2 py-1 rounded font-mono",
                  "bg-surface-secondary",
                  FOCUS_STYLES.textMuted
                )}>
                  Enter
                </kbd>{" "}
                to save & next
              </div>
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto p-6 space-y-2">
            {students.map((student, index) => (
              <div
                key={student.id}
                className={cn(
                  "flex items-center p-3 rounded-lg transition-colors group",
                  "hover:bg-blue-50 dark:hover:bg-blue-900/20"
                )}
              >
                <div className={cn("w-12 text-center font-mono text-sm", FOCUS_STYLES.textLight)}>
                  {index + 1}
                </div>
                <div className="flex-1">
                  <div className={cn("font-medium", FOCUS_STYLES.text)}>
                    {student.studentName}
                  </div>
                  <div className={cn("text-xs", FOCUS_STYLES.textMuted)}>
                    {student.studentId}
                  </div>
                </div>
                <div className="w-32">
                  <input
                    ref={(el) => {
                      inputRefs.current[index] = el;
                    }}
                    type="number"
                    className={cn(
                      "w-full px-4 py-2 text-right text-lg font-bold rounded-md outline-none transition-all duration-200",
                      "border",
                      FOCUS_STYLES.border,
                      FOCUS_STYLES.bg,
                      FOCUS_STYLES.text,
                      "focus:ring-2 focus:ring-blue-500/50 dark:focus:ring-blue-400/50",
                      "focus:border-blue-500 dark:focus:border-blue-400",
                      "focus:shadow-lg"
                    )}
                    placeholder="-"
                    value={student.scores[assessmentCode] ?? ""}
                    onChange={(e) => {
                      const val =
                        e.target.value === "" ? null : Number(e.target.value);
                      onUpdateScore(student.id, val);
                    }}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Statistics & Actions */}
        <div className="w-80 bg-gray-50 flex flex-col p-6">
          <div className="flex justify-end mb-8">
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors"
            >
              <X className="w-6 h-6 text-gray-500" />
            </button>
          </div>

          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
                Statistics
              </h3>
              <div className="space-y-4">
                <div className="flex justify-between items-end">
                  <span className="text-gray-600">Average</span>
                  <span className="text-3xl font-bold text-blue-600">
                    {average}
                  </span>
                </div>
                <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-blue-500 h-full rounded-full"
                    style={{ width: `${Math.min(Number(average) || 0, 100)}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                  <div>
                    <div className="text-xs text-gray-400">Highest</div>
                    <div className="text-lg font-semibold text-green-600">
                      {max}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-400">Lowest</div>
                    <div className="text-lg font-semibold text-red-500">
                      {min}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
              <h4 className="font-medium text-blue-800 mb-2 flex items-center">
                <Save className="w-4 h-4 mr-2" />
                Auto-saving
              </h4>
              <p className="text-xs text-blue-600 leading-relaxed">
                Changes are saved automatically as you type. You can close this
                window at any time.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

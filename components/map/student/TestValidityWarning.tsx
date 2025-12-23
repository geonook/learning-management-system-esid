"use client";

import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface TestValidityWarningProps {
  rapidGuessingPercent: number | null;
  course?: "Reading" | "Language Usage";
  className?: string;
}

/**
 * 測驗效度警告組件
 *
 * 當學生的 Rapid Guessing Percentage 超過 15% 時顯示警告，
 * 這表示學生可能沒有認真作答，分數可能無法準確反映其能力。
 *
 * NWEA 標準：
 * - 15% 以上：需要關注，分數效度可能受影響
 * - 25% 以上：嚴重警告，建議重新測驗
 */
export function TestValidityWarning({
  rapidGuessingPercent,
  course,
  className,
}: TestValidityWarningProps) {
  // 不顯示：無資料或低於閾值
  if (rapidGuessingPercent === null || rapidGuessingPercent <= 15) {
    return null;
  }

  const isSevere = rapidGuessingPercent >= 25;

  return (
    <div
      className={cn(
        "rounded-lg p-3 flex items-start gap-3 border",
        isSevere
          ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800"
          : "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",
        className
      )}
    >
      <AlertTriangle
        className={cn(
          "w-5 h-5 flex-shrink-0 mt-0.5",
          isSevere
            ? "text-red-600 dark:text-red-400"
            : "text-amber-600 dark:text-amber-400"
        )}
      />
      <div>
        <p
          className={cn(
            "text-sm font-medium",
            isSevere
              ? "text-red-700 dark:text-red-400"
              : "text-amber-700 dark:text-amber-400"
          )}
        >
          {isSevere ? "Test Validity Concern" : "Test Validity Notice"}
          {course && <span className="font-normal"> - {course}</span>}
        </p>
        <p
          className={cn(
            "text-xs mt-0.5",
            isSevere
              ? "text-red-600 dark:text-red-500"
              : "text-amber-600 dark:text-amber-500"
          )}
        >
          {rapidGuessingPercent.toFixed(0)}% of responses were rapid guesses
          {isSevere
            ? " (>25% threshold). Consider retesting for accurate assessment."
            : " (>15% threshold). Results may not fully reflect ability."}
        </p>
        <p
          className={cn(
            "text-xs mt-2 italic",
            isSevere
              ? "text-red-500 dark:text-red-500"
              : "text-amber-500 dark:text-amber-500"
          )}
        >
          Rapid guessing = answering faster than possible to read and consider the question.
        </p>
      </div>
    </div>
  );
}

interface CombinedTestValidityWarningProps {
  readingRapidGuessing: number | null;
  languageUsageRapidGuessing: number | null;
  className?: string;
}

/**
 * 合併的測驗效度警告組件
 *
 * 同時檢查 Reading 和 Language Usage 的 Rapid Guessing，
 * 顯示需要關注的科目警告。
 */
export function CombinedTestValidityWarning({
  readingRapidGuessing,
  languageUsageRapidGuessing,
  className,
}: CombinedTestValidityWarningProps) {
  const showReadingWarning =
    readingRapidGuessing !== null && readingRapidGuessing > 15;
  const showLUWarning =
    languageUsageRapidGuessing !== null && languageUsageRapidGuessing > 15;

  if (!showReadingWarning && !showLUWarning) {
    return null;
  }

  return (
    <div className={cn("space-y-2", className)}>
      {showReadingWarning && (
        <TestValidityWarning
          rapidGuessingPercent={readingRapidGuessing}
          course="Reading"
        />
      )}
      {showLUWarning && (
        <TestValidityWarning
          rapidGuessingPercent={languageUsageRapidGuessing}
          course="Language Usage"
        />
      )}
    </div>
  );
}

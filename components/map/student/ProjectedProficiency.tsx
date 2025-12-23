"use client";

import { Target, Star, CheckCircle2, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProgressHistoryPoint } from "@/lib/api/map-student-analytics";
import {
  getProjectedStatusInfo,
  type ProjectedStatusInfo,
} from "@/lib/map/achievement";

interface ProjectedProficiencyProps {
  progressHistory: ProgressHistoryPoint[];
}

interface CourseProjection {
  course: "Reading" | "Language Usage";
  fallRit: number;
  expectedGrowth: number;
  projectedSpring: number;
  springNorm: number | null;
  statusInfo: ProjectedStatusInfo | null;
}

/**
 * Projected Proficiency 組件
 *
 * 僅在 Fall 學期顯示，預測學生在 Spring 是否能達到年級標準。
 * 計算方式：projectedSpring = fallRit + expectedGrowth
 */
export function ProjectedProficiency({
  progressHistory,
}: ProjectedProficiencyProps) {
  // 找到最新的 Fall 資料
  const latestFallData = [...progressHistory]
    .reverse()
    .find((point) => point.mapTerm === "fall");

  // 如果沒有 Fall 資料，不顯示此組件
  if (!latestFallData) {
    return null;
  }

  // 檢查是否已有同學年的 Spring 資料（如果有就不需要預測）
  const academicYear = latestFallData.academicYear;
  const hasSpringData = progressHistory.some(
    (point) =>
      point.mapTerm === "spring" && point.academicYear === academicYear
  );

  // 如果已有 Spring 資料，不顯示預測
  if (hasSpringData) {
    return null;
  }

  // 準備 Reading 預測
  const readingProjection: CourseProjection | null = latestFallData.reading
    ? createProjection("Reading", latestFallData.reading)
    : null;

  // 準備 Language Usage 預測
  const languageProjection: CourseProjection | null =
    latestFallData.languageUsage
      ? createProjection("Language Usage", latestFallData.languageUsage)
      : null;

  // 如果兩科都沒有預測資料，不顯示
  if (!readingProjection && !languageProjection) {
    return null;
  }

  // 學年格式化（使用簡短格式：SP25）
  const yearParts = academicYear.split("-");
  const shortYear = yearParts[1]?.slice(-2) ?? "";
  const springLabel = `SP${shortYear} (G${latestFallData.grade})`;

  return (
    <div className="bg-surface-elevated rounded-xl border border-border-default p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-amber-100 dark:bg-amber-900/30 rounded-lg">
          <Target className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-text-primary">
            {springLabel} Projection
          </h3>
          <p className="text-xs text-text-tertiary">
            Based on Fall scores + expected growth
          </p>
        </div>
      </div>

      {/* Projections Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {readingProjection && (
          <ProjectionCard projection={readingProjection} />
        )}
        {languageProjection && (
          <ProjectionCard projection={languageProjection} />
        )}
      </div>

      {/* Footer Note with Explanation */}
      <div className="mt-4 pt-3 border-t border-border-subtle text-xs text-text-tertiary space-y-2">
        <p className="text-center font-medium">How to interpret this projection:</p>
        <ul className="space-y-1 list-disc list-inside">
          <li><strong>On Track</strong>: Student is expected to meet grade-level standards by Spring.</li>
          <li><strong>Exceeding</strong>: Student is projected to exceed grade-level expectations.</li>
          <li><strong>Needs Support</strong>: Additional intervention may help student reach grade-level goals.</li>
        </ul>
        <p className="text-center italic">
          Projections are based on NWEA typical growth expectations for students at similar achievement levels.
        </p>
      </div>
    </div>
  );
}

/**
 * 建立課程預測資料
 */
function createProjection(
  course: "Reading" | "Language Usage",
  data: {
    rit: number;
    expectedGrowth: number | null;
    norm: number | null;
  }
): CourseProjection | null {
  // 需要有 expectedGrowth 才能計算預測
  if (data.expectedGrowth === null) {
    return null;
  }

  const projectedSpring = data.rit + data.expectedGrowth;

  // 估算 Spring Norm（通常比 Fall Norm 高約 3-5 分）
  // 這裡使用簡化方法：Spring Norm ≈ Fall Norm + 3
  const springNorm = data.norm !== null ? data.norm + 3 : null;

  const statusInfo =
    springNorm !== null
      ? getProjectedStatusInfo(projectedSpring, springNorm)
      : null;

  return {
    course,
    fallRit: data.rit,
    expectedGrowth: data.expectedGrowth,
    projectedSpring,
    springNorm,
    statusInfo,
  };
}

/**
 * 單一課程預測卡片
 */
function ProjectionCard({ projection }: { projection: CourseProjection }) {
  const isReading = projection.course === "Reading";
  const statusInfo = projection.statusInfo;

  // 決定圖標
  const StatusIcon = statusInfo
    ? statusInfo.icon === "star"
      ? Star
      : statusInfo.icon === "check"
      ? CheckCircle2
      : AlertTriangle
    : CheckCircle2;

  return (
    <div
      className={cn(
        "rounded-lg p-4 border",
        isReading
          ? "bg-blue-50/50 dark:bg-blue-950/20 border-blue-200/50 dark:border-blue-800/30"
          : "bg-purple-50/50 dark:bg-purple-950/20 border-purple-200/50 dark:border-purple-800/30"
      )}
    >
      {/* Course Name */}
      <div className="flex items-center justify-between mb-3">
        <span
          className={cn(
            "text-sm font-medium",
            isReading
              ? "text-blue-700 dark:text-blue-400"
              : "text-purple-700 dark:text-purple-400"
          )}
        >
          {projection.course}
        </span>
        {statusInfo && (
          <span
            className={cn(
              "flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
              statusInfo.bgColor,
              statusInfo.textColor
            )}
          >
            <StatusIcon className="w-3 h-3" />
            {statusInfo.label}
          </span>
        )}
      </div>

      {/* Projection Details */}
      <div className="space-y-2 text-sm">
        {/* Fall RIT */}
        <div className="flex justify-between">
          <span className="text-text-tertiary">Fall RIT</span>
          <span className="font-medium text-text-primary">
            {projection.fallRit}
          </span>
        </div>

        {/* Expected Growth */}
        <div className="flex justify-between">
          <span className="text-text-tertiary">+ Expected Growth</span>
          <span className="font-medium text-green-600 dark:text-green-400">
            +{projection.expectedGrowth}
          </span>
        </div>

        {/* Divider */}
        <div className="border-t border-border-subtle my-1" />

        {/* Projected Spring */}
        <div className="flex justify-between">
          <span className="text-text-secondary font-medium">
            Projected Spring
          </span>
          <span className="text-lg font-bold text-text-primary">
            {projection.projectedSpring}
          </span>
        </div>

        {/* vs Spring Norm */}
        {projection.springNorm !== null && (
          <div className="flex justify-between text-xs">
            <span className="text-text-tertiary">
              Spring Norm: {projection.springNorm}
            </span>
            <span
              className={cn(
                "font-medium",
                projection.projectedSpring >= projection.springNorm
                  ? "text-green-600 dark:text-green-400"
                  : "text-amber-600 dark:text-amber-400"
              )}
            >
              {projection.projectedSpring >= projection.springNorm
                ? `+${projection.projectedSpring - projection.springNorm}`
                : projection.projectedSpring - projection.springNorm}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

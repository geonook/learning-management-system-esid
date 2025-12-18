"use client";

import { Skeleton } from "@/components/ui/skeleton";
import type { HeatmapCell } from "@/lib/api/dashboard";

interface ScoreHeatmapProps {
  data: HeatmapCell[];
  loading: boolean;
  title?: string;
  subtitle?: string;
}

// Get color based on score
function getScoreColor(score: number | null): string {
  if (score === null) return "bg-gray-200 dark:bg-gray-700";
  if (score >= 90) return "bg-green-500";
  if (score >= 80) return "bg-green-400";
  if (score >= 70) return "bg-yellow-400";
  if (score >= 60) return "bg-amber-500";
  return "bg-red-500";
}

// Get text color based on score
function getTextColor(score: number | null): string {
  if (score === null) return "text-gray-400 dark:text-gray-500";
  return "text-white";
}

export function ScoreHeatmap({
  data,
  loading,
}: ScoreHeatmapProps) {
  // Group data by grade level
  const grades = ["G1", "G2", "G3", "G4", "G5", "G6"];
  const courseTypes = ["LT", "IT", "KCFS"];

  // Create a lookup map
  const dataMap = new Map<string, HeatmapCell>();
  data.forEach(cell => {
    const key = `${cell.gradeLevel}-${cell.courseType}`;
    dataMap.set(key, cell);
  });

  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <div className="grid grid-cols-4 gap-1">
          <Skeleton className="h-6 w-12" />
          {courseTypes.map(ct => (
            <Skeleton key={ct} className="h-6 w-full" />
          ))}
        </div>
        <div className="flex-1 grid grid-cols-4 gap-1 mt-2">
          {grades.slice(0, 3).map(g => (
            <div key={g} className="contents">
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
              <Skeleton className="h-10" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  const isEmpty = !data || data.length === 0;

  if (isEmpty) {
    return (
      <div className="h-full flex items-center justify-center text-text-tertiary text-sm">
        No data available
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <table className="w-full table-fixed">
        <thead>
          <tr>
            <th className="p-1 text-left text-xs font-medium text-text-secondary w-12">
              Grade
            </th>
            {courseTypes.map(ct => (
              <th
                key={ct}
                className="p-1 text-center text-xs font-medium text-text-secondary"
              >
                {ct}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grades.map(grade => (
            <tr key={grade}>
              <td className="p-1 text-xs font-medium text-text-primary">
                {grade}
              </td>
              {courseTypes.map(ct => {
                const key = `${grade}-${ct}`;
                const cell = dataMap.get(key);
                const score = cell?.avgScore ?? null;

                return (
                  <td key={ct} className="p-0.5">
                    <div
                      className={`
                        rounded p-1.5 text-center transition-all hover:scale-105 cursor-default
                        ${getScoreColor(score)}
                      `}
                      title={cell ? `${cell.studentCount} students` : "No data"}
                    >
                      <div className={`text-sm font-bold ${getTextColor(score)}`}>
                        {score !== null ? score.toFixed(1) : "-"}
                      </div>
                      <div className={`text-[10px] ${getTextColor(score)} opacity-75`}>
                        {cell?.studentCount ?? 0}
                      </div>
                    </div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

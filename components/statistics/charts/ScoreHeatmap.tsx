"use client";

import { ChartWrapper } from "./ChartWrapper";
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
  if (score >= 70) return "text-white";
  return "text-white";
}

export function ScoreHeatmap({
  data,
  loading,
  title = "Score Heatmap",
  subtitle = "Grade level performance by course type",
}: ScoreHeatmapProps) {
  const isEmpty = !data || data.length === 0;

  // Group data by grade level
  const grades = ["G1", "G2", "G3", "G4", "G5", "G6"];
  const courseTypes = ["LT", "IT", "KCFS"];

  // Create a lookup map
  const dataMap = new Map<string, HeatmapCell>();
  data.forEach(cell => {
    const key = `${cell.gradeLevel}-${cell.courseType}`;
    dataMap.set(key, cell);
  });

  return (
    <ChartWrapper
      title={title}
      subtitle={subtitle}
      loading={loading}
      isEmpty={isEmpty}
      height={280}
    >
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr>
              <th className="p-2 text-left text-sm font-medium text-text-secondary w-16">
                Grade
              </th>
              {courseTypes.map(ct => (
                <th
                  key={ct}
                  className="p-2 text-center text-sm font-medium text-text-secondary"
                >
                  {ct}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grades.map(grade => (
              <tr key={grade}>
                <td className="p-2 text-sm font-medium text-text-primary">
                  {grade}
                </td>
                {courseTypes.map(ct => {
                  const key = `${grade}-${ct}`;
                  const cell = dataMap.get(key);
                  const score = cell?.avgScore ?? null;

                  return (
                    <td key={ct} className="p-1">
                      <div
                        className={`
                          rounded-lg p-3 text-center transition-all hover:scale-105 cursor-default
                          ${getScoreColor(score)}
                        `}
                        title={cell ? `${cell.studentCount} students` : "No data"}
                      >
                        <div className={`text-lg font-bold ${getTextColor(score)}`}>
                          {score !== null ? score.toFixed(1) : "-"}
                        </div>
                        <div className={`text-xs ${getTextColor(score)} opacity-75`}>
                          {cell?.studentCount ?? 0} students
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

      {/* Legend */}
      <div className="flex justify-center gap-4 mt-4">
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-green-500" />
          <span className="text-xs text-text-secondary">&gt;=90</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-green-400" />
          <span className="text-xs text-text-secondary">80-89</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-yellow-400" />
          <span className="text-xs text-text-secondary">70-79</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-amber-500" />
          <span className="text-xs text-text-secondary">60-69</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-4 h-4 rounded bg-red-500" />
          <span className="text-xs text-text-secondary">&lt;60</span>
        </div>
      </div>
    </ChartWrapper>
  );
}

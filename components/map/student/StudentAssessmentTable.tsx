"use client";

import { cn } from "@/lib/utils";
import type { ProgressHistoryPoint } from "@/lib/api/map-student-analytics";

interface StudentAssessmentTableProps {
  data: ProgressHistoryPoint[];
  course: "reading" | "languageUsage";
  title: string;
}

// Standard error is typically ±3 for MAP assessments
const STD_ERROR = 3;

export function StudentAssessmentTable({
  data,
  course,
  title,
}: StudentAssessmentTableProps) {
  // Sort data in reverse chronological order (newest first)
  const sortedData = [...data].reverse();

  if (data.length === 0) {
    return null;
  }

  return (
    <div className="bg-surface-elevated rounded-xl border border-border-default overflow-hidden">
      <div className="px-4 py-3 bg-surface-secondary border-b border-border-default">
        <h3 className="text-sm font-semibold text-text-primary">{title}</h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-secondary/50 border-b border-border-default">
              <th className="px-3 py-2 text-left text-xs font-medium text-text-secondary">
                Term/Year
              </th>
              <th className="px-3 py-2 text-center text-xs font-medium text-text-secondary">
                Grade
              </th>
              <th className="px-3 py-2 text-center text-xs font-medium text-text-secondary">
                RIT Score<br />(+/- Std Err)
              </th>
              <th className="px-3 py-2 text-center text-xs font-medium text-text-secondary">
                RIT<br />Growth
              </th>
              <th className="px-3 py-2 text-center text-xs font-medium text-text-secondary">
                Growth<br />Projection
              </th>
              {/* Percentile will be added later */}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((point, index) => {
              const courseData = course === "reading" ? point.reading : point.languageUsage;

              if (!courseData) return null;

              const { rit, growth, expectedGrowth } = courseData;
              const ritLow = rit - STD_ERROR;
              const ritHigh = rit + STD_ERROR;

              // Determine growth indicator color
              let growthColor = "";
              if (growth !== null && expectedGrowth !== null) {
                if (growth >= expectedGrowth) {
                  growthColor = "text-green-600 dark:text-green-400";
                } else if (growth >= expectedGrowth * 0.8) {
                  growthColor = "text-yellow-600 dark:text-yellow-400";
                } else {
                  growthColor = "text-red-600 dark:text-red-400";
                }
              }

              return (
                <tr
                  key={point.termTested}
                  className={cn(
                    "border-b border-border-default last:border-0",
                    index === 0 && "bg-primary/5"
                  )}
                >
                  <td className="px-3 py-2.5 text-text-primary font-medium">
                    {point.termShort}
                  </td>
                  <td className="px-3 py-2.5 text-center text-text-secondary">
                    {point.grade}
                  </td>
                  <td className="px-3 py-2.5 text-center">
                    <span className="text-text-tertiary text-xs">{ritLow}-</span>
                    <span className="font-bold text-text-primary">{rit}</span>
                    <span className="text-text-tertiary text-xs">-{ritHigh}</span>
                  </td>
                  <td className={cn("px-3 py-2.5 text-center font-medium", growthColor)}>
                    {growth !== null ? (
                      <>
                        {growth > 0 && "+"}
                        {growth}
                      </>
                    ) : (
                      <span className="text-text-tertiary">-</span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-center text-text-secondary">
                    {expectedGrowth !== null ? expectedGrowth : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Wrapper component that displays both Reading and Language Usage tables
 */
export function StudentAssessmentTables({
  data,
}: {
  data: ProgressHistoryPoint[];
}) {
  if (data.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <StudentAssessmentTable
        data={data}
        course="reading"
        title="Reading Assessment History"
      />
      <StudentAssessmentTable
        data={data}
        course="languageUsage"
        title="Language Usage Assessment History"
      />
    </div>
  );
}

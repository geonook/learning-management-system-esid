"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import type { ProgressHistoryPoint } from "@/lib/api/map-student-analytics";

interface StudentProgressChartProps {
  data: ProgressHistoryPoint[];
  course: "reading" | "languageUsage";
  title: string;
}

interface ChartBar {
  label: string;
  studentRit: number | null;
  gradeAvg: number | null;
  norm: number | null;
  projection: number | null;
}

const BAR_COLORS = {
  studentRit: "bg-blue-500",
  gradeAvg: "bg-orange-400",
  norm: "bg-gray-400",
  projection: "bg-blue-300",
};

const LEGEND_ITEMS = [
  { key: "studentRit", label: "Student RIT", color: "bg-blue-500" },
  { key: "gradeAvg", label: "Grade Avg", color: "bg-orange-400" },
  { key: "norm", label: "NWEA Norm", color: "bg-gray-400" },
  { key: "projection", label: "Projection", color: "bg-blue-300", pattern: true },
];

export function StudentProgressChart({
  data,
  course,
  title,
}: StudentProgressChartProps) {
  // Transform data for chart
  const chartData = useMemo(() => {
    const bars: ChartBar[] = [];

    for (const point of data) {
      const courseData = course === "reading" ? point.reading : point.languageUsage;

      bars.push({
        label: point.termShort,
        studentRit: courseData?.rit ?? null,
        gradeAvg: courseData?.gradeAvg ?? null,
        norm: courseData?.norm ?? null,
        projection: courseData?.projection ?? null,
      });

      // Add projection as separate entry for Fall terms (shown after actual data)
      if (courseData && courseData.projection !== null) {
        bars.push({
          label: `${point.termShort}p`,
          studentRit: null,
          gradeAvg: null,
          norm: null,
          projection: courseData.projection,
        });
      }
    }

    return bars;
  }, [data, course]);

  // Calculate Y-axis range
  const { minY, maxY, yTicks } = useMemo(() => {
    const allValues = chartData.flatMap((d) => [
      d.studentRit,
      d.gradeAvg,
      d.norm,
      d.projection,
    ]).filter((v): v is number => v !== null);

    if (allValues.length === 0) {
      return { minY: 150, maxY: 250, yTicks: [150, 175, 200, 225, 250] };
    }

    const min = Math.min(...allValues);
    const max = Math.max(...allValues);

    // Round to nearest 25
    const roundedMin = Math.floor(min / 25) * 25 - 25;
    const roundedMax = Math.ceil(max / 25) * 25 + 25;

    const ticks: number[] = [];
    for (let y = roundedMin; y <= roundedMax; y += 25) {
      ticks.push(y);
    }

    return { minY: roundedMin, maxY: roundedMax, yTicks: ticks };
  }, [chartData]);

  // Calculate bar height percentage
  const getBarHeight = (value: number | null): number => {
    if (value === null) return 0;
    const range = maxY - minY;
    return ((value - minY) / range) * 100;
  };

  if (data.length === 0) {
    return (
      <div className="bg-surface-elevated rounded-xl border border-border-default p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">{title}</h3>
        <div className="text-center py-8 text-text-secondary">
          No data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-elevated rounded-xl border border-border-default p-6">
      <h3 className="text-lg font-semibold text-text-primary mb-4">{title}</h3>

      {/* Chart Container */}
      <div className="relative">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-8 w-10 flex flex-col justify-between text-xs text-text-tertiary">
          {[...yTicks].reverse().map((tick) => (
            <span key={tick} className="text-right pr-2">
              {tick}
            </span>
          ))}
        </div>

        {/* Chart Area */}
        <div className="ml-12">
          {/* Grid lines */}
          <div className="absolute left-12 right-0 top-0 bottom-8">
            {yTicks.map((tick, i) => (
              <div
                key={tick}
                className="absolute w-full border-t border-border-default"
                style={{
                  bottom: `${((tick - minY) / (maxY - minY)) * 100}%`,
                }}
              />
            ))}
          </div>

          {/* Bars */}
          <div className="relative h-48 flex items-end justify-around gap-1 pb-8">
            {chartData.map((bar, index) => (
              <div
                key={`${bar.label}-${index}`}
                className="flex-1 flex items-end justify-center gap-0.5 relative"
              >
                {/* Student RIT Bar */}
                {bar.studentRit !== null && (
                  <div
                    className={cn(
                      "w-3 rounded-t transition-all duration-300",
                      BAR_COLORS.studentRit
                    )}
                    style={{ height: `${getBarHeight(bar.studentRit)}%` }}
                    title={`Student: ${bar.studentRit}`}
                  />
                )}

                {/* Grade Avg Bar */}
                {bar.gradeAvg !== null && (
                  <div
                    className={cn(
                      "w-3 rounded-t transition-all duration-300",
                      BAR_COLORS.gradeAvg
                    )}
                    style={{ height: `${getBarHeight(bar.gradeAvg)}%` }}
                    title={`Grade Avg: ${bar.gradeAvg}`}
                  />
                )}

                {/* Norm Bar */}
                {bar.norm !== null && (
                  <div
                    className={cn(
                      "w-3 rounded-t transition-all duration-300",
                      BAR_COLORS.norm
                    )}
                    style={{ height: `${getBarHeight(bar.norm)}%` }}
                    title={`Norm: ${bar.norm}`}
                  />
                )}

                {/* Projection Bar (with pattern) */}
                {bar.projection !== null && bar.studentRit === null && (
                  <div
                    className={cn(
                      "w-3 rounded-t transition-all duration-300 relative overflow-hidden",
                      BAR_COLORS.projection
                    )}
                    style={{ height: `${getBarHeight(bar.projection)}%` }}
                    title={`Projection: ${bar.projection}`}
                  >
                    {/* Diagonal stripes pattern */}
                    <div
                      className="absolute inset-0 opacity-50"
                      style={{
                        backgroundImage: `repeating-linear-gradient(
                          -45deg,
                          transparent,
                          transparent 2px,
                          rgba(255,255,255,0.5) 2px,
                          rgba(255,255,255,0.5) 4px
                        )`,
                      }}
                    />
                  </div>
                )}

                {/* X-axis label */}
                {!bar.label.endsWith("p") && (
                  <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 text-xs text-text-tertiary whitespace-nowrap">
                    {bar.label}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-4 mt-4 pt-4 border-t border-border-default">
        {LEGEND_ITEMS.map((item) => (
          <div key={item.key} className="flex items-center gap-1.5">
            <div
              className={cn(
                "w-3 h-3 rounded-sm",
                item.color,
                item.pattern && "relative overflow-hidden"
              )}
            >
              {item.pattern && (
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage: `repeating-linear-gradient(
                      -45deg,
                      transparent,
                      transparent 1px,
                      rgba(255,255,255,0.5) 1px,
                      rgba(255,255,255,0.5) 2px
                    )`,
                  }}
                />
              )}
            </div>
            <span className="text-xs text-text-secondary">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Wrapper component that displays both Reading and Language Usage charts
 */
export function StudentProgressCharts({
  data,
}: {
  data: ProgressHistoryPoint[];
}) {
  if (data.length === 0) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <StudentProgressChart
        data={data}
        course="reading"
        title="Language Arts: Reading"
      />
      <StudentProgressChart
        data={data}
        course="languageUsage"
        title="Language Arts: Language Usage"
      />
    </div>
  );
}

"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  ReferenceLine,
  CartesianGrid,
} from "recharts";
import { BookOpen, Languages } from "lucide-react";
import type { ProgressHistoryPoint } from "@/lib/api/map-student-analytics";

interface StudentProgressChartsProps {
  data: ProgressHistoryPoint[];
}

interface ChartDataPoint {
  term: string;
  termFull: string;
  grade: number;
  reading: number | null;
  readingGradeAvg: number | null;
  readingNorm: number | null;
  languageUsage: number | null;
  luGradeAvg: number | null;
  luNorm: number | null;
}

// Percentile Band 顏色（用於背景區塊）
const PERCENTILE_BANDS = [
  { min: 0, max: 20, color: "rgba(239, 68, 68, 0.08)", label: "1-20%" },
  { min: 20, max: 40, color: "rgba(249, 115, 22, 0.08)", label: "21-40%" },
  { min: 40, max: 60, color: "rgba(250, 204, 21, 0.08)", label: "41-60%" },
  { min: 60, max: 80, color: "rgba(132, 204, 22, 0.08)", label: "61-80%" },
  { min: 80, max: 100, color: "rgba(34, 197, 94, 0.08)", label: "81-100%" },
];

// 課程配色
const COURSE_COLORS = {
  reading: {
    main: "#3b82f6", // blue-500
    light: "rgba(59, 130, 246, 0.15)",
    gradeAvg: "#94a3b8", // slate-400
  },
  languageUsage: {
    main: "#8b5cf6", // violet-500
    light: "rgba(139, 92, 246, 0.15)",
    gradeAvg: "#94a3b8",
  },
  norm: "#f59e0b", // amber-500
};

/**
 * Growth Trend Area Chart
 * 統一顯示 Reading 和 Language Usage 的 RIT 歷程
 * 包含 Grade Average 比較線和 NWEA Norm 參考線
 */
export function StudentProgressCharts({ data }: StudentProgressChartsProps) {
  // 轉換資料格式
  const chartData = useMemo(() => {
    const points: ChartDataPoint[] = [];

    for (const point of data) {
      points.push({
        term: point.termShort,
        termFull: point.termTested,
        grade: point.grade,
        reading: point.reading?.rit ?? null,
        readingGradeAvg: point.reading?.gradeAvg ?? null,
        readingNorm: point.reading?.norm ?? null,
        languageUsage: point.languageUsage?.rit ?? null,
        luGradeAvg: point.languageUsage?.gradeAvg ?? null,
        luNorm: point.languageUsage?.norm ?? null,
      });
    }

    return points;
  }, [data]);

  // 計算 Y 軸範圍
  const { minY, maxY } = useMemo(() => {
    const allValues = chartData.flatMap((d) => [
      d.reading,
      d.readingGradeAvg,
      d.readingNorm,
      d.languageUsage,
      d.luGradeAvg,
      d.luNorm,
    ]).filter((v): v is number => v !== null);

    if (allValues.length === 0) {
      return { minY: 150, maxY: 250 };
    }

    const min = Math.min(...allValues);
    const max = Math.max(...allValues);

    // 向下取整到 10 的倍數 -20，向上取整到 10 的倍數 +20
    return {
      minY: Math.floor(min / 10) * 10 - 20,
      maxY: Math.ceil(max / 10) * 10 + 20,
    };
  }, [chartData]);

  // 計算最新的 Norm 值（用於參考線）
  const latestNorms = useMemo(() => {
    const lastPoint = chartData[chartData.length - 1];
    return {
      reading: lastPoint?.readingNorm ?? null,
      languageUsage: lastPoint?.luNorm ?? null,
    };
  }, [chartData]);

  if (data.length === 0) {
    return (
      <div className="bg-surface-elevated rounded-xl border border-border-default p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          Growth Trend
        </h3>
        <div className="text-center py-12 text-text-secondary">
          No assessment data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-elevated rounded-xl border border-border-default p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-text-primary">
          RIT Score Growth Trend
        </h3>
        <div className="flex items-center gap-4 text-xs text-text-tertiary">
          <span>G{chartData[0]?.grade} - G{chartData[chartData.length - 1]?.grade}</span>
        </div>
      </div>

      {/* Chart */}
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 20, left: 0, bottom: 0 }}
          >
            {/* Grid */}
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="currentColor"
              className="text-border-default"
              opacity={0.5}
            />

            {/* Axes */}
            <XAxis
              dataKey="term"
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: "currentColor", className: "text-border-default" }}
            />
            <YAxis
              domain={[minY, maxY]}
              tick={{ fontSize: 12 }}
              tickLine={false}
              axisLine={{ stroke: "currentColor", className: "text-border-default" }}
              width={40}
            />

            {/* Tooltip */}
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: "#94a3b8", strokeDasharray: "3 3" }}
            />

            {/* NWEA Norm Reference Lines */}
            {latestNorms.reading !== null && (
              <ReferenceLine
                y={latestNorms.reading}
                stroke={COURSE_COLORS.norm}
                strokeDasharray="5 5"
                strokeWidth={1.5}
              />
            )}

            {/* Reading Area + Line */}
            <Area
              type="monotone"
              dataKey="reading"
              name="Reading"
              stroke={COURSE_COLORS.reading.main}
              fill={COURSE_COLORS.reading.light}
              strokeWidth={2.5}
              dot={{ fill: COURSE_COLORS.reading.main, strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6, strokeWidth: 2, stroke: "#fff" }}
              connectNulls
            />

            {/* Language Usage Area + Line */}
            <Area
              type="monotone"
              dataKey="languageUsage"
              name="Language Usage"
              stroke={COURSE_COLORS.languageUsage.main}
              fill={COURSE_COLORS.languageUsage.light}
              strokeWidth={2.5}
              dot={{ fill: COURSE_COLORS.languageUsage.main, strokeWidth: 0, r: 4 }}
              activeDot={{ r: 6, strokeWidth: 2, stroke: "#fff" }}
              connectNulls
            />

            {/* Grade Average Lines (dashed) */}
            <Line
              type="monotone"
              dataKey="readingGradeAvg"
              name="Reading (Grade Avg)"
              stroke={COURSE_COLORS.reading.gradeAvg}
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="luGradeAvg"
              name="Language Usage (Grade Avg)"
              stroke={COURSE_COLORS.languageUsage.gradeAvg}
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
              connectNulls
            />

            {/* Legend */}
            <Legend
              content={<CustomLegend latestNorms={latestNorms} />}
              verticalAlign="bottom"
              height={48}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/**
 * 自訂 Tooltip
 */
function CustomTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    color: string;
    dataKey: string;
  }>;
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  // 取得完整學期名稱
  const termFull = (payload[0] as { payload?: { termFull?: string } })?.payload?.termFull;
  const grade = (payload[0] as { payload?: { grade?: number } })?.payload?.grade;

  return (
    <div className="bg-surface-elevated border border-border-default rounded-lg shadow-lg p-3 min-w-[180px]">
      <div className="text-sm font-medium text-text-primary mb-2">
        {termFull || label} {grade && `(G${grade})`}
      </div>
      <div className="space-y-1.5">
        {payload.map((entry, index) => {
          if (entry.value === null || entry.value === undefined) return null;

          const isGradeAvg = entry.dataKey.includes("GradeAvg");
          const label = isGradeAvg
            ? entry.name
            : entry.name;

          return (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="text-xs text-text-secondary">{label}</span>
              </div>
              <span className="text-sm font-semibold text-text-primary">
                {Math.round(entry.value)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * 自訂 Legend
 */
function CustomLegend({ latestNorms }: {
  latestNorms: { reading: number | null; languageUsage: number | null };
}) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-4 border-t border-border-default">
      {/* Reading */}
      <div className="flex items-center gap-2">
        <BookOpen className="w-4 h-4" style={{ color: COURSE_COLORS.reading.main }} />
        <span className="text-xs text-text-secondary">Reading</span>
      </div>

      {/* Language Usage */}
      <div className="flex items-center gap-2">
        <Languages className="w-4 h-4" style={{ color: COURSE_COLORS.languageUsage.main }} />
        <span className="text-xs text-text-secondary">Language Usage</span>
      </div>

      {/* Grade Avg */}
      <div className="flex items-center gap-2">
        <div className="w-6 h-0 border-t-2 border-dashed border-slate-400" />
        <span className="text-xs text-text-secondary">Grade Avg</span>
      </div>

      {/* NWEA Norm */}
      {(latestNorms.reading !== null || latestNorms.languageUsage !== null) && (
        <div className="flex items-center gap-2">
          <div
            className="w-6 h-0 border-t-2 border-dashed"
            style={{ borderColor: COURSE_COLORS.norm }}
          />
          <span className="text-xs text-text-secondary">
            NWEA Norm ({latestNorms.reading ?? latestNorms.languageUsage})
          </span>
        </div>
      )}
    </div>
  );
}

// 保留舊的單一課程圖表組件（向後相容）
export function StudentProgressChart({
  data,
  course,
  title,
}: {
  data: ProgressHistoryPoint[];
  course: "reading" | "languageUsage";
  title: string;
}) {
  // 簡化版：僅顯示單一課程
  const filteredData = useMemo(() => {
    return data.map(point => ({
      term: point.termShort,
      termFull: point.termTested,
      grade: point.grade,
      rit: course === "reading" ? point.reading?.rit : point.languageUsage?.rit,
      gradeAvg: course === "reading" ? point.reading?.gradeAvg : point.languageUsage?.gradeAvg,
      norm: course === "reading" ? point.reading?.norm : point.languageUsage?.norm,
    }));
  }, [data, course]);

  const { minY, maxY } = useMemo(() => {
    const allValues = filteredData.flatMap(d => [d.rit, d.gradeAvg, d.norm])
      .filter((v): v is number => v !== null && v !== undefined);
    if (allValues.length === 0) return { minY: 150, maxY: 250 };
    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    return {
      minY: Math.floor(min / 10) * 10 - 20,
      maxY: Math.ceil(max / 10) * 10 + 20,
    };
  }, [filteredData]);

  const color = course === "reading" ? COURSE_COLORS.reading : COURSE_COLORS.languageUsage;

  if (data.length === 0) {
    return (
      <div className="bg-surface-elevated rounded-xl border border-border-default p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">{title}</h3>
        <div className="text-center py-8 text-text-secondary">No data available</div>
      </div>
    );
  }

  return (
    <div className="bg-surface-elevated rounded-xl border border-border-default p-6">
      <h3 className="text-lg font-semibold text-text-primary mb-4">{title}</h3>
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={filteredData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border-default" opacity={0.5} />
            <XAxis dataKey="term" tick={{ fontSize: 11 }} tickLine={false} />
            <YAxis domain={[minY, maxY]} tick={{ fontSize: 11 }} tickLine={false} width={35} />
            <Tooltip content={<SingleCourseTooltip />} />
            <Area
              type="monotone"
              dataKey="rit"
              name="Student RIT"
              stroke={color.main}
              fill={color.light}
              strokeWidth={2}
              dot={{ fill: color.main, strokeWidth: 0, r: 3 }}
              connectNulls
            />
            <Line
              type="monotone"
              dataKey="gradeAvg"
              name="Grade Avg"
              stroke={color.gradeAvg}
              strokeWidth={1.5}
              strokeDasharray="4 4"
              dot={false}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function SingleCourseTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}) {
  if (!active || !payload) return null;
  return (
    <div className="bg-surface-elevated border border-border-default rounded-lg shadow-lg p-2">
      <div className="text-xs font-medium text-text-primary mb-1">{label}</div>
      {payload.map((entry, i) => (
        entry.value != null && (
          <div key={i} className="flex items-center gap-2 text-xs">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <span className="text-text-secondary">{entry.name}:</span>
            <span className="font-medium">{Math.round(entry.value)}</span>
          </div>
        )
      ))}
    </div>
  );
}

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
  ReferenceArea,
  CartesianGrid,
} from "recharts";
import { BookOpen, Languages } from "lucide-react";
import type { ProgressHistoryPoint } from "@/lib/api/map-student-analytics";

interface StudentProgressChartsProps {
  data: ProgressHistoryPoint[];
  showPercentileBands?: boolean;
  showProjection?: boolean;
}

interface ChartDataPoint {
  term: string;
  termFull: string;
  grade: number;
  isProjection?: boolean;
  reading: number | null;
  readingGradeAvg: number | null;
  readingNorm: number | null;
  readingProjection?: number | null;
  languageUsage: number | null;
  luGradeAvg: number | null;
  luNorm: number | null;
  luProjection?: number | null;
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
 * 可選：Percentile Bands 背景、Growth Projection 虛線
 */
export function StudentProgressCharts({
  data,
  showPercentileBands = true,
  showProjection = true,
}: StudentProgressChartsProps) {
  // 轉換資料格式
  const chartData = useMemo(() => {
    const points: ChartDataPoint[] = [];

    for (const point of data) {
      points.push({
        term: point.termShort,
        termFull: point.termTested,
        grade: point.grade,
        isProjection: false,
        reading: point.reading?.rit ?? null,
        readingGradeAvg: point.reading?.gradeAvg ?? null,
        readingNorm: point.reading?.norm ?? null,
        languageUsage: point.languageUsage?.rit ?? null,
        luGradeAvg: point.languageUsage?.gradeAvg ?? null,
        luNorm: point.languageUsage?.norm ?? null,
      });
    }

    // 如果啟用 projection 且最後一筆是 Fall 資料，加入預測點
    if (showProjection && data.length > 0) {
      const lastPoint = data[data.length - 1];
      if (lastPoint && lastPoint.mapTerm === "fall") {
        // 檢查同學年是否已有 Spring
        const hasSpring = data.some(
          (p) =>
            p.mapTerm === "spring" && p.academicYear === lastPoint.academicYear
        );

        if (!hasSpring) {
          const readingProjection =
            lastPoint.reading?.rit != null &&
            lastPoint.reading?.expectedGrowth != null
              ? lastPoint.reading.rit + lastPoint.reading.expectedGrowth
              : null;

          const luProjection =
            lastPoint.languageUsage?.rit != null &&
            lastPoint.languageUsage?.expectedGrowth != null
              ? lastPoint.languageUsage.rit +
                lastPoint.languageUsage.expectedGrowth
              : null;

          if (readingProjection || luProjection) {
            // 格式化預測學期標籤
            const yearParts = lastPoint.academicYear.split("-");
            const projectionTerm = `SP${yearParts[0]?.slice(-2) ?? ""} (proj)`;

            points.push({
              term: projectionTerm,
              termFull: `Spring ${lastPoint.academicYear} (Projected)`,
              grade: lastPoint.grade,
              isProjection: true,
              reading: null,
              readingGradeAvg: null,
              readingNorm: null,
              readingProjection,
              languageUsage: null,
              luGradeAvg: null,
              luNorm: null,
              luProjection,
            });
          }
        }
      }
    }

    return points;
  }, [data, showProjection]);

  // 計算 Y 軸範圍（包含 projection）
  const { minY, maxY } = useMemo(() => {
    const allValues = chartData.flatMap((d) => [
      d.reading,
      d.readingGradeAvg,
      d.readingNorm,
      d.readingProjection,
      d.languageUsage,
      d.luGradeAvg,
      d.luNorm,
      d.luProjection,
    ]).filter((v): v is number => v !== null && v !== undefined);

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

  // 計算 Percentile Bands 的 Y 值範圍
  // 使用動態計算：基於 minY 和 maxY 等分為 5 個區間
  const percentileBandRanges = useMemo(() => {
    const range = maxY - minY;
    const bandHeight = range / 5;

    return PERCENTILE_BANDS.map((band, index) => ({
      ...band,
      y1: minY + bandHeight * index,
      y2: minY + bandHeight * (index + 1),
    }));
  }, [minY, maxY]);

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
            {/* Percentile Bands Background */}
            {showPercentileBands &&
              percentileBandRanges.map((band, index) => (
                <ReferenceArea
                  key={index}
                  y1={band.y1}
                  y2={band.y2}
                  fill={band.color}
                  fillOpacity={1}
                  ifOverflow="hidden"
                />
              ))}

            {/* Grid */}
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="currentColor"
              className="text-border-default"
              opacity={0.3}
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

            {/* Reading Projection Line (dashed) */}
            {showProjection && (
              <Line
                type="monotone"
                dataKey="readingProjection"
                name="Reading (Projected)"
                stroke={COURSE_COLORS.reading.main}
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={{ fill: COURSE_COLORS.reading.main, strokeWidth: 2, stroke: "#fff", r: 5 }}
                connectNulls
              />
            )}

            {/* Language Usage Projection Line (dashed) */}
            {showProjection && (
              <Line
                type="monotone"
                dataKey="luProjection"
                name="Language Usage (Projected)"
                stroke={COURSE_COLORS.languageUsage.main}
                strokeWidth={2}
                strokeDasharray="6 4"
                dot={{ fill: COURSE_COLORS.languageUsage.main, strokeWidth: 2, stroke: "#fff", r: 5 }}
                connectNulls
              />
            )}

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
              content={<CustomLegend latestNorms={latestNorms} hasProjection={chartData.some(d => d.isProjection)} />}
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

  // 取得完整學期名稱和投影狀態
  const termFull = (payload[0] as { payload?: { termFull?: string } })?.payload?.termFull;
  const grade = (payload[0] as { payload?: { grade?: number } })?.payload?.grade;
  const isProjection = (payload[0] as { payload?: { isProjection?: boolean } })?.payload?.isProjection;

  return (
    <div className="bg-surface-elevated border border-border-default rounded-lg shadow-lg p-3 min-w-[180px]">
      <div className="text-sm font-medium text-text-primary mb-2">
        {termFull || label} {grade && `(G${grade})`}
        {isProjection && (
          <span className="ml-1 text-xs text-amber-600 dark:text-amber-400">(Projected)</span>
        )}
      </div>
      <div className="space-y-1.5">
        {payload.map((entry, index) => {
          if (entry.value === null || entry.value === undefined) return null;

          const isProjectionData = entry.dataKey.includes("Projection");
          const displayName = isProjectionData
            ? entry.name.replace(" (Projected)", "")
            : entry.name;

          return (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full"
                  style={{
                    backgroundColor: entry.color,
                    border: isProjectionData ? "2px dashed currentColor" : "none",
                  }}
                />
                <span className="text-xs text-text-secondary">
                  {displayName}
                  {isProjectionData && " (proj)"}
                </span>
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
function CustomLegend({ latestNorms, hasProjection = false }: {
  latestNorms: { reading: number | null; languageUsage: number | null };
  hasProjection?: boolean;
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

      {/* Projection */}
      {hasProjection && (
        <div className="flex items-center gap-2">
          <div className="w-6 h-0 border-t-2 border-dashed border-amber-500" />
          <span className="text-xs text-text-secondary">Projected</span>
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

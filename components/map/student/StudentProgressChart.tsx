"use client";

import { useMemo, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceArea,
} from "recharts";
import { BookOpen, Languages } from "lucide-react";
import type { ProgressHistoryPoint } from "@/lib/api/map-student-analytics";

interface StudentProgressChartsProps {
  data: ProgressHistoryPoint[];
  showPercentileBands?: boolean;
  showProjection?: boolean;
}

interface NWEAChartDataPoint {
  term: string;
  termFull: string;
  grade: number;
  rit: number | null;
  gradeAvg: number | null;
  norm: number | null;
  projection?: number | null;
  isProjection?: boolean;
  hasData: boolean;
}

// NWEA 官方百分位色帶顏色
const NWEA_PERCENTILE_COLORS = {
  p1_20: "#ef4444",   // red-500 (1-20%)
  p21_40: "#f97316",  // orange-500 (21-40%)
  p41_60: "#eab308",  // yellow-500 (41-60%)
  p61_80: "#84cc16",  // lime-500 (61-80%)
  p81_100: "#22c55e", // green-500 (81-100%)
};

// 學生資料點顏色
const STUDENT_DATA_COLOR = "#1e3a5f"; // dark blue for student data dots

/**
 * NWEA 風格 Growth Over Time 圖表
 * 單科顯示，使用 ReferenceArea 背景色帶
 */
function NWEAStyleChart({
  data,
  course,
  title,
  icon: Icon,
  showProjection = true,
}: {
  data: ProgressHistoryPoint[];
  course: "reading" | "languageUsage";
  title: string;
  icon: React.ElementType;
  showProjection?: boolean;
}) {
  // 轉換資料格式
  const chartData = useMemo(() => {
    const points: NWEAChartDataPoint[] = [];

    for (const point of data) {
      const courseData = course === "reading" ? point.reading : point.languageUsage;

      // 格式化 X 軸標籤：Fall 25 (Gr 4)
      const termLabel = formatTermLabel(point.termTested, point.grade);

      points.push({
        term: termLabel,
        termFull: point.termTested,
        grade: point.grade,
        rit: courseData?.rit ?? null,
        gradeAvg: courseData?.gradeAvg ?? null,
        norm: courseData?.norm ?? null,
        hasData: courseData?.rit !== null && courseData?.rit !== undefined,
      });
    }

    // 如果啟用 projection 且最後一筆是 Fall 資料，加入預測點
    if (showProjection && data.length > 0) {
      const lastPoint = data[data.length - 1];
      if (lastPoint && lastPoint.mapTerm === "fall") {
        const hasSpring = data.some(
          (p) => p.mapTerm === "spring" && p.academicYear === lastPoint.academicYear
        );

        if (!hasSpring) {
          const courseData = course === "reading" ? lastPoint.reading : lastPoint.languageUsage;
          const projection =
            courseData?.rit != null && courseData?.expectedGrowth != null
              ? courseData.rit + courseData.expectedGrowth
              : null;

          if (projection) {
            const yearParts = lastPoint.academicYear.split("-");
            const springLabel = `Spring ${yearParts[1]?.slice(-2) ?? ""} (Gr ${lastPoint.grade})`;

            points.push({
              term: springLabel,
              termFull: `Spring ${lastPoint.academicYear} (Projected)`,
              grade: lastPoint.grade,
              rit: null,
              gradeAvg: null,
              norm: null,
              projection,
              isProjection: true,
              hasData: false,
            });
          }
        }
      }
    }

    return points;
  }, [data, course, showProjection]);

  // 計算 Y 軸範圍（根據實際資料）
  const { minY, maxY, bandRanges } = useMemo(() => {
    const allValues = chartData.flatMap((d) => [d.rit, d.gradeAvg, d.norm, d.projection])
      .filter((v): v is number => v !== null && v !== undefined);

    if (allValues.length === 0) {
      return {
        minY: 150,
        maxY: 250,
        bandRanges: [
          { y1: 150, y2: 170 },
          { y1: 170, y2: 190 },
          { y1: 190, y2: 210 },
          { y1: 210, y2: 230 },
          { y1: 230, y2: 250 },
        ]
      };
    }

    const min = Math.min(...allValues);
    const max = Math.max(...allValues);

    // 向下/上取整到 10 的倍數，留出一些空間
    const calcMinY = Math.floor(min / 10) * 10 - 20;
    const calcMaxY = Math.ceil(max / 10) * 10 + 20;

    // 計算每個百分位色帶的範圍（等分 5 份）
    const range = calcMaxY - calcMinY;
    const bandHeight = range / 5;

    return {
      minY: calcMinY,
      maxY: calcMaxY,
      bandRanges: [
        { y1: calcMinY, y2: calcMinY + bandHeight },                    // 1-20%
        { y1: calcMinY + bandHeight, y2: calcMinY + bandHeight * 2 },   // 21-40%
        { y1: calcMinY + bandHeight * 2, y2: calcMinY + bandHeight * 3 }, // 41-60%
        { y1: calcMinY + bandHeight * 3, y2: calcMinY + bandHeight * 4 }, // 61-80%
        { y1: calcMinY + bandHeight * 4, y2: calcMaxY },                // 81-100%
      ]
    };
  }, [chartData]);

  // 取得最新的 Norm 值
  const latestNorm = useMemo(() => {
    const lastPoint = chartData.filter(d => d.norm !== null).pop();
    return lastPoint?.norm ?? null;
  }, [chartData]);

  if (data.length === 0) {
    return (
      <div className="bg-surface-elevated rounded-xl border border-border-default p-6">
        <div className="flex items-center gap-2 mb-4">
          <Icon className="w-5 h-5 text-text-tertiary" />
          <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
        </div>
        <div className="text-center py-12 text-text-secondary">
          No assessment data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-surface-elevated rounded-xl border border-border-default p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-text-tertiary" />
          <h3 className="text-lg font-semibold text-text-primary">{title}</h3>
        </div>
        <span className="text-xs text-text-tertiary">GROWTH OVER TIME</span>
      </div>

      {/* Chart */}
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 20, left: 0, bottom: 20 }}
          >
            {/* Percentile Bands as ReferenceAreas (背景色帶) */}
            <ReferenceArea
              y1={bandRanges[0]?.y1 ?? minY}
              y2={bandRanges[0]?.y2 ?? minY}
              fill={NWEA_PERCENTILE_COLORS.p1_20}
              fillOpacity={0.85}
            />
            <ReferenceArea
              y1={bandRanges[1]?.y1 ?? minY}
              y2={bandRanges[1]?.y2 ?? minY}
              fill={NWEA_PERCENTILE_COLORS.p21_40}
              fillOpacity={0.85}
            />
            <ReferenceArea
              y1={bandRanges[2]?.y1 ?? minY}
              y2={bandRanges[2]?.y2 ?? minY}
              fill={NWEA_PERCENTILE_COLORS.p41_60}
              fillOpacity={0.85}
            />
            <ReferenceArea
              y1={bandRanges[3]?.y1 ?? minY}
              y2={bandRanges[3]?.y2 ?? minY}
              fill={NWEA_PERCENTILE_COLORS.p61_80}
              fillOpacity={0.85}
            />
            <ReferenceArea
              y1={bandRanges[4]?.y1 ?? minY}
              y2={bandRanges[4]?.y2 ?? maxY}
              fill={NWEA_PERCENTILE_COLORS.p81_100}
              fillOpacity={0.85}
            />

            {/* Grid */}
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#ffffff"
              opacity={0.4}
              vertical={true}
            />

            {/* Axes */}
            <XAxis
              dataKey="term"
              tick={{ fontSize: 11, fill: "#6b7280" }}
              tickLine={false}
              axisLine={{ stroke: "#9ca3af" }}
              interval={0}
              angle={-35}
              textAnchor="end"
              height={60}
            />
            <YAxis
              domain={[minY, maxY]}
              tick={{ fontSize: 11, fill: "#6b7280" }}
              tickLine={false}
              axisLine={{ stroke: "#9ca3af" }}
              width={40}
              label={{
                value: "RIT Score",
                angle: -90,
                position: "insideLeft",
                style: { textAnchor: "middle", fontSize: 11, fill: "#6b7280" },
              }}
            />

            {/* Tooltip */}
            <Tooltip content={<NWEATooltip />} />

            {/* Average Achievement Line (dotted black) */}
            <Line
              type="monotone"
              dataKey="norm"
              name="Average Achievement"
              stroke="#1f2937"
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={false}
              connectNulls
            />

            {/* Student RIT Score Line (dark blue dashed with dots) */}
            <Line
              type="monotone"
              dataKey="rit"
              name="Student RIT"
              stroke={STUDENT_DATA_COLOR}
              strokeWidth={2.5}
              strokeDasharray="8 4"
              dot={{
                fill: STUDENT_DATA_COLOR,
                stroke: "#fff",
                strokeWidth: 2,
                r: 6,
              }}
              activeDot={{
                fill: STUDENT_DATA_COLOR,
                stroke: "#fff",
                strokeWidth: 2,
                r: 8,
              }}
              connectNulls
            />

            {/* Projection Point (hollow dot) */}
            {showProjection && (
              <Line
                type="monotone"
                dataKey="projection"
                name="Projected"
                stroke={STUDENT_DATA_COLOR}
                strokeWidth={2}
                strokeDasharray="3 6"
                dot={{
                  fill: "#fff",
                  stroke: STUDENT_DATA_COLOR,
                  strokeWidth: 2,
                  r: 6,
                }}
                connectNulls={false}
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend - Percentile Bands */}
      <div className="mt-4 pt-3 border-t border-border-subtle">
        <div className="flex flex-wrap items-center justify-center gap-4 text-xs">
          <span className="text-text-tertiary font-medium">Percentile Bands</span>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-4 rounded" style={{ backgroundColor: NWEA_PERCENTILE_COLORS.p1_20 }} />
            <span className="text-text-secondary">1-20</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-4 rounded" style={{ backgroundColor: NWEA_PERCENTILE_COLORS.p21_40 }} />
            <span className="text-text-secondary">21-40</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-4 rounded" style={{ backgroundColor: NWEA_PERCENTILE_COLORS.p41_60 }} />
            <span className="text-text-secondary">41-60</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-4 rounded" style={{ backgroundColor: NWEA_PERCENTILE_COLORS.p61_80 }} />
            <span className="text-text-secondary">61-80</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-5 h-4 rounded" style={{ backgroundColor: NWEA_PERCENTILE_COLORS.p81_100 }} />
            <span className="text-text-secondary">81-100</span>
          </div>
        </div>
        {latestNorm && (
          <div className="flex items-center justify-center gap-2 mt-2 text-xs">
            <div className="w-8 h-0 border-t-2 border-dashed border-gray-800" />
            <span className="text-text-secondary">Average Achievement (50th %ile)</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 格式化 X 軸標籤：Fall 2024-2025 → Fall 25 (Gr 4)
 */
function formatTermLabel(termTested: string, grade: number): string {
  const match = termTested.match(/(Fall|Spring|Winter)\s+(\d{4})-(\d{4})/i);
  if (!match) return termTested;

  const [, season, , endYear] = match;
  const shortYear = endYear?.slice(-2) ?? "";

  return `${season} ${shortYear} (Gr ${grade})`;
}

/**
 * NWEA 風格 Tooltip
 */
function NWEATooltip({ active, payload }: {
  active?: boolean;
  payload?: Array<{
    name: string;
    value: number;
    dataKey: string;
    payload: NWEAChartDataPoint;
  }>;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0]?.payload;
  if (!data) return null;

  const studentRit = data.rit;
  const projection = data.projection;
  const norm = data.norm;
  const gradeAvg = data.gradeAvg;

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 min-w-[180px]">
      <div className="text-sm font-semibold text-text-primary mb-2 border-b pb-1">
        {data.termFull}
      </div>
      <div className="space-y-1.5 text-xs">
        {studentRit !== null && (
          <div className="flex justify-between">
            <span className="text-text-secondary">Student RIT:</span>
            <span className="font-bold text-text-primary">{studentRit}</span>
          </div>
        )}
        {projection != null && (
          <div className="flex justify-between">
            <span className="text-text-secondary">Projected:</span>
            <span className="font-bold text-amber-600">{Math.round(projection)}</span>
          </div>
        )}
        {gradeAvg !== null && (
          <div className="flex justify-between">
            <span className="text-text-secondary">Grade Avg:</span>
            <span className="font-medium text-text-primary">{Math.round(gradeAvg)}</span>
          </div>
        )}
        {norm !== null && (
          <div className="flex justify-between">
            <span className="text-text-secondary">NWEA Norm:</span>
            <span className="font-medium text-text-primary">{norm}</span>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 主組件：顯示 Reading 和 Language Usage 兩張圖表
 */
export function StudentProgressCharts({
  data,
  showPercentileBands = true,
  showProjection = true,
}: StudentProgressChartsProps) {
  if (data.length === 0) {
    return (
      <div className="bg-surface-elevated rounded-xl border border-border-default p-6">
        <h3 className="text-lg font-semibold text-text-primary mb-4">
          Growth Over Time
        </h3>
        <div className="text-center py-12 text-text-secondary">
          No assessment data available
        </div>
      </div>
    );
  }

  // 檢查是否有各科資料
  const hasReading = data.some(d => d.reading?.rit !== null && d.reading?.rit !== undefined);
  const hasLanguageUsage = data.some(d => d.languageUsage?.rit !== null && d.languageUsage?.rit !== undefined);

  return (
    <div className="space-y-6">
      {/* Reading Chart */}
      {hasReading && (
        <NWEAStyleChart
          data={data}
          course="reading"
          title="Reading"
          icon={BookOpen}
          showProjection={showProjection}
        />
      )}

      {/* Language Usage Chart */}
      {hasLanguageUsage && (
        <NWEAStyleChart
          data={data}
          course="languageUsage"
          title="Language Usage"
          icon={Languages}
          showProjection={showProjection}
        />
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
  return (
    <NWEAStyleChart
      data={data}
      course={course}
      title={title}
      icon={course === "reading" ? BookOpen : Languages}
      showProjection={true}
    />
  );
}

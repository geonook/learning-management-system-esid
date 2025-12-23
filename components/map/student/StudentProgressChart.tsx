"use client";

import { useMemo } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  LabelList,
  Cell,
  Legend,
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
  levelAvg: number | null;
  norm: number | null;
  projection?: number | null;
  isProjection?: boolean;
  hasData: boolean;
  // 額外資料用於表格
  percentile?: number | null;  // 使用 mid 值或官方值
  growth?: number | null;
}

// NWEA 官方配色
const NWEA_COLORS = {
  studentRit: "#4472C4",   // 藍色 - Student RIT
  levelMean: "#FFC000",    // 黃色 - Level Mean
  norm: "#1F3864",         // 深藍色 - Norm
  projection: "#4472C4",   // 預測用同色但斜線填充
  gridLine: "#e5e7eb",
};

/**
 * 斜線填充 Pattern（用於 Projection）
 */
function DiagonalPattern() {
  return (
    <defs>
      <pattern
        id="projection-pattern"
        patternUnits="userSpaceOnUse"
        width="8"
        height="8"
        patternTransform="rotate(45)"
      >
        <rect width="8" height="8" fill={NWEA_COLORS.studentRit} fillOpacity={0.3} />
        <line
          x1="0"
          y1="0"
          x2="0"
          y2="8"
          stroke={NWEA_COLORS.studentRit}
          strokeWidth="4"
        />
      </pattern>
    </defs>
  );
}

/**
 * NWEA 風格柱狀圖 - 單科
 */
function NWEABarChart({
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
  const { chartData, tableData } = useMemo(() => {
    const points: NWEAChartDataPoint[] = [];

    for (const point of data) {
      const courseData = course === "reading" ? point.reading : point.languageUsage;
      if (!courseData) continue;

      // 格式化 X 軸標籤：FA25 (G4)
      const termLabel = formatTermLabel(point.termTested, point.grade);

      // 優先使用官方 percentile，否則使用 range 的 mid 值
      const displayPercentile = courseData.officialPercentile
        ?? courseData.percentile?.mid
        ?? null;

      points.push({
        term: termLabel,
        termFull: formatTermLabelFull(point.termTested, point.grade),
        grade: point.grade,
        rit: courseData.rit ?? null,
        levelAvg: courseData.gradeAvg ?? null,
        norm: courseData.norm ?? null,
        hasData: courseData.rit !== null && courseData.rit !== undefined,
        percentile: displayPercentile,
        growth: null, // 計算 growth 需前後比較
      });
    }

    // 計算 growth（相鄰資料點之間的差異）
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      if (prev?.rit !== null && curr?.rit !== null && prev && curr) {
        curr.growth = curr.rit - prev.rit;
      }
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
            const springLabel = `SP${yearParts[1]?.slice(-2) ?? ""} (G${lastPoint.grade})`;

            points.push({
              term: springLabel,
              termFull: `Spring ${lastPoint.academicYear} (Projected)`,
              grade: lastPoint.grade,
              rit: null,
              levelAvg: null,
              norm: null,
              projection: Math.round(projection),
              isProjection: true,
              hasData: false,
              percentile: null,
              growth: courseData?.expectedGrowth ?? null,
            });
          }
        }
      }
    }

    return { chartData: points, tableData: points };
  }, [data, course, showProjection]);

  // 計算 Y 軸範圍
  const { minY, maxY } = useMemo(() => {
    const allValues = chartData.flatMap((d) => [d.rit, d.levelAvg, d.norm, d.projection])
      .filter((v): v is number => v !== null && v !== undefined);

    if (allValues.length === 0) {
      return { minY: 150, maxY: 250 };
    }

    const min = Math.min(...allValues);
    const max = Math.max(...allValues);

    // 留出適當空間給 LabelList
    const calcMinY = Math.floor((min - 15) / 10) * 10;
    const calcMaxY = Math.ceil((max + 15) / 10) * 10;

    return { minY: calcMinY, maxY: calcMaxY };
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
        <span className="text-xs text-text-tertiary uppercase tracking-wide">Growth Over Time</span>
      </div>

      {/* Chart + Table Layout */}
      <div className="flex flex-col lg:flex-row gap-6">
        {/* Chart */}
        <div className="flex-1 h-72 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={chartData}
              margin={{ top: 20, right: 20, left: 0, bottom: 20 }}
              barCategoryGap="20%"
            >
              <DiagonalPattern />

              <CartesianGrid
                strokeDasharray="3 3"
                stroke={NWEA_COLORS.gridLine}
                vertical={false}
              />

              <XAxis
                dataKey="term"
                tick={{ fontSize: 11, fill: "#6b7280" }}
                tickLine={false}
                axisLine={{ stroke: "#d1d5db" }}
                interval={0}
              />
              <YAxis
                domain={[minY, maxY]}
                tick={{ fontSize: 11, fill: "#6b7280" }}
                tickLine={false}
                axisLine={{ stroke: "#d1d5db" }}
                width={45}
                label={{
                  value: "RIT Score",
                  angle: -90,
                  position: "insideLeft",
                  style: { textAnchor: "middle", fontSize: 11, fill: "#6b7280" },
                }}
              />

              <Tooltip content={<NWEABarTooltip />} />

              {/* Student RIT Bar */}
              <Bar
                dataKey="rit"
                name="Student RIT"
                fill={NWEA_COLORS.studentRit}
                radius={[4, 4, 0, 0]}
                maxBarSize={35}
              >
                <LabelList
                  dataKey="rit"
                  position="top"
                  fill="#374151"
                  fontSize={10}
                  fontWeight={600}
                />
              </Bar>

              {/* Level Average Bar */}
              <Bar
                dataKey="levelAvg"
                name="Level Avg"
                fill={NWEA_COLORS.levelMean}
                radius={[4, 4, 0, 0]}
                maxBarSize={35}
              >
                <LabelList
                  dataKey="levelAvg"
                  position="top"
                  fill="#374151"
                  fontSize={10}
                  formatter={(value: number | null) => value ? Math.round(value) : ""}
                />
              </Bar>

              {/* NWEA Norm Bar */}
              <Bar
                dataKey="norm"
                name="NWEA Norm"
                fill={NWEA_COLORS.norm}
                radius={[4, 4, 0, 0]}
                maxBarSize={35}
              >
                <LabelList
                  dataKey="norm"
                  position="top"
                  fill="#374151"
                  fontSize={10}
                />
              </Bar>

              {/* Projection Bar (with pattern) */}
              <Bar
                dataKey="projection"
                name="Projected"
                radius={[4, 4, 0, 0]}
                maxBarSize={35}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`projection-${index}`}
                    fill={entry.isProjection ? "url(#projection-pattern)" : "transparent"}
                    stroke={entry.isProjection ? NWEA_COLORS.studentRit : "none"}
                    strokeWidth={entry.isProjection ? 1 : 0}
                  />
                ))}
                <LabelList
                  dataKey="projection"
                  position="top"
                  fill="#374151"
                  fontSize={10}
                  fontWeight={600}
                />
              </Bar>

              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value: string) => (
                  <span className="text-xs text-text-secondary">{value}</span>
                )}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Data Table (Right Side) */}
        <div className="lg:w-72 flex-shrink-0">
          <div className="bg-surface-secondary rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-surface-tertiary text-text-secondary">
                  <th className="px-2 py-2 text-left font-medium">Term</th>
                  <th className="px-2 py-2 text-right font-medium">RIT</th>
                  <th className="px-2 py-2 text-right font-medium">Growth</th>
                  <th className="px-2 py-2 text-right font-medium">%ile</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {tableData.map((row, idx) => (
                  <tr
                    key={idx}
                    className={row.isProjection ? "bg-amber-50 dark:bg-amber-900/10" : ""}
                  >
                    <td className="px-2 py-1.5 text-text-primary font-medium">
                      {row.term}
                      {row.isProjection && (
                        <span className="ml-1 text-amber-600 text-[10px]">(proj)</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-right text-text-primary font-semibold">
                      {row.isProjection ? row.projection : row.rit ?? "-"}
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      {row.growth != null ? (
                        <span className={row.growth >= 0 ? "text-green-600" : "text-red-600"}>
                          {row.growth >= 0 ? "+" : ""}{row.growth}
                        </span>
                      ) : (
                        <span className="text-text-tertiary">-</span>
                      )}
                    </td>
                    <td className="px-2 py-1.5 text-right text-text-secondary">
                      {row.percentile ?? "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * 格式化 X 軸標籤：Fall 2024-2025 → FA25 (G4)
 */
function formatTermLabel(termTested: string, grade: number): string {
  const match = termTested.match(/(Fall|Spring|Winter)\s+(\d{4})-(\d{4})/i);
  if (!match) return termTested;

  const [, season, , endYear] = match;
  const shortYear = endYear?.slice(-2) ?? "";

  // Fall → FA, Spring → SP, Winter → WI
  const seasonAbbr = season?.toLowerCase() === "fall" ? "FA"
    : season?.toLowerCase() === "spring" ? "SP"
    : "WI";

  return `${seasonAbbr}${shortYear} (G${grade})`;
}

/**
 * 格式化完整標籤（用於 tooltip）
 */
function formatTermLabelFull(termTested: string, grade: number): string {
  const match = termTested.match(/(Fall|Spring|Winter)\s+(\d{4})-(\d{4})/i);
  if (!match) return termTested;

  const [, season, startYear, endYear] = match;
  return `${season} ${startYear}-${endYear} (Grade ${grade})`;
}

/**
 * 柱狀圖 Tooltip
 */
function NWEABarTooltip({ active, payload }: {
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

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg p-3 min-w-[180px]">
      <div className="text-sm font-semibold text-text-primary mb-2 border-b pb-1">
        {data.termFull}
      </div>
      <div className="space-y-1.5 text-xs">
        {data.rit !== null && (
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: NWEA_COLORS.studentRit }} />
              <span className="text-text-secondary">Student RIT:</span>
            </div>
            <span className="font-bold text-text-primary">{data.rit}</span>
          </div>
        )}
        {data.projection !== null && (
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm border border-blue-500 bg-blue-100" />
              <span className="text-text-secondary">Projected:</span>
            </div>
            <span className="font-bold text-amber-600">{data.projection}</span>
          </div>
        )}
        {data.levelAvg !== null && (
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: NWEA_COLORS.levelMean }} />
              <span className="text-text-secondary">Level Avg:</span>
            </div>
            <span className="font-medium text-text-primary">{Math.round(data.levelAvg)}</span>
          </div>
        )}
        {data.norm !== null && (
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: NWEA_COLORS.norm }} />
              <span className="text-text-secondary">NWEA Norm:</span>
            </div>
            <span className="font-medium text-text-primary">{data.norm}</span>
          </div>
        )}
        {data.percentile !== null && (
          <div className="flex justify-between border-t pt-1.5 mt-1">
            <span className="text-text-secondary">Percentile:</span>
            <span className="font-medium text-text-primary">{data.percentile}th</span>
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
        <NWEABarChart
          data={data}
          course="reading"
          title="Reading"
          icon={BookOpen}
          showProjection={showProjection}
        />
      )}

      {/* Language Usage Chart */}
      {hasLanguageUsage && (
        <NWEABarChart
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
    <NWEABarChart
      data={data}
      course={course}
      title={title}
      icon={course === "reading" ? BookOpen : Languages}
      showProjection={true}
    />
  );
}

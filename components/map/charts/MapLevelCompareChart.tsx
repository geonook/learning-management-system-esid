"use client";

/**
 * MAP Level Compare Chart (v1.65.0)
 *
 * 學期間比較柱狀圖 - 用於比較同一學年 Fall vs Spring 各 Level 的表現
 *
 * X-axis: Level (G3E1, G3E2, G3E3, All G3)
 * Y-axis: RIT Score
 * Bars: Fall (橙色) vs Spring (藍色)
 *
 * 根據 Cleveland & McGill (1984) 視覺感知研究，
 * 柱狀圖的位置編碼比折線圖的斜率編碼更適合類別間的數值比較。
 */

import { useMemo, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
  LabelList,
} from "recharts";
import type { MapAnalyticsChartData } from "@/lib/api/map-analytics";
import { TERM_COMPARE_COLORS, NWEA_COLORS } from "@/lib/map/colors";
import { calculateYAxisRange, formatTermStats } from "@/lib/map/utils";
import {
  getNorm,
  getNormAverage,
  parseTermTested,
  type Course,
} from "@/lib/map/norms";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface MapLevelCompareChartProps {
  data: MapAnalyticsChartData;
  showNorm?: boolean;
  height?: number;
}

interface LevelCompareDataPoint {
  level: string;
  levelLabel: string;
  fall: number | null;
  spring: number | null;
  growth: number | null;
}

interface AcademicYearOption {
  value: string;
  label: string;
  fallTerm: string | null;
  springTerm: string | null;
}

/**
 * 從 terms 中提取學年選項
 */
function extractAcademicYears(terms: string[]): AcademicYearOption[] {
  const yearMap = new Map<string, { fall: string | null; spring: string | null }>();

  terms.forEach((term) => {
    const parsed = parseTermTested(term);
    if (!parsed) return;

    const year = parsed.academicYear;
    if (!yearMap.has(year)) {
      yearMap.set(year, { fall: null, spring: null });
    }

    const entry = yearMap.get(year)!;
    if (parsed.mapTerm === "fall") {
      entry.fall = term;
    } else if (parsed.mapTerm === "spring") {
      entry.spring = term;
    }
  });

  // 轉換為選項陣列，按學年降序排列
  return Array.from(yearMap.entries())
    .map(([year, { fall, spring }]) => ({
      value: year,
      label: year,
      fallTerm: fall,
      springTerm: spring,
    }))
    .sort((a, b) => b.value.localeCompare(a.value));
}

/**
 * 自定義標籤渲染
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function renderBarLabel(props: any, customFill: string) {
  const x = typeof props.x === "number" ? props.x : 0;
  const y = typeof props.y === "number" ? props.y : 0;
  const width = typeof props.width === "number" ? props.width : 0;
  const value = typeof props.value === "number" ? props.value : null;

  if (value === null) return null;

  return (
    <text
      x={x + width / 2}
      y={y - 5}
      fill={customFill}
      textAnchor="middle"
      fontSize={10}
      fontWeight={500}
    >
      {value.toFixed(1)}
    </text>
  );
}

export function MapLevelCompareChart({
  data,
  showNorm = true,
  height = 300,
}: MapLevelCompareChartProps) {
  // 提取學年選項
  const academicYears = useMemo(
    () => extractAcademicYears(data.terms),
    [data.terms]
  );

  // 選擇的學年（預設最新）
  const [selectedYear, setSelectedYear] = useState<string>(
    academicYears[0]?.value || ""
  );

  // 取得選中學年的 Fall/Spring term
  const selectedYearData = useMemo(
    () => academicYears.find((y) => y.value === selectedYear),
    [academicYears, selectedYear]
  );

  // 檢查是否有 Fall 和 Spring 資料
  const hasBothTerms = Boolean(
    selectedYearData?.fallTerm && selectedYearData?.springTerm
  );

  // 轉換資料為 Level Compare 格式
  const chartData = useMemo<LevelCompareDataPoint[]>(() => {
    if (!selectedYearData) return [];

    const fallIdx = selectedYearData.fallTerm
      ? data.terms.indexOf(selectedYearData.fallTerm)
      : -1;
    const springIdx = selectedYearData.springTerm
      ? data.terms.indexOf(selectedYearData.springTerm)
      : -1;

    return data.data.map((levelData) => {
      const fallScore = fallIdx >= 0 ? (levelData.scores[fallIdx] ?? null) : null;
      const springScore = springIdx >= 0 ? (levelData.scores[springIdx] ?? null) : null;
      const growth =
        fallScore !== null && springScore !== null
          ? springScore - fallScore
          : null;

      return {
        level: levelData.level,
        levelLabel:
          levelData.level === "All"
            ? `All G${data.grade}`
            : `G${data.grade}${levelData.level}`,
        fall: fallScore,
        spring: springScore,
        growth,
      };
    });
  }, [data, selectedYearData]);

  // 計算 Y 軸範圍
  const { minY: yMin, maxY: yMax } = useMemo(() => {
    const allScores = chartData.flatMap((d) => [d.fall, d.spring]).filter(
      (v): v is number => v !== null
    );
    return calculateYAxisRange(allScores, {
      minFloor: 100,
      minPadding: 10,
      maxPadding: 20, // 多留空間給標籤
    });
  }, [chartData]);

  // 取得 Norm 值（使用 Spring term）
  const getNormValue = (): number | null => {
    if (!selectedYearData?.springTerm) return null;
    const parsed = parseTermTested(selectedYearData.springTerm);
    if (!parsed) return null;

    if (data.course === "Average") {
      return getNormAverage(parsed.academicYear, data.grade, parsed.mapTerm);
    }
    return getNorm(
      parsed.academicYear,
      data.grade,
      parsed.mapTerm,
      data.course as Course
    );
  };

  const normValue = showNorm ? getNormValue() : null;

  // Course 標題
  const courseTitle =
    data.course === "Language Usage"
      ? "Language Usage"
      : data.course === "Reading"
        ? "Reading"
        : "Average";

  // 若無資料
  if (chartData.length === 0 || academicYears.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        No data available for level comparison
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* 標題與學年選擇器 */}
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium">
          G{data.grade} MAP {courseTitle}
        </h4>
        {academicYears.length > 1 && (
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-[120px] h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {academicYears.map((year) => (
                <SelectItem key={year.value} value={year.value}>
                  {year.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* 圖表 */}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 10, bottom: 5 }}
          barGap={2}
          barCategoryGap="20%"
        >
          <CartesianGrid strokeDasharray="3 3" stroke={NWEA_COLORS.gridLine} />
          <XAxis
            dataKey="levelLabel"
            tick={{ fontSize: 12 }}
            className="text-muted-foreground"
          />
          <YAxis
            domain={[yMin, yMax]}
            tick={{ fontSize: 12 }}
            className="text-muted-foreground"
            width={40}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload || payload.length === 0) return null;
              const fallData = payload.find((p) => p.dataKey === "fall");
              const springData = payload.find((p) => p.dataKey === "spring");
              const point = chartData.find((d) => d.levelLabel === label);

              return (
                <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                  <p className="font-medium text-sm mb-2">{label}</p>
                  <div className="space-y-1">
                    {fallData?.value !== null && fallData?.value !== undefined && (
                      <div className="flex items-center gap-2 text-xs">
                        <span
                          className="w-2 h-2 rounded-sm"
                          style={{
                            backgroundColor: TERM_COMPARE_COLORS.fall.fill,
                          }}
                        />
                        <span className="text-muted-foreground">Fall:</span>
                        <span className="font-mono font-medium">
                          {typeof fallData.value === "number"
                            ? fallData.value.toFixed(1)
                            : "N/A"}
                        </span>
                      </div>
                    )}
                    {springData?.value !== null &&
                      springData?.value !== undefined && (
                        <div className="flex items-center gap-2 text-xs">
                          <span
                            className="w-2 h-2 rounded-sm"
                            style={{
                              backgroundColor: TERM_COMPARE_COLORS.spring.fill,
                            }}
                          />
                          <span className="text-muted-foreground">Spring:</span>
                          <span className="font-mono font-medium">
                            {typeof springData.value === "number"
                              ? springData.value.toFixed(1)
                              : "N/A"}
                          </span>
                        </div>
                      )}
                    {point?.growth !== null && point?.growth !== undefined && (
                      <div className="flex items-center gap-2 text-xs pt-1 border-t border-border mt-1">
                        <span className="text-muted-foreground">Growth:</span>
                        <span
                          className={`font-mono font-medium ${
                            point.growth >= 0
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {point.growth >= 0 ? "+" : ""}
                          {point.growth.toFixed(1)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            }}
          />

          {/* Fall 柱狀圖 */}
          <Bar
            dataKey="fall"
            name="Fall"
            fill={TERM_COMPARE_COLORS.fall.fill}
            radius={[4, 4, 0, 0]}
          >
            <LabelList
              dataKey="fall"
              position="top"
              content={(props) =>
                renderBarLabel(props, TERM_COMPARE_COLORS.fall.stroke)
              }
            />
          </Bar>

          {/* Spring 柱狀圖 */}
          <Bar
            dataKey="spring"
            name="Spring"
            fill={TERM_COMPARE_COLORS.spring.fill}
            radius={[4, 4, 0, 0]}
          >
            <LabelList
              dataKey="spring"
              position="top"
              content={(props) =>
                renderBarLabel(props, TERM_COMPARE_COLORS.spring.stroke)
              }
            />
          </Bar>

          {/* Norm 參考線 */}
          {showNorm && normValue !== null && (
            <ReferenceLine
              y={normValue}
              stroke={NWEA_COLORS.norm}
              strokeDasharray="5 5"
              strokeWidth={1.5}
            />
          )}
        </BarChart>
      </ResponsiveContainer>

      {/* 圖例 */}
      <div className="mt-2 flex items-center justify-center gap-6 text-xs">
        <div className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: TERM_COMPARE_COLORS.fall.fill }}
          />
          <span>Fall</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-sm"
            style={{ backgroundColor: TERM_COMPARE_COLORS.spring.fill }}
          />
          <span>Spring</span>
        </div>
        {showNorm && normValue !== null && (
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <span className="inline-block w-4 border-t-2 border-dashed border-gray-400" />
            <span>Norm: {normValue.toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* 成長摘要 */}
      {hasBothTerms && (
        <div className="mt-3 pt-2 border-t border-border">
          <div className="flex items-center justify-center gap-4 text-xs">
            {chartData.map((d) => (
              <div key={d.level} className="text-center">
                <span className="text-muted-foreground">{d.levelLabel}</span>
                {d.growth !== null && (
                  <span
                    className={`ml-1 font-medium ${
                      d.growth >= 0
                        ? "text-green-600 dark:text-green-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {d.growth >= 0 ? "+" : ""}
                    {d.growth.toFixed(1)}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 單學期警告 */}
      {!hasBothTerms && (
        <p className="mt-2 text-xs text-muted-foreground text-center">
          {selectedYearData?.fallTerm && !selectedYearData?.springTerm
            ? "Spring term data not yet available"
            : "Fall term data not available"}
        </p>
      )}
    </div>
  );
}

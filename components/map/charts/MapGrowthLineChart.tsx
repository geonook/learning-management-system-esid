"use client";

/**
 * MAP Growth Line Chart (v1.61.0)
 *
 * 顯示多學期的成長趨勢折線圖，採用雙面板佈局
 * - 左側：折線圖（X 軸: English Level，Y 軸: RIT Score）
 * - 右側：數據表格
 *
 * 使用統一的配色系統和格式函數
 */

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { MapAnalyticsChartData } from "@/lib/api/map-analytics";
import { getNorm, getNormAverage, parseTermTested, type Course } from "@/lib/map/norms";
import { TERM_SEQUENCE_COLORS, NWEA_COLORS } from "@/lib/map/colors";
import { formatTermStats, calculateYAxisRange, CHART_EXPLANATIONS } from "@/lib/map/utils";

interface MapGrowthLineChartProps {
  data: MapAnalyticsChartData;
  showNorm?: boolean;
  showTable?: boolean;
  height?: number;
}

export function MapGrowthLineChart({
  data,
  showNorm = true,
  showTable = true,
  height = 300,
}: MapGrowthLineChartProps) {
  if (!data || data.terms.length === 0 || data.data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        No data available
      </div>
    );
  }

  // 轉換資料格式為 recharts 需要的格式
  const chartData = useMemo(() => {
    return data.data.map((levelData) => {
      const row: Record<string, string | number | null> = {
        level: levelData.level === "All" ? `All G${data.grade}` : `G${data.grade}${levelData.level}`,
        levelShort: levelData.level,
      };
      data.terms.forEach((term, idx) => {
        row[term] = levelData.scores[idx] ?? null;
      });
      return row;
    });
  }, [data]);

  // 計算 Y 軸範圍（使用共用函數）
  const { minY: yMin, maxY: yMax } = useMemo(() => {
    const allScores = data.data.flatMap((d) => d.scores);
    return calculateYAxisRange(allScores, { minFloor: 100, minPadding: 10, maxPadding: 10 });
  }, [data]);

  // 取得常模值（用於 Reference Line）
  const getNormValue = (term: string): number | null => {
    const parsed = parseTermTested(term);
    if (!parsed) return null;

    if (data.course === "Average") {
      return getNormAverage(parsed.academicYear, data.grade, parsed.mapTerm);
    }
    return getNorm(parsed.academicYear, data.grade, parsed.mapTerm, data.course as Course);
  };

  // 課程標題
  const courseTitle =
    data.course === "Language Usage"
      ? "Language Usage"
      : data.course === "Reading"
        ? "Reading"
        : "Average";

  // 準備表格資料
  const tableData = useMemo(() => {
    return data.terms.map((term, termIdx) => ({
      term,
      termShort: formatTermStats(term),
      scores: data.data.map((levelData) => ({
        level: levelData.level,
        score: levelData.scores[termIdx] ?? null,
      })),
    }));
  }, [data]);

  // 取得常模值用於表格
  const latestNorm = useMemo(() => {
    if (data.terms.length === 0) return null;
    const latestTerm = data.terms[data.terms.length - 1];
    return latestTerm ? getNormValue(latestTerm) : null;
  }, [data.terms]);

  return (
    <div className="w-full">
      <h4 className="text-sm font-medium mb-3 text-center">
        G{data.grade} MAP {courseTitle}
      </h4>

      {/* 雙面板佈局：圖表 + 表格 */}
      <div className={`flex flex-col ${showTable ? "lg:flex-row" : ""} gap-4`}>
        {/* 左側：折線圖 */}
        <div className={showTable ? "flex-1 min-w-0" : "w-full"}>
          <ResponsiveContainer width="100%" height={height}>
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={NWEA_COLORS.gridLine}
              />
              <XAxis
                dataKey="level"
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <YAxis
                domain={[yMin, yMax]}
                tick={{ fontSize: 12 }}
                className="text-muted-foreground"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--popover))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "6px",
                }}
                labelStyle={{ color: "hsl(var(--popover-foreground))" }}
                formatter={(value) =>
                  value !== null && typeof value === "number" ? [value.toFixed(1), "RIT"] : ["N/A", "RIT"]
                }
              />
              <Legend
                formatter={(value) => formatTermStats(value)}
                wrapperStyle={{ fontSize: "12px" }}
              />

              {/* 繪製每個學期的線 */}
              {data.terms.map((term, idx) => (
                <Line
                  key={term}
                  type="monotone"
                  dataKey={term}
                  name={term}
                  stroke={TERM_SEQUENCE_COLORS[idx % TERM_SEQUENCE_COLORS.length]?.stroke}
                  strokeWidth={2}
                  dot={{
                    fill: TERM_SEQUENCE_COLORS[idx % TERM_SEQUENCE_COLORS.length]?.color,
                    strokeWidth: 2,
                    r: 4,
                  }}
                  activeDot={{ r: 6 }}
                  connectNulls
                />
              ))}

              {/* 常模參考線（僅顯示最新學期的常模） */}
              {showNorm && latestNorm !== null && (
                <ReferenceLine
                  y={latestNorm}
                  stroke={NWEA_COLORS.norm}
                  strokeDasharray="5 5"
                  label={{
                    value: `Norm ${latestNorm}`,
                    position: "right",
                    fontSize: 10,
                    fill: NWEA_COLORS.norm,
                  }}
                />
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* 右側：數據表格 */}
        {showTable && (
          <div className="lg:w-64 flex-shrink-0">
            <div className="border border-border rounded-lg overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="px-2 py-1.5 text-left font-medium">Term</th>
                    {data.data.map((levelData) => (
                      <th
                        key={levelData.level}
                        className="px-2 py-1.5 text-right font-medium"
                      >
                        {levelData.level}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tableData.map((row, rowIdx) => (
                    <tr
                      key={row.term}
                      className={rowIdx % 2 === 0 ? "bg-background" : "bg-muted/30"}
                    >
                      <td className="px-2 py-1.5 font-medium">
                        <span
                          className="inline-block w-2 h-2 rounded-full mr-1.5"
                          style={{
                            backgroundColor:
                              TERM_SEQUENCE_COLORS[rowIdx % TERM_SEQUENCE_COLORS.length]?.color,
                          }}
                        />
                        {row.termShort}
                      </td>
                      {row.scores.map((scoreData) => (
                        <td
                          key={scoreData.level}
                          className="px-2 py-1.5 text-right"
                        >
                          {scoreData.score !== null ? (
                            <span
                              className={
                                latestNorm !== null && scoreData.score >= latestNorm
                                  ? "text-green-600 dark:text-green-400"
                                  : latestNorm !== null
                                    ? "text-amber-600 dark:text-amber-400"
                                    : ""
                              }
                            >
                              {scoreData.score.toFixed(1)}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  ))}
                  {/* Norm 行 */}
                  {showNorm && latestNorm !== null && (
                    <tr className="border-t border-border bg-muted/50">
                      <td className="px-2 py-1.5 font-medium text-muted-foreground">
                        Norm
                      </td>
                      {data.data.map((levelData) => (
                        <td
                          key={levelData.level}
                          className="px-2 py-1.5 text-right text-muted-foreground"
                        >
                          {latestNorm.toFixed(1)}
                        </td>
                      ))}
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* 解釋文字 */}
      <div className="mt-4 pt-3 border-t border-border text-xs text-muted-foreground">
        <p>{CHART_EXPLANATIONS.growthTrend.zh}</p>
      </div>
    </div>
  );
}

"use client";

/**
 * MAP Growth Line Chart
 *
 * 顯示多學期的成長趨勢折線圖
 * X 軸: English Level (E1, E2, E3, All)
 * Y 軸: RIT Score
 * 多條線: 每個學期一條
 */

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

// 學期顏色配置
const TERM_COLORS = [
  { color: "#f97316", stroke: "#f97316" }, // Fall 24-25: 橙色
  { color: "#3b82f6", stroke: "#3b82f6" }, // Spring 24-25: 藍色
  { color: "#22c55e", stroke: "#22c55e" }, // Fall 25-26: 綠色
  { color: "#a855f7", stroke: "#a855f7" }, // Spring 25-26: 紫色
  { color: "#ec4899", stroke: "#ec4899" }, // 未來: 粉紅色
];

interface MapGrowthLineChartProps {
  data: MapAnalyticsChartData;
  showNorm?: boolean;
  height?: number;
}

export function MapGrowthLineChart({
  data,
  showNorm = true,
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
  // { level: 'E1', 'Fall 2024-2025': 207.76, 'Spring 2024-2025': 210.22, ... }
  const chartData = data.data.map((levelData) => {
    const row: Record<string, string | number | null> = {
      level: levelData.level === "All" ? `All G${data.grade}` : `G${data.grade}${levelData.level}`,
    };
    data.terms.forEach((term, idx) => {
      row[term] = levelData.scores[idx] ?? null;
    });
    return row;
  });

  // 計算 Y 軸範圍
  const allScores = data.data.flatMap((d) => d.scores.filter((s): s is number => s !== null));
  const minScore = Math.min(...allScores);
  const maxScore = Math.max(...allScores);
  const yMin = Math.floor((minScore - 10) / 10) * 10;
  const yMax = Math.ceil((maxScore + 10) / 10) * 10;

  // 取得常模值（用於 Reference Line）
  const getNormValue = (term: string): number | null => {
    const parsed = parseTermTested(term);
    if (!parsed) return null;

    if (data.course === "Average") {
      return getNormAverage(parsed.academicYear, data.grade, parsed.mapTerm);
    }
    return getNorm(parsed.academicYear, data.grade, parsed.mapTerm, data.course as Course);
  };

  // 格式化學期標籤
  const formatTermLabel = (term: string): string => {
    const match = term.match(/^(Fall|Spring)\s+(\d{4})-(\d{4})$/);
    if (!match) return term;
    const season = match[1] === "Fall" ? "F" : "S";
    const year = match[2]?.slice(2);
    return `${season}${year}`;
  };

  // 課程標題
  const courseTitle =
    data.course === "Language Usage"
      ? "Language Usage"
      : data.course === "Reading"
        ? "Reading"
        : "Average";

  return (
    <div className="w-full">
      <h4 className="text-sm font-medium mb-2 text-center">
        G{data.grade} MAP {courseTitle}
      </h4>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
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
          />
          <Legend
            formatter={(value) => formatTermLabel(value)}
            wrapperStyle={{ fontSize: "12px" }}
          />

          {/* 繪製每個學期的線 */}
          {data.terms.map((term, idx) => (
            <Line
              key={term}
              type="monotone"
              dataKey={term}
              name={term}
              stroke={TERM_COLORS[idx % TERM_COLORS.length]?.stroke}
              strokeWidth={2}
              dot={{
                fill: TERM_COLORS[idx % TERM_COLORS.length]?.color,
                strokeWidth: 2,
                r: 4,
              }}
              activeDot={{ r: 6 }}
              connectNulls
            />
          ))}

          {/* 常模參考線（僅顯示最新學期的常模） */}
          {showNorm && data.terms.length > 0 && (
            <>
              {(() => {
                const latestTerm = data.terms[data.terms.length - 1];
                const normValue = latestTerm ? getNormValue(latestTerm) : null;
                if (normValue === null) return null;
                return (
                  <ReferenceLine
                    y={normValue}
                    stroke="#9ca3af"
                    strokeDasharray="5 5"
                    label={{
                      value: `Norm ${normValue}`,
                      position: "right",
                      fontSize: 10,
                      fill: "#9ca3af",
                    }}
                  />
                );
              })()}
            </>
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

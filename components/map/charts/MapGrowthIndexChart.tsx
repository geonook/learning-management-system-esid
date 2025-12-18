"use client";

/**
 * MAP Growth Index Bar Chart
 *
 * 顯示各 English Level (E1/E2/E3/All) 的 Growth Index
 * 左右對稱顯示 Language Usage 和 Reading
 * Growth Index > 1.0 綠色，= 1.0 藍色，< 1.0 紅色
 * 有虛線參考線在 1.0 位置
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Cell,
} from "recharts";
import type { GrowthAnalysisData } from "@/lib/api/map-analytics";

interface MapGrowthIndexChartProps {
  data: GrowthAnalysisData | null;
  height?: number;
}

// Growth Index 顏色判斷
const getGrowthIndexColor = (index: number | null): string => {
  if (index === null) return "#94a3b8"; // gray for null
  if (index > 1.0) return "#22c55e"; // green
  if (index === 1.0) return "#3b82f6"; // blue
  return "#ef4444"; // red
};

export function MapGrowthIndexChart({
  data,
  height = 300,
}: MapGrowthIndexChartProps) {
  if (!data) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        No growth data available
      </div>
    );
  }

  // 轉換資料格式為 recharts 需要的格式
  // { level: 'E1', languageUsage: 1.2, reading: 0.9 }
  const chartData = data.byLevel.map((levelData) => ({
    level: levelData.englishLevel === "All" ? `All G${data.grade}` : `G${data.grade}${levelData.englishLevel}`,
    languageUsage: levelData.languageUsage.growthIndex,
    reading: levelData.reading.growthIndex,
    // 保留顏色資訊
    luColor: getGrowthIndexColor(levelData.languageUsage.growthIndex),
    rdColor: getGrowthIndexColor(levelData.reading.growthIndex),
  }));

  // 計算 Y 軸範圍
  const allIndices = data.byLevel.flatMap((d) => [
    d.languageUsage.growthIndex,
    d.reading.growthIndex,
  ]).filter((i): i is number => i !== null);

  const maxIndex = Math.max(...allIndices, 1.5);
  const minIndex = Math.min(...allIndices, 0);
  const yMax = Math.ceil(maxIndex * 10) / 10;
  const yMin = Math.floor(minIndex * 10) / 10;

  // 自訂 Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div
          className="bg-popover border border-border rounded-md p-2 text-sm"
          style={{ backgroundColor: "hsl(var(--popover))" }}
        >
          <p className="font-medium text-popover-foreground mb-1">{label}</p>
          {payload.map((entry: any) => {
            const value = entry.value;
            const name = entry.name === "languageUsage" ? "Language Usage" : "Reading";
            const status =
              value > 1.0 ? "Above Expected" : value === 1.0 ? "On Target" : "Below Expected";
            return (
              <p key={entry.dataKey} style={{ color: entry.fill }}>
                {name}: {value !== null ? value.toFixed(2) : "N/A"} ({status})
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="w-full">
      <h4 className="text-sm font-medium mb-1 text-center">
        G{data.grade} Growth Index ({data.academicYear})
      </h4>
      <p className="text-xs text-muted-foreground text-center mb-2">
        Actual Growth ÷ Expected Growth (1.0 = on target)
      </p>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
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
            label={{
              value: "Growth Index",
              angle: -90,
              position: "insideLeft",
              style: { fontSize: 12, fill: "hsl(var(--muted-foreground))" },
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            formatter={(value) =>
              value === "languageUsage" ? "Language Usage" : "Reading"
            }
            wrapperStyle={{ fontSize: "12px" }}
          />

          {/* Reference Line at 1.0 */}
          <ReferenceLine
            y={1.0}
            stroke="#9ca3af"
            strokeDasharray="5 5"
            label={{
              value: "Expected (1.0)",
              position: "right",
              fontSize: 10,
              fill: "#9ca3af",
            }}
          />

          {/* Bars with dynamic colors */}
          <Bar dataKey="languageUsage" name="Language Usage" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`lu-${index}`} fill={entry.luColor} />
            ))}
          </Bar>
          <Bar dataKey="reading" name="Reading" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`rd-${index}`} fill={entry.rdColor} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend explanation */}
      <div className="mt-3 p-2 bg-muted/50 rounded-md text-xs text-muted-foreground">
        <div className="flex items-center gap-4 justify-center">
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: "#22c55e" }}></div>
            <span>Above Expected (&gt; 1.0)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: "#3b82f6" }}></div>
            <span>On Target (= 1.0)</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: "#ef4444" }}></div>
            <span>Below Expected (&lt; 1.0)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

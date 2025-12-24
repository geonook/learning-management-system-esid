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
import { GROWTH_INDEX_COLORS, NWEA_COLORS, getGrowthIndexColor } from "@/lib/map/colors";
import { formatTermStats, CHART_EXPLANATIONS } from "@/lib/map/utils";

interface MapGrowthIndexChartProps {
  data: GrowthAnalysisData | null;
  height?: number;
}

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

  // 格式化顯示標題
  const formatTitle = () => {
    if (data.growthType === "within-year") {
      return `G${data.grade} Growth Index (${data.academicYear})`;
    } else {
      // Year-over-year: 顯示 G4→G5 格式
      return `G${data.fromGrade}→G${data.toGrade} Year-over-Year Growth Index`;
    }
  };

  const formatSubtitle = () => {
    if (data.growthType === "within-year") {
      return `Fall → Spring (1.0 = on target)`;
    } else {
      // 簡化學期顯示
      const fromShort = data.fromTerm.replace(/(\w+) (\d{4})-\d{4}/, "$1 $2");
      const toShort = data.toTerm.replace(/(\w+) (\d{4})-\d{4}/, "$1 $2");
      return `${fromShort} → ${toShort} (1.0 = on target)`;
    }
  };

  return (
    <div className="w-full">
      <h4 className="text-sm font-medium mb-1 text-center">
        {formatTitle()}
      </h4>
      <p className="text-xs text-muted-foreground text-center mb-2">
        {formatSubtitle()}
      </p>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={NWEA_COLORS.gridLine} />
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
          <Legend wrapperStyle={{ fontSize: "12px" }} />

          {/* Reference Line at 1.0 */}
          <ReferenceLine
            y={1.0}
            stroke={NWEA_COLORS.norm}
            strokeDasharray="5 5"
            label={{
              value: "Expected (1.0)",
              position: "right",
              fontSize: 10,
              fill: NWEA_COLORS.norm,
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
      <div className="mt-3 flex items-center gap-4 justify-center text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: GROWTH_INDEX_COLORS.above }}></div>
          <span>Above Expected (&gt; 1.0)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: GROWTH_INDEX_COLORS.atTarget }}></div>
          <span>On Target (= 1.0)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: GROWTH_INDEX_COLORS.below }}></div>
          <span>Below Expected (&lt; 1.0)</span>
        </div>
      </div>

      {/* 解釋文字 */}
      <div className="mt-4 pt-3 border-t border-border text-xs text-muted-foreground">
        <p>{CHART_EXPLANATIONS.growthIndex.en}</p>
      </div>
    </div>
  );
}

"use client";

/**
 * MAP Growth Index Bar Chart
 *
 * 顯示各 English Level (E1/E2/E3/All) 的 Growth Index
 * 使用水平條形圖，以 0 為基準向右延伸
 * Growth Index >= 1.0 綠色，0.8-0.99 藍色，< 0.8 紅色
 * 有垂直參考線在 1.0 位置
 */

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
import type { GrowthAnalysisData } from "@/lib/api/map-analytics";
import { GROWTH_INDEX_COLORS, NWEA_COLORS, getGrowthIndexColor } from "@/lib/map/colors";
import { CHART_EXPLANATIONS } from "@/lib/map/utils";

interface MapGrowthIndexChartProps {
  data: GrowthAnalysisData | null;
  height?: number;
}

export function MapGrowthIndexChart({
  data,
  height = 320,
}: MapGrowthIndexChartProps) {
  if (!data) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        No growth data available
      </div>
    );
  }

  // 轉換資料格式為水平條形圖需要的格式
  // 每個 level 有兩個條目：LU 和 RD
  const chartData: Array<{
    label: string;
    level: string;
    course: string;
    value: number | null;
    color: string;
  }> = [];

  data.byLevel.forEach((levelData) => {
    const levelLabel = levelData.englishLevel === "All"
      ? `All G${data.grade}`
      : `G${data.grade}${levelData.englishLevel}`;

    chartData.push({
      label: `${levelLabel} LU`,
      level: levelLabel,
      course: "Language Usage",
      value: levelData.languageUsage.growthIndex,
      color: getGrowthIndexColor(levelData.languageUsage.growthIndex),
    });

    chartData.push({
      label: `${levelLabel} RD`,
      level: levelLabel,
      course: "Reading",
      value: levelData.reading.growthIndex,
      color: getGrowthIndexColor(levelData.reading.growthIndex),
    });
  });

  // 計算 X 軸範圍（最小值到最大值，確保包含 1.0）
  const allValues = chartData.map(d => d.value).filter((v): v is number => v !== null);
  const minVal = Math.min(...allValues, 0);
  const maxVal = Math.max(...allValues, 1.2);
  const xMin = Math.floor(minVal * 10) / 10 - 0.1;
  const xMax = Math.ceil(maxVal * 10) / 10 + 0.1;

  // 自訂 Tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const entry = payload[0].payload;
      const value = entry.value;
      const status =
        value >= 1.0 ? "Above Expected" : value >= 0.8 ? "Near Expected" : "Below Expected";
      return (
        <div
          className="bg-popover border border-border rounded-md p-2 text-sm"
          style={{ backgroundColor: "hsl(var(--popover))" }}
        >
          <p className="font-medium text-popover-foreground mb-1">{entry.level}</p>
          <p style={{ color: entry.color }}>
            {entry.course}: {value !== null ? value.toFixed(2) : "N/A"}
          </p>
          <p className="text-xs text-muted-foreground mt-1">{status}</p>
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
      return `G${data.fromGrade}→G${data.toGrade} Year-over-Year Growth Index`;
    }
  };

  const formatSubtitle = () => {
    if (data.growthType === "within-year") {
      return `Fall → Spring | Target: 1.0`;
    } else {
      const fromShort = data.fromTerm.replace(/(\w+) (\d{4})-\d{4}/, "$1 $2");
      const toShort = data.toTerm.replace(/(\w+) (\d{4})-\d{4}/, "$1 $2");
      return `${fromShort} → ${toShort} | Target: 1.0`;
    }
  };

  // 自定義 Label 渲染
  const renderCustomLabel = (props: any) => {
    const { x, y, width, value, fill } = props;
    if (value === null) return null;

    // Label 位置：在條形末端
    const labelX = width >= 0 ? x + width + 5 : x + width - 5;
    const textAnchor = width >= 0 ? "start" : "end";

    return (
      <text
        x={labelX}
        y={y + 10}
        fill={fill}
        textAnchor={textAnchor}
        fontSize={11}
        fontWeight={500}
      >
        {value.toFixed(2)}
      </text>
    );
  };

  return (
    <div className="w-full">
      <h4 className="text-sm font-medium mb-1 text-center">
        {formatTitle()}
      </h4>
      <p className="text-xs text-muted-foreground text-center mb-3">
        {formatSubtitle()}
      </p>

      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 60, left: 70, bottom: 5 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={NWEA_COLORS.gridLine} horizontal={false} />
          <XAxis
            type="number"
            domain={[xMin, xMax]}
            tick={{ fontSize: 11 }}
            tickFormatter={(v) => v.toFixed(1)}
          />
          <YAxis
            type="category"
            dataKey="label"
            tick={{ fontSize: 11 }}
            width={65}
          />
          <Tooltip content={<CustomTooltip />} />

          {/* Reference Line at 1.0 (Target) */}
          <ReferenceLine
            x={1.0}
            stroke={NWEA_COLORS.norm}
            strokeWidth={2}
            strokeDasharray="5 5"
            label={{
              value: "Target (1.0)",
              position: "top",
              fontSize: 10,
              fill: NWEA_COLORS.norm,
            }}
          />

          {/* Reference Line at 0 */}
          <ReferenceLine x={0} stroke="#94a3b8" strokeWidth={1} />

          {/* Bars with dynamic colors */}
          <Bar dataKey="value" radius={[0, 4, 4, 0]} barSize={16}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
            <LabelList
              dataKey="value"
              content={renderCustomLabel}
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Legend explanation */}
      <div className="mt-3 flex items-center gap-4 justify-center text-xs text-muted-foreground flex-wrap">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: GROWTH_INDEX_COLORS.above }}></div>
          <span>Above Expected (≥ 1.0)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: GROWTH_INDEX_COLORS.atTarget }}></div>
          <span>Near Expected (0.8-0.99)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded" style={{ backgroundColor: GROWTH_INDEX_COLORS.below }}></div>
          <span>Below Expected (&lt; 0.8)</span>
        </div>
      </div>

      {/* 解釋文字 */}
      <div className="mt-4 pt-3 border-t border-border text-xs text-muted-foreground">
        <p>{CHART_EXPLANATIONS.growthIndex.en}</p>
      </div>
    </div>
  );
}

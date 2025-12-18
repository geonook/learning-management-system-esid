"use client";

/**
 * MAP Growth Distribution Histogram
 *
 * 顯示所有學生成長值的分佈
 * X 軸: 成長範圍 (<0, 0-5, 5-10, 10-15, 15+)
 * Y 軸: 學生人數
 * 使用 recharts 的 BarChart
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { GrowthAnalysisData } from "@/lib/api/map-analytics";

interface MapGrowthDistributionProps {
  data: GrowthAnalysisData | null;
  height?: number;
}

// 成長範圍顏色配置
const RANGE_COLORS: Record<string, string> = {
  "<0": "#ef4444", // red - negative growth
  "0-5": "#f97316", // orange - low growth
  "5-10": "#eab308", // yellow - moderate growth
  "10-15": "#22c55e", // green - good growth
  "15+": "#16a34a", // dark green - excellent growth
};

export function MapGrowthDistribution({
  data,
  height = 300,
}: MapGrowthDistributionProps) {
  if (!data || data.distribution.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        No growth distribution data available
      </div>
    );
  }

  // 轉換資料格式為 recharts 需要的格式
  const chartData = data.distribution.map((d) => ({
    range: d.range,
    count: d.count,
    percentage: d.percentage,
    color: RANGE_COLORS[d.range] || "#64748b",
  }));

  // 計算總學生數
  const totalStudents = chartData.reduce((sum, d) => sum + d.count, 0);

  // 自訂 Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div
          className="bg-popover border border-border rounded-md p-2 text-sm"
          style={{ backgroundColor: "hsl(var(--popover))" }}
        >
          <p className="font-medium text-popover-foreground mb-1">
            Growth: {label} points
          </p>
          <p className="text-popover-foreground">
            Students: {data.count} ({data.percentage.toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  // Y 軸最大值（向上取整到 10 的倍數）
  const maxCount = Math.max(...chartData.map((d) => d.count));
  const yMax = Math.ceil(maxCount / 10) * 10;

  // 格式化標題
  const formatTitle = () => {
    if (data.growthType === "within-year") {
      return `G${data.grade} Growth Distribution (${data.academicYear})`;
    } else {
      return `G${data.fromGrade}→G${data.toGrade} Year-over-Year Growth Distribution`;
    }
  };

  const formatSubtitle = () => {
    if (data.growthType === "within-year") {
      return `Fall → Spring | All students (Total: ${totalStudents})`;
    } else {
      const fromShort = data.fromTerm.replace(/(\w+) (\d{4})-\d{4}/, "$1 $2");
      const toShort = data.toTerm.replace(/(\w+) (\d{4})-\d{4}/, "$1 $2");
      return `${fromShort} → ${toShort} | All students (Total: ${totalStudents})`;
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
          <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
          <XAxis
            dataKey="range"
            tick={{ fontSize: 12 }}
            className="text-muted-foreground"
            label={{
              value: "Growth Range (RIT Points)",
              position: "insideBottom",
              offset: -5,
              style: { fontSize: 12, fill: "hsl(var(--muted-foreground))" },
            }}
          />
          <YAxis
            domain={[0, yMax]}
            tick={{ fontSize: 12 }}
            className="text-muted-foreground"
            label={{
              value: "Number of Students",
              angle: -90,
              position: "insideLeft",
              style: { fontSize: 12, fill: "hsl(var(--muted-foreground))" },
            }}
          />
          <Tooltip content={<CustomTooltip />} />

          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* Distribution summary */}
      <div className="mt-3 p-2 bg-muted/50 rounded-md text-xs text-muted-foreground">
        <p className="mb-1">
          <strong>Distribution:</strong> Shows how many students achieved
          different levels of growth{" "}
          {data.growthType === "within-year"
            ? "from Fall to Spring"
            : "over the past year"}.
        </p>
        <div className="grid grid-cols-5 gap-2 mt-2">
          {chartData.map((d) => (
            <div key={d.range} className="flex flex-col items-center">
              <div
                className="w-full h-2 rounded mb-1"
                style={{ backgroundColor: d.color }}
              ></div>
              <span className="text-[10px]">
                {d.range}: {d.count}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

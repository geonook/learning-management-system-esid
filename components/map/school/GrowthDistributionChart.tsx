"use client";

/**
 * Growth Distribution Chart
 *
 * 成長分佈直方圖，顯示 Fall-to-Fall 成長分佈
 * 紅色標記負成長學生
 */

import { useMemo } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  ReferenceLine,
} from "recharts";
import { AlertTriangle } from "lucide-react";
import type { SchoolGrowthDistributionData } from "@/lib/api/map-school-analytics";

interface GrowthDistributionChartProps {
  data: SchoolGrowthDistributionData;
  height?: number;
}

// 配色
const GROWTH_COLORS = {
  negative: "#ef4444", // red-500
  low: "#f97316", // orange-500
  medium: "#eab308", // yellow-500
  high: "#22c55e", // green-500
  veryHigh: "#16a34a", // green-600
};

export function GrowthDistributionChart({
  data,
  height = 280,
}: GrowthDistributionChartProps) {
  // 為每個 bucket 分配顏色
  const chartData = useMemo(() => {
    return data.distribution.map((bucket) => {
      let color: string;
      if (bucket.isNegative) {
        color = GROWTH_COLORS.negative;
      } else if (bucket.max <= 5) {
        color = GROWTH_COLORS.low;
      } else if (bucket.max <= 10) {
        color = GROWTH_COLORS.medium;
      } else if (bucket.max <= 15) {
        color = GROWTH_COLORS.high;
      } else {
        color = GROWTH_COLORS.veryHigh;
      }

      return {
        ...bucket,
        color,
      };
    });
  }, [data.distribution]);

  return (
    <div className="w-full">
      {/* 負成長警示 */}
      {data.negativeGrowthPercentage > 0 && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
          <span className="text-sm text-red-700 dark:text-red-300">
            <strong>{data.negativeGrowthCount}</strong> students (
            {data.negativeGrowthPercentage}%) showed negative growth
          </span>
        </div>
      )}

      {/* 統計摘要 */}
      <div className="mb-4 flex gap-4 text-sm">
        <div className="px-3 py-1.5 bg-muted rounded-md">
          <span className="text-muted-foreground">Students: </span>
          <span className="font-medium">{data.totalStudents}</span>
        </div>
        <div className="px-3 py-1.5 bg-muted rounded-md">
          <span className="text-muted-foreground">Mean Growth: </span>
          <span
            className={`font-medium ${
              data.meanGrowth >= 0 ? "text-green-600" : "text-red-600"
            }`}
          >
            {data.meanGrowth >= 0 ? "+" : ""}
            {data.meanGrowth}
          </span>
        </div>
        <div className="px-3 py-1.5 bg-muted rounded-md">
          <span className="text-muted-foreground">Period: </span>
          <span className="font-medium text-xs">
            {data.fromTerm} → {data.toTerm}
          </span>
        </div>
      </div>

      {/* 直方圖 */}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart
          data={chartData}
          margin={{ top: 10, right: 20, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="range"
            tick={{ fontSize: 11 }}
            className="text-muted-foreground"
          />
          <YAxis
            tick={{ fontSize: 11 }}
            className="text-muted-foreground"
            width={40}
            label={{
              value: "Count",
              angle: -90,
              position: "insideLeft",
              style: { textAnchor: "middle", fontSize: 11 },
            }}
          />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null;
              const d = payload[0]?.payload;
              return (
                <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                  <p className="font-medium text-sm mb-1">{d?.range} RIT</p>
                  <div className="text-xs space-y-1">
                    <div>
                      <span className="text-muted-foreground">Count: </span>
                      <span className="font-medium">{d?.count}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Percentage:{" "}
                      </span>
                      <span className="font-medium">{d?.percentage}%</span>
                    </div>
                  </div>
                </div>
              );
            }}
          />
          <ReferenceLine x="0 to 5" stroke="#94a3b8" strokeDasharray="3 3" />
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>

      {/* 圖例 */}
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground justify-center">
        <div className="flex items-center gap-1">
          <span
            className="w-3 h-3 rounded"
            style={{ backgroundColor: GROWTH_COLORS.negative }}
          />
          <span>Negative</span>
        </div>
        <div className="flex items-center gap-1">
          <span
            className="w-3 h-3 rounded"
            style={{ backgroundColor: GROWTH_COLORS.low }}
          />
          <span>Low (0-5)</span>
        </div>
        <div className="flex items-center gap-1">
          <span
            className="w-3 h-3 rounded"
            style={{ backgroundColor: GROWTH_COLORS.medium }}
          />
          <span>Medium (5-10)</span>
        </div>
        <div className="flex items-center gap-1">
          <span
            className="w-3 h-3 rounded"
            style={{ backgroundColor: GROWTH_COLORS.high }}
          />
          <span>High (10+)</span>
        </div>
      </div>
    </div>
  );
}

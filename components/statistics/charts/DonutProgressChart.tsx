"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { ChartWrapper } from "./ChartWrapper";

interface DonutProgressChartProps {
  passRate: number | null;
  excellentRate: number | null;
  loading: boolean;
  title?: string;
  color?: string;
}

export function DonutProgressChart({
  passRate,
  excellentRate,
  loading,
  title = "Pass Rate Overview",
  color = "#06b6d4",
}: DonutProgressChartProps) {
  // API returns values as 0-100 percentages, use directly
  const passRatePercent = passRate ?? 0;
  const excellentRatePercent = excellentRate ?? 0;

  // Calculate segments: Excellent (subset of Pass), Pass-only, Fail
  const excellentPercent = excellentRatePercent;
  const passOnlyPercent = passRatePercent - excellentRatePercent;
  const failPercent = 100 - passRatePercent;

  const chartData = [
    { name: "Excellent (>=90)", value: Math.max(0, excellentPercent), color: "#22c55e" },
    { name: "Good (60-89)", value: Math.max(0, passOnlyPercent), color: color },
    { name: "Fail (<60)", value: Math.max(0, failPercent), color: "#ef4444" },
  ].filter((d) => d.value > 0);

  const isEmpty = passRate === null || chartData.length === 0;

  return (
    <ChartWrapper
      title={title}
      subtitle="Student performance distribution"
      loading={loading}
      isEmpty={isEmpty}
      height={280}
    >
      <div className="relative">
        <ResponsiveContainer width="100%" height={240}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value"
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "rgba(15, 23, 42, 0.9)",
                border: "1px solid rgba(148, 163, 184, 0.2)",
                borderRadius: "8px",
                color: "#f1f5f9",
              }}
              formatter={(value: number) => [`${value.toFixed(1)}%`, ""]}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className="text-2xl font-bold text-text-primary">
              {passRatePercent.toFixed(0)}%
            </div>
            <div className="text-xs text-text-secondary">Pass Rate</div>
          </div>
        </div>
      </div>
      {/* Legend */}
      <div className="flex justify-center gap-4 mt-2">
        {chartData.map((entry, index) => (
          <div key={index} className="flex items-center gap-1">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: entry.color }}
            />
            <span className="text-xs text-text-secondary">{entry.name}</span>
          </div>
        ))}
      </div>
    </ChartWrapper>
  );
}

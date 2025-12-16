"use client";

import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  TooltipProps,
} from "recharts";
import { ChartWrapper } from "./ChartWrapper";

// Custom tooltip that adapts to light/dark mode
interface ChartDataEntry {
  name: string;
  value: number;
  color: string;
}

function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0]?.payload as ChartDataEntry | undefined;
  if (!data) return null;

  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 shadow-lg">
      <p className="text-gray-900 dark:text-slate-200 font-medium text-sm">{data.name}</p>
      <p className="text-gray-600 dark:text-slate-400 text-sm">
        {data.value.toFixed(1)}%
      </p>
    </div>
  );
}

interface DonutProgressChartProps {
  passRate: number | null;
  excellentRate: number | null;
  loading: boolean;
  title?: string;
  color?: string;
  /** Course type for appropriate label display */
  courseType?: "LT" | "IT" | "KCFS";
}

// Label configurations by course type
const CHART_LABELS = {
  default: {
    excellent: "Excellent (>=90)",
    good: "Good (60-89)",
    fail: "Fail (<60)",
  },
  KCFS: {
    excellent: "Excellent (>=4.5)",
    good: "Pass (3-4.5)",
    fail: "Below Standard (<3)",
  },
};

export function DonutProgressChart({
  passRate,
  excellentRate,
  loading,
  title = "Pass Rate Overview",
  color = "#06b6d4",
  courseType,
}: DonutProgressChartProps) {
  // API returns values as 0-100 percentages, use directly
  const passRatePercent = passRate ?? 0;
  const excellentRatePercent = excellentRate ?? 0;

  // Calculate segments: Excellent (subset of Pass), Pass-only, Fail
  const excellentPercent = excellentRatePercent;
  const passOnlyPercent = passRatePercent - excellentRatePercent;
  const failPercent = 100 - passRatePercent;

  // Select labels based on course type
  const labels = courseType === "KCFS" ? CHART_LABELS.KCFS : CHART_LABELS.default;

  const chartData = [
    { name: labels.excellent, value: Math.max(0, excellentPercent), color: "#22c55e" },
    { name: labels.good, value: Math.max(0, passOnlyPercent), color: color },
    { name: labels.fail, value: Math.max(0, failPercent), color: "#ef4444" },
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
            <Tooltip content={<CustomTooltip />} />
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

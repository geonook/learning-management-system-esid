"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  TooltipProps,
} from "recharts";
import { ChartWrapper } from "./ChartWrapper";

// Custom tooltip that adapts to light/dark mode
interface ChartDataEntry {
  name: string;
  average: number | null;
  passRate: number | null;
  excellentRate: number | null;
}

function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 shadow-lg">
      <p className="text-gray-900 dark:text-slate-200 font-medium text-sm mb-1">{label}</p>
      {payload.map((entry, index) => {
        const name = entry.dataKey as string;
        const label = name === "average" ? "Average" : name === "passRate" ? "Pass Rate" : "Excellent Rate";
        const value = entry.value as number;
        const suffix = name !== "average" ? "%" : "";
        return (
          <p key={index} className="text-gray-600 dark:text-slate-400 text-sm" style={{ color: entry.color }}>
            {label}: {value?.toFixed(1)}{suffix}
          </p>
        );
      })}
    </div>
  );
}

interface TrendLineChartProps {
  data: Array<{
    grade_level: string;
    grade_avg: number | null;
    pass_rate: number | null;
    excellent_rate: number | null;
  }>;
  loading: boolean;
  title?: string;
  color?: string;
}

export function TrendLineChart({
  data,
  loading,
  title = "Grade Level Trend",
  color = "#06b6d4",
}: TrendLineChartProps) {
  // Filter out null values and sort by grade level
  const chartData = data
    .filter((d) => d.grade_avg !== null)
    .sort((a, b) => a.grade_level.localeCompare(b.grade_level))
    .map((d) => ({
      name: d.grade_level,
      average: d.grade_avg,
      passRate: d.pass_rate,
      excellentRate: d.excellent_rate,
    }));

  return (
    <ChartWrapper
      title={title}
      subtitle="Grade average trends across levels"
      loading={loading}
      isEmpty={chartData.length < 2}
      minDataPoints={2}
      height={300}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(148, 163, 184, 0.2)"
          />
          <XAxis
            dataKey="name"
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            axisLine={{ stroke: "rgba(148, 163, 184, 0.3)" }}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            axisLine={{ stroke: "rgba(148, 163, 184, 0.3)" }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: 10 }}
            formatter={(value) => (
              <span style={{ color: "#94a3b8" }}>
                {value === "average"
                  ? "Grade Avg"
                  : value === "passRate"
                  ? "Pass Rate"
                  : "Excellent Rate"}
              </span>
            )}
          />
          <Line
            type="monotone"
            dataKey="average"
            stroke={color}
            strokeWidth={2}
            dot={{ fill: color, strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
          />
          <Line
            type="monotone"
            dataKey="passRate"
            stroke="#22c55e"
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ fill: "#22c55e", strokeWidth: 2, r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="excellentRate"
            stroke="#a855f7"
            strokeWidth={2}
            strokeDasharray="3 3"
            dot={{ fill: "#a855f7", strokeWidth: 2, r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
}

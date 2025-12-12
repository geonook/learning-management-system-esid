"use client";

import {
  BarChart,
  Bar,
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
function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 shadow-lg">
      <p className="text-gray-900 dark:text-slate-200 font-medium text-sm mb-1">{label}</p>
      {payload.map((entry, index) => {
        const name = entry.dataKey as string;
        const displayName = name === "excellent" ? "Excellent (>=90)" : name === "good" ? "Good (60-89)" : "Fail (<60)";
        const value = entry.value as number;
        return (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {displayName}: {value} students
          </p>
        );
      })}
    </div>
  );
}

interface GradeLevelData {
  grade_level: string;
  total_students: number;
  pass_rate: number | null;
  excellent_rate: number | null;
}

interface StackedGradeChartProps {
  data: GradeLevelData[];
  loading: boolean;
  title?: string;
}

export function StackedGradeChart({
  data,
  loading,
  title = "Grade Distribution by Level",
}: StackedGradeChartProps) {
  // Calculate stacked data: Excellent, Good, Fail
  // API returns rates as 0-100 percentages, convert to 0-1 for calculation
  const chartData = data
    .filter((d) => d.total_students > 0)
    .map((d) => {
      const excellentRate = (d.excellent_rate ?? 0) / 100;
      const passRate = (d.pass_rate ?? 0) / 100;
      const goodRate = passRate - excellentRate;
      const failRate = 1 - passRate;

      return {
        name: d.grade_level,
        excellent: Math.round(d.total_students * excellentRate),
        good: Math.round(d.total_students * goodRate),
        fail: Math.round(d.total_students * failRate),
        total: d.total_students,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <ChartWrapper
      title={title}
      subtitle="Student count by performance level"
      loading={loading}
      isEmpty={chartData.length === 0}
      height={300}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
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
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            axisLine={{ stroke: "rgba(148, 163, 184, 0.3)" }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ paddingTop: 10 }}
            formatter={(value) => (
              <span style={{ color: "#94a3b8" }}>
                {value === "excellent"
                  ? "Excellent"
                  : value === "good"
                  ? "Good"
                  : "Fail"}
              </span>
            )}
          />
          <Bar dataKey="excellent" stackId="a" fill="#22c55e" />
          <Bar dataKey="good" stackId="a" fill="#3b82f6" />
          <Bar dataKey="fail" stackId="a" fill="#ef4444" />
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
}

"use client";

import {
  ComposedChart,
  Bar,
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
function CustomTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-lg px-3 py-2 shadow-lg">
      <p className="text-gray-900 dark:text-slate-200 font-medium text-sm mb-1">{label}</p>
      {payload.map((entry, index) => {
        const name = entry.dataKey as string;
        const displayName = name === "average" ? "Grade Avg" : name === "passRate" ? "Pass Rate" : "Students";
        const value = entry.value as number;
        const suffix = name === "passRate" ? "%" : "";
        return (
          <p key={index} className="text-sm" style={{ color: entry.color }}>
            {displayName}: {value?.toFixed(1)}{suffix}
          </p>
        );
      })}
    </div>
  );
}

interface GradeLevelStatistics {
  grade_level: string;
  class_count: number;
  student_count: number;
  term_grade_avg: number | null;
  pass_rate: number | null;
  excellent_rate: number | null;
}

interface GradeComparisonChartProps {
  data: GradeLevelStatistics[];
  loading: boolean;
  title?: string;
  barColor?: string;
}

export function GradeComparisonChart({
  data,
  loading,
  title = "Grade Level Comparison",
  barColor = "#8b5cf6",
}: GradeComparisonChartProps) {
  // API returns pass_rate as 0-100, use directly
  const chartData = data
    .filter((d) => d.term_grade_avg !== null)
    .map((d) => ({
      name: d.grade_level,
      average: d.term_grade_avg,
      passRate: d.pass_rate ?? 0,
      students: d.student_count,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <ChartWrapper
      title={title}
      subtitle="Average scores and pass rates by grade level"
      loading={loading}
      isEmpty={chartData.length === 0}
      height={320}
    >
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={chartData}
          margin={{ top: 5, right: 50, left: 0, bottom: 5 }}
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
            yAxisId="left"
            domain={[0, 100]}
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            axisLine={{ stroke: "rgba(148, 163, 184, 0.3)" }}
            label={{
              value: "Score",
              angle: -90,
              position: "insideLeft",
              fill: "#94a3b8",
              fontSize: 12,
            }}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[0, 100]}
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            axisLine={{ stroke: "rgba(148, 163, 184, 0.3)" }}
            label={{
              value: "Pass %",
              angle: 90,
              position: "insideRight",
              fill: "#94a3b8",
              fontSize: 12,
            }}
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
                  : "Students"}
              </span>
            )}
          />
          <Bar
            yAxisId="left"
            dataKey="average"
            fill={barColor}
            radius={[4, 4, 0, 0]}
            maxBarSize={40}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="passRate"
            stroke="#22c55e"
            strokeWidth={2}
            dot={{ fill: "#22c55e", strokeWidth: 2, r: 4 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
}

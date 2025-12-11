"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { ChartWrapper } from "./ChartWrapper";

interface ClassStatistics {
  class_name: string;
  term_grade_avg: number | null;
  student_count: number;
}

interface ClassDistributionChartProps {
  data: ClassStatistics[];
  loading: boolean;
  title?: string;
  color?: string;
}

export function ClassDistributionChart({
  data,
  loading,
  title = "Class Score Distribution",
  color = "#06b6d4",
}: ClassDistributionChartProps) {
  // Group by score ranges and count classes
  const scoreRanges = [
    { min: 0, max: 60, label: "<60" },
    { min: 60, max: 70, label: "60-69" },
    { min: 70, max: 80, label: "70-79" },
    { min: 80, max: 90, label: "80-89" },
    { min: 90, max: 100, label: "90+" },
  ];

  const chartData = scoreRanges.map((range) => {
    const count = data.filter((d) => {
      if (d.term_grade_avg === null) return false;
      if (range.max === 100) {
        return d.term_grade_avg >= range.min;
      }
      return d.term_grade_avg >= range.min && d.term_grade_avg < range.max;
    }).length;

    return {
      range: range.label,
      count,
    };
  });

  const hasData = data.some((d) => d.term_grade_avg !== null);

  return (
    <ChartWrapper
      title={title}
      subtitle="Number of classes by average score range"
      loading={loading}
      isEmpty={!hasData}
      height={280}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={chartData}
          margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
        >
          <defs>
            <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={color} stopOpacity={0.8} />
              <stop offset="95%" stopColor={color} stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(148, 163, 184, 0.2)"
          />
          <XAxis
            dataKey="range"
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            axisLine={{ stroke: "rgba(148, 163, 184, 0.3)" }}
          />
          <YAxis
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            axisLine={{ stroke: "rgba(148, 163, 184, 0.3)" }}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "rgba(15, 23, 42, 0.9)",
              border: "1px solid rgba(148, 163, 184, 0.2)",
              borderRadius: "8px",
              color: "#f1f5f9",
            }}
            formatter={(value: number) => [`${value} classes`, "Count"]}
          />
          <Area
            type="monotone"
            dataKey="count"
            stroke={color}
            fillOpacity={1}
            fill="url(#colorCount)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
}

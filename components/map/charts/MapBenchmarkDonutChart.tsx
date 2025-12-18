"use client";

/**
 * MAP Benchmark Distribution Donut Chart
 *
 * 顯示學生 E1/E2/E3 分佈圓餅圖
 * 基於 Average (兩科平均) 分類
 */

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { BENCHMARK_COLORS, getBenchmarkLabels } from "@/lib/map/benchmarks";
import type { BenchmarkDistribution } from "@/lib/api/map-analytics";

interface MapBenchmarkDonutChartProps {
  data: BenchmarkDistribution | null;
  height?: number;
}

export function MapBenchmarkDonutChart({
  data,
  height = 280,
}: MapBenchmarkDonutChartProps) {
  if (!data) {
    return (
      <div className="flex items-center justify-center h-[280px] text-muted-foreground">
        No benchmark data available
      </div>
    );
  }

  const labels = getBenchmarkLabels(data.grade);

  const chartData = [
    {
      name: labels?.E1 || "E1",
      value: data.e1.count,
      percentage: data.e1.percentage,
      color: BENCHMARK_COLORS.E1,
    },
    {
      name: labels?.E2 || "E2",
      value: data.e2.count,
      percentage: data.e2.percentage,
      color: BENCHMARK_COLORS.E2,
    },
    {
      name: labels?.E3 || "E3",
      value: data.e3.count,
      percentage: data.e3.percentage,
      color: BENCHMARK_COLORS.E3,
    },
  ];

  // 格式化學期標籤
  const formatTermLabel = (term: string): string => {
    const match = term.match(/^(Fall|Spring)\s+(\d{4})-(\d{4})$/);
    if (!match) return term;
    return `${match[1]} ${match[2]?.slice(2)}-${match[3]?.slice(2)}`;
  };

  return (
    <div className="w-full">
      <h4 className="text-sm font-medium mb-1 text-center">
        G{data.grade} Benchmark Distribution
      </h4>
      <p className="text-xs text-muted-foreground text-center mb-2">
        Based on Average ({formatTermLabel(data.termTested)})
      </p>
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={chartData}
            cx="50%"
            cy="50%"
            innerRadius={50}
            outerRadius={80}
            paddingAngle={2}
            dataKey="value"
            label={({ name, percentage }) => `${percentage}%`}
            labelLine={false}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            formatter={(value: number, name: string) => [
              `${value} students`,
              name,
            ]}
            contentStyle={{
              backgroundColor: "hsl(var(--popover))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "6px",
            }}
          />
          <Legend
            layout="horizontal"
            verticalAlign="bottom"
            align="center"
            formatter={(value) => (
              <span className="text-xs text-foreground">{value}</span>
            )}
          />
        </PieChart>
      </ResponsiveContainer>
      <p className="text-xs text-muted-foreground text-center mt-1">
        Total: {data.total} students
      </p>
    </div>
  );
}

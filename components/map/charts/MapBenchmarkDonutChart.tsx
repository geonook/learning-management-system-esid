"use client";

/**
 * MAP Benchmark Distribution Donut Chart
 *
 * 顯示學生 E1/E2/E3 分佈圓餅圖
 * 基於 Average (兩科平均) 分類
 */

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Info } from "lucide-react";
import { getBenchmarkLabels, getBenchmarkThresholds } from "@/lib/map/benchmarks";
import { BENCHMARK_COLORS } from "@/lib/map/colors";
import { formatTermStats, CHART_EXPLANATIONS } from "@/lib/map/utils";
import type { BenchmarkDistribution } from "@/lib/api/map-analytics";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  const thresholds = getBenchmarkThresholds(data.grade);

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

  return (
    <TooltipProvider>
      <div className="w-full">
        <div className="flex items-center justify-center gap-1 mb-1">
          <h4 className="text-sm font-medium text-center">
            G{data.grade} Benchmark Distribution
          </h4>
          <UITooltip>
            <TooltipTrigger asChild>
              <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-[280px]">
              <p className="text-xs">
                <strong>Benchmark Classification</strong> is based on the student&apos;s MAP
                two-subject average (Language Usage + Reading) ÷ 2.
              </p>
              {thresholds && (
                <ul className="text-xs mt-1 space-y-0.5">
                  <li className="text-green-600">• E1 (Advanced): Average ≥ {thresholds.e1Threshold}</li>
                  <li className="text-amber-600">• E2 (Intermediate): {thresholds.e2Threshold} ≤ Average &lt; {thresholds.e1Threshold}</li>
                  <li className="text-red-600">• E3 (Developing): Average &lt; {thresholds.e2Threshold}</li>
                </ul>
              )}
            </TooltipContent>
          </UITooltip>
        </div>
        <p className="text-xs text-muted-foreground text-center mb-2">
          Based on Average ({formatTermStats(data.termTested)})
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

        {/* Explanation Box */}
        <div className="mt-4 pt-3 border-t border-border text-xs text-muted-foreground">
          <p>{CHART_EXPLANATIONS.benchmark.en}</p>
        </div>
      </div>
    </TooltipProvider>
  );
}

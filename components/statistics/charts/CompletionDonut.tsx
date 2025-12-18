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
import type { SchoolCompletionProgress } from "@/lib/api/dashboard";

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
      <p className="text-gray-900 dark:text-slate-200 font-medium text-sm">
        {data.name}
      </p>
      <p className="text-gray-600 dark:text-slate-400 text-sm">
        {data.value.toLocaleString()}
      </p>
    </div>
  );
}

interface CompletionDonutProps {
  data: SchoolCompletionProgress;
  loading: boolean;
  title?: string;
  subtitle?: string;
}

export function CompletionDonut({
  data,
  loading,
  title = "Grade Entry Progress",
  subtitle = "School-wide completion status",
}: CompletionDonutProps) {
  const isEmpty = !data || data.expected === 0;

  const chartData: ChartDataEntry[] = [
    {
      name: "Entered",
      value: data.entered,
      color: "#22c55e",
    },
    {
      name: "Remaining",
      value: Math.max(0, data.expected - data.entered),
      color: "#e5e7eb",
    },
  ];

  // Get color based on completion percentage
  const getPercentageColor = (pct: number): string => {
    if (pct >= 90) return "text-green-600 dark:text-green-400";
    if (pct >= 70) return "text-blue-600 dark:text-blue-400";
    if (pct >= 50) return "text-amber-600 dark:text-amber-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <ChartWrapper
      title={title}
      subtitle={subtitle}
      loading={loading}
      isEmpty={isEmpty}
      height={280}
    >
      <div className="relative">
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={85}
              paddingAngle={2}
              dataKey="value"
              startAngle={90}
              endAngle={-270}
            >
              {chartData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color}
                  className={index === 1 ? "dark:fill-gray-700" : ""}
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        {/* Center label */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="text-center">
            <div className={`text-3xl font-bold ${getPercentageColor(data.percentage)}`}>
              {data.percentage}%
            </div>
            <div className="text-xs text-text-secondary">Complete</div>
          </div>
        </div>
      </div>

      {/* Stats below */}
      <div className="flex justify-center gap-6 mt-2">
        <div className="text-center">
          <div className="text-lg font-bold text-green-600 dark:text-green-400">
            {data.entered.toLocaleString()}
          </div>
          <div className="text-xs text-text-secondary">Entered</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-text-primary">
            {data.expected.toLocaleString()}
          </div>
          <div className="text-xs text-text-secondary">Expected</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
            {Math.max(0, data.expected - data.entered).toLocaleString()}
          </div>
          <div className="text-xs text-text-secondary">Remaining</div>
        </div>
      </div>
    </ChartWrapper>
  );
}

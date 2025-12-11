"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  TooltipProps,
} from "recharts";
import { ChartWrapper } from "./ChartWrapper";

// Custom tooltip component for proper typing
interface ChartDataEntry {
  name: string;
  fullName: string;
  average: number | null;
  rank: number;
}

function CustomTooltip({ active, payload }: TooltipProps<number, string>) {
  if (!active || !payload || payload.length === 0) return null;

  const data = payload[0]?.payload as ChartDataEntry | undefined;
  if (!data) return null;

  return (
    <div className="bg-slate-900/90 border border-slate-700 rounded-lg px-3 py-2">
      <p className="text-slate-200 font-medium">{data.fullName}</p>
      <p className="text-slate-400 text-sm">
        {data.average?.toFixed(1)} (Rank #{data.rank})
      </p>
    </div>
  );
}

interface RankingData {
  class_name: string;
  term_grade_avg: number | null;
  rank?: number;
}

interface RankingBarChartProps {
  data: RankingData[];
  loading: boolean;
  title?: string;
  topN?: number;
}

export function RankingBarChart({
  data,
  loading,
  title = "Top Performing Classes",
  topN = 10,
}: RankingBarChartProps) {
  // Sort by average and take top N
  const chartData = data
    .filter((d) => d.term_grade_avg !== null)
    .sort((a, b) => (b.term_grade_avg ?? 0) - (a.term_grade_avg ?? 0))
    .slice(0, topN)
    .map((d, index) => ({
      name: d.class_name.length > 15 ? d.class_name.slice(0, 15) + "..." : d.class_name,
      fullName: d.class_name,
      average: d.term_grade_avg,
      rank: index + 1,
    }));

  // Color function based on rank
  const getBarColor = (rank: number) => {
    if (rank === 1) return "#fbbf24"; // Gold
    if (rank === 2) return "#94a3b8"; // Silver
    if (rank === 3) return "#cd7f32"; // Bronze
    return "#3b82f6"; // Blue for others
  };

  return (
    <ChartWrapper
      title={title}
      subtitle={`Top ${topN} classes by average score`}
      loading={loading}
      isEmpty={chartData.length === 0}
      height={Math.max(300, chartData.length * 40)}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 5, right: 30, left: 100, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(148, 163, 184, 0.2)"
            horizontal={false}
          />
          <XAxis
            type="number"
            domain={[0, 100]}
            tick={{ fill: "#94a3b8", fontSize: 12 }}
            axisLine={{ stroke: "rgba(148, 163, 184, 0.3)" }}
          />
          <YAxis
            type="category"
            dataKey="name"
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            axisLine={{ stroke: "rgba(148, 163, 184, 0.3)" }}
            width={95}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar dataKey="average" radius={[0, 4, 4, 0]} maxBarSize={30}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry.rank)} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </ChartWrapper>
  );
}

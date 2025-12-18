"use client";

/**
 * MAP Growth Chart Component
 * Displays RIT score growth trend over time using a line chart
 */

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { MapTrendPoint } from "@/lib/api/map-assessments";
import { formatTermLabel } from "@/lib/api/map-assessments";

interface MapGrowthChartProps {
  readingTrend: MapTrendPoint[];
  languageUsageTrend: MapTrendPoint[];
  showLegend?: boolean;
  height?: number;
}

export function MapGrowthChart({
  readingTrend,
  languageUsageTrend,
  showLegend = true,
  height = 200,
}: MapGrowthChartProps) {
  // Merge trends into a single dataset
  const chartData = useMemo(() => {
    const termMap = new Map<
      string,
      { term: string; sortOrder: number; reading?: number; languageUsage?: number }
    >();

    for (const point of readingTrend) {
      const existing = termMap.get(point.termTested) || {
        term: formatTermLabel(point.termTested),
        sortOrder: point.sortOrder,
      };
      existing.reading = point.ritScore;
      termMap.set(point.termTested, existing);
    }

    for (const point of languageUsageTrend) {
      const existing = termMap.get(point.termTested) || {
        term: formatTermLabel(point.termTested),
        sortOrder: point.sortOrder,
      };
      existing.languageUsage = point.ritScore;
      termMap.set(point.termTested, existing);
    }

    return Array.from(termMap.values()).sort((a, b) => a.sortOrder - b.sortOrder);
  }, [readingTrend, languageUsageTrend]);

  if (chartData.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-text-tertiary">
        No trend data available
      </div>
    );
  }

  // Calculate Y-axis range
  const allScores = chartData.flatMap((d) => [d.reading, d.languageUsage].filter(Boolean)) as number[];
  const minScore = Math.min(...allScores) - 10;
  const maxScore = Math.max(...allScores) + 10;

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <XAxis
            dataKey="term"
            tick={{ fontSize: 11, fill: "var(--text-tertiary)" }}
            axisLine={{ stroke: "var(--border-default)" }}
            tickLine={false}
          />
          <YAxis
            domain={[minScore, maxScore]}
            tick={{ fontSize: 11, fill: "var(--text-tertiary)" }}
            axisLine={false}
            tickLine={false}
            width={35}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "var(--surface-elevated)",
              border: "1px solid var(--border-default)",
              borderRadius: "8px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
            }}
            labelStyle={{ color: "var(--text-primary)", fontWeight: 600 }}
            formatter={(value: number, name: string) => [
              `${value} RIT`,
              name === "reading" ? "Reading" : "Language Usage",
            ]}
          />
          <ReferenceLine y={200} stroke="var(--border-subtle)" strokeDasharray="3 3" />
          <Line
            type="monotone"
            dataKey="reading"
            stroke="#3b82f6"
            strokeWidth={2}
            dot={{ fill: "#3b82f6", strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
            connectNulls
          />
          <Line
            type="monotone"
            dataKey="languageUsage"
            stroke="#8b5cf6"
            strokeWidth={2}
            dot={{ fill: "#8b5cf6", strokeWidth: 2, r: 4 }}
            activeDot={{ r: 6 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
      {showLegend && (
        <div className="flex items-center justify-center gap-6 mt-3">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-blue-500" />
            <span className="text-sm text-text-secondary">Reading</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500" />
            <span className="text-sm text-text-secondary">Language Usage</span>
          </div>
        </div>
      )}
    </div>
  );
}

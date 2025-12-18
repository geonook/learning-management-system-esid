"use client";

/**
 * MAP Growth Chart Component
 * Displays RIT score growth trend over time using a line chart
 * Optimized for both light and dark mode visibility
 */

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import type { MapTrendPoint } from "@/lib/api/map-assessments";
import { formatTermLabel } from "@/lib/api/map-assessments";

interface MapGrowthChartProps {
  readingTrend: MapTrendPoint[];
  languageUsageTrend: MapTrendPoint[];
  showLegend?: boolean;
  height?: number;
}

// Custom tooltip component for better dark mode support
interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ dataKey: string; value: number; color: string }>;
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="bg-surface-elevated border border-border-default rounded-lg shadow-lg p-3">
      <p className="text-text-primary font-semibold text-sm mb-2">{label}</p>
      {payload.map((entry, index) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-text-secondary">
            {entry.dataKey === "reading" ? "Reading" : "Language Usage"}:
          </span>
          <span className="text-text-primary font-medium">{entry.value} RIT</span>
        </div>
      ))}
    </div>
  );
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

  // Calculate Y-axis range with padding
  const allScores = chartData.flatMap((d) => [d.reading, d.languageUsage].filter(Boolean)) as number[];
  const minScore = Math.floor((Math.min(...allScores) - 5) / 10) * 10;
  const maxScore = Math.ceil((Math.max(...allScores) + 5) / 10) * 10;

  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart
          data={chartData}
          margin={{ top: 10, right: 20, left: 0, bottom: 10 }}
        >
          {/* Grid for better readability - uses neutral colors for both modes */}
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="rgba(128, 128, 128, 0.2)"
            vertical={false}
          />

          <XAxis
            dataKey="term"
            tick={{ fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "rgba(128, 128, 128, 0.3)" }}
            dy={8}
            stroke="rgba(128, 128, 128, 0.7)"
          />

          <YAxis
            domain={[minScore, maxScore]}
            tick={{ fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            width={40}
            tickFormatter={(value) => `${value}`}
            stroke="rgba(128, 128, 128, 0.7)"
          />

          <Tooltip content={<CustomTooltip />} />

          {/* Reading line - Blue */}
          <Line
            type="monotone"
            dataKey="reading"
            name="Reading"
            stroke="#3b82f6"
            strokeWidth={3}
            dot={{
              fill: "#3b82f6",
              strokeWidth: 2,
              r: 5,
              stroke: "#fff"
            }}
            activeDot={{
              r: 7,
              fill: "#3b82f6",
              stroke: "#fff",
              strokeWidth: 2
            }}
            connectNulls
          />

          {/* Language Usage line - Purple */}
          <Line
            type="monotone"
            dataKey="languageUsage"
            name="Language Usage"
            stroke="#a855f7"
            strokeWidth={3}
            dot={{
              fill: "#a855f7",
              strokeWidth: 2,
              r: 5,
              stroke: "#fff"
            }}
            activeDot={{
              r: 7,
              fill: "#a855f7",
              stroke: "#fff",
              strokeWidth: 2
            }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>

      {/* Custom Legend */}
      {showLegend && (
        <div className="flex items-center justify-center gap-8 mt-4">
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 rounded-full bg-blue-500" />
            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 -ml-1" />
            <span className="text-sm text-text-secondary ml-1">Reading</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-1 rounded-full bg-purple-500" />
            <div className="w-2.5 h-2.5 rounded-full bg-purple-500 -ml-1" />
            <span className="text-sm text-text-secondary ml-1">Language Usage</span>
          </div>
        </div>
      )}
    </div>
  );
}

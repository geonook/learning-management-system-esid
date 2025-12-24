"use client";

/**
 * MAP Lexile Distribution Histogram
 *
 * Displays Lexile score distribution grouped by Lexile Bands
 * BR, 0-200L, 200-400L, 400-600L, 600-800L, 800-1000L, 1000L+
 * Uses recharts BarChart with corresponding band colors
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Info } from "lucide-react";
import type { LexileAnalysisData } from "@/lib/api/map-analytics";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { NWEA_COLORS } from "@/lib/map/colors";
import { formatTermStats, CHART_EXPLANATIONS } from "@/lib/map/utils";

interface MapLexileDistributionProps {
  data: LexileAnalysisData | null;
  height?: number;
}

export function MapLexileDistribution({
  data,
  height = 300,
}: MapLexileDistributionProps) {
  if (!data || data.distribution.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        No Lexile data available
      </div>
    );
  }

  // Prepare chart data
  const chartData = data.distribution.map((d) => ({
    band: d.band,
    count: d.count,
    percentage: d.percentage,
    color: d.color,
    description: d.description,
  }));

  return (
    <TooltipProvider>
      <div className="w-full">
        <div className="flex items-center justify-center gap-1 mb-1">
          <h4 className="text-sm font-medium text-center">
            G{data.grade} Lexile Score Distribution
          </h4>
          <UITooltip>
            <TooltipTrigger asChild>
              <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-[320px]">
              <p className="text-xs">
                <strong>Lexile Framework</strong> measures reading ability and text complexity.
                Higher scores indicate advanced reading levels.
              </p>
              <ul className="text-xs mt-1 space-y-0.5">
                <li>• <strong>BR</strong>: Beginning Reader - students still developing foundational reading skills. BR codes like BR400 indicate a Lexile measure of negative 400L.</li>
                <li>• 0-200L: Early Reader</li>
                <li>• 200-600L: Transitional</li>
                <li>• 600-1000L: Intermediate to Advanced</li>
                <li>• 1000L+: Proficient</li>
              </ul>
              <p className="text-xs mt-2 pt-1 border-t border-border text-muted-foreground">
                Note: Many primary students (G3-G4) are expected to be in BR-400L range.
              </p>
            </TooltipContent>
          </UITooltip>
        </div>
        <p className="text-xs text-muted-foreground text-center mb-2">
          Based on Reading ({formatTermStats(data.termTested)})
        </p>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={NWEA_COLORS.gridLine} />
            <XAxis
              dataKey="band"
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
            />
            <YAxis
              tick={{ fontSize: 12 }}
              className="text-muted-foreground"
              label={{
                value: "Students",
                angle: -90,
                position: "insideLeft",
                style: { fontSize: 12 },
              }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const data = payload[0]?.payload;
                return (
                  <div
                    className="bg-popover border border-border rounded-md p-2 shadow-md"
                  >
                    <p className="text-xs font-medium">{data.band}</p>
                    <p className="text-xs text-muted-foreground">
                      {data.description}
                    </p>
                    <p className="text-xs mt-1">
                      <strong>{data.count}</strong> students (
                      {data.percentage}%)
                    </p>
                  </div>
                );
              }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <p className="text-xs text-muted-foreground text-center mt-2">
          Total: {data.stats.count} students with Lexile scores
        </p>

        {/* Explanation Box */}
        <div className="mt-4 pt-3 border-t border-border text-xs text-muted-foreground">
          <p>{CHART_EXPLANATIONS.lexile.en}</p>
        </div>
      </div>
    </TooltipProvider>
  );
}

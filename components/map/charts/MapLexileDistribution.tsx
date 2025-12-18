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

  // Format term label
  const formatTermLabel = (term: string): string => {
    const match = term.match(/^(Fall|Spring)\s+(\d{4})-(\d{4})$/);
    if (!match) return term;
    return `${match[1]} ${match[2]?.slice(2)}-${match[3]?.slice(2)}`;
  };

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
            <TooltipContent className="max-w-[280px]">
              <p className="text-xs">
                <strong>Lexile Framework</strong> measures reading ability and text complexity.
                Higher scores indicate advanced reading levels.
              </p>
              <ul className="text-xs mt-1 space-y-0.5">
                <li>• BR: Beginning Reader (below 0L)</li>
                <li>• 0-200L: Early Reader</li>
                <li>• 200-600L: Transitional</li>
                <li>• 600-1000L: Intermediate to Advanced</li>
                <li>• 1000L+: Proficient</li>
              </ul>
            </TooltipContent>
          </UITooltip>
        </div>
        <p className="text-xs text-muted-foreground text-center mb-2">
          Based on Reading ({formatTermLabel(data.termTested)})
        </p>
        <ResponsiveContainer width="100%" height={height}>
          <BarChart
            data={chartData}
            margin={{ top: 5, right: 30, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
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
        <div className="mt-3 p-2 bg-muted/50 rounded-md text-xs text-muted-foreground">
          <p className="mb-1">
            <strong>Note:</strong> Lexile scores are derived from MAP Reading assessments.
            They provide a standardized measure for matching students with appropriate reading materials.
          </p>
          <p>
            BR (Beginning Reader) represents scores below 0L. Not all students may have Lexile scores available.
          </p>
        </div>
      </div>
    </TooltipProvider>
  );
}

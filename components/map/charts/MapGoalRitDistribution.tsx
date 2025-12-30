"use client";

/**
 * MAP Goal RIT Distribution Chart
 *
 * Displays overall RIT distribution with Goal area overlays
 * Shows Gaussian curves for each Goal (Writing, Grammar, Mechanics for LU
 * or Informational, Literary, Vocabulary for Reading)
 *
 * Uses recharts ComposedChart with Area overlays
 */

import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Info } from "lucide-react";
import type { GoalRitDistributionData } from "@/lib/api/map-analytics";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { NWEA_COLORS } from "@/lib/map/colors";
import { formatTermStats } from "@/lib/map/utils";

interface MapGoalRitDistributionProps {
  data: GoalRitDistributionData | null;
  height?: number;
}

export function MapGoalRitDistribution({
  data,
  height = 320,
}: MapGoalRitDistributionProps) {
  if (!data || data.goals.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        No Goal RIT data available
      </div>
    );
  }

  // Merge all curves into a single dataset
  // Each point has: x, overall, goal1, goal2, goal3
  const mergedData: Record<string, number | null>[] = [];

  // Get all unique x values
  const allXValues = new Set<number>();
  data.overallStats.gaussianCurve.forEach((p) => allXValues.add(p.x));
  data.goals.forEach((g) => g.gaussianCurve.forEach((p) => allXValues.add(p.x)));

  const sortedX = Array.from(allXValues).sort((a, b) => a - b);

  // Build lookup maps for each curve
  const overallMap = new Map(data.overallStats.gaussianCurve.map((p) => [p.x, p.y]));
  const goalMaps = data.goals.map((g) => ({
    name: g.shortName,
    map: new Map(g.gaussianCurve.map((p) => [p.x, p.y])),
  }));

  // Merge into chart data
  for (const x of sortedX) {
    const point: Record<string, number | null> = { x };
    point.overall = overallMap.get(x) ?? null;
    for (const { name, map } of goalMaps) {
      point[name] = map.get(x) ?? null;
    }
    mergedData.push(point);
  }

  return (
    <TooltipProvider>
      <div className="w-full">
        {/* Header */}
        <div className="flex items-center justify-center gap-1 mb-1">
          <h4 className="text-sm font-medium text-center">
            G{data.grade} {data.course} Goal RIT Distribution
          </h4>
          <UITooltip>
            <TooltipTrigger asChild>
              <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-[320px]">
              <p className="text-xs">
                <strong>Goal RIT Distribution</strong> shows how students perform
                across different skill areas.
              </p>
              <ul className="text-xs mt-1 space-y-0.5">
                <li>• <strong>Black line</strong>: Overall RIT distribution</li>
                <li>• <strong>Colored areas</strong>: Individual goal distributions</li>
                <li>• Goals shifted right indicate stronger performance</li>
                <li>• Goals shifted left indicate areas for improvement</li>
              </ul>
              <p className="text-xs mt-2 pt-1 border-t border-border text-muted-foreground">
                Curves are fitted to Gaussian distributions for smooth visualization.
              </p>
            </TooltipContent>
          </UITooltip>
        </div>
        <p className="text-xs text-muted-foreground text-center mb-2">
          {formatTermStats(data.termTested)} • n={data.overallStats.count}
        </p>

        {/* Chart */}
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart
            data={mergedData}
            margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke={NWEA_COLORS.gridLine} />
            <XAxis
              dataKey="x"
              type="number"
              domain={["dataMin", "dataMax"]}
              tick={{ fontSize: 11 }}
              tickFormatter={(v) => Math.round(v).toString()}
              label={{
                value: "RIT Score",
                position: "insideBottom",
                offset: -2,
                style: { fontSize: 11 },
              }}
            />
            <YAxis
              tick={{ fontSize: 11 }}
              label={{
                value: "Density",
                angle: -90,
                position: "insideLeft",
                style: { fontSize: 11 },
              }}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || payload.length === 0) return null;
                return (
                  <div className="bg-popover border border-border rounded-md p-2 shadow-md">
                    <p className="text-xs font-medium mb-1">RIT: {Math.round(label as number)}</p>
                    {payload.map((entry, index) => (
                      <p key={index} className="text-xs" style={{ color: entry.color }}>
                        {entry.name}: {typeof entry.value === "number" ? entry.value.toFixed(2) : "-"}
                      </p>
                    ))}
                  </div>
                );
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: "11px", paddingTop: "10px" }}
              formatter={(value) => <span className="text-xs">{value}</span>}
            />

            {/* Goal areas (semi-transparent) */}
            {data.goals.map((goal, index) => (
              <Area
                key={goal.name}
                type="monotone"
                dataKey={goal.shortName}
                name={goal.shortName}
                stroke={goal.color}
                fill={goal.color}
                fillOpacity={0.15}
                strokeWidth={1.5}
                dot={false}
                connectNulls
              />
            ))}

            {/* Overall line (on top) */}
            <Line
              type="monotone"
              dataKey="overall"
              name="Overall"
              stroke="#1f2937"
              strokeWidth={2.5}
              dot={false}
              connectNulls
            />
          </ComposedChart>
        </ResponsiveContainer>

        {/* Stats Summary */}
        <div className="mt-3 pt-3 border-t border-border">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            {/* Overall Stats */}
            <div className="bg-muted/50 rounded p-2">
              <p className="font-medium">Overall</p>
              <p className="text-muted-foreground">
                μ={data.overallStats.mean} σ={data.overallStats.sd}
              </p>
            </div>
            {/* Goal Stats */}
            {data.goals.map((goal) => (
              <div
                key={goal.name}
                className="rounded p-2"
                style={{ backgroundColor: `${goal.color}15` }}
              >
                <p className="font-medium" style={{ color: goal.color }}>
                  {goal.shortName}
                </p>
                <p className="text-muted-foreground">
                  μ={goal.stats.mean} σ={goal.stats.sd}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Explanation */}
        <div className="mt-3 pt-2 border-t border-border text-xs text-muted-foreground">
          <p>
            {data.course === "Reading"
              ? "Reading goals: Informational Text, Literary Text, and Vocabulary."
              : "Language Usage goals: Writing, Grammar & Usage, and Mechanics."}
            {" "}A goal curve shifted right of overall indicates relative strength.
          </p>
        </div>
      </div>
    </TooltipProvider>
  );
}

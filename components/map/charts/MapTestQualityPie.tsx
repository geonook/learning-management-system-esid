"use client";

/**
 * MAP Test Quality Pie Chart
 *
 * 顯示測驗品質分佈：Normal / Caution / Flagged
 * 基於 Rapid Guessing Percent 分類
 */

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Info } from "lucide-react";
import type { TestQualityData } from "@/lib/api/map-analytics";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface MapTestQualityPieProps {
  data: TestQualityData | null;
  height?: number;
}

// Quality category colors
const QUALITY_COLORS = {
  normal: "#22c55e",    // green-500
  caution: "#f59e0b",   // amber-500
  flagged: "#ef4444",   // red-500
};

export function MapTestQualityPie({
  data,
  height = 280,
}: MapTestQualityPieProps) {
  if (!data) {
    return (
      <div className="flex items-center justify-center h-[280px] text-muted-foreground">
        No test quality data available
      </div>
    );
  }

  const chartData = [
    {
      name: "Normal (≤15%)",
      value: data.summary.normal.count,
      percentage: data.summary.normal.percentage,
      color: QUALITY_COLORS.normal,
    },
    {
      name: "Caution (15-30%)",
      value: data.summary.caution.count,
      percentage: data.summary.caution.percentage,
      color: QUALITY_COLORS.caution,
    },
    {
      name: "Flagged (>30%)",
      value: data.summary.flagged.count,
      percentage: data.summary.flagged.percentage,
      color: QUALITY_COLORS.flagged,
    },
  ];

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
            Test Quality Distribution
          </h4>
          <UITooltip>
            <TooltipTrigger asChild>
              <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
            </TooltipTrigger>
            <TooltipContent className="max-w-[280px]">
              <p className="text-xs">
                <strong>Test Quality Classification</strong> is based on the Rapid Guessing Percent
                from MAP assessments. Higher percentages may indicate unreliable results.
              </p>
              <ul className="text-xs mt-1 space-y-0.5">
                <li className="text-green-600">• Normal: Rapid Guessing ≤ 15%</li>
                <li className="text-amber-600">• Caution: 15% &lt; Rapid Guessing ≤ 30%</li>
                <li className="text-red-600">• Flagged: Rapid Guessing &gt; 30%</li>
              </ul>
            </TooltipContent>
          </UITooltip>
        </div>
        <p className="text-xs text-muted-foreground text-center mb-2">
          Based on Rapid Guessing % ({formatTermLabel(data.termTested)})
        </p>

        {/* Threshold Legend */}
        <div className="flex items-center justify-center gap-4 text-xs mb-2">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: QUALITY_COLORS.normal }}></span>
            <span>≤15%</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: QUALITY_COLORS.caution }}></span>
            <span>15-30%</span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: QUALITY_COLORS.flagged }}></span>
            <span>&gt;30%</span>
          </span>
        </div>
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
                `${value} tests`,
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
          Total: {data.summary.total} tests
        </p>

        {/* Explanation Box */}
        <div className="mt-3 p-2 bg-muted/50 rounded-md text-xs text-muted-foreground">
          <p className="mb-1">
            <strong>Note:</strong> This chart shows the distribution of test quality
            based on Rapid Guessing percentage. High percentages may indicate tests
            requiring review.
          </p>
          <p>
            <strong>Flagged Tests:</strong> {data.summary.flagged.count} tests with &gt;30% rapid guessing.
            {data.flaggedStudents.length > 0 && ` Review ${data.flaggedStudents.length} students.`}
          </p>
        </div>
      </div>
    </TooltipProvider>
  );
}

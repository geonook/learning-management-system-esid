"use client";

/**
 * MAP Lexile Statistics Cards
 *
 * Displays statistical summary of Lexile scores:
 * Count, Average, Median, Min, Max, Standard Deviation
 * Uses shadcn/ui Card component for clean number display
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatLexile } from "@/lib/map/lexile";
import type { LexileAnalysisData } from "@/lib/api/map-analytics";

interface MapLexileStatsProps {
  data: LexileAnalysisData | null;
}

export function MapLexileStats({ data }: MapLexileStatsProps) {
  if (!data) {
    return (
      <div className="flex items-center justify-center p-8 text-muted-foreground">
        No Lexile statistics available
      </div>
    );
  }

  const { stats } = data;

  // Format term label
  const formatTermLabel = (term: string): string => {
    const match = term.match(/^(Fall|Spring)\s+(\d{4})-(\d{4})$/);
    if (!match) return term;
    return `${match[1]} ${match[2]?.slice(2)}-${match[3]?.slice(2)}`;
  };

  // Stats cards data
  const statsCards = [
    {
      label: "Count",
      value: stats.count.toString(),
      description: "Students with Lexile scores",
    },
    {
      label: "Average",
      value: formatLexile(stats.avg),
      description: "Mean Lexile score",
    },
    {
      label: "Median",
      value: formatLexile(stats.median),
      description: "Middle value",
    },
    {
      label: "Min",
      value: formatLexile(stats.min),
      description: "Lowest score",
    },
    {
      label: "Max",
      value: formatLexile(stats.max),
      description: "Highest score",
    },
    {
      label: "Std Dev",
      value: stats.stdDev !== null ? stats.stdDev.toFixed(1) : "-",
      description: "Standard deviation",
    },
  ];

  return (
    <div className="w-full space-y-4">
      <div className="text-center">
        <h4 className="text-sm font-medium">
          G{data.grade} Lexile Statistics
        </h4>
        <p className="text-xs text-muted-foreground">
          {formatTermLabel(data.termTested)}
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {statsCards.map((stat) => (
          <Card key={stat.label} className="shadow-sm">
            <CardHeader className="pb-2 pt-4">
              <CardTitle className="text-xs font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stat.description}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Info Box */}
      <div className="p-3 bg-muted/50 rounded-md text-xs text-muted-foreground">
        <p>
          <strong>Lexile Statistics:</strong> These metrics summarize the reading
          proficiency levels across all students in Grade {data.grade}.
          Use these statistics to understand the overall reading level distribution
          and identify students who may need additional support or challenge.
        </p>
      </div>
    </div>
  );
}

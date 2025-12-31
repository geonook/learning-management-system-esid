"use client";

/**
 * Cross-Grade Growth Comparison Chart
 *
 * 顯示 G3-G6 各年級的成長指數比較
 * 使用分組條形圖，一眼看出各年級的成長差異
 */

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
  Cell,
} from "recharts";
import { Info, TrendingUp } from "lucide-react";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CrossGradeGrowthData } from "@/lib/api/map-growth-analytics";
import { NWEA_COLORS, getGrowthQuintileColor } from "@/lib/map/colors";

interface CrossGradeGrowthChartProps {
  data: CrossGradeGrowthData | null;
  height?: number;
  /** Whether NWEA official benchmark is available for this growth period */
  hasOfficialBenchmark?: boolean;
}

// 課程顏色
const COURSE_COLORS = {
  reading: "#3b82f6", // blue-500
  languageUsage: "#f97316", // orange-500
};

export function CrossGradeGrowthChart({
  data,
  height = 280,
  hasOfficialBenchmark = true,
}: CrossGradeGrowthChartProps) {
  if (!data || data.grades.length === 0) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-[280px] text-muted-foreground">
          No cross-grade growth data available
        </CardContent>
      </Card>
    );
  }

  // 準備圖表資料（使用 toGrade 作為 X 軸標籤，過濾無資料年級）
  const chartData = data.grades
    .filter((g) => g.reading.studentCount > 0 || g.languageUsage.studentCount > 0)
    .map((g) => ({
      // X 軸顯示結束年級，畢業生加上標註
      grade: g.isGraduated ? `G${g.toGrade} (Grad.)` : `G${g.toGrade}`,
      gradeNum: g.grade,           // fromGrade：用於 NWEA norm 查詢
      toGradeNum: g.toGrade,       // toGrade：用於 tooltip 顯示
      isGraduated: g.isGraduated,  // 用於 tooltip 顯示畢業狀態
      reading: g.reading.growthIndex,
      readingGrowth: g.reading.avgGrowth,
      readingCount: g.reading.studentCount,
      readingCGP: g.reading.avgCGP,
      languageUsage: g.languageUsage.growthIndex,
      languageGrowth: g.languageUsage.avgGrowth,
      languageCount: g.languageUsage.studentCount,
      languageCGP: g.languageUsage.avgCGP,
    }));

  // 自訂 Tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || payload.length === 0) return null;

    const gradeData = payload[0]?.payload;
    const gradeNum = gradeData?.gradeNum;
    const expected = data.nweaExpected[gradeNum];

    return (
      <div className="bg-popover border border-border rounded-md p-3 shadow-md text-sm">
        <p className="font-semibold mb-2">{label} Growth Analysis</p>
        {gradeData?.isGraduated && (
          <p className="text-xs text-amber-600 dark:text-amber-400 mb-2">
            These students have since graduated
          </p>
        )}

        <div className="space-y-2">
          {/* Reading */}
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: COURSE_COLORS.reading }}
            />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Reading</p>
              <p className="font-medium">
                Index: <span style={{ color: getGrowthQuintileColor(gradeData?.reading) }}>
                  {gradeData?.reading?.toFixed(2) ?? "N/A"}
                </span>
                {gradeData?.readingCGP !== null && gradeData?.readingCGP !== undefined && (
                  <span className="ml-2 text-muted-foreground">
                    cGP: <span className="text-foreground">{gradeData.readingCGP}<sup className="text-[9px]">th</sup></span>
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                Avg Growth: +{gradeData?.readingGrowth?.toFixed(1)} RIT ({gradeData?.readingCount} students)
              </p>
              {expected && (
                <p className="text-xs text-muted-foreground">
                  Expected: +{expected.reading?.toFixed(1)} RIT
                </p>
              )}
            </div>
          </div>

          {/* Language Usage */}
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded"
              style={{ backgroundColor: COURSE_COLORS.languageUsage }}
            />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Language Usage</p>
              <p className="font-medium">
                Index: <span style={{ color: getGrowthQuintileColor(gradeData?.languageUsage) }}>
                  {gradeData?.languageUsage?.toFixed(2) ?? "N/A"}
                </span>
                {gradeData?.languageCGP !== null && gradeData?.languageCGP !== undefined && (
                  <span className="ml-2 text-muted-foreground">
                    cGP: <span className="text-foreground">{gradeData.languageCGP}<sup className="text-[9px]">th</sup></span>
                  </span>
                )}
              </p>
              <p className="text-xs text-muted-foreground">
                Avg Growth: +{gradeData?.languageGrowth?.toFixed(1)} RIT ({gradeData?.languageCount} students)
              </p>
              {expected && (
                <p className="text-xs text-muted-foreground">
                  Expected: +{expected.languageUsage?.toFixed(1)} RIT
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <TooltipProvider>
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-blue-600" />
              <CardTitle className="text-base">Cross-Grade Growth Comparison</CardTitle>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[340px]">
                  <p className="text-xs mb-2">
                    <strong>Growth Index</strong> = Actual Growth / Expected Growth
                  </p>
                  <p className="text-xs mb-2">
                    <strong>cGP (Conditional Growth Percentile)</strong> = Percentile ranking that accounts for starting RIT score (1-99)
                  </p>
                  <p className="text-xs mb-2">
                    Index of <strong>1.0</strong> = met expectations. cGP of <strong>50</strong> = average growth for similar starting scores.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    This chart shows all grades (G3-G6) side by side for quick comparison.
                  </p>
                </TooltipContent>
              </UITooltip>
            </div>
          </div>
          <CardDescription>
            {data.fromTerm} → {data.toTerm}
            {hasOfficialBenchmark && " | Target: 1.0"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={height}>
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 20, left: 0, bottom: 5 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke={NWEA_COLORS.gridLine} />
              <XAxis
                dataKey="grade"
                tick={{ fontSize: 12 }}
              />
              <YAxis
                domain={[0, 'auto']}
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => v.toFixed(1)}
                label={{
                  value: "Growth Index",
                  angle: -90,
                  position: "insideLeft",
                  style: { fontSize: 11, fill: "hsl(var(--muted-foreground))" },
                }}
              />
              <Tooltip content={<CustomTooltip />} />

              {/* Target Line at 1.0 */}
              <ReferenceLine
                y={1.0}
                stroke={NWEA_COLORS.norm}
                strokeWidth={2}
                strokeDasharray="5 5"
                label={{
                  value: "Target (1.0)",
                  position: "right",
                  fontSize: 10,
                  fill: NWEA_COLORS.norm,
                }}
              />

              {/* Reading Bar */}
              <Bar
                dataKey="reading"
                name="Reading"
                fill={COURSE_COLORS.reading}
                radius={[4, 4, 0, 0]}
                barSize={20}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`reading-${index}`}
                    fill={getGrowthQuintileColor(entry.reading)}
                  />
                ))}
              </Bar>

              {/* Language Usage Bar */}
              <Bar
                dataKey="languageUsage"
                name="Language Usage"
                fill={COURSE_COLORS.languageUsage}
                radius={[4, 4, 0, 0]}
                barSize={20}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={`lu-${index}`}
                    fill={getGrowthQuintileColor(entry.languageUsage)}
                  />
                ))}
              </Bar>

              <Legend
                verticalAlign="top"
                height={36}
                formatter={(value: string) => (
                  <span className="text-xs">{value}</span>
                )}
              />
            </BarChart>
          </ResponsiveContainer>

          {/* How to read */}
          <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
            <p>
              <strong>How to read:</strong> Each bar represents a grade&apos;s Growth Index.
              Colors indicate quintile: <span className="text-green-600">Green</span> (High/HiAvg),{" "}
              <span className="text-blue-600">Blue</span> (Avg),{" "}
              <span className="text-yellow-600">Yellow</span> (LoAvg),{" "}
              <span className="text-red-600">Red</span> (Low).
              Bars above the dashed line exceeded growth expectations.
            </p>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}

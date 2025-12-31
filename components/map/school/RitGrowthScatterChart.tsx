"use client";

/**
 * RIT-Growth Scatter Chart
 *
 * 散佈圖顯示起始 RIT 分數與成長的關係
 * 用於識別天花板效應和補救教學效果
 */

import { useMemo } from "react";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  ZAxis,
  Line,
  ComposedChart,
} from "recharts";
import { Info } from "lucide-react";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { RitGrowthScatterData } from "@/lib/api/map-school-analytics";

interface RitGrowthScatterChartProps {
  data: RitGrowthScatterData;
  height?: number;
}

// Grade 配色
const GRADE_COLORS: Record<number, string> = {
  3: "#3b82f6", // blue
  4: "#22c55e", // green
  5: "#f59e0b", // amber
  6: "#a855f7", // purple
};

export function RitGrowthScatterChart({
  data,
  height = 320,
}: RitGrowthScatterChartProps) {
  // 按年級分組
  const gradeData = useMemo(() => {
    const grouped: Record<number, typeof data.points> = {
      3: [],
      4: [],
      5: [],
      6: [],
    };
    for (const point of data.points) {
      const gradeGroup = grouped[point.grade];
      if (gradeGroup) {
        gradeGroup.push(point);
      }
    }
    return grouped;
  }, [data]);

  // 計算軸範圍
  const xDomain = useMemo(() => {
    const padding = 5;
    return [
      Math.floor((data.stats.minRit - padding) / 10) * 10,
      Math.ceil((data.stats.maxRit + padding) / 10) * 10,
    ];
  }, [data.stats.minRit, data.stats.maxRit]);

  const yDomain = useMemo(() => {
    const padding = 3;
    return [
      Math.floor(data.stats.minGrowth - padding),
      Math.ceil(data.stats.maxGrowth + padding),
    ];
  }, [data.stats.minGrowth, data.stats.maxGrowth]);

  // 相關性解讀（增強版，包含教學意涵）
  const correlationInterpretation = useMemo(() => {
    const r = data.stats.correlation;
    const r2 = r * r;
    const explainedVariance = Math.round(r2 * 100);

    if (r >= 0.5) {
      return {
        strength: "Strong positive",
        text: "Higher starting RIT shows more growth",
        color: "text-green-600",
        explainedVariance,
      };
    }
    if (r >= 0.3) {
      return {
        strength: "Moderate positive",
        text: "Some tendency for higher RIT to show more growth",
        color: "text-green-500",
        explainedVariance,
      };
    }
    if (r >= 0.1) {
      return {
        strength: "Weak positive",
        text: "Slight tendency for higher RIT to show more growth",
        color: "text-yellow-600",
        explainedVariance,
      };
    }
    if (r >= -0.1) {
      return {
        strength: "No correlation",
        text: "Growth is independent of starting RIT",
        color: "text-gray-500",
        explainedVariance,
      };
    }
    if (r >= -0.3) {
      return {
        strength: "Weak negative",
        text: "Slight ceiling effect - high performers show less growth",
        color: "text-orange-500",
        explainedVariance,
      };
    }
    if (r >= -0.5) {
      return {
        strength: "Moderate negative",
        text: "Ceiling effect present - high performers have less room to grow",
        color: "text-orange-600",
        explainedVariance,
      };
    }
    return {
      strength: "Strong negative",
      text: "Strong ceiling effect - high performers showing less growth",
      color: "text-red-600",
      explainedVariance,
    };
  }, [data.stats.correlation]);

  // 趨勢線資料（使用 API 回傳的 slope 和 intercept）
  const trendLineData = useMemo(() => {
    const { slope, intercept } = data.stats;
    const xMin = xDomain[0] ?? 150;
    const xMax = xDomain[1] ?? 250;
    // 生成趨勢線的兩個端點
    return [
      { x: xMin, y: slope * xMin + intercept },
      { x: xMax, y: slope * xMax + intercept },
    ];
  }, [data.stats, xDomain]);

  // Period 類型標籤
  const periodLabel = useMemo(() => {
    const periodType = data.periodType;
    switch (periodType) {
      case "fall-to-fall":
        return "Fall-to-Fall (1 Year)";
      case "fall-to-spring":
        return "Fall-to-Spring (Within Year)";
      case "winter-to-spring":
        return "Winter-to-Spring";
      default:
        return "Custom Period";
    }
  }, [data.periodType]);

  return (
    <TooltipProvider>
      <div className="w-full">
        {/* 統計摘要 */}
        <div className="mb-4 flex gap-4 text-sm flex-wrap">
          {/* 學生數（含說明） */}
          <div className="px-3 py-1.5 bg-muted rounded-md flex items-center gap-1">
            <span className="text-muted-foreground">Students: </span>
            <span className="font-medium">{data.points.length}</span>
            <UITooltip>
              <TooltipTrigger asChild>
                <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[280px]">
                <p className="text-xs">
                  Only students with assessment data in <strong>both</strong>{" "}
                  {data.fromTerm} and {data.toTerm} are included. Students missing
                  either term are excluded from growth analysis.
                </p>
              </TooltipContent>
            </UITooltip>
          </div>

          {/* Period 標籤 */}
          <div className="px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-md">
            <span className="text-blue-700 font-medium text-xs">
              📅 {periodLabel}
            </span>
          </div>

          {/* 相關係數（增強顯示） */}
          <div className="px-3 py-1.5 bg-muted rounded-md flex items-center gap-1">
            <span className="text-muted-foreground">Correlation: </span>
            <span className={`font-medium ${correlationInterpretation.color}`}>
              r = {data.stats.correlation.toFixed(2)}
            </span>
            <span className="text-muted-foreground text-xs">
              ({correlationInterpretation.strength})
            </span>
            <UITooltip>
              <TooltipTrigger asChild>
                <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[280px]">
                <p className="text-xs mb-1">
                  <strong>R² = {correlationInterpretation.explainedVariance}%</strong> of
                  growth variance is explained by starting RIT.
                </p>
                <p className="text-xs text-muted-foreground">
                  {correlationInterpretation.text}
                </p>
              </TooltipContent>
            </UITooltip>
          </div>
        </div>

      {/* 散佈圖 */}
      <ResponsiveContainer width="100%" height={height}>
        <ScatterChart margin={{ top: 10, right: 20, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            type="number"
            dataKey="startRit"
            name="Starting RIT"
            domain={xDomain}
            tick={{ fontSize: 11 }}
            label={{
              value: "Starting RIT",
              position: "insideBottom",
              offset: -10,
              style: { fontSize: 11 },
            }}
          />
          <YAxis
            type="number"
            dataKey="growth"
            name="Growth"
            domain={yDomain}
            tick={{ fontSize: 11 }}
            width={40}
            label={{
              value: "Growth",
              angle: -90,
              position: "insideLeft",
              style: { textAnchor: "middle", fontSize: 11 },
            }}
          />
          <ZAxis range={[30, 30]} />
          <Tooltip
            content={({ active, payload }) => {
              if (!active || !payload || payload.length === 0) return null;
              const d = payload[0]?.payload;
              return (
                <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                  <p className="font-medium text-sm mb-1">Grade {d?.grade}</p>
                  <div className="text-xs space-y-1">
                    <div>
                      <span className="text-muted-foreground">
                        Starting RIT:{" "}
                      </span>
                      <span className="font-medium">{d?.startRit}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Growth: </span>
                      <span
                        className={`font-medium ${
                          d?.growth >= 0 ? "text-green-600" : "text-red-600"
                        }`}
                      >
                        {d?.growth >= 0 ? "+" : ""}
                        {d?.growth}
                      </span>
                    </div>
                  </div>
                </div>
              );
            }}
          />
          {/* 零成長參考線 */}
          <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />

          {/* 趨勢線 */}
          <ReferenceLine
            segment={[
              { x: trendLineData[0]?.x ?? 150, y: trendLineData[0]?.y ?? 0 },
              { x: trendLineData[1]?.x ?? 250, y: trendLineData[1]?.y ?? 0 },
            ]}
            stroke="#6366f1"
            strokeWidth={2}
            strokeDasharray="5 3"
            ifOverflow="extendDomain"
          />

          {/* 各年級散點 */}
          {([3, 4, 5, 6] as const).map((grade) => (
            <Scatter
              key={grade}
              name={`G${grade}`}
              data={gradeData[grade]}
              fill={GRADE_COLORS[grade]}
              opacity={0.7}
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>

      {/* 圖例 */}
      <div className="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground justify-center">
        {([3, 4, 5, 6] as const).map((grade) => (
          <div key={grade} className="flex items-center gap-1">
            <span
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: GRADE_COLORS[grade] }}
            />
            <span>
              G{grade} ({gradeData[grade]?.length ?? 0})
            </span>
          </div>
        ))}
        {/* 趨勢線圖例 */}
        <div className="flex items-center gap-1">
          <span
            className="w-4 h-0.5"
            style={{
              backgroundColor: "#6366f1",
              borderStyle: "dashed",
            }}
          />
          <span>Trend Line</span>
        </div>
      </div>

      {/* 解讀說明 */}
      <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground space-y-1">
        <p>
          <strong>How to read:</strong> Each dot represents a student. Points
          below the dashed line show negative growth. The purple trend line
          shows the linear regression fit. {correlationInterpretation.text}.
        </p>
        <p className="text-muted-foreground/80">
          <strong>Note:</strong> Grade shown is the <em>starting grade</em> ({data.fromTerm}).
          Students who were G3 in {data.fromTerm} are now G4 in {data.toTerm}.
        </p>
      </div>
      </div>
    </TooltipProvider>
  );
}

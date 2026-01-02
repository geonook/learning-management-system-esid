"use client";

/**
 * MapGradeGrowthDistribution
 *
 * Per-grade Growth Distribution chart with NWEA Norm overlay
 * Like Colab's Grade-Level Analysis:
 * - Histogram with KCIS student growth distribution
 * - Gaussian fit curve (black line)
 * - NWEA Norm curve overlay (purple line)
 * - Negative growth area highlighted (red shaded)
 * - Statistics panel (R², Mean±SD, Max/Min)
 */

import { useMemo } from "react";
import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Area,
  ReferenceLine,
  ReferenceArea,
} from "recharts";
import { Info, AlertTriangle } from "lucide-react";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { GradeGrowthDistributionData } from "@/lib/api/map-analytics";
import { interpretRSquared } from "@/lib/map/statistics";
import { GROWTH_DISTRIBUTION_COLORS, GAUSSIAN_FIT_COLORS } from "@/lib/map/colors";

interface MapGradeGrowthDistributionProps {
  data: GradeGrowthDistributionData;
  height?: number;
}

export function MapGradeGrowthDistribution({
  data,
  height = 320,
}: MapGradeGrowthDistributionProps) {
  // 計算圖表資料
  const { chartData, minX, maxX } = useMemo(() => {
    // 為每個 distribution bucket 加入顏色
    const bucketsWithColor = data.distribution.map((bucket) => {
      let color: string;
      if (bucket.isNegative) {
        color = GROWTH_DISTRIBUTION_COLORS.negative;
      } else if (bucket.max <= 5) {
        color = GROWTH_DISTRIBUTION_COLORS.low;
      } else if (bucket.max <= 10) {
        color = GROWTH_DISTRIBUTION_COLORS.medium;
      } else if (bucket.max <= 15) {
        color = GROWTH_DISTRIBUTION_COLORS.high;
      } else {
        color = GROWTH_DISTRIBUTION_COLORS.veryHigh;
      }

      // 找到對應的 KCIS Gaussian 值
      const midpoint = (bucket.min + bucket.max) / 2;
      const kcisGaussian = data.gaussianCurve.find(
        (g) => Math.abs(g.x - midpoint) < 2.5
      );
      const nweaGaussian = data.nweaNormCurve?.find(
        (g) => Math.abs(g.x - midpoint) < 2.5
      );

      return {
        ...bucket,
        color,
        midpoint,
        kcisGaussian: kcisGaussian?.y ?? null,
        nweaGaussian: nweaGaussian?.y ?? null,
      };
    });

    // 計算 X 軸範圍
    const minVal = Math.min(...data.distribution.map((b) => b.min));
    const maxVal = Math.max(...data.distribution.map((b) => b.max));

    return {
      chartData: bucketsWithColor,
      minX: minVal,
      maxX: maxVal,
    };
  }, [data]);

  const r2Interpretation = interpretRSquared(data.gaussianFit.rSquared);

  // Period 類型標籤
  const periodLabel = useMemo(() => {
    switch (data.periodType) {
      case "fall-to-fall":
        return "Fall-to-Fall (1 Year)";
      case "fall-to-spring":
        return "Fall-to-Spring (Within Year)";
      case "fall-to-winter":
        return "Fall-to-Winter";
      case "winter-to-spring":
        return "Winter-to-Spring";
      default:
        return "Custom Period";
    }
  }, [data.periodType]);

  // 計算正成長百分比
  const positiveGrowthPercentage = 100 - data.negativePercentage;

  return (
    <TooltipProvider>
      <div className="w-full">
        {/* 標題與說明 */}
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium">
              G{data.grade} {data.course} Growth Distribution
            </h4>
            <p className="text-xs text-muted-foreground">
              {data.fromTerm} → {data.toTerm}
            </p>
          </div>
        </div>

        {/* 負成長警示 */}
        {data.negativePercentage > 0 && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            <span className="text-sm text-red-700 dark:text-red-300">
              <strong>{data.negativeCount}</strong> students ({data.negativePercentage}%)
              showed negative growth
            </span>
          </div>
        )}

        {/* 統計摘要 */}
        <div className="mb-4 flex flex-wrap gap-2 text-sm">
          {/* Period 標籤 */}
          <div className="px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-md">
            <span className="text-blue-700 font-medium text-xs">
              📅 {periodLabel}
            </span>
          </div>

          {/* 學生數 */}
          <div className="px-2.5 py-1 bg-muted rounded-md flex items-center gap-1">
            <span className="text-muted-foreground text-xs">Students:</span>
            <span className="font-medium text-xs">{data.totalStudents}</span>
          </div>

          {/* KCIS 平均成長 */}
          <div className="px-2.5 py-1 bg-muted rounded-md">
            <span className="text-muted-foreground text-xs">KCIS Mean: </span>
            <span
              className={`font-medium text-xs ${
                data.meanGrowth >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {data.meanGrowth >= 0 ? "+" : ""}
              {data.meanGrowth}
            </span>
            <span className="text-muted-foreground text-xs ml-1">
              (±{data.stdDev})
            </span>
          </div>

          {/* NWEA Norm（如果有） */}
          {data.nweaNorm && (
            <div className="px-2.5 py-1 bg-purple-50 border border-purple-200 rounded-md flex items-center gap-1">
              <span className="text-purple-700 text-xs">NWEA Norm: </span>
              <span className="font-medium text-purple-700 text-xs">
                {data.nweaNorm.mean.toFixed(2)}
              </span>
              <span className="text-purple-600 text-xs">
                (±{data.nweaNorm.stdDev.toFixed(2)})
              </span>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3 h-3 text-purple-500 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[280px]">
                  <p className="text-xs">
                    NWEA 2025 Growth Norm for G{data.grade - 1}→G{data.grade}{" "}
                    {data.course}. Purple curve shows national average growth
                    distribution.
                  </p>
                </TooltipContent>
              </UITooltip>
            </div>
          )}

          {/* R² 擬合品質 */}
          <div className="px-2.5 py-1 bg-muted rounded-md flex items-center gap-1">
            <span className="text-muted-foreground text-xs">Fit: </span>
            <span
              className="font-medium text-xs"
              style={{ color: r2Interpretation.color }}
            >
              R² = {data.gaussianFit.rSquared.toFixed(2)}
            </span>
            <UITooltip>
              <TooltipTrigger asChild>
                <Info className="w-3 h-3 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[320px]">
                <p className="text-xs mb-2">
                  <strong>R² (Goodness of Fit)</strong> measures how well the histogram
                  matches a normal (bell curve) distribution.
                </p>
                <p className="text-xs mb-2">
                  R² = {data.gaussianFit.rSquared.toFixed(2)} means <strong>{Math.round(data.gaussianFit.rSquared * 100)}%</strong> of
                  the variation in student growth is explained by the normal curve.
                </p>
                <p className="text-xs text-muted-foreground">
                  {r2Interpretation.color === "#22c55e"
                    ? "✅ High R² (≥0.8): Growth is normally distributed."
                    : r2Interpretation.color === "#eab308"
                    ? "⚠️ Moderate R² (0.5-0.8): Some deviation from normal."
                    : "❌ Low R² (<0.5): Significant deviation - investigate for outliers."}
                </p>
              </TooltipContent>
            </UITooltip>
          </div>

          {/* 正成長百分比 */}
          <div className="px-2.5 py-1 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md flex items-center gap-1">
            <span className="text-green-700 dark:text-green-400 font-medium text-xs">
              ✅ {positiveGrowthPercentage}% positive growth
            </span>
            <UITooltip>
              <TooltipTrigger asChild>
                <Info className="w-3 h-3 text-green-500 cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[280px]">
                <p className="text-xs">
                  <strong>{data.totalStudents - data.negativeCount}</strong> out of{" "}
                  <strong>{data.totalStudents}</strong> students showed RIT score improvement
                  (growth {">"} 0). This is a simple count, not a measure of growth quality.
                </p>
              </TooltipContent>
            </UITooltip>
          </div>
        </div>

        {/* 成長範圍統計 */}
        <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
          <div className="flex justify-between text-xs">
            <div>
              <span className="text-muted-foreground">Min Growth: </span>
              <span
                className={`font-medium ${
                  data.minGrowth < 0 ? "text-red-600" : "text-foreground"
                }`}
              >
                {data.minGrowth >= 0 ? "+" : ""}
                {data.minGrowth}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Max Growth: </span>
              <span className="font-medium text-green-600">
                +{data.maxGrowth}
              </span>
            </div>
          </div>
        </div>

        {/* 圖表 */}
        <ResponsiveContainer width="100%" height={height}>
          <ComposedChart
            data={chartData}
            margin={{ top: 10, right: 20, left: 20, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />

            {/* 負成長區域背景 */}
            <ReferenceArea
              x1={minX}
              x2={0}
              fill={GAUSSIAN_FIT_COLORS.negativeArea}
              fillOpacity={1}
            />

            <XAxis
              dataKey="midpoint"
              type="number"
              domain={[minX, maxX]}
              tick={{ fontSize: 10 }}
              tickFormatter={(v) => `${v}`}
              label={{
                value: "Growth (RIT)",
                position: "insideBottom",
                offset: -10,
                style: { fontSize: 11 },
              }}
            />
            <YAxis
              tick={{ fontSize: 10 }}
              width={35}
              label={{
                value: "Count",
                angle: -90,
                position: "insideLeft",
                style: { textAnchor: "middle", fontSize: 11 },
              }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || payload.length === 0) return null;
                const d = payload[0]?.payload;
                return (
                  <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                    <p className="font-medium text-sm mb-1">{d?.range} RIT</p>
                    <div className="text-xs space-y-1">
                      <div>
                        <span className="text-muted-foreground">Count: </span>
                        <span className="font-medium">{d?.count}</span>
                        <span className="text-muted-foreground ml-1">
                          ({d?.percentage}%)
                        </span>
                      </div>
                      {d?.kcisGaussian !== null && (
                        <div>
                          <span className="text-muted-foreground">
                            KCIS Expected:{" "}
                          </span>
                          <span className="font-medium">
                            {d.kcisGaussian.toFixed(1)}
                          </span>
                        </div>
                      )}
                      {d?.nweaGaussian !== null && (
                        <div>
                          <span className="text-purple-600">NWEA Norm: </span>
                          <span className="font-medium text-purple-600">
                            {d.nweaGaussian.toFixed(1)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }}
            />

            {/* 零成長參考線 */}
            <ReferenceLine x={0} stroke="#94a3b8" strokeDasharray="3 3" />

            {/* 直方圖 */}
            <Bar dataKey="count" radius={[3, 3, 0, 0]} barSize={20}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Bar>

            {/* KCIS Gaussian 擬合曲線（黑色） */}
            <Line
              type="monotone"
              dataKey="kcisGaussian"
              stroke={GAUSSIAN_FIT_COLORS.kcis}
              strokeWidth={2}
              dot={false}
              name="KCIS Fit"
              connectNulls
            />

            {/* NWEA Norm 曲線（紫色） */}
            {data.nweaNormCurve && (
              <Line
                type="monotone"
                dataKey="nweaGaussian"
                stroke={GAUSSIAN_FIT_COLORS.nwea}
                strokeWidth={2.5}
                strokeDasharray="5 3"
                dot={false}
                name="NWEA Norm"
                connectNulls
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>

        {/* 圖例 */}
        <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground justify-center">
          <div className="flex items-center gap-1">
            <span
              className="w-3 h-3 rounded"
              style={{ backgroundColor: GROWTH_DISTRIBUTION_COLORS.negative }}
            />
            <span>Negative</span>
          </div>
          <div className="flex items-center gap-1">
            <span
              className="w-3 h-3 rounded"
              style={{ backgroundColor: GROWTH_DISTRIBUTION_COLORS.low }}
            />
            <span>0-5</span>
          </div>
          <div className="flex items-center gap-1">
            <span
              className="w-3 h-3 rounded"
              style={{ backgroundColor: GROWTH_DISTRIBUTION_COLORS.medium }}
            />
            <span>5-10</span>
          </div>
          <div className="flex items-center gap-1">
            <span
              className="w-3 h-3 rounded"
              style={{ backgroundColor: GROWTH_DISTRIBUTION_COLORS.high }}
            />
            <span>10+</span>
          </div>
          <div className="flex items-center gap-1">
            <span
              className="w-5 h-0.5"
              style={{ backgroundColor: GAUSSIAN_FIT_COLORS.kcis }}
            />
            <span>KCIS Fit</span>
          </div>
          {data.nweaNorm && (
            <div className="flex items-center gap-1">
              <span
                className="w-5 h-0.5"
                style={{
                  backgroundColor: GAUSSIAN_FIT_COLORS.nwea,
                  borderTop: "2px dashed",
                }}
              />
              <span>NWEA Norm</span>
            </div>
          )}
        </div>

        {/* 解讀說明 */}
        <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground space-y-1">
          <p>
            <strong>How to read:</strong> Histogram shows KCIS G{data.grade}{" "}
            {data.course} growth distribution. Black curve is Gaussian fit to
            student data.
            {data.nweaNorm && (
              <>
                {" "}
                Purple dashed curve shows NWEA national norm (
                {data.nweaNorm.mean.toFixed(1)}±{data.nweaNorm.stdDev.toFixed(1)}
                ).
              </>
            )}{" "}
            Red shaded area indicates negative growth.
          </p>
          {data.nweaNorm && (
            <p>
              <strong>Curves explained:</strong> The <span className="font-medium">black solid curve</span> (KCIS Fit)
              is fitted to our students&apos; actual data. The <span className="text-purple-600 dark:text-purple-400 font-medium">purple dashed curve</span> (NWEA Norm)
              shows the expected distribution based on NWEA 2025 national norms for comparison.
            </p>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

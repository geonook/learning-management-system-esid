"use client";

/**
 * Growth Distribution Chart
 *
 * 成長分佈直方圖，顯示 Fall-to-Fall 成長分佈
 * 紅色標記負成長學生
 * 包含高斯擬合曲線和 R² 品質指標
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
} from "recharts";
import { AlertTriangle, Info } from "lucide-react";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { SchoolGrowthDistributionData } from "@/lib/api/map-school-analytics";
import {
  generateGaussianCurve,
  calculateRSquared,
  interpretRSquared,
} from "@/lib/map/statistics";
import { SCHOOL_CHART_COLORS } from "@/lib/map/colors";

interface GrowthDistributionChartProps {
  data: SchoolGrowthDistributionData;
  height?: number;
}

// 配色
const GROWTH_COLORS = {
  negative: "#ef4444", // red-500
  low: "#f97316", // orange-500
  medium: "#eab308", // yellow-500
  high: "#22c55e", // green-500
  veryHigh: "#16a34a", // green-600
};

// Bin width for histogram (matching the bucket ranges)
const BIN_WIDTH = 5;

export function GrowthDistributionChart({
  data,
  height = 280,
}: GrowthDistributionChartProps) {
  // 為每個 bucket 分配顏色，並加入高斯擬合值
  const { chartData, gaussianCurve, rSquared } = useMemo(() => {
    // 計算每個 bucket 的中點用於高斯擬合
    const bucketsWithMidpoint = data.distribution.map((bucket) => {
      let color: string;
      if (bucket.isNegative) {
        color = GROWTH_COLORS.negative;
      } else if (bucket.max <= 5) {
        color = GROWTH_COLORS.low;
      } else if (bucket.max <= 10) {
        color = GROWTH_COLORS.medium;
      } else if (bucket.max <= 15) {
        color = GROWTH_COLORS.high;
      } else {
        color = GROWTH_COLORS.veryHigh;
      }

      // 計算 bucket 中點（處理無限範圍）
      const midpoint =
        bucket.min === -Infinity
          ? bucket.max - BIN_WIDTH / 2
          : bucket.max === Infinity
            ? bucket.min + BIN_WIDTH / 2
            : (bucket.min + bucket.max) / 2;

      return {
        ...bucket,
        color,
        midpoint,
      };
    });

    // 生成高斯擬合曲線
    const curve = generateGaussianCurve(
      data.meanGrowth,
      data.stdDev,
      -10, // minX
      25, // maxX
      data.totalStudents,
      BIN_WIDTH,
      30 // numPoints
    );

    // 計算 R²
    const observed = bucketsWithMidpoint.map((b) => ({
      midpoint: b.midpoint,
      count: b.count,
    }));
    const r2 = calculateRSquared(
      observed,
      data.meanGrowth,
      data.stdDev,
      data.totalStudents,
      BIN_WIDTH
    );

    // 合併 bar 資料與 gaussian 曲線資料
    // 為了在同一圖表顯示，需要合併兩個資料集
    const combinedData = bucketsWithMidpoint.map((bucket) => {
      // 找到最接近的 gaussian 值
      const nearestGaussian = curve.find(
        (g) => Math.abs(g.x - bucket.midpoint) < BIN_WIDTH / 2
      );
      return {
        ...bucket,
        gaussian: nearestGaussian?.y ?? null,
      };
    });

    return {
      chartData: combinedData,
      gaussianCurve: curve,
      rSquared: r2,
    };
  }, [data]);

  const r2Interpretation = interpretRSquared(rSquared);

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

  // 計算正成長百分比
  const positiveGrowthPercentage = useMemo(() => {
    return Math.round((1 - data.negativeGrowthCount / data.totalStudents) * 100);
  }, [data.negativeGrowthCount, data.totalStudents]);

  return (
    <TooltipProvider>
      <div className="w-full">
        {/* 負成長警示 */}
        {data.negativeGrowthPercentage > 0 && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400" />
            <span className="text-sm text-red-700 dark:text-red-300">
              <strong>{data.negativeGrowthCount}</strong> students (
              {data.negativeGrowthPercentage}%) showed negative growth
            </span>
          </div>
        )}

        {/* 統計摘要 */}
        <div className="mb-4 flex flex-wrap gap-3 text-sm">
          {/* Period 標籤（優先顯示） */}
          <div className="px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-md">
            <span className="text-blue-700 font-medium text-xs">
              📅 {periodLabel}
            </span>
          </div>

          {/* 學生數（含說明） */}
          <div className="px-3 py-1.5 bg-muted rounded-md flex items-center gap-1">
            <span className="text-muted-foreground">Students: </span>
            <span className="font-medium">{data.totalStudents}</span>
            <UITooltip>
              <TooltipTrigger asChild>
                <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[280px]">
                <p className="text-xs">
                  Only students with assessment data in <strong>both</strong>{" "}
                  {data.fromTerm} and {data.toTerm} are included in growth analysis.
                </p>
              </TooltipContent>
            </UITooltip>
          </div>

          {/* 平均成長 */}
          <div className="px-3 py-1.5 bg-muted rounded-md">
            <span className="text-muted-foreground">Mean Growth: </span>
            <span
              className={`font-medium ${
                data.meanGrowth >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {data.meanGrowth >= 0 ? "+" : ""}
              {data.meanGrowth} RIT
            </span>
            <span className="text-muted-foreground ml-1">
              (SD: {data.stdDev})
            </span>
          </div>

          {/* 正成長百分比 */}
          <div className="px-3 py-1.5 bg-green-50 border border-green-200 rounded-md">
            <span className="text-green-700 font-medium text-xs">
              ✅ {positiveGrowthPercentage}% showed positive growth
            </span>
          </div>

          {/* R² 擬合品質 */}
          <div className="px-3 py-1.5 bg-muted rounded-md flex items-center gap-1">
            <span className="text-muted-foreground">Gaussian Fit: </span>
            <span className="font-medium" style={{ color: r2Interpretation.color }}>
              R² = {rSquared.toFixed(2)}
            </span>
            <UITooltip>
              <TooltipTrigger asChild>
                <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[280px]">
                <p className="text-xs">
                  <strong>{r2Interpretation.quality}</strong> - {r2Interpretation.color === "#22c55e"
                    ? "Distribution closely follows normal curve"
                    : r2Interpretation.color === "#eab308"
                    ? "Distribution roughly follows normal curve"
                    : "Distribution deviates from normal curve (may indicate subgroups)"}
                </p>
              </TooltipContent>
            </UITooltip>
          </div>
        </div>

      {/* 直方圖 + 高斯曲線 */}
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          data={chartData}
          margin={{ top: 10, right: 20, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="range"
            tick={{ fontSize: 11 }}
            className="text-muted-foreground"
          />
          <YAxis
            tick={{ fontSize: 11 }}
            className="text-muted-foreground"
            width={40}
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
                    </div>
                    <div>
                      <span className="text-muted-foreground">
                        Percentage:{" "}
                      </span>
                      <span className="font-medium">{d?.percentage}%</span>
                    </div>
                    {d?.gaussian !== null && (
                      <div>
                        <span className="text-muted-foreground">
                          Expected (Gaussian):{" "}
                        </span>
                        <span className="font-medium">{d.gaussian.toFixed(1)}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            }}
          />
          {/* 直方圖 */}
          <Bar dataKey="count" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
          {/* 高斯擬合曲線 */}
          <Line
            type="monotone"
            dataKey="gaussian"
            stroke={SCHOOL_CHART_COLORS.gaussianFit}
            strokeWidth={2.5}
            dot={false}
            name="Gaussian Fit"
            connectNulls
          />
        </ComposedChart>
      </ResponsiveContainer>

      {/* 圖例 */}
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground justify-center">
        <div className="flex items-center gap-1">
          <span
            className="w-3 h-3 rounded"
            style={{ backgroundColor: GROWTH_COLORS.negative }}
          />
          <span>Negative</span>
        </div>
        <div className="flex items-center gap-1">
          <span
            className="w-3 h-3 rounded"
            style={{ backgroundColor: GROWTH_COLORS.low }}
          />
          <span>Low (0-5)</span>
        </div>
        <div className="flex items-center gap-1">
          <span
            className="w-3 h-3 rounded"
            style={{ backgroundColor: GROWTH_COLORS.medium }}
          />
          <span>Medium (5-10)</span>
        </div>
        <div className="flex items-center gap-1">
          <span
            className="w-3 h-3 rounded"
            style={{ backgroundColor: GROWTH_COLORS.high }}
          />
          <span>High (10+)</span>
        </div>
        <div className="flex items-center gap-1">
          <span
            className="w-6 h-0.5"
            style={{ backgroundColor: SCHOOL_CHART_COLORS.gaussianFit }}
          />
          <span>Gaussian Fit</span>
        </div>
      </div>

      {/* 解讀說明 */}
      <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
        <p>
          <strong>How to read:</strong> This histogram shows the distribution of RIT
          growth from {data.fromTerm} to {data.toTerm}. Red bars indicate students
          with negative growth who may need intervention. The curve shows the expected
          normal distribution.
        </p>
      </div>
      </div>
    </TooltipProvider>
  );
}

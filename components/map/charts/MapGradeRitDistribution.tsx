"use client";

/**
 * MapGradeRitDistribution
 *
 * Per-grade RIT Distribution chart with NWEA Norm overlay
 * Like Colab's Grade-Level Analysis:
 * - Histogram with KCIS student RIT distribution
 * - Gaussian fit curve (black line)
 * - NWEA Norm curve overlay (purple line)
 * - E1/E3 Benchmark reference lines (for Average reference)
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
  ReferenceLine,
} from "recharts";
import { Info } from "lucide-react";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { GradeRitDistributionData } from "@/lib/api/map-analytics";
import { interpretRSquared } from "@/lib/map/statistics";
import { BENCHMARK_COLORS, GAUSSIAN_FIT_COLORS, RIT_HISTOGRAM_COLORS } from "@/lib/map/colors";

interface MapGradeRitDistributionProps {
  data: GradeRitDistributionData;
  height?: number;
}

export function MapGradeRitDistribution({
  data,
  height = 320,
}: MapGradeRitDistributionProps) {
  // 計算圖表資料
  const { chartData, minX, maxX } = useMemo(() => {
    // 為每個 distribution bucket 加入顏色和 Gaussian 值
    const bucketsWithData = data.distribution.map((bucket) => {
      // 計算 bucket 中點
      const midpoint = (bucket.min + bucket.max) / 2;

      // 找到對應的 KCIS Gaussian 值
      const kcisGaussian = data.gaussianCurve.find(
        (g) => Math.abs(g.x - midpoint) < 2.5
      );
      const nweaGaussian = data.nweaNormCurve?.find(
        (g) => Math.abs(g.x - midpoint) < 2.5
      );

      return {
        ...bucket,
        midpoint,
        kcisGaussian: kcisGaussian?.y ?? null,
        nweaGaussian: nweaGaussian?.y ?? null,
      };
    });

    // 計算 X 軸範圍
    const minVal = Math.min(...data.distribution.map((b) => b.min));
    const maxVal = Math.max(...data.distribution.map((b) => b.max));

    return {
      chartData: bucketsWithData,
      minX: minVal,
      maxX: maxVal,
    };
  }, [data]);

  const r2Interpretation = interpretRSquared(data.gaussianFit.rSquared);

  // Term 類型標籤
  const termLabel = useMemo(() => {
    const mapTerm = data.mapTerm;
    switch (mapTerm) {
      case "fall":
        return "Fall";
      case "winter":
        return "Winter";
      case "spring":
        return "Spring";
      default:
        return mapTerm;
    }
  }, [data.mapTerm]);

  // 計算 vs NWEA 差異
  const vsNweaDiff = useMemo(() => {
    if (!data.nweaNorm) return null;
    const diff = data.meanRit - data.nweaNorm.mean;
    return {
      value: Math.round(diff * 10) / 10,
      isPositive: diff >= 0,
    };
  }, [data.meanRit, data.nweaNorm]);

  return (
    <TooltipProvider>
      <div className="w-full">
        {/* 標題與說明 */}
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium">
              G{data.grade} {data.course} RIT Distribution
            </h4>
            <p className="text-xs text-muted-foreground">{data.termTested}</p>
          </div>
        </div>

        {/* 統計摘要 */}
        <div className="mb-4 flex flex-wrap gap-2 text-sm">
          {/* Term 標籤 */}
          <div className="px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-md">
            <span className="text-blue-700 font-medium text-xs">
              📅 {termLabel}
            </span>
          </div>

          {/* 學生數 */}
          <div className="px-2.5 py-1 bg-muted rounded-md flex items-center gap-1">
            <span className="text-muted-foreground text-xs">Students:</span>
            <span className="font-medium text-xs">{data.totalStudents}</span>
          </div>

          {/* KCIS 平均 RIT */}
          <div className="px-2.5 py-1 bg-muted rounded-md">
            <span className="text-muted-foreground text-xs">KCIS Mean: </span>
            <span className="font-medium text-xs">{data.meanRit}</span>
            <span className="text-muted-foreground text-xs ml-1">
              (±{data.stdDev})
            </span>
          </div>

          {/* NWEA Norm（如果有） */}
          {data.nweaNorm && (
            <div className="px-2.5 py-1 bg-purple-50 border border-purple-200 rounded-md flex items-center gap-1">
              <span className="text-purple-700 text-xs">NWEA Norm: </span>
              <span className="font-medium text-purple-700 text-xs">
                {data.nweaNorm.mean.toFixed(1)}
              </span>
              <span className="text-purple-600 text-xs">
                (±{data.nweaNorm.stdDev.toFixed(1)})
              </span>
              <UITooltip>
                <TooltipTrigger asChild>
                  <Info className="w-3 h-3 text-purple-500 cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-[280px]">
                  <p className="text-xs">
                    NWEA 2025 Achievement Norm for G{data.grade} {termLabel}{" "}
                    {data.course}. Purple curve shows national average RIT
                    distribution.
                  </p>
                </TooltipContent>
              </UITooltip>
            </div>
          )}

          {/* vs NWEA 差異 */}
          {vsNweaDiff && (
            <div
              className={`px-2.5 py-1 rounded-md border ${
                vsNweaDiff.isPositive
                  ? "bg-green-50 border-green-200"
                  : "bg-red-50 border-red-200"
              }`}
            >
              <span
                className={`font-medium text-xs ${
                  vsNweaDiff.isPositive ? "text-green-700" : "text-red-700"
                }`}
              >
                {vsNweaDiff.isPositive ? "+" : ""}
                {vsNweaDiff.value} vs NWEA
              </span>
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
                  the variation in student RIT scores is explained by the normal curve.
                </p>
                <p className="text-xs text-muted-foreground">
                  {r2Interpretation.color === "#22c55e"
                    ? "✅ High R² (≥0.8): RIT scores are normally distributed."
                    : r2Interpretation.color === "#eab308"
                    ? "⚠️ Moderate R² (0.5-0.8): Some deviation from normal."
                    : "❌ Low R² (<0.5): Significant deviation - investigate for outliers."}
                </p>
              </TooltipContent>
            </UITooltip>
          </div>
        </div>

        {/* RIT 範圍統計 */}
        <div className="mb-4 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
          <div className="flex justify-between text-xs">
            <div>
              <span className="text-muted-foreground">Min RIT: </span>
              <span className="font-medium">{data.minRit}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Max RIT: </span>
              <span className="font-medium">{data.maxRit}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Range: </span>
              <span className="font-medium">{data.maxRit - data.minRit}</span>
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

            <XAxis
              dataKey="midpoint"
              type="number"
              domain={[minX - 5, maxX + 5]}
              tick={{ fontSize: 10 }}
              tickFormatter={(v) => `${v}`}
              label={{
                value: "RIT Score",
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

            {/* E1/E3 Benchmark 參考線 (僅供參考，實際是用於 Average) */}
            {data.benchmarks && (
              <>
                <ReferenceLine
                  x={data.benchmarks.e1Threshold}
                  stroke={BENCHMARK_COLORS.E1}
                  strokeDasharray="5 3"
                  strokeWidth={1.5}
                  label={{
                    value: `E1 (${data.benchmarks.e1Threshold})`,
                    position: "top",
                    fill: BENCHMARK_COLORS.E1,
                    fontSize: 10,
                  }}
                />
                <ReferenceLine
                  x={data.benchmarks.e2Threshold}
                  stroke={BENCHMARK_COLORS.E3}
                  strokeDasharray="5 3"
                  strokeWidth={1.5}
                  label={{
                    value: `E3 (<${data.benchmarks.e2Threshold})`,
                    position: "top",
                    fill: BENCHMARK_COLORS.E3,
                    fontSize: 10,
                  }}
                />
              </>
            )}

            {/* NWEA Norm 平均參考線 */}
            {data.nweaNorm && (
              <ReferenceLine
                x={data.nweaNorm.mean}
                stroke={GAUSSIAN_FIT_COLORS.nwea}
                strokeDasharray="3 3"
                strokeWidth={1}
              />
            )}

            {/* 直方圖 */}
            <Bar dataKey="count" radius={[3, 3, 0, 0]} barSize={20}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={RIT_HISTOGRAM_COLORS.bar} />
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
              style={{ backgroundColor: RIT_HISTOGRAM_COLORS.bar }}
            />
            <span>KCIS Students</span>
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
          {data.benchmarks && (
            <>
              <div className="flex items-center gap-1">
                <span
                  className="w-4 h-0.5"
                  style={{
                    backgroundColor: BENCHMARK_COLORS.E1,
                    borderTop: "1px dashed",
                  }}
                />
                <span>E1 Threshold</span>
              </div>
              <div className="flex items-center gap-1">
                <span
                  className="w-4 h-0.5"
                  style={{
                    backgroundColor: BENCHMARK_COLORS.E3,
                    borderTop: "1px dashed",
                  }}
                />
                <span>E3 Threshold</span>
              </div>
            </>
          )}
        </div>

        {/* 解讀說明 */}
        <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground space-y-1">
          <p>
            <strong>How to read:</strong> Histogram shows KCIS G{data.grade}{" "}
            {data.course} RIT distribution for {data.termTested}. Black curve is
            Gaussian fit to student data.
            {data.nweaNorm && (
              <>
                {" "}
                Purple dashed curve shows NWEA national norm (
                {data.nweaNorm.mean.toFixed(1)}±{data.nweaNorm.stdDev.toFixed(1)}
                ).
              </>
            )}
            {data.benchmarks && (
              <>
                {" "}
                Dashed lines show E1/E3 benchmark thresholds (based on Average
                of both courses).
              </>
            )}
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

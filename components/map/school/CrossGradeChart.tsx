"use client";

/**
 * Cross-Grade Performance Chart
 *
 * 跨年級比較圖表，顯示 G3-G6 的平均 RIT 分數
 * 包含 NWEA Norm 線、KCIS Expected 線和誤差棒（標準差）
 *
 * Features:
 * - X 軸: Grade (G3, G4, G5, G6)
 * - Y 軸: RIT Score
 * - 綠線: KCISLK 學生平均 (with error bars)
 * - 灰色虛線: NWEA Norm
 * - 紫色虛線: KCIS Expected (E2) with ±1 SD band
 */

import { useMemo } from "react";
import { useTheme } from "next-themes";
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ErrorBar,
  Legend,
} from "recharts";
import { KCIS_EXPECTED_COLORS, BENCHMARK_COLORS, SCHOOL_CHART_COLORS } from "@/lib/map/colors";
import { KCIS_EXPECTED } from "@/lib/map/kcis-expected";
import type { CrossGradeStats } from "@/lib/api/map-school-analytics";

interface CrossGradeChartProps {
  data: CrossGradeStats[];
  height?: number;
}

export function CrossGradeChart({ data, height = 350 }: CrossGradeChartProps) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  // 深色模式下使用深色背景遮蓋，淺色模式用白色
  const bandMaskColor = isDark ? "#0f172a" : "#ffffff";  // slate-950 for dark

  // 深色模式配色調整 - 提高對比度
  const gridColor = isDark ? "#334155" : "#e5e7eb";  // slate-700 for dark, gray-200 for light
  const normColor = isDark ? "#94a3b8" : "#64748b";  // slate-400 for dark, slate-500 for light
  const e1Color = isDark ? "#4ade80" : "#22c55e";    // green-400 for dark, green-500 for light
  const e3Color = isDark ? "#f87171" : "#ef4444";    // red-400 for dark, red-500 for light

  // 轉換資料格式，包含 KCIS Expected 數據
  // 只顯示有實際數據的年級（解決 G6 空資料問題）
  const { chartData, missingGrades } = useMemo(() => {
    const allGrades = [3, 4, 5, 6];
    const gradesWithData: number[] = [];
    const gradesWithoutData: number[] = [];

    // 先檢查哪些年級有資料
    allGrades.forEach((grade) => {
      const gradeData = data.find((d) => d.grade === grade);
      if (gradeData && gradeData.studentCount > 0) {
        gradesWithData.push(grade);
      } else {
        gradesWithoutData.push(grade);
      }
    });

    // 只為有資料的年級生成圖表資料
    const chartItems = gradesWithData.map((grade) => {
      const gradeData = data.find((d) => d.grade === grade);
      const kcisData = KCIS_EXPECTED[grade];
      return {
        grade: `G${grade}`,
        gradeNum: grade,
        mean: gradeData?.meanRit ?? null,
        stdDev: gradeData?.stdDev ?? 0,
        norm: gradeData?.norm ?? null,
        studentCount: gradeData?.studentCount ?? 0,
        vsNorm: gradeData?.vsNorm ?? null,
        // KCIS Expected (E2) 數據
        expected: kcisData?.mean ?? null,
        expectedUpper: kcisData ? kcisData.mean + kcisData.stdDev : null,
        expectedLower: kcisData ? kcisData.mean - kcisData.stdDev : null,
        // E1/E3 閾值
        e1: kcisData?.e1 ?? null,
        e3: kcisData?.e3 ?? null,
      };
    });

    return {
      chartData: chartItems,
      missingGrades: gradesWithoutData,
    };
  }, [data]);

  // 計算 Y 軸範圍（包含 KCIS Expected 範圍）
  const { yMin, yMax } = useMemo(() => {
    const allValues: number[] = [];
    chartData.forEach((d) => {
      if (d.mean !== null) {
        allValues.push(d.mean - d.stdDev);
        allValues.push(d.mean + d.stdDev);
      }
      if (d.norm !== null) {
        allValues.push(d.norm);
      }
      // 加入 KCIS Expected 範圍
      if (d.expectedUpper !== null) {
        allValues.push(d.expectedUpper);
      }
      if (d.expectedLower !== null) {
        allValues.push(d.expectedLower);
      }
      // 加入 E1/E3 閾值
      if (d.e1 !== null) {
        allValues.push(d.e1);
      }
      if (d.e3 !== null) {
        allValues.push(d.e3);
      }
    });

    if (allValues.length === 0) return { yMin: 150, yMax: 250 };

    const min = Math.min(...allValues);
    const max = Math.max(...allValues);
    const padding = (max - min) * 0.15;

    return {
      yMin: Math.floor((min - padding) / 5) * 5,
      yMax: Math.ceil((max + padding) / 5) * 5,
    };
  }, [chartData]);

  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[350px] text-muted-foreground">
        No data available
      </div>
    );
  }

  return (
    <div className="w-full">
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
          <XAxis
            dataKey="grade"
            tick={{ fontSize: 12 }}
            className="text-muted-foreground"
          />
          <YAxis
            domain={[yMin, yMax]}
            tick={{ fontSize: 12 }}
            className="text-muted-foreground"
            width={45}
            label={{
              value: "RIT Score",
              angle: -90,
              position: "insideLeft",
              style: { textAnchor: "middle", fontSize: 12 },
            }}
          />
          <Tooltip
            content={({ active, payload, label }) => {
              if (!active || !payload || payload.length === 0) return null;
              const pointData = payload[0]?.payload;
              return (
                <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                  <p className="font-medium text-sm mb-2">{label}</p>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: SCHOOL_CHART_COLORS.kcislk }}
                      />
                      <span className="text-muted-foreground">KCISLK:</span>
                      <span className="font-mono font-medium">
                        {pointData?.mean?.toFixed(1) ?? "N/A"}
                      </span>
                      {pointData?.stdDev > 0 && (
                        <span className="text-muted-foreground">
                          (±{pointData.stdDev.toFixed(1)})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: KCIS_EXPECTED_COLORS.line }}
                      />
                      <span className="text-muted-foreground">KCIS Expected:</span>
                      <span className="font-mono font-medium">
                        {pointData?.expected?.toFixed(1) ?? "N/A"}
                      </span>
                      {pointData?.expected && pointData?.expectedUpper && (
                        <span className="text-muted-foreground">
                          (±{(pointData.expectedUpper - pointData.expected).toFixed(1)})
                        </span>
                      )}
                    </div>
                    {/* E1/E3 閾值 */}
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: BENCHMARK_COLORS.E1 }}
                      />
                      <span className="text-muted-foreground">E1:</span>
                      <span className="font-mono font-medium">
                        {pointData?.e1?.toFixed(0) ?? "N/A"}
                      </span>
                      <span className="mx-1 text-muted-foreground">|</span>
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: BENCHMARK_COLORS.E3 }}
                      />
                      <span className="text-muted-foreground">E3:</span>
                      <span className="font-mono font-medium">
                        {pointData?.e3?.toFixed(0) ?? "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: SCHOOL_CHART_COLORS.norm }}
                      />
                      <span className="text-muted-foreground">NWEA Norm:</span>
                      <span className="font-mono font-medium">
                        {pointData?.norm ?? "N/A"}
                      </span>
                    </div>
                    {pointData?.vsNorm !== null && (
                      <div className="flex items-center gap-2 pt-1 border-t border-border mt-1">
                        <span className="text-muted-foreground">vs Norm:</span>
                        <span
                          className={`font-mono font-medium ${
                            pointData.vsNorm >= 0
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {pointData.vsNorm >= 0 ? "+" : ""}
                          {pointData.vsNorm.toFixed(1)}
                        </span>
                      </div>
                    )}
                    <div className="text-muted-foreground pt-1">
                      n = {pointData?.studentCount ?? 0} students
                    </div>
                  </div>
                </div>
              );
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            formatter={(value) => (
              <span className="text-xs text-muted-foreground">{value}</span>
            )}
          />

          {/* KCIS Expected ±1 SD 帶狀區域 (紫色半透明) */}
          <Area
            type="monotone"
            dataKey="expectedUpper"
            stroke="none"
            fill={KCIS_EXPECTED_COLORS.band}
            fillOpacity={KCIS_EXPECTED_COLORS.bandOpacity}
            name="KCIS Expected Range"
            legendType="none"
            connectNulls
          />
          <Area
            type="monotone"
            dataKey="expectedLower"
            stroke="none"
            fill={bandMaskColor}
            fillOpacity={1}
            legendType="none"
            connectNulls
          />

          {/* KCIS Expected (E2) 線 (紫色虛線) */}
          <Line
            type="monotone"
            dataKey="expected"
            name="KCIS Expected (E2)"
            stroke={KCIS_EXPECTED_COLORS.line}
            strokeWidth={2}
            strokeDasharray="8 4"
            dot={{ fill: KCIS_EXPECTED_COLORS.line, r: 4 }}
            connectNulls
          />

          {/* E1 閾值虛線 (綠色) */}
          <Line
            type="monotone"
            dataKey="e1"
            name="E1 Threshold"
            stroke={e1Color}
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
            connectNulls
          />

          {/* E3 閾值虛線 (紅色) */}
          <Line
            type="monotone"
            dataKey="e3"
            name="E3 Threshold"
            stroke={e3Color}
            strokeWidth={1.5}
            strokeDasharray="4 4"
            dot={false}
            connectNulls
          />

          {/* NWEA Norm 線 (灰色虛線) */}
          <Line
            type="monotone"
            dataKey="norm"
            name="NWEA Norm"
            stroke={normColor}
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ fill: normColor, r: 4 }}
            connectNulls
          />

          {/* KCISLK 學生平均 (綠線 + 誤差棒) */}
          <Line
            type="monotone"
            dataKey="mean"
            name="KCISLK Students"
            stroke={SCHOOL_CHART_COLORS.kcislk}
            strokeWidth={2.5}
            dot={{
              fill: SCHOOL_CHART_COLORS.kcislk,
              r: 5,
              stroke: "#fff",
              strokeWidth: 2,
            }}
            connectNulls
          >
            <ErrorBar
              dataKey="stdDev"
              width={6}
              strokeWidth={1.5}
              stroke={SCHOOL_CHART_COLORS.errorBar}
              direction="y"
            />
          </Line>
        </ComposedChart>
      </ResponsiveContainer>

      {/* 圖表說明 */}
      <div className="mt-2 px-4 text-xs text-muted-foreground space-y-1">
        <p>
          <strong>How to read:</strong> This chart compares KCISLK student
          performance across grades with NWEA national norms and KCIS expected levels.
        </p>
        <p>
          <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: SCHOOL_CHART_COLORS.kcislk }} />
          <strong>Green solid:</strong> KCISLK students (±1 SD)
          {" | "}
          <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: KCIS_EXPECTED_COLORS.line }} />
          <strong>Purple dashed:</strong> E2 (with ±1 SD band)
          {" | "}
          <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: BENCHMARK_COLORS.E1 }} />
          <strong>Green dashed:</strong> E1
          {" | "}
          <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: BENCHMARK_COLORS.E3 }} />
          <strong>Red dashed:</strong> E3
          {" | "}
          <span className="inline-block w-2 h-2 rounded-full mr-1" style={{ backgroundColor: SCHOOL_CHART_COLORS.norm }} />
          <strong>Gray dashed:</strong> NWEA Norm
        </p>
        {/* 缺失年級提示 */}
        {missingGrades.length > 0 && (
          <p className="text-amber-600 dark:text-amber-400">
            <strong>Note:</strong> G{missingGrades.join(", G")} not shown (no data available for this term).
          </p>
        )}
      </div>
    </div>
  );
}

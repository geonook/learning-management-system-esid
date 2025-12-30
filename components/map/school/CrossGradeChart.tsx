"use client";

/**
 * Cross-Grade Performance Chart
 *
 * 跨年級比較圖表，顯示 G3-G6 的平均 RIT 分數
 * 包含 NWEA Norm 線和誤差棒（標準差）
 *
 * Features:
 * - X 軸: Grade (G3, G4, G5, G6)
 * - Y 軸: RIT Score
 * - 黑線: KCISLK 學生平均 (with error bars)
 * - 藍色虛線: NWEA Norm
 */

import { useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ErrorBar,
  Legend,
} from "recharts";
import { NWEA_COLORS } from "@/lib/map/colors";
import type { CrossGradeStats } from "@/lib/api/map-school-analytics";

interface CrossGradeChartProps {
  data: CrossGradeStats[];
  height?: number;
}

// 配色
const SCHOOL_COLORS = {
  student: "#1f2937", // gray-800 (黑色)
  norm: NWEA_COLORS.norm, // 灰藍色
  errorBar: "#6b7280", // gray-500
};

export function CrossGradeChart({ data, height = 350 }: CrossGradeChartProps) {
  // 轉換資料格式
  const chartData = useMemo(() => {
    const grades = [3, 4, 5, 6];
    return grades.map((grade) => {
      const gradeData = data.find((d) => d.grade === grade);
      return {
        grade: `G${grade}`,
        gradeNum: grade,
        mean: gradeData?.meanRit ?? null,
        stdDev: gradeData?.stdDev ?? 0,
        norm: gradeData?.norm ?? null,
        studentCount: gradeData?.studentCount ?? 0,
        vsNorm: gradeData?.vsNorm ?? null,
      };
    });
  }, [data]);

  // 計算 Y 軸範圍
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
        <LineChart
          data={chartData}
          margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke={NWEA_COLORS.gridLine} />
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
              const data = payload[0]?.payload;
              return (
                <div className="bg-popover border border-border rounded-lg p-3 shadow-lg">
                  <p className="font-medium text-sm mb-2">{label}</p>
                  <div className="space-y-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: SCHOOL_COLORS.student }}
                      />
                      <span className="text-muted-foreground">KCISLK:</span>
                      <span className="font-mono font-medium">
                        {data?.mean?.toFixed(1) ?? "N/A"}
                      </span>
                      {data?.stdDev > 0 && (
                        <span className="text-muted-foreground">
                          (±{data.stdDev.toFixed(1)})
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: SCHOOL_COLORS.norm }}
                      />
                      <span className="text-muted-foreground">NWEA Norm:</span>
                      <span className="font-mono font-medium">
                        {data?.norm ?? "N/A"}
                      </span>
                    </div>
                    {data?.vsNorm !== null && (
                      <div className="flex items-center gap-2 pt-1 border-t border-border mt-1">
                        <span className="text-muted-foreground">vs Norm:</span>
                        <span
                          className={`font-mono font-medium ${
                            data.vsNorm >= 0
                              ? "text-green-600 dark:text-green-400"
                              : "text-red-600 dark:text-red-400"
                          }`}
                        >
                          {data.vsNorm >= 0 ? "+" : ""}
                          {data.vsNorm.toFixed(1)}
                        </span>
                      </div>
                    )}
                    <div className="text-muted-foreground pt-1">
                      n = {data?.studentCount ?? 0} students
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

          {/* NWEA Norm 線 (藍色虛線) */}
          <Line
            type="monotone"
            dataKey="norm"
            name="NWEA Norm"
            stroke={SCHOOL_COLORS.norm}
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={{ fill: SCHOOL_COLORS.norm, r: 4 }}
            connectNulls
          />

          {/* KCISLK 學生平均 (黑線 + 誤差棒) */}
          <Line
            type="monotone"
            dataKey="mean"
            name="KCISLK Students"
            stroke={SCHOOL_COLORS.student}
            strokeWidth={2.5}
            dot={{
              fill: SCHOOL_COLORS.student,
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
              stroke={SCHOOL_COLORS.errorBar}
              direction="y"
            />
          </Line>
        </LineChart>
      </ResponsiveContainer>

      {/* 圖表說明 */}
      <div className="mt-2 px-4 text-xs text-muted-foreground space-y-1">
        <p>
          <strong>How to read:</strong> This chart compares KCISLK student
          performance across grades with NWEA national norms.
        </p>
        <p>
          Error bars show ±1 standard deviation. Points above the dashed line
          indicate performance above national average.
        </p>
      </div>
    </div>
  );
}

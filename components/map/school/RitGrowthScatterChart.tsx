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
} from "recharts";
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

  // 相關性解讀
  const correlationInterpretation = useMemo(() => {
    const r = data.stats.correlation;
    if (r >= 0.5) return { text: "Strong positive", color: "text-green-600" };
    if (r >= 0.3) return { text: "Moderate positive", color: "text-green-500" };
    if (r >= 0.1) return { text: "Weak positive", color: "text-yellow-600" };
    if (r >= -0.1) return { text: "No correlation", color: "text-gray-500" };
    if (r >= -0.3) return { text: "Weak negative", color: "text-orange-500" };
    if (r >= -0.5)
      return { text: "Moderate negative", color: "text-orange-600" };
    return { text: "Strong negative", color: "text-red-600" };
  }, [data.stats.correlation]);

  return (
    <div className="w-full">
      {/* 統計摘要 */}
      <div className="mb-4 flex gap-4 text-sm flex-wrap">
        <div className="px-3 py-1.5 bg-muted rounded-md">
          <span className="text-muted-foreground">Students: </span>
          <span className="font-medium">{data.points.length}</span>
        </div>
        <div className="px-3 py-1.5 bg-muted rounded-md">
          <span className="text-muted-foreground">Correlation (r): </span>
          <span className={`font-medium ${correlationInterpretation.color}`}>
            {data.stats.correlation.toFixed(2)} (
            {correlationInterpretation.text})
          </span>
        </div>
        <div className="px-3 py-1.5 bg-muted rounded-md">
          <span className="text-muted-foreground">Period: </span>
          <span className="font-medium text-xs">
            {data.fromTerm} → {data.toTerm}
          </span>
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
      </div>

      {/* 解讀說明 */}
      <div className="mt-3 pt-3 border-t border-border text-xs text-muted-foreground">
        <p>
          <strong>How to read:</strong> Each dot represents a student. Points
          below the dashed line show negative growth. A negative correlation
          suggests higher-performing students may have limited room for growth
          (ceiling effect).
        </p>
      </div>
    </div>
  );
}

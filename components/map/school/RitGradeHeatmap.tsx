"use client";

/**
 * RIT-Grade Heatmap
 *
 * 2D 熱力圖顯示 RIT 分數在各年級的分佈密度
 * 顏色越深表示該區間學生越多
 */

import { useMemo } from "react";
import type { RitGradeHeatmapData, HeatmapCell } from "@/lib/api/map-school-analytics";

interface RitGradeHeatmapProps {
  data: RitGradeHeatmapData;
}

// 熱力圖顏色漸層（淺到深）
function getHeatmapColor(count: number, maxCount: number): string {
  if (count === 0) return "#f1f5f9"; // slate-100 (空白)
  const intensity = count / maxCount;
  if (intensity < 0.15) return "#dbeafe"; // blue-100
  if (intensity < 0.3) return "#bfdbfe"; // blue-200
  if (intensity < 0.45) return "#93c5fd"; // blue-300
  if (intensity < 0.6) return "#60a5fa"; // blue-400
  if (intensity < 0.75) return "#3b82f6"; // blue-500
  if (intensity < 0.9) return "#2563eb"; // blue-600
  return "#1d4ed8"; // blue-700
}

// 文字顏色（淺背景用深色，深背景用淺色）
function getTextColor(count: number, maxCount: number): string {
  if (count === 0) return "transparent";
  const intensity = count / maxCount;
  return intensity > 0.5 ? "#ffffff" : "#1e3a8a"; // white or blue-900
}

export function RitGradeHeatmap({ data }: RitGradeHeatmapProps) {
  const grades = [3, 4, 5, 6];

  // 過濾只顯示有資料的 RIT 區間（避免顯示太多空欄位）
  const relevantBuckets = useMemo(() => {
    // 找出有資料的 RIT 範圍
    const bucketsWithData = new Set<string>();
    for (const cell of data.cells) {
      if (cell.count > 0) {
        bucketsWithData.add(cell.ritBucket);
      }
    }

    // 擴展範圍：包含有資料區間前後各一個
    const allBuckets = data.ritBuckets;
    const indices = allBuckets
      .map((b, i) => (bucketsWithData.has(b) ? i : -1))
      .filter((i) => i >= 0);

    if (indices.length === 0) return [];

    const minIndex = Math.max(0, Math.min(...indices) - 1);
    const maxIndex = Math.min(allBuckets.length - 1, Math.max(...indices) + 1);

    return allBuckets.slice(minIndex, maxIndex + 1);
  }, [data.cells, data.ritBuckets]);

  // 建立 cell 查找 map
  const cellMap = useMemo(() => {
    const map = new Map<string, HeatmapCell>();
    for (const cell of data.cells) {
      map.set(`${cell.grade}-${cell.ritBucket}`, cell);
    }
    return map;
  }, [data.cells]);

  if (relevantBuckets.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        No data available for heatmap
      </div>
    );
  }

  return (
    <div className="w-full">
      {/* 統計摘要 */}
      <div className="mb-4 flex gap-4 text-sm">
        <div className="px-3 py-1.5 bg-muted rounded-md">
          <span className="text-muted-foreground">Students: </span>
          <span className="font-medium">{data.totalStudents}</span>
        </div>
        <div className="px-3 py-1.5 bg-muted rounded-md">
          <span className="text-muted-foreground">Term: </span>
          <span className="font-medium text-xs">{data.termTested}</span>
        </div>
      </div>

      {/* 熱力圖表格 */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="p-2 text-left font-medium text-muted-foreground border-b border-border">
                Grade
              </th>
              {relevantBuckets.map((bucket) => (
                <th
                  key={bucket}
                  className="p-2 text-center font-medium text-muted-foreground border-b border-border min-w-[48px]"
                >
                  {bucket}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {grades.map((grade) => (
              <tr key={grade}>
                <td className="p-2 font-medium text-foreground border-b border-border">
                  G{grade}
                </td>
                {relevantBuckets.map((bucket) => {
                  const cell = cellMap.get(`${grade}-${bucket}`);
                  const count = cell?.count ?? 0;
                  const bgColor = getHeatmapColor(count, data.maxCount);
                  const textColor = getTextColor(count, data.maxCount);

                  return (
                    <td
                      key={bucket}
                      className="p-0 border-b border-border"
                      title={`G${grade} ${bucket} RIT: ${count} students`}
                    >
                      <div
                        className="w-full h-10 flex items-center justify-center font-mono text-xs transition-colors"
                        style={{
                          backgroundColor: bgColor,
                          color: textColor,
                        }}
                      >
                        {count > 0 ? count : ""}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 色階圖例 */}
      <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted-foreground">
        <span>Density:</span>
        <div className="flex">
          {[0, 0.15, 0.3, 0.45, 0.6, 0.75, 0.9, 1].map((intensity, i) => (
            <div
              key={i}
              className="w-6 h-4"
              style={{
                backgroundColor: getHeatmapColor(
                  intensity * data.maxCount,
                  data.maxCount
                ),
              }}
            />
          ))}
        </div>
        <span>Low → High</span>
      </div>

      {/* 說明 */}
      <div className="mt-2 text-xs text-muted-foreground text-center">
        RIT score distribution across grade levels. Darker cells indicate more
        students in that range.
      </div>
    </div>
  );
}

"use client";

/**
 * RIT-Grade Heatmap
 *
 * 2D 熱力圖顯示 RIT 分數在各年級的分佈密度
 * 顏色越深表示該區間學生越多
 */

import { useMemo } from "react";
import { Info } from "lucide-react";
import {
  Tooltip as UITooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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

  // 計算每年級的峰值區間（最多學生的 RIT 區間）
  const peakBuckets = useMemo(() => {
    const peaks: { grade: number; bucket: string; count: number }[] = [];
    for (const grade of grades) {
      let maxCount = 0;
      let peakBucket = "";
      for (const bucket of data.ritBuckets) {
        const cell = cellMap.get(`${grade}-${bucket}`);
        if (cell && cell.count > maxCount) {
          maxCount = cell.count;
          peakBucket = bucket;
        }
      }
      if (maxCount > 0) {
        peaks.push({ grade, bucket: peakBucket, count: maxCount });
      }
    }
    return peaks;
  }, [cellMap, data.ritBuckets]);

  // 計算每年級的學生總數
  const gradeStudentCounts = useMemo(() => {
    const counts: Record<number, number> = { 3: 0, 4: 0, 5: 0, 6: 0 };
    for (const cell of data.cells) {
      counts[cell.grade] = (counts[cell.grade] || 0) + cell.count;
    }
    return counts;
  }, [data.cells]);

  if (relevantBuckets.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-muted-foreground">
        No data available for heatmap
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="w-full">
        {/* 統計摘要 */}
        <div className="mb-4 flex flex-wrap gap-3 text-sm">
          <div className="px-3 py-1.5 bg-muted rounded-md flex items-center gap-1">
            <span className="text-muted-foreground">Students: </span>
            <span className="font-medium">{data.totalStudents}</span>
            <UITooltip>
              <TooltipTrigger asChild>
                <Info className="w-3.5 h-3.5 text-muted-foreground cursor-help" />
              </TooltipTrigger>
              <TooltipContent className="max-w-[280px]">
                <p className="text-xs mb-1">
                  <strong>Per-grade breakdown:</strong>
                </p>
                <div className="text-xs space-y-0.5">
                  {grades.map((g) => (
                    <div key={g}>G{g}: {gradeStudentCounts[g]} students</div>
                  ))}
                </div>
              </TooltipContent>
            </UITooltip>
          </div>
          <div className="px-3 py-1.5 bg-muted rounded-md">
            <span className="text-muted-foreground">Term: </span>
            <span className="font-medium text-xs">{data.termTested}</span>
          </div>
        </div>

        {/* 峰值區間說明 */}
        {peakBuckets.length > 0 && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-xs font-medium text-blue-700 mb-2">📊 Peak Concentration by Grade:</p>
            <div className="flex flex-wrap gap-3 text-xs">
              {peakBuckets.map(({ grade, bucket, count }) => {
                const total = gradeStudentCounts[grade] || 1;
                const percentage = Math.round((count / total) * 100);
                return (
                  <div key={grade} className="text-blue-600">
                    <span className="font-medium">G{grade}:</span> {bucket} RIT ({percentage}%)
                  </div>
                );
              })}
            </div>
          </div>
        )}

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
        students in that range. Higher grades typically show higher RIT scores.
      </div>
      </div>
    </TooltipProvider>
  );
}

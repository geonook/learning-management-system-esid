"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertCircle } from "lucide-react";
import {
  getStudentMapAnalytics,
  getStudentProgressHistory,
  type StudentMapAnalytics,
  type ProgressHistoryPoint,
} from "@/lib/api/map-student-analytics";
import { ScoreSummaryCards } from "./ScoreSummaryCards";
import { ProjectedProficiency } from "./ProjectedProficiency";
import { StudentBenchmarkStatus } from "./StudentBenchmarkStatus";
import { StudentGrowthIndex } from "./StudentGrowthIndex";
import { StudentGoalAreas } from "./StudentGoalAreas";
import { StudentLexileLevel } from "./StudentLexileLevel";
import { StudentBenchmarkHistory } from "./StudentBenchmarkHistory";
import { StudentPeerComparison } from "./StudentPeerComparison";
import { StudentProgressCharts } from "./StudentProgressChart";
import { StudentAssessmentTables } from "./StudentAssessmentTable";
import { CombinedTestValidityWarning } from "./TestValidityWarning";

interface StudentMapAnalysisTabProps {
  studentId: string;
  studentNumber: string;
  grade: number;
  classId: string | null;
}

export function StudentMapAnalysisTab({
  studentId,
  studentNumber,
  grade,
  classId,
}: StudentMapAnalysisTabProps) {
  const [analytics, setAnalytics] = useState<StudentMapAnalytics | null>(null);
  const [progressHistory, setProgressHistory] = useState<ProgressHistoryPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchAnalytics() {
      setLoading(true);
      setError(null);
      try {
        // Fetch both analytics and progress history in parallel
        const [analyticsData, historyData] = await Promise.all([
          getStudentMapAnalytics(studentId, studentNumber, grade, classId),
          getStudentProgressHistory(studentNumber, grade),
        ]);
        setAnalytics(analyticsData);
        setProgressHistory(historyData);
      } catch (err) {
        console.error("Failed to fetch MAP analytics:", err);
        setError(err instanceof Error ? err.message : "Failed to load MAP analytics");
      } finally {
        setLoading(false);
      }
    }

    if (studentNumber && grade >= 3 && grade <= 6) {
      fetchAnalytics();
    } else {
      setLoading(false);
      setError("MAP analysis is only available for G3-G6 students");
    }
  }, [studentId, studentNumber, grade, classId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 text-purple-500 dark:text-purple-400 animate-spin" />
        <span className="ml-3 text-text-secondary">Loading MAP analytics...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-6">
        <div className="flex items-center gap-3">
          <AlertCircle className="w-6 h-6 text-red-500" />
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      </div>
    );
  }

  if (!analytics) {
    return (
      <div className="bg-surface-elevated rounded-xl border border-border-default p-8 text-center">
        <AlertCircle className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
        <h3 className="text-lg font-medium text-text-primary mb-2">No MAP Data Available</h3>
        <p className="text-text-secondary">
          This student does not have any MAP assessment data recorded.
        </p>
      </div>
    );
  }

  const {
    benchmarkStatus,
    growthRecords,
    goalPerformance,
    lexileStatus,
    benchmarkHistory,
    rankings,
  } = analytics;

  // 檢查是否有任何資料
  const hasAnyData =
    benchmarkStatus ||
    growthRecords.length > 0 ||
    goalPerformance ||
    lexileStatus ||
    benchmarkHistory.length > 0 ||
    rankings ||
    progressHistory.length > 0;

  if (!hasAnyData) {
    return (
      <div className="bg-surface-elevated rounded-xl border border-border-default p-8 text-center">
        <AlertCircle className="w-12 h-12 text-text-tertiary mx-auto mb-4" />
        <h3 className="text-lg font-medium text-text-primary mb-2">No MAP Data Available</h3>
        <p className="text-text-secondary">
          This student does not have any MAP assessment data recorded.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ============================================================ */}
      {/* 第一層：這學期表現如何？ */}
      {/* ============================================================ */}

      {/* 1. Score Summary - 現在幾分？在哪個百分位？ */}
      {progressHistory.length > 0 && (
        <ScoreSummaryCards
          progressHistory={progressHistory}
          rankings={rankings}
        />
      )}

      {/* 2. Benchmark Status - 屬於 E1/E2/E3 哪一級？ */}
      <StudentBenchmarkStatus data={benchmarkStatus} />

      {/* 3. Test Validity Warning - 分數是否可信？ */}
      {progressHistory.length > 0 && (() => {
        const latestData = progressHistory[progressHistory.length - 1];
        return (
          <CombinedTestValidityWarning
            readingRapidGuessing={latestData?.reading?.rapidGuessingPercent ?? null}
            languageUsageRapidGuessing={latestData?.languageUsage?.rapidGuessingPercent ?? null}
          />
        );
      })()}

      {/* ============================================================ */}
      {/* 第二層：跟過去/同儕比較 */}
      {/* ============================================================ */}

      {/* 4. Growth Index - 有沒有達到預期成長？ */}
      <StudentGrowthIndex data={growthRecords} />

      {/* 5. Progress Charts - 歷史趨勢視覺化 */}
      {progressHistory.length > 0 && (
        <StudentProgressCharts
          data={progressHistory}
          showPercentileBands
          showProjection
        />
      )}

      {/* 6. Peer Comparison - 跟同儕相比如何？ */}
      <StudentPeerComparison data={rankings} />

      {/* ============================================================ */}
      {/* 第三層：具體哪裡強/弱？ */}
      {/* ============================================================ */}

      {/* 7. Goal Areas - 哪些技能強、哪些需加強？ */}
      <StudentGoalAreas data={goalPerformance} />

      {/* 8. Projected Proficiency - Spring 預測（僅 Fall） */}
      {progressHistory.length > 0 && (
        <ProjectedProficiency progressHistory={progressHistory} />
      )}

      {/* ============================================================ */}
      {/* 第四層：補充資訊 */}
      {/* ============================================================ */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* 9. Lexile Level - 適合讀什麼程度的書？ */}
        <StudentLexileLevel data={lexileStatus} />
        {/* 10. Benchmark History - 歷史分級變化 */}
        <StudentBenchmarkHistory data={benchmarkHistory} currentGrade={grade} />
        {/* 11. Assessment Tables - 原始數據 */}
        {progressHistory.length > 0 && (
          <StudentAssessmentTables data={progressHistory} collapsible />
        )}
      </div>
    </div>
  );
}

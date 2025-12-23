"use client";

import { useEffect, useState } from "react";
import { Loader2, AlertCircle, Activity, TrendingUp, Target, History } from "lucide-react";
import {
  getStudentMapAnalytics,
  getStudentProgressHistory,
  type StudentMapAnalytics,
  type ProgressHistoryPoint,
} from "@/lib/api/map-student-analytics";
import { CollapsibleSection } from "./CollapsibleSection";
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

  // 取得最新考試資料（用於 Test Validity Warning）
  const latestData = progressHistory.length > 0
    ? progressHistory[progressHistory.length - 1]
    : null;

  return (
    <div className="space-y-8">
      {/* ============================================================ */}
      {/* Section 1: Current Performance - 現在表現如何？ */}
      {/* ============================================================ */}
      <CollapsibleSection
        title="Current Performance"
        subtitle="Latest assessment results and benchmark status"
        icon={<Activity className="w-5 h-5" />}
        defaultOpen={true}
      >
        {/* Score Summary - RIT 分數、Percentile、Achievement Quintile */}
        {progressHistory.length > 0 && (
          <ScoreSummaryCards
            progressHistory={progressHistory}
            rankings={rankings}
          />
        )}

        {/* Benchmark Status - E1/E2/E3 分級 */}
        <StudentBenchmarkStatus data={benchmarkStatus} />

        {/* Test Validity Warning - Rapid Guessing 警示 */}
        {latestData && (
          <CombinedTestValidityWarning
            readingRapidGuessing={latestData.reading?.rapidGuessingPercent ?? null}
            languageUsageRapidGuessing={latestData.languageUsage?.rapidGuessingPercent ?? null}
          />
        )}
      </CollapsibleSection>

      {/* ============================================================ */}
      {/* Section 2: Growth & Progress - 成長趨勢 */}
      {/* ============================================================ */}
      <CollapsibleSection
        title="Growth & Progress"
        subtitle="Historical trends and growth metrics"
        icon={<TrendingUp className="w-5 h-5" />}
        defaultOpen={true}
      >
        {/* Progress Charts - 圖表（仿官方報告） */}
        {progressHistory.length > 0 && (
          <StudentProgressCharts
            data={progressHistory}
            showPercentileBands
            showProjection
          />
        )}

        {/* Growth Index - Growth Index、Met/Not Met */}
        <StudentGrowthIndex data={growthRecords} />

        {/* Projected Proficiency - 下次考試預測 */}
        {progressHistory.length > 0 && (
          <ProjectedProficiency progressHistory={progressHistory} />
        )}

        {/* Peer Comparison - 同儕比較 */}
        <StudentPeerComparison data={rankings} />
      </CollapsibleSection>

      {/* ============================================================ */}
      {/* Section 3: Instructional Focus - 教學診斷 */}
      {/* ============================================================ */}
      <CollapsibleSection
        title="Instructional Focus"
        subtitle="Skill areas and reading level recommendations"
        icon={<Target className="w-5 h-5" />}
        defaultOpen={true}
      >
        {/* Goal Areas - 各技能領域表現 */}
        <StudentGoalAreas data={goalPerformance} />

        {/* Lexile Level - Lexile 分數、建議書籍 */}
        <StudentLexileLevel data={lexileStatus} />
      </CollapsibleSection>

      {/* ============================================================ */}
      {/* Section 4: Historical Data - 歷史資料（預設收合） */}
      {/* ============================================================ */}
      <CollapsibleSection
        title="Historical Data"
        subtitle="Complete assessment history and benchmark trends"
        icon={<History className="w-5 h-5" />}
        defaultOpen={false}
      >
        {/* Benchmark History - E1/E2/E3 歷史變化 */}
        <StudentBenchmarkHistory data={benchmarkHistory} currentGrade={grade} />

        {/* Assessment Tables - 完整原始數據表 */}
        {progressHistory.length > 0 && (
          <StudentAssessmentTables data={progressHistory} collapsible={false} />
        )}
      </CollapsibleSection>
    </div>
  );
}

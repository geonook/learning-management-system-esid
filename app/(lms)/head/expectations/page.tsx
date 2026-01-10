"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { useAuthReady } from "@/hooks/useAuthReady";
import { Target, Save, RotateCcw, Loader2, Check, Info } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { getCurrentAcademicYear } from "@/types/academic-year";
import {
  getExpectationsWithDefaults,
  batchUpsertExpectations,
  upsertExpectation,
  resetToDefault,
} from "@/lib/api/gradebook-expectations";
import {
  parseGradeBand,
  ALL_LEVELS,
  LEVEL_NAMES,
  DEFAULT_EXPECTATION,
  EXPECTATION_RANGES,
  calculateExpectedTotal,
  type CourseType,
  type Level,
} from "@/types/gradebook-expectations";

interface ExpectationSetting {
  grade: number | null;
  level: Level | null;
  expected_fa: number;
  expected_sa: number;
  expected_mid: boolean;
  expected_total: number;
  isDefault: boolean;
}

export default function ExpectationsPage() {
  const { permissions: userPermissions } = useAuthReady();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedTerm, setSelectedTerm] = useState(1);
  const [settings, setSettings] = useState<ExpectationSetting[]>([]);
  const [hasChanges, setHasChanges] = useState(false);

  const academicYear = getCurrentAcademicYear();
  const gradeBand = userPermissions?.grade || "1";
  const courseType = (userPermissions?.track as CourseType) || "LT";
  const isKCFS = courseType === "KCFS";

  // Parse grades from grade band - memoized to prevent infinite re-renders
  const grades = useMemo(() => parseGradeBand(gradeBand), [gradeBand]);

  // Fetch expectations on mount and when term changes
  const fetchExpectations = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getExpectationsWithDefaults(
        academicYear,
        selectedTerm,
        courseType,
        grades,
        ALL_LEVELS
      );
      setSettings(data);
      setHasChanges(false);
    } catch (err) {
      console.error("[ExpectationsPage] Fetch error:", err);
      setError(err instanceof Error ? err.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, [academicYear, selectedTerm, courseType, grades]);

  useEffect(() => {
    if (userPermissions) {
      fetchExpectations();
    }
  }, [fetchExpectations, userPermissions]);

  // Update a single setting
  const updateSetting = (
    grade: number | null,
    level: Level | null,
    field: "expected_fa" | "expected_sa" | "expected_mid",
    value: number | boolean
  ) => {
    setSettings((prev) =>
      prev.map((s) => {
        if (s.grade === grade && s.level === level) {
          const updated = { ...s, [field]: value, isDefault: false };
          updated.expected_total = calculateExpectedTotal(
            updated.expected_fa,
            updated.expected_sa,
            updated.expected_mid
          );
          return updated;
        }
        return s;
      })
    );
    setHasChanges(true);
    setSaveSuccess(false);
  };

  // Save all settings
  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      if (isKCFS) {
        // KCFS: single unified setting
        const kcfsSetting = settings[0];
        if (kcfsSetting) {
          await upsertExpectation({
            academic_year: academicYear,
            term: selectedTerm,
            course_type: "KCFS",
            grade: null,
            level: null,
            expected_fa: kcfsSetting.expected_fa,
            expected_sa: kcfsSetting.expected_sa,
            expected_mid: kcfsSetting.expected_mid,
          });
        }
      } else {
        // LT/IT: batch upsert
        await batchUpsertExpectations({
          academic_year: academicYear,
          term: selectedTerm,
          course_type: courseType,
          settings: settings
            .filter((s) => s.grade !== null && s.level !== null)
            .map((s) => ({
              grade: s.grade!,
              level: s.level!,
              expected_fa: s.expected_fa,
              expected_sa: s.expected_sa,
              expected_mid: s.expected_mid,
            })),
        });
      }

      setHasChanges(false);
      setSaveSuccess(true);

      // Clear success indicator after 3 seconds
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error("[ExpectationsPage] Save error:", err);
      setError(err instanceof Error ? err.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  // Reset to defaults
  const handleReset = async () => {
    setSaving(true);
    setError(null);

    try {
      await resetToDefault(
        {
          academic_year: academicYear,
          term: selectedTerm,
          course_type: courseType,
        },
        isKCFS ? undefined : grades,
        isKCFS ? undefined : ALL_LEVELS
      );

      // Refresh data
      await fetchExpectations();
    } catch (err) {
      console.error("[ExpectationsPage] Reset error:", err);
      setError(err instanceof Error ? err.message : "Failed to reset settings");
    } finally {
      setSaving(false);
    }
  };

  // Get grade display string
  const getGradeDisplay = (band: string) => {
    if (band.includes("-")) {
      return `G${band}`;
    }
    return `G${band}`;
  };

  return (
    <AuthGuard requiredRoles={["admin", "head"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-500/20 rounded-lg">
              <Target className="w-6 h-6 text-orange-500 dark:text-orange-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">
                Assessment Expectations
              </h1>
              <p className="text-sm text-text-secondary">
                {getGradeDisplay(gradeBand)} • {courseType} • Configure expected
                assessment counts
              </p>
            </div>
          </div>

          {/* Term Selector */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-text-secondary">Term:</span>
            <select
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(Number(e.target.value))}
              className="px-3 py-1.5 bg-surface-secondary border border-border-default rounded-lg text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-accent-blue/50"
              disabled={loading || saving}
            >
              <option value={1}>Term 1</option>
              <option value={2}>Term 2</option>
              <option value={3}>Term 3</option>
              <option value={4}>Term 4</option>
            </select>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-600 dark:text-red-400">
            {error}
          </div>
        )}

        {/* Settings Content */}
        {isKCFS ? (
          // KCFS: Single Unified Form
          <KCFSSettings
            setting={settings[0]}
            loading={loading}
            onUpdate={updateSetting}
          />
        ) : (
          // LT/IT: Grade × Level Table
          <LTITSettings
            settings={settings}
            grades={grades}
            loading={loading}
            onUpdate={updateSetting}
          />
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handleReset}
            disabled={loading || saving}
            className="gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset to Defaults
          </Button>

          <div className="flex items-center gap-3">
            {saveSuccess && (
              <span className="flex items-center gap-1 text-green-600 dark:text-green-400 text-sm">
                <Check className="w-4 h-4" />
                Saved
              </span>
            )}
            <Button
              onClick={handleSave}
              disabled={loading || saving || !hasChanges}
              className="gap-2"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              Save Settings
            </Button>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-orange-500 mt-0.5" />
            <div>
              <h3 className="text-orange-600 dark:text-orange-400 font-medium mb-1">
                About Expected Assessments
              </h3>
              <p className="text-text-secondary text-sm">
                {isKCFS
                  ? "KCFS uses a unified setting for all grades and levels. The expected counts you set here will apply to all KCFS classes."
                  : `Settings are configured per Grade × Level. For ${getGradeDisplay(gradeBand)} ${courseType}, you have ${grades.length} grade(s) × 3 levels = ${grades.length * 3} configurations.`}
              </p>
              <p className="text-text-tertiary text-xs mt-2">
                Default values: FA = {DEFAULT_EXPECTATION.expected_fa}, SA ={" "}
                {DEFAULT_EXPECTATION.expected_sa}, MID ={" "}
                {DEFAULT_EXPECTATION.expected_mid ? "Yes" : "No"} (Total ={" "}
                {DEFAULT_EXPECTATION.expected_total})
              </p>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}

// ============================================
// KCFS Settings Component (Unified Form)
// ============================================

function KCFSSettings({
  setting,
  loading,
  onUpdate,
}: {
  setting: ExpectationSetting | undefined;
  loading: boolean;
  onUpdate: (
    grade: number | null,
    level: Level | null,
    field: "expected_fa" | "expected_sa" | "expected_mid",
    value: number | boolean
  ) => void;
}) {
  if (loading || !setting) {
    return (
      <div className="bg-surface-secondary rounded-xl border border-border-default p-6 space-y-6">
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-8 w-32" />
      </div>
    );
  }

  return (
    <div className="bg-surface-secondary rounded-xl border border-border-default p-6">
      <h3 className="text-lg font-medium text-text-primary mb-6">
        Unified Settings (All Grades & Levels)
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-2xl">
        {/* FA Count */}
        <div>
          <label className="block text-sm text-text-secondary mb-2">
            Formative Assessments (FA)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={EXPECTATION_RANGES.fa.min}
              max={EXPECTATION_RANGES.fa.max}
              value={setting.expected_fa}
              onChange={(e) =>
                onUpdate(null, null, "expected_fa", Number(e.target.value))
              }
              className="flex-1"
            />
            <span className="w-8 text-center text-text-primary font-medium">
              {setting.expected_fa}
            </span>
          </div>
          <div className="text-xs text-text-tertiary mt-1">
            Range: {EXPECTATION_RANGES.fa.min}-{EXPECTATION_RANGES.fa.max}
          </div>
        </div>

        {/* SA Count */}
        <div>
          <label className="block text-sm text-text-secondary mb-2">
            Summative Assessments (SA)
          </label>
          <div className="flex items-center gap-3">
            <input
              type="range"
              min={EXPECTATION_RANGES.sa.min}
              max={EXPECTATION_RANGES.sa.max}
              value={setting.expected_sa}
              onChange={(e) =>
                onUpdate(null, null, "expected_sa", Number(e.target.value))
              }
              className="flex-1"
            />
            <span className="w-8 text-center text-text-primary font-medium">
              {setting.expected_sa}
            </span>
          </div>
          <div className="text-xs text-text-tertiary mt-1">
            Range: {EXPECTATION_RANGES.sa.min}-{EXPECTATION_RANGES.sa.max}
          </div>
        </div>

        {/* MID Toggle */}
        <div className="col-span-2">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={setting.expected_mid}
              onChange={(e) =>
                onUpdate(null, null, "expected_mid", e.target.checked)
              }
              className="w-5 h-5 rounded border-border-default text-accent-blue focus:ring-accent-blue/50"
            />
            <span className="text-text-primary">Include Midterm (MID)</span>
          </label>
        </div>

        {/* Total Display */}
        <div className="col-span-2 pt-4 border-t border-border-default">
          <div className="flex items-center justify-between">
            <span className="text-text-secondary">Expected Total:</span>
            <span className="text-2xl font-bold text-text-primary">
              {setting.expected_total}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================
// LT/IT Settings Component (Grade × Level Table)
// ============================================

function LTITSettings({
  settings,
  grades,
  loading,
  onUpdate,
}: {
  settings: ExpectationSetting[];
  grades: number[];
  loading: boolean;
  onUpdate: (
    grade: number | null,
    level: Level | null,
    field: "expected_fa" | "expected_sa" | "expected_mid",
    value: number | boolean
  ) => void;
}) {
  if (loading) {
    return (
      <div className="bg-surface-secondary rounded-xl border border-border-default overflow-hidden">
        <div className="p-4 border-b border-border-default">
          <Skeleton className="h-6 w-48" />
        </div>
        <div className="p-4 space-y-4">
          {Array.from({ length: grades.length * 3 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Group settings by grade
  const settingsByGrade = new Map<number, ExpectationSetting[]>();
  settings.forEach((s) => {
    if (s.grade !== null) {
      const existing = settingsByGrade.get(s.grade) || [];
      existing.push(s);
      settingsByGrade.set(s.grade, existing);
    }
  });

  return (
    <div className="bg-surface-secondary rounded-xl border border-border-default overflow-hidden">
      <div className="table-responsive">
      <table className="min-w-[600px] w-full">
        <thead>
          <tr className="border-b border-border-default">
            <th className="text-left p-4 text-sm font-medium text-text-secondary w-20">
              Grade
            </th>
            {ALL_LEVELS.map((level) => (
              <th
                key={level}
                className="text-center p-4 text-sm font-medium text-text-secondary"
              >
                <div>{level}</div>
                <div className="text-xs font-normal text-text-tertiary">
                  {LEVEL_NAMES[level]}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grades.map((grade) => {
            const gradeSettings = settingsByGrade.get(grade) || [];
            return (
              <tr
                key={grade}
                className="border-b border-border-subtle hover:bg-surface-hover"
              >
                <td className="p-4 text-text-primary font-medium">G{grade}</td>
                {ALL_LEVELS.map((level) => {
                  const setting = gradeSettings.find((s) => s.level === level);
                  return (
                    <td key={level} className="p-4">
                      {setting ? (
                        <LevelSettingCell
                          grade={grade}
                          level={level}
                          setting={setting}
                          onUpdate={onUpdate}
                        />
                      ) : (
                        <div className="text-text-tertiary text-center">-</div>
                      )}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </div>
  );
}

// ============================================
// Level Setting Cell Component
// ============================================

function LevelSettingCell({
  grade,
  level,
  setting,
  onUpdate,
}: {
  grade: number;
  level: Level;
  setting: ExpectationSetting;
  onUpdate: (
    grade: number | null,
    level: Level | null,
    field: "expected_fa" | "expected_sa" | "expected_mid",
    value: number | boolean
  ) => void;
}) {
  return (
    <div className="space-y-2">
      {/* FA / SA Inputs */}
      <div className="flex items-center justify-center gap-2 text-xs">
        <div className="flex items-center gap-1">
          <span className="text-text-tertiary">FA:</span>
          <select
            value={setting.expected_fa}
            onChange={(e) =>
              onUpdate(grade, level, "expected_fa", Number(e.target.value))
            }
            className="w-12 px-1 py-0.5 bg-surface-elevated border border-border-default rounded text-text-primary text-center focus:outline-none focus:ring-1 focus:ring-accent-blue/50"
          >
            {Array.from({ length: EXPECTATION_RANGES.fa.max + 1 }).map(
              (_, i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              )
            )}
          </select>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-text-tertiary">SA:</span>
          <select
            value={setting.expected_sa}
            onChange={(e) =>
              onUpdate(grade, level, "expected_sa", Number(e.target.value))
            }
            className="w-12 px-1 py-0.5 bg-surface-elevated border border-border-default rounded text-text-primary text-center focus:outline-none focus:ring-1 focus:ring-accent-blue/50"
          >
            {Array.from({ length: EXPECTATION_RANGES.sa.max + 1 }).map(
              (_, i) => (
                <option key={i} value={i}>
                  {i}
                </option>
              )
            )}
          </select>
        </div>
      </div>

      {/* MID Toggle */}
      <div className="flex items-center justify-center">
        <label className="flex items-center gap-1 cursor-pointer text-xs">
          <input
            type="checkbox"
            checked={setting.expected_mid}
            onChange={(e) =>
              onUpdate(grade, level, "expected_mid", e.target.checked)
            }
            className="w-3 h-3 rounded border-border-default text-accent-blue focus:ring-accent-blue/50"
          />
          <span className="text-text-tertiary">MID</span>
        </label>
      </div>

      {/* Total */}
      <div className="text-center">
        <span
          className={`text-xs font-medium ${setting.isDefault ? "text-text-tertiary" : "text-accent-blue"}`}
        >
          Total: {setting.expected_total}
        </span>
      </div>
    </div>
  );
}

/**
 * Academic Year Configuration
 * 學年度設定與輔助函數
 *
 * @version 1.0.0
 * @date 2026-01-08
 */

import type { Term } from '@/types/academic-year'

/**
 * 當前學年度
 * 格式: YYYY-YYYY
 */
export const CURRENT_ACADEMIC_YEAR = '2025-2026'

/**
 * 取得當前學年度
 */
export function getCurrentAcademicYear(): string {
  return CURRENT_ACADEMIC_YEAR
}

/**
 * 取得當前 Term（根據日期）
 *
 * Term 對應月份：
 * - Term 1 (Fall Midterm): 9-11月
 * - Term 2 (Fall Final): 12-1月
 * - Term 3 (Spring Midterm): 2-4月
 * - Term 4 (Spring Final): 5-6月
 * - 7-8月（暑假）: 回傳 Term 4 作為預設
 */
export function getCurrentTerm(): Term {
  const now = new Date()
  const month = now.getMonth() + 1 // getMonth() is 0-indexed

  if (month >= 9 && month <= 11) return 1
  if (month === 12 || month === 1) return 2
  if (month >= 2 && month <= 4) return 3
  // 5-8月都回傳 Term 4
  return 4
}

/**
 * 取得 Semester（1 = Fall, 2 = Spring）
 */
export function getSemesterFromTerm(term: Term): 1 | 2 {
  return term <= 2 ? 1 : 2
}

/**
 * 取得當前 Semester
 */
export function getCurrentSemester(): 1 | 2 {
  return getSemesterFromTerm(getCurrentTerm())
}

/**
 * Term 顯示名稱
 */
export const TERM_LABELS: Record<Term, string> = {
  1: 'Term 1 (Fall Midterm)',
  2: 'Term 2 (Fall Final)',
  3: 'Term 3 (Spring Midterm)',
  4: 'Term 4 (Spring Final)',
}

/**
 * 取得 Term 顯示名稱
 */
export function getTermLabel(term: Term): string {
  return TERM_LABELS[term] ?? `Term ${term}`
}

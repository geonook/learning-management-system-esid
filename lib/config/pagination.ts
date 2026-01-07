/**
 * Pagination Configuration
 * 分頁與查詢限制的集中配置
 *
 * @version 1.0.0
 * @date 2026-01-07
 */

/**
 * 預設分頁大小配置
 * 根據不同使用場景選擇適當的分頁大小
 */
export const PAGINATION = {
  /** 大量資料查詢（統計、匯出）- 適用於 statistics, webhook 等 */
  LARGE: 1000,

  /** 標準列表查詢 - 適用於一般資料列表 */
  MEDIUM: 100,

  /** 學生列表預設 - 適用於 students API */
  STUDENTS: 50,

  /** 小型列表（通訊記錄等）- 適用於 communications API */
  SMALL: 20,

  /** 無限捲動每頁載入數量 */
  INFINITE_SCROLL: 25,
} as const

/**
 * 查詢限制配置
 * 防止過大查詢影響效能
 */
export const QUERY_LIMITS = {
  /** 單次查詢最大頁數（用於分頁迴圈）- 如 5 頁 × 1000 = 5000 筆 */
  MAX_PAGES: 5,

  /** 批次查詢最大記錄數 */
  MAX_BATCH_SIZE: 5000,

  /** Supabase API 最大行數限制（需在 Dashboard 設定） */
  SUPABASE_MAX_ROWS: 10000,
} as const

/**
 * 取得預設分頁大小
 * @param context - 使用情境
 * @returns 對應的分頁大小
 */
export function getDefaultPageSize(
  context: 'statistics' | 'students' | 'communications' | 'default' = 'default'
): number {
  switch (context) {
    case 'statistics':
      return PAGINATION.LARGE
    case 'students':
      return PAGINATION.STUDENTS
    case 'communications':
      return PAGINATION.SMALL
    default:
      return PAGINATION.MEDIUM
  }
}

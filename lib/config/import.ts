/**
 * Import Configuration
 * 資料匯入處理的集中配置
 *
 * @version 1.0.0
 * @date 2026-01-07
 */

/**
 * 批次處理配置
 * 控制資料匯入的批次大小和重試策略
 */
export const BATCH_PROCESSING = {
  /** 每批處理的記錄數 */
  BATCH_SIZE: 5,

  /** 最大重試次數 */
  MAX_RETRIES: 3,

  /** 重試延遲時間（毫秒） */
  RETRY_DELAY_MS: 200,

  /** 批次間延遲時間（毫秒）- 避免過度負載 */
  BATCH_DELAY_MS: 100,
} as const

/**
 * MAP CDF 匯入限制
 * NWEA MAP 評測資料的匯入限制
 */
export const MAP_IMPORT_LIMITS = {
  /** 最大目標領域數量（Goal Areas） */
  MAX_GOALS: 8,

  /** 最大預測熟練度項目數 */
  MAX_PROJECTED_PROFICIENCY: 3,

  /** 單次匯入最大學生數 */
  MAX_STUDENTS_PER_IMPORT: 500,
} as const

/**
 * 成績匯入限制
 */
export const GRADEBOOK_IMPORT_LIMITS = {
  /** 單次匯入最大記錄數 */
  MAX_RECORDS: 1000,

  /** 允許的成績範圍 */
  SCORE_MIN: 0,
  SCORE_MAX: 100,
} as const

/**
 * 計算預估處理時間
 * @param recordCount - 記錄總數
 * @returns 預估時間（秒）
 */
export function estimateProcessingTime(recordCount: number): number {
  const { BATCH_SIZE, BATCH_DELAY_MS } = BATCH_PROCESSING
  const batchCount = Math.ceil(recordCount / BATCH_SIZE)
  const totalDelayMs = batchCount * BATCH_DELAY_MS
  // 假設每批處理約 500ms
  const processingTimeMs = batchCount * 500
  return Math.ceil((totalDelayMs + processingTimeMs) / 1000)
}

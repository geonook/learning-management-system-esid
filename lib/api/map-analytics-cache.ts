/**
 * MAP Analytics 快取層
 *
 * 用於快取高頻、低變動的 MAP 分析資料
 * TTL: 30 分鐘
 *
 * 適用場景：
 * - getAvailableTerms() - 學期列表（極低變動）
 * - getAvailableGrowthPeriods() - 成長週期選項（極低變動）
 * - getCrossGradeStats() - 跨年級統計（每次測驗後變動）
 * - getMapGroupAverages() - 群組平均（低變動）
 */

class MapAnalyticsCache {
  private cache: Map<string, { data: unknown; expires: number }> = new Map();
  private readonly cacheTTL = 30 * 60 * 1000; // 30 分鐘

  /**
   * 取得快取資料
   * @returns 快取資料或 null（若過期或不存在）
   */
  get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    // 檢查是否過期
    if (Date.now() > cached.expires) {
      this.cache.delete(key);
      return null;
    }

    return cached.data as T;
  }

  /**
   * 設定快取資料
   */
  set<T>(key: string, data: T): void {
    this.cache.set(key, {
      data,
      expires: Date.now() + this.cacheTTL,
    });
  }

  /**
   * 檢查快取是否存在且有效
   */
  has(key: string): boolean {
    const cached = this.cache.get(key);
    if (!cached) return false;

    if (Date.now() > cached.expires) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * 清除所有快取
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * 清除特定 prefix 的快取
   * 用於部分失效場景
   */
  clearByPrefix(prefix: string): void {
    for (const key of this.cache.keys()) {
      if (key.startsWith(prefix)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * 取得快取統計（用於除錯）
   */
  getStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }
}

// 單例模式匯出
export const mapAnalyticsCache = new MapAnalyticsCache();

// 快取 key 常數（避免拼字錯誤）
export const CACHE_KEYS = {
  AVAILABLE_TERMS: "available-terms",
  AVAILABLE_GROWTH_PERIODS: "available-growth-periods",
  CROSS_GRADE_STATS: (term: string) => `cross-grade-stats:${term}`,
  MAP_GROUP_AVERAGES: (term: string, grade: number) =>
    `map-group-averages:${term}:${grade}`,
} as const;

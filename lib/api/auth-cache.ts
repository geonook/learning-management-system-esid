/**
 * Auth User Cache
 *
 * 記憶體快取使用者資訊，避免重複的資料庫查詢。
 * 每個 API 函數呼叫 requireAuth() 時，會先檢查快取。
 *
 * 特性：
 * - TTL: 5 分鐘
 * - 自動驗證 userId 一致性（防止用戶切換）
 * - 登出時自動清除
 *
 * @module lib/api/auth-cache
 */

import type { CurrentUser } from './permissions'

class AuthUserCache {
  private cache: { user: CurrentUser; expires: number } | null = null
  private cacheTTL = 5 * 60 * 1000 // 5 分鐘

  /**
   * 設置快取
   */
  set(user: CurrentUser) {
    this.cache = {
      user,
      expires: Date.now() + this.cacheTTL
    }
  }

  /**
   * 取得快取的使用者（自動檢查過期）
   */
  get(): CurrentUser | null {
    if (!this.cache || this.cache.expires < Date.now()) {
      this.cache = null
      return null
    }
    return this.cache.user
  }

  /**
   * 清除快取
   */
  clear() {
    this.cache = null
  }

  /**
   * 檢查快取是否對指定 userId 有效
   * 確保快取的使用者 ID 與當前 auth session 一致
   */
  isValidFor(userId: string): boolean {
    return this.cache?.user.id === userId && this.cache.expires > Date.now()
  }
}

export const authUserCache = new AuthUserCache()

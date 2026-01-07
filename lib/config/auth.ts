/**
 * Authentication Configuration
 * 認證相關的超時與安全配置
 *
 * @version 1.0.0
 * @date 2026-01-07
 */

/**
 * Cookie 超時配置（秒）
 */
export const COOKIE_TIMEOUTS = {
  /** PKCE Code Verifier 超時 - 15 分鐘 */
  PKCE_VERIFIER: 900,

  /** OAuth State 超時 - 15 分鐘 */
  OAUTH_STATE: 900,

  /** Redirect URL 超時 - 15 分鐘 */
  REDIRECT_URL: 900,

  /** Session Cookie 超時 - 7 天 */
  SESSION: 7 * 24 * 60 * 60,

  /** 立即過期（用於登出） */
  IMMEDIATE_EXPIRE: 0,
} as const

/**
 * Token 配置
 */
export const TOKEN_CONFIG = {
  /** Access Token 預設有效期（秒）- 1 小時 */
  ACCESS_TOKEN_EXPIRY: 3600,

  /** Refresh Token 預設有效期（秒）- 30 天 */
  REFRESH_TOKEN_EXPIRY: 30 * 24 * 60 * 60,

  /** Token 刷新提前量（秒）- 提前 5 分鐘刷新 */
  REFRESH_BUFFER: 300,
} as const

/**
 * Session 配置
 */
export const SESSION_CONFIG = {
  /** Session 閒置超時（毫秒）- 30 分鐘 */
  IDLE_TIMEOUT_MS: 30 * 60 * 1000,

  /** 最大並發 Session 數 */
  MAX_CONCURRENT_SESSIONS: 5,
} as const

/**
 * 安全驗證配置
 */
export const SECURITY_CONFIG = {
  /** Secret 最小長度（Base64 編碼的 256-bit） */
  SECRET_MIN_LENGTH: 43,

  /** Secret 最大長度 */
  SECRET_MAX_LENGTH: 44,

  /** 是否要求 HTTPS（生產環境） */
  REQUIRE_HTTPS: process.env.NODE_ENV === 'production',
} as const

/**
 * 取得 Cookie 選項
 * @param timeout - 超時秒數
 * @param isSecure - 是否使用安全 Cookie
 */
export function getCookieOptions(timeout: number, isSecure = SECURITY_CONFIG.REQUIRE_HTTPS) {
  return {
    maxAge: timeout,
    httpOnly: true,
    secure: isSecure,
    sameSite: 'lax' as const,
    path: '/',
  }
}

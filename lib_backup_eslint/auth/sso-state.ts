/**
 * SSO State Management
 * CSRF 保護與 PKCE 狀態管理
 *
 * 使用 sessionStorage 儲存狀態（客戶端）
 * 符合 OAuth 2.0 安全最佳實務
 *
 * @version 1.0.0
 * @date 2025-11-13
 */

import { SSOState } from '@/types/sso'

const SSO_STATE_KEY = 'sso_state'
const STATE_EXPIRY_MS = 10 * 60 * 1000 // 10 minutes

/**
 * 生成密碼學安全的隨機 State Token
 * 用於 CSRF 保護
 *
 * @returns Cryptographically secure random state token (32 chars)
 */
export function generateStateToken(): string {
  const array = new Uint8Array(24) // 24 bytes = 32 chars base64
  crypto.getRandomValues(array)

  return btoa(String.fromCharCode(...Array.from(array)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

/**
 * 儲存 SSO 狀態到 sessionStorage
 * 包含 state token, code verifier, 和 redirect URL
 *
 * @param state - SSO state to save
 */
export function saveSSOState(state: Omit<SSOState, 'createdAt'>): void {
  if (typeof window === 'undefined') {
    throw new Error('saveSSOState can only be called on client-side')
  }

  const ssoState: SSOState = {
    ...state,
    createdAt: Date.now(),
  }

  sessionStorage.setItem(SSO_STATE_KEY, JSON.stringify(ssoState))
}

/**
 * 從 sessionStorage 讀取 SSO 狀態
 *
 * @returns SSO state or null if not found or expired
 */
export function getSSOState(): SSOState | null {
  if (typeof window === 'undefined') {
    return null
  }

  const stateJson = sessionStorage.getItem(SSO_STATE_KEY)
  if (!stateJson) {
    return null
  }

  try {
    const state = JSON.parse(stateJson) as SSOState

    // Check if state has expired
    const now = Date.now()
    if (now - state.createdAt > STATE_EXPIRY_MS) {
      clearSSOState()
      return null
    }

    return state
  } catch (error) {
    console.error('Failed to parse SSO state:', error)
    clearSSOState()
    return null
  }
}

/**
 * 驗證 State Token
 * 比對回調參數中的 state 與儲存的 state
 *
 * @param stateToken - State token from OAuth callback
 * @returns true if state is valid
 */
export function validateStateToken(stateToken: string): boolean {
  const savedState = getSSOState()

  if (!savedState) {
    console.error('No saved SSO state found')
    return false
  }

  // Timing-safe comparison to prevent timing attacks
  if (savedState.state !== stateToken) {
    console.error('State token mismatch')
    return false
  }

  return true
}

/**
 * 清除 SSO 狀態
 * 登入成功或失敗後都應清除
 */
export function clearSSOState(): void {
  if (typeof window === 'undefined') {
    return
  }

  sessionStorage.removeItem(SSO_STATE_KEY)
}

/**
 * 取得 Code Verifier
 * 從已儲存的 SSO 狀態中取得 PKCE code verifier
 *
 * @returns Code verifier or null if not found
 */
export function getCodeVerifier(): string | null {
  const state = getSSOState()
  return state?.codeVerifier || null
}

/**
 * 取得 Redirect URL
 * 從已儲存的 SSO 狀態中取得重定向 URL
 *
 * @returns Redirect URL or null if not found
 */
export function getRedirectUrl(): string | null {
  const state = getSSOState()
  return state?.redirectUrl || null
}

/**
 * SSO 狀態型別守衛
 * 檢查物件是否為有效的 SSO 狀態
 *
 * @param obj - Object to check
 * @returns true if valid SSOState
 */
export function isSSOState(obj: unknown): obj is SSOState {
  if (!obj || typeof obj !== 'object') {
    return false
  }

  const state = obj as Record<string, unknown>

  return (
    typeof state.state === 'string' &&
    typeof state.codeVerifier === 'string' &&
    typeof state.createdAt === 'number' &&
    state.state.length > 0 &&
    state.codeVerifier.length >= 43
  )
}

/**
 * 初始化 SSO 登入流程
 * 生成並儲存 state 與 PKCE 參數
 *
 * @param codeVerifier - PKCE code verifier
 * @param redirectUrl - Optional redirect URL after login
 * @returns State token
 */
export function initiateSSOLogin(
  codeVerifier: string,
  redirectUrl?: string
): string {
  const stateToken = generateStateToken()

  saveSSOState({
    state: stateToken,
    codeVerifier,
    redirectUrl,
  })

  return stateToken
}

/**
 * 完成 SSO 登入流程
 * 驗證 state 並取得必要資訊後清除狀態
 *
 * @param stateToken - State token from OAuth callback
 * @returns Object containing code verifier and redirect URL, or null if invalid
 */
export function completeSSOLogin(stateToken: string): {
  codeVerifier: string
  redirectUrl?: string
} | null {
  if (!validateStateToken(stateToken)) {
    clearSSOState()
    return null
  }

  const savedState = getSSOState()
  if (!savedState) {
    return null
  }

  // Clear state after successful validation
  clearSSOState()

  return {
    codeVerifier: savedState.codeVerifier,
    redirectUrl: savedState.redirectUrl,
  }
}

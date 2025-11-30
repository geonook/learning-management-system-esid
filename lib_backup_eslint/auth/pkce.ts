/**
 * PKCE (Proof Key for Code Exchange) Implementation
 * RFC 7636 標準實作
 *
 * @version 1.0.0
 * @date 2025-11-13
 */

import { PKCEParams } from '@/types/sso'

/**
 * Base64 URL 編碼（符合 RFC 4648 Section 5）
 * 將 Uint8Array 轉換為 URL-safe base64 字串
 *
 * @param buffer - Uint8Array to encode
 * @returns URL-safe base64 encoded string
 */
function base64UrlEncode(buffer: Uint8Array): string {
  // Convert Uint8Array to base64
  const base64 = btoa(String.fromCharCode(...Array.from(buffer)))

  // Convert to URL-safe format
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

/**
 * 生成 PKCE Code Verifier
 * RFC 7636: 43-128 個字元的高熵隨機字串
 *
 * 使用 256-bit (32 bytes) 隨機值，編碼後為 43 字元
 *
 * @returns Code verifier (43 chars, base64url encoded)
 */
export function generateCodeVerifier(): string {
  // Generate 256-bit (32 bytes) random value
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)

  // Encode to URL-safe base64 (43 chars)
  return base64UrlEncode(array)
}

/**
 * 生成 PKCE Code Challenge
 * SHA-256 hash of code verifier
 *
 * @param verifier - Code verifier to hash
 * @returns Promise<Code challenge (43 chars, base64url encoded)>
 */
export async function generateCodeChallenge(
  verifier: string
): Promise<string> {
  // Convert verifier to Uint8Array
  const encoder = new TextEncoder()
  const data = encoder.encode(verifier)

  // Hash with SHA-256
  const hash = await crypto.subtle.digest('SHA-256', data)

  // Encode to URL-safe base64
  return base64UrlEncode(new Uint8Array(hash))
}

/**
 * 生成完整的 PKCE 參數組
 * 包含 verifier, challenge, 和 method
 *
 * @returns Promise<PKCE parameters>
 */
export async function generatePKCEParams(): Promise<PKCEParams> {
  const codeVerifier = generateCodeVerifier()
  const codeChallenge = await generateCodeChallenge(codeVerifier)

  return {
    codeVerifier,
    codeChallenge,
    codeChallengeMethod: 'S256',
  }
}

/**
 * 驗證 Code Verifier 格式
 * RFC 7636: 43-128 個字元，僅包含 [A-Z][a-z][0-9]-._~
 *
 * @param verifier - Code verifier to validate
 * @returns true if valid
 */
export function isValidCodeVerifier(verifier: string): boolean {
  if (!verifier || verifier.length < 43 || verifier.length > 128) {
    return false
  }

  // RFC 7636: unreserved characters [A-Z] / [a-z] / [0-9] / "-" / "." / "_" / "~"
  const validPattern = /^[A-Za-z0-9\-._~]+$/
  return validPattern.test(verifier)
}

/**
 * 驗證 Code Challenge 與 Verifier 是否匹配
 * Server-side verification (Info Hub 會執行此驗證)
 *
 * @param verifier - Code verifier
 * @param challenge - Code challenge to verify
 * @returns Promise<true if match>
 */
export async function verifyCodeChallenge(
  verifier: string,
  challenge: string
): Promise<boolean> {
  if (!isValidCodeVerifier(verifier)) {
    return false
  }

  const computedChallenge = await generateCodeChallenge(verifier)
  return computedChallenge === challenge
}

/**
 * PKCE 參數型別守衛
 * 檢查物件是否為有效的 PKCE 參數
 *
 * @param obj - Object to check
 * @returns true if valid PKCEParams
 */
export function isPKCEParams(obj: unknown): obj is PKCEParams {
  if (!obj || typeof obj !== 'object') {
    return false
  }

  const params = obj as Record<string, unknown>

  return (
    typeof params.codeVerifier === 'string' &&
    typeof params.codeChallenge === 'string' &&
    params.codeChallengeMethod === 'S256' &&
    isValidCodeVerifier(params.codeVerifier)
  )
}

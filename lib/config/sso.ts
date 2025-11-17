/**
 * SSO Configuration Helper
 * 環境變數載入與驗證
 *
 * @version 1.0.0
 * @date 2025-11-13
 */

import { SSOConfig } from '@/types/sso'

/**
 * 驗證必要的環境變數是否存在
 * @throws Error if required environment variables are missing
 */
function validateEnvVariables(): void {
  const requiredVars = [
    'NEXT_PUBLIC_INFOHUB_OAUTH_CLIENT_ID',
    'INFOHUB_OAUTH_CLIENT_SECRET',
    'NEXT_PUBLIC_INFOHUB_AUTH_URL',
    'INFOHUB_TOKEN_URL',
    'LMS_WEBHOOK_SECRET',
  ]

  const missing = requiredVars.filter((varName) => !process.env[varName])

  if (missing.length > 0) {
    throw new Error(
      `Missing required SSO environment variables: ${missing.join(', ')}\n` +
        'Please check your .env.local file and ensure all SSO variables are set.'
    )
  }
}

/**
 * 取得 SSO 設定
 * Server-side only - contains secrets
 *
 * @returns SSO configuration object
 * @throws Error if required environment variables are missing
 */
export function getSSOConfig(): SSOConfig {
  // Validate environment variables
  validateEnvVariables()

  return {
    clientId: process.env.NEXT_PUBLIC_INFOHUB_OAUTH_CLIENT_ID!,
    clientSecret: process.env.INFOHUB_OAUTH_CLIENT_SECRET!,
    authUrl: process.env.NEXT_PUBLIC_INFOHUB_AUTH_URL!,
    tokenUrl: process.env.INFOHUB_TOKEN_URL!,
    webhookSecret: process.env.LMS_WEBHOOK_SECRET!,
    webhookUrl:
      process.env.NEXT_PUBLIC_LMS_WEBHOOK_URL ||
      'http://localhost:3000/api/webhook/user-sync',
    enableSSO: process.env.NEXT_PUBLIC_ENABLE_SSO === 'true',
    enableEmailPassword:
      process.env.NEXT_PUBLIC_ENABLE_EMAIL_PASSWORD_AUTH !== 'false', // default true
  }
}

/**
 * 取得客戶端 SSO 設定
 * Client-side safe - only public variables
 *
 * @returns Public SSO configuration
 */
export function getPublicSSOConfig() {
  return {
    clientId: process.env.NEXT_PUBLIC_INFOHUB_OAUTH_CLIENT_ID || '',
    authUrl: process.env.NEXT_PUBLIC_INFOHUB_AUTH_URL || '',
    webhookUrl:
      process.env.NEXT_PUBLIC_LMS_WEBHOOK_URL ||
      'http://localhost:3000/api/webhook/user-sync',
    enableSSO: process.env.NEXT_PUBLIC_ENABLE_SSO === 'true',
    enableEmailPassword:
      process.env.NEXT_PUBLIC_ENABLE_EMAIL_PASSWORD_AUTH !== 'false',
  }
}

/**
 * 檢查 SSO 功能是否啟用
 *
 * @returns true if SSO is enabled
 */
export function isSSOEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_SSO === 'true'
}

/**
 * 檢查 Email/Password 認證是否啟用
 *
 * @returns true if email/password auth is enabled
 */
export function isEmailPasswordEnabled(): boolean {
  return process.env.NEXT_PUBLIC_ENABLE_EMAIL_PASSWORD_AUTH !== 'false'
}

/**
 * 取得 OAuth 授權 URL
 *
 * @param params - Authorization request parameters
 * @returns Full authorization URL with query parameters
 */
export function buildAuthorizationUrl(params: {
  clientId: string
  redirectUri: string
  codeChallenge: string
  state: string
  scope?: string
}): string {
  const authUrl = process.env.NEXT_PUBLIC_INFOHUB_AUTH_URL!

  const queryParams = new URLSearchParams({
    client_id: params.clientId,
    redirect_uri: params.redirectUri,
    response_type: 'code',
    code_challenge: params.codeChallenge,
    code_challenge_method: 'S256',
    state: params.state,
    ...(params.scope && { scope: params.scope }),
  })

  return `${authUrl}?${queryParams.toString()}`
}

/**
 * 驗證 Webhook 密鑰格式
 * 應為 256-bit (43-44 chars base64)
 *
 * @param secret - Webhook secret to validate
 * @returns true if valid format
 */
export function isValidWebhookSecret(secret: string): boolean {
  // Base64 encoded 256-bit secret should be 43-44 chars
  return secret.length >= 43 && secret.length <= 44
}

/**
 * 驗證 OAuth Client Secret 格式
 * 應為 256-bit (43-44 chars base64)
 *
 * @param secret - Client secret to validate
 * @returns true if valid format
 */
export function isValidClientSecret(secret: string): boolean {
  // Base64 encoded 256-bit secret should be 43-44 chars
  return secret.length >= 43 && secret.length <= 44
}

/**
 * 取得 OAuth 回調 URL
 * 用於 redirect_uri 參數
 *
 * IMPORTANT:
 * - Client-side: Uses window.location.origin (runtime value from browser)
 * - Server-side: Uses NEXT_PUBLIC_APP_URL environment variable
 *
 * This ensures correct redirect_uri in all deployment environments without
 * relying on build-time environment variable substitution.
 *
 * @returns OAuth callback URL
 */
export function getOAuthCallbackUrl(): string {
  // Client-side: Use browser's current origin (always correct for current deployment)
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/auth/callback/infohub`
  }

  // Server-side: Use environment variable
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return `${baseUrl}/api/auth/callback/infohub`
}

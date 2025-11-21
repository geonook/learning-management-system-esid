/**
 * SSO Integration Type Definitions
 * Info Hub ↔ LMS Single Sign-On
 * OAuth 2.0 + PKCE Implementation
 *
 * Updated to align with Info Hub implementation:
 * - Webhook signature: X-Webhook-Signature (HMAC-SHA256)
 * - Events: user.created, user.updated only (no user.deleted)
 *
 * @version 1.1.0
 * @date 2025-11-19
 */

import { Database } from "./database";

// ========================================
// OAUTH 2.0 + PKCE TYPES
// ========================================

/**
 * PKCE (Proof Key for Code Exchange) 參數
 * RFC 7636 標準實作
 */
export interface PKCEParams {
  /** Code verifier (43-128 chars, base64url encoded) */
  codeVerifier: string;
  /** Code challenge (SHA-256 hash of verifier) */
  codeChallenge: string;
  /** Challenge method (always 'S256' for SHA-256) */
  codeChallengeMethod: "S256";
}

/**
 * OAuth 授權請求參數
 * 對應 Info Hub /api/oauth/authorize 端點
 */
export interface OAuthAuthorizationRequest {
  /** OAuth Client ID */
  client_id: string;
  /** Redirect URI (must match registered URI) */
  redirect_uri: string;
  /** Response type (always 'code' for authorization code flow) */
  response_type: "code";
  /** PKCE code challenge */
  code_challenge: string;
  /** PKCE challenge method */
  code_challenge_method: "S256";
  /** CSRF protection state token */
  state: string;
  /** Requested scopes (space-separated) */
  scope?: string;
}

/**
 * OAuth Token Exchange 請求參數
 * 對應 Info Hub /api/oauth/token 端點
 */
export interface OAuthTokenRequest {
  /** OAuth Client ID */
  client_id: string;
  /** OAuth Client Secret */
  client_secret: string;
  /** Authorization code from callback */
  code: string;
  /** PKCE code verifier */
  code_verifier: string;
  /** Grant type (always 'authorization_code') */
  grant_type: "authorization_code";
  /** Redirect URI (must match authorization request) */
  redirect_uri: string;
}

/**
 * OAuth Token Exchange 回應
 * Info Hub 回傳的使用者資料與 Webhook 狀態
 */
export interface OAuthTokenResponse {
  /** Access token (contains user data JSON) */
  access_token: string;
  /** Token type (always 'Bearer') */
  token_type: "Bearer";
  /** Token expiry time (seconds) */
  expires_in: number;
  /** User data from Info Hub */
  user: InfoHubUser;
  /** Webhook sync status */
  webhook_status: WebhookSyncStatus;
}

// ========================================
// INFO HUB USER TYPES
// ========================================

/**
 * Info Hub 使用者資料結構
 * 來自 Token Exchange 回應
 */
export interface InfoHubUser {
  /** User email (login credential) */
  email: string;
  /** Full name in English */
  full_name: string;
  /** Info Hub user ID (UUID v4) */
  infohub_user_id: string;
  /** User role in Info Hub */
  role: InfoHubRole;
  /** Teacher type (LT/IT/KCFS) */
  teacher_type: TeacherType | null;
  /** Track (course_type: LT/IT/KCFS) - Aligned with Migration 014 */
  track: "LT" | "IT" | "KCFS" | null;
  /** Grade level (1-6, for Head Teachers) */
  grade: number | null;
  /** Google OAuth profile picture URL */
  avatar_url?: string;
  /** LMS user ID (if already synced) */
  lms_user_id?: string;
  /** Last sync timestamp */
  lms_synced_at?: string;
}

/**
 * Info Hub 角色列舉
 */
export type InfoHubRole =
  | "admin"
  | "office_member"
  | "head"
  | "teacher"
  | "viewer";

/**
 * 教師類型列舉
 */
export type TeacherType = "LT" | "IT" | "KCFS";

/**
 * Info Hub → LMS 角色對應
 */
export interface RoleMapping {
  infohubRole: InfoHubRole;
  lmsRole: Database["public"]["Enums"]["user_role"];
  teacherType: TeacherType | null;
  grade: number | null;
}

// ========================================
// WEBHOOK TYPES
// ========================================

/**
 * Webhook 事件類型
 * Info Hub only sends user.created and user.updated events
 */
export type WebhookEventType = "user.created" | "user.updated";

/**
 * Webhook 請求標頭
 * Info Hub uses X-Webhook-Signature with HMAC-SHA256
 */
export interface WebhookHeaders {
  /** X-Webhook-Signature: HMAC-SHA256 signature (hex) */
  "x-webhook-signature": string;
  /** X-Webhook-Event: user.created | user.updated */
  "x-webhook-event": WebhookEventType;
  /** X-Webhook-Retry: 0 | 1 | 2 */
  "x-webhook-retry": string;
  /** X-Webhook-Timestamp: ISO 8601 format */
  "x-webhook-timestamp": string;
  /** Content-Type: application/json */
  "content-type": "application/json";
}

/**
 * Webhook Payload 結構
 */
export interface WebhookPayload {
  /** Event type */
  event: WebhookEventType;
  /** User data */
  user: InfoHubUser;
  /** Event timestamp */
  timestamp: string;
  /** HMAC signature for verification */
  signature: string;
}

/**
 * Webhook 回應結構
 */
export interface WebhookResponse {
  /** Success status */
  success: boolean;
  /** LMS user ID (UUID) */
  lms_user_id?: string;
  /** Error message (if failed) */
  error?: string;
  /** Timestamp */
  timestamp: string;
}

/**
 * Webhook 同步狀態
 * Token Exchange 回應中的 webhook_status 欄位
 */
export interface WebhookSyncStatus {
  /** Webhook sent status */
  sent: boolean;
  /** Webhook success status */
  success: boolean;
  /** Retry attempt number (0-3) */
  attempt: number;
  /** Error message (if failed) */
  error: string | null;
}

// ========================================
// SSO STATE MANAGEMENT
// ========================================

/**
 * SSO 狀態資料（儲存在 session storage）
 */
export interface SSOState {
  /** CSRF protection state token */
  state: string;
  /** PKCE code verifier */
  codeVerifier: string;
  /** Redirect URL after successful login */
  redirectUrl?: string;
  /** Timestamp when state was created */
  createdAt: number;
}

/**
 * SSO 回調參數（從 Info Hub 重定向回來）
 */
export interface SSOCallbackParams {
  /** Authorization code */
  code: string;
  /** State token (for CSRF validation) */
  state: string;
  /** Error code (if authorization failed) */
  error?: string;
  /** Error description */
  error_description?: string;
}

// ========================================
// ERROR TYPES
// ========================================

/**
 * SSO 錯誤類型
 */
export type SSOErrorCode =
  | "invalid_request"
  | "unauthorized_client"
  | "access_denied"
  | "unsupported_response_type"
  | "invalid_scope"
  | "server_error"
  | "temporarily_unavailable"
  | "invalid_grant"
  | "invalid_state"
  | "pkce_verification_failed"
  | "webhook_failed"
  | "user_creation_failed"
  | "viewer_access_denied";

/**
 * SSO 錯誤結構
 */
export interface SSOError {
  /** Error code */
  code: SSOErrorCode;
  /** Human-readable error message */
  message: string;
  /** Detailed error description */
  description?: string;
  /** Original error object */
  originalError?: Error;
}

// ========================================
// SUPABASE USER CREATION
// ========================================

/**
 * 建立 Supabase 使用者的參數
 */
export interface CreateSupabaseUserParams {
  /** User email */
  email: string;
  /** Full name */
  fullName: string;
  /** User role (admin/head/teacher) */
  role: Database["public"]["Enums"]["user_role"];
  /** Teacher type (LT/IT/KCFS) */
  teacherType?: TeacherType | null;
  /** Grade level (1-6, for Head Teachers) */
  grade?: number | null;
  /** Track (local/international) */
  track?: "local" | "international" | null;
  /** Info Hub user ID */
  infohubUserId: string;
  /** Avatar URL */
  avatarUrl?: string;
}

/**
 * Supabase 使用者建立結果
 */
export interface CreateSupabaseUserResult {
  /** Success status */
  success: boolean;
  /** Created user ID */
  userId?: string;
  /** Error message (if failed) */
  error?: string;
}

// ========================================
// CONFIGURATION
// ========================================

/**
 * SSO 設定介面
 */
export interface SSOConfig {
  /** OAuth Client ID */
  clientId: string;
  /** OAuth Client Secret (server-side only) */
  clientSecret: string;
  /** Info Hub Authorization URL */
  authUrl: string;
  /** Info Hub Token URL */
  tokenUrl: string;
  /** LMS Webhook Secret */
  webhookSecret: string;
  /** LMS Webhook URL */
  webhookUrl: string;
  /** Enable SSO feature */
  enableSSO: boolean;
  /** Enable Email/Password authentication */
  enableEmailPassword: boolean;
}

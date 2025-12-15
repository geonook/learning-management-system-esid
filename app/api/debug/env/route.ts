/**
 * Environment Variables Diagnostic API
 * 環境變數診斷端點
 *
 * Purpose: Verify that environment variables are correctly loaded in deployed environment
 * Usage: GET /api/debug/env
 *
 * @version 1.0.0
 * @date 2025-11-17
 */

import { NextResponse } from 'next/server'

export async function GET() {
  // Collect all relevant environment variables for SSO
  const envDiagnostic = {
    // Critical SSO Configuration
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL || 'NOT SET',
    NEXT_PUBLIC_INFOHUB_AUTH_URL: process.env.NEXT_PUBLIC_INFOHUB_AUTH_URL || 'NOT SET',
    NEXT_PUBLIC_INFOHUB_OAUTH_CLIENT_ID: process.env.NEXT_PUBLIC_INFOHUB_OAUTH_CLIENT_ID || 'NOT SET',
    NEXT_PUBLIC_LMS_WEBHOOK_URL: process.env.NEXT_PUBLIC_LMS_WEBHOOK_URL || 'NOT SET',

    // Feature Flags
    NEXT_PUBLIC_ENABLE_SSO: process.env.NEXT_PUBLIC_ENABLE_SSO || 'NOT SET',
    NEXT_PUBLIC_ENABLE_EMAIL_PASSWORD_AUTH: process.env.NEXT_PUBLIC_ENABLE_EMAIL_PASSWORD_AUTH || 'NOT SET',

    // Supabase Configuration
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ? `${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 20)}...`
      : 'NOT SET',

    // Server-side only variables (masked for security)
    INFOHUB_TOKEN_URL: process.env.INFOHUB_TOKEN_URL || 'NOT SET',
    INFOHUB_OAUTH_CLIENT_SECRET: process.env.INFOHUB_OAUTH_CLIENT_SECRET ? 'SET (hidden)' : 'NOT SET',
    LMS_WEBHOOK_SECRET: process.env.LMS_WEBHOOK_SECRET ? 'SET (hidden)' : 'NOT SET',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'SET (hidden)' : 'NOT SET',

    // Environment Info
    NODE_ENV: process.env.NODE_ENV || 'NOT SET',

    // Computed Values (what the app actually uses)
    computed: {
      oauth_callback_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/callback/infohub`,
      is_production: process.env.NODE_ENV === 'production',
      sso_enabled: process.env.NEXT_PUBLIC_ENABLE_SSO === 'true',
    },

    // Deployment Info
    deployment: {
      timestamp: new Date().toISOString(),
      platform: 'Zeabur',
    }
  }

  return NextResponse.json(envDiagnostic, {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      // Allow CORS for development testing
      'Access-Control-Allow-Origin': '*',
    }
  })
}

/**
 * Expected Output for Staging:
 *
 * {
 *   "NEXT_PUBLIC_APP_URL": "https://lms-staging.zeabur.app",
 *   "NEXT_PUBLIC_INFOHUB_AUTH_URL": "https://next14-landing.zeabur.app/api/oauth/authorize",
 *   "NEXT_PUBLIC_INFOHUB_OAUTH_CLIENT_ID": "eb88b24e-8392-45c4-b7f7-39f03b6df208",
 *   "NEXT_PUBLIC_LMS_WEBHOOK_URL": "https://lms-staging.zeabur.app/api/webhook/user-sync",
 *   "NEXT_PUBLIC_ENABLE_SSO": "true",
 *   "NEXT_PUBLIC_ENABLE_EMAIL_PASSWORD_AUTH": "true",
 *   "NEXT_PUBLIC_SUPABASE_URL": "https://piwbooidofbaqklhijup.supabase.co",
 *   "NEXT_PUBLIC_SUPABASE_ANON_KEY": "eyJhbGciOiJIUzI1NiI...",
 *   "INFOHUB_TOKEN_URL": "https://next14-landing.zeabur.app/api/oauth/token",
 *   "INFOHUB_OAUTH_CLIENT_SECRET": "SET (hidden)",
 *   "LMS_WEBHOOK_SECRET": "SET (hidden)",
 *   "SUPABASE_SERVICE_ROLE_KEY": "SET (hidden)",
 *   "NODE_ENV": "production",
 *   "computed": {
 *     "oauth_callback_url": "https://lms-staging.zeabur.app/api/auth/callback/infohub",
 *     "is_production": true,
 *     "sso_enabled": true
 *   },
 *   "deployment": {
 *     "timestamp": "2025-11-17T...",
 *     "platform": "Zeabur"
 *   }
 * }
 */

/**
 * SSO Redirect API Route
 *
 * Server-side SSO initiation endpoint for seamless authentication
 * from Info Hub to LMS without showing login page UI.
 *
 * Flow:
 * 1. Info Hub clicks LMS button → redirects to this endpoint
 * 2. This endpoint generates PKCE params and state token
 * 3. Sets httpOnly cookies for PKCE verifier and state
 * 4. 302 redirects to Info Hub OAuth authorize endpoint
 * 5. Info Hub authenticates and redirects back to /api/auth/callback/infohub
 *
 * @version 1.0.0
 * @date 2025-11-28
 */

import { NextResponse, NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import * as crypto from 'crypto'

export const dynamic = 'force-dynamic'

/**
 * Generate a cryptographically secure random string
 * Used for both code_verifier and state token
 */
function generateSecureToken(length: number = 32): string {
  const array = crypto.randomBytes(length)
  return array
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

/**
 * Generate PKCE code challenge from verifier using SHA-256
 */
function generateCodeChallenge(verifier: string): string {
  const hash = crypto.createHash('sha256').update(verifier).digest()
  return hash
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '')
}

export async function GET(request: NextRequest) {
  console.log('[SSO Redirect] Request received')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'

  try {
    // 0. Check if user is already logged in - if so, skip SSO and go to dashboard
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value
          },
          set() {},
          remove() {},
        },
      }
    )

    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      console.log('[SSO Redirect] User already logged in:', user.email)
      console.log('[SSO Redirect] Skipping SSO, redirecting to dashboard')
      return NextResponse.redirect(new URL('/dashboard', appUrl))
    }

    // 1. Check if SSO is enabled
    const enableSSO = process.env.NEXT_PUBLIC_ENABLE_SSO === 'true'
    if (!enableSSO) {
      console.warn('[SSO Redirect] SSO is not enabled')
      return NextResponse.redirect(
        new URL('/auth/login?error=sso_disabled', appUrl)
      )
    }

    // 2. Validate required environment variables
    const clientId = process.env.NEXT_PUBLIC_INFOHUB_OAUTH_CLIENT_ID
    const authUrl = process.env.NEXT_PUBLIC_INFOHUB_AUTH_URL

    if (!clientId || !authUrl) {
      console.error('[SSO Redirect] Missing OAuth configuration')
      return NextResponse.redirect(
        new URL('/auth/login?error=config_error', appUrl)
      )
    }

    // 3. Generate PKCE parameters
    const codeVerifier = generateSecureToken(32) // 43 chars after base64url
    const codeChallenge = generateCodeChallenge(codeVerifier)
    const state = generateSecureToken(32)

    console.log('[SSO Redirect] PKCE params generated')
    console.log('[SSO Redirect] Code verifier length:', codeVerifier.length)
    console.log('[SSO Redirect] Code challenge:', codeChallenge.substring(0, 10) + '...')

    // 4. Build callback URL
    const callbackUri = `${appUrl}/api/auth/callback/infohub`

    // 5. Build OAuth authorization URL
    const authParams = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackUri,
      response_type: 'code',
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
      state: state,
      scope: 'openid profile email',
    })

    const fullAuthUrl = `${authUrl}?${authParams.toString()}`

    console.log('[SSO Redirect] Redirecting to:', authUrl)
    console.log('[SSO Redirect] Callback URI:', callbackUri)

    // 6. Create redirect response with cookies
    const response = NextResponse.redirect(fullAuthUrl)

    // Set PKCE verifier cookie (httpOnly for security)
    response.cookies.set('pkce_verifier', codeVerifier, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 900, // 15 minutes
    })

    // Set state cookie (httpOnly for security)
    response.cookies.set('sso_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 900, // 15 minutes
    })

    // Also store redirect URL for after successful auth
    response.cookies.set('sso_redirect', '/dashboard', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 900, // 15 minutes
    })

    console.log('[SSO Redirect] Cookies set, redirecting to Info Hub OAuth')

    return response
  } catch (error) {
    console.error('[SSO Redirect] Error:', error)

    return NextResponse.redirect(
      new URL('/auth/login?error=sso_redirect_failed', appUrl)
    )
  }
}

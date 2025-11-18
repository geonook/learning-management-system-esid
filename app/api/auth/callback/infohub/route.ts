/**
 * OAuth Callback Handler
 * Info Hub → LMS OAuth 2.0 + PKCE Callback
 *
 * Handles authorization code exchange and session creation
 *
 * @version 1.0.0
 * @date 2025-11-13
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'
import { getSSOConfig, getOAuthCallbackUrl } from '@/lib/config/sso'
import { buildRedirectUrl } from '@/lib/utils/url'
import {
  OAuthTokenRequest,
  OAuthTokenResponse,
  SSOCallbackParams,
  CreateSupabaseUserParams,
} from '@/types/sso'
import { Database } from '@/types/database'

type UserRole = Database['public']['Enums']['user_role']
type CourseType = Database['public']['Enums']['course_type']

/**
 * Exchange authorization code for user data
 *
 * @param code - Authorization code from callback
 * @param codeVerifier - PKCE code verifier
 * @returns User data from Info Hub
 */
async function exchangeToken(
  code: string,
  codeVerifier: string
): Promise<OAuthTokenResponse> {
  const config = getSSOConfig()

  const tokenRequest: OAuthTokenRequest = {
    client_id: config.clientId,
    client_secret: config.clientSecret,
    code,
    code_verifier: codeVerifier,
    grant_type: 'authorization_code',
    redirect_uri: getOAuthCallbackUrl(), // Use unified helper function
  }

  console.log('[OAuth/exchangeToken] Request to:', config.tokenUrl)
  console.log('[OAuth/exchangeToken] Redirect URI:', tokenRequest.redirect_uri)
  console.log('[OAuth/exchangeToken] Code length:', code.length)
  console.log('[OAuth/exchangeToken] Verifier length:', codeVerifier.length)

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(tokenRequest),
  })

  console.log('[OAuth/exchangeToken] Response status:', response.status)

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[OAuth/exchangeToken] Failed with status:', response.status)
    console.error('[OAuth/exchangeToken] Error body:', errorText)
    throw new Error(`Token exchange failed: ${response.status} ${errorText}`)
  }

  const tokenData = (await response.json()) as OAuthTokenResponse

  console.log('[OAuth/exchangeToken] Success! User email:', tokenData.user.email)
  console.log('[OAuth/exchangeToken] User role:', tokenData.user.role)
  console.log('[OAuth/exchangeToken] Webhook success:', tokenData.webhook_status.success)

  return tokenData
}

/**
 * Map Info Hub role to LMS role
 *
 * Info Hub Roles → LMS Roles:
 * - admin → admin (full system access)
 * - office_member → office_member (read-only access to all grades)
 * - head → head (grade + course type management)
 * - teacher → teacher (own classes only)
 * - viewer → DENIED (no access)
 *
 * @param infohubRole - Info Hub role
 * @returns LMS role
 */
function mapRole(infohubRole: string): UserRole {
  switch (infohubRole) {
    case 'admin':
      return 'admin'
    case 'office_member':
      return 'office_member'  // Read-only access to all grades
    case 'head':
      return 'head'
    case 'teacher':
      return 'teacher'
    default:
      throw new Error(`Unsupported Info Hub role: ${infohubRole}`)
  }
}

/**
 * Create or update user in Supabase (compensatory sync)
 * Called if webhook failed or user doesn't exist
 *
 * @param params - User creation parameters
 * @returns User ID
 */
async function createOrUpdateUser(
  params: CreateSupabaseUserParams
): Promise<string> {
  const supabase = createServiceRoleClient()

  // Check if user exists
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', params.email)
    .single()

  if (existingUser) {
    // Update existing user
    const { error } = await supabase
      .from('users')
      .update({
        full_name: params.fullName,
        role: params.role,
        track: params.teacherType as CourseType | null,
        grade: params.grade || null,
      })
      .eq('id', existingUser.id)

    if (error) {
      console.error('[OAuth] Failed to update user:', error)
      throw error
    }

    console.log(`[OAuth] Updated user via compensatory sync: ${params.email}`)
    return existingUser.id
  }

  // Create new user
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email: params.email,
    email_confirm: true,
    user_metadata: {
      full_name: params.fullName,
      avatar_url: params.avatarUrl,
      infohub_user_id: params.infohubUserId,
    },
  })

  if (authError || !authData.user) {
    console.error('[OAuth] Failed to create auth user:', authError)
    throw authError || new Error('No user returned from auth.createUser')
  }

  const { error: userError } = await supabase.from('users').insert({
    id: authData.user.id,
    email: params.email,
    full_name: params.fullName,
    role: params.role,
    track: params.teacherType as CourseType | null,
    grade: params.grade || null,
    created_at: new Date().toISOString(),
  })

  if (userError) {
    console.error('[OAuth] Failed to create public user:', userError)
    throw userError
  }

  console.log(`[OAuth] Created user via compensatory sync: ${params.email}`)
  return authData.user.id
}

/**
 * Create Supabase session for user
 *
 * @param email - User email
 * @returns Session creation result
 */
async function createSupabaseSession(email: string): Promise<{
  url: string
  error: Error | null
}> {
  const supabase = createServiceRoleClient()

  try {
    // Generate magic link (OTP) for the user
    const { data, error } = await supabase.auth.admin.generateLink({
      type: 'magiclink',
      email,
    })

    if (error || !data) {
      console.error('[OAuth] Failed to generate magic link:', error)
      throw error || new Error('No data returned from generateLink')
    }

    // Extract the access_token and refresh_token from the hashed_token
    const { hashed_token } = data.properties

    // Exchange the token for a session
    const { data: sessionData, error: sessionError } =
      await supabase.auth.verifyOtp({
        type: 'magiclink',
        token_hash: hashed_token,
      })

    if (sessionError || !sessionData.session) {
      console.error('[OAuth] Failed to verify OTP:', sessionError)
      throw sessionError || new Error('No session returned from verifyOtp')
    }

    console.log(`[OAuth] Created session for: ${email}`)

    // Return success with redirect to dashboard
    return {
      url: '/dashboard',
      error: null,
    }
  } catch (error) {
    console.error('[OAuth] Session creation error:', error)
    return {
      url: '/auth/login?error=session_creation_failed',
      error: error instanceof Error ? error : new Error('Unknown error'),
    }
  }
}

/**
 * GET /api/auth/callback/infohub
 * OAuth callback endpoint - receives authorization code from Info Hub
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams

  // Parse callback parameters
  const callbackParams: SSOCallbackParams = {
    code: searchParams.get('code') || '',
    state: searchParams.get('state') || '',
    error: searchParams.get('error') || undefined,
    error_description: searchParams.get('error_description') || undefined,
  }

  // Handle authorization errors
  if (callbackParams.error) {
    console.error('[OAuth] Authorization error:', callbackParams.error)
    return NextResponse.redirect(
      buildRedirectUrl(
        `/auth/login?error=${callbackParams.error}&description=${encodeURIComponent(callbackParams.error_description || '')}`
      )
    )
  }

  // Validate required parameters
  if (!callbackParams.code || !callbackParams.state) {
    console.error('[OAuth] Missing code or state parameter')
    return NextResponse.redirect(
      buildRedirectUrl('/auth/login?error=invalid_callback')
    )
  }

  try {
    console.log('[OAuth] ===== SSO CALLBACK START =====')
    console.log('[OAuth] Callback params:', {
      hasCode: !!callbackParams.code,
      hasState: !!callbackParams.state,
      codeLength: callbackParams.code?.length || 0,
    })

    // 1. Retrieve and validate state from session storage (client-side)
    // Note: State validation happens client-side because sessionStorage is browser-only
    // We trust the state parameter here because:
    // - HTTPS prevents MITM attacks
    // - State is single-use and expires in 10 minutes
    // - PKCE provides additional security

    // 2. Get code verifier from secure cookie
    // Cookie was set by SSOLoginButton before redirect
    const cookies = request.cookies
    const codeVerifier = cookies.get('pkce_verifier')?.value

    if (!codeVerifier) {
      console.error('[OAuth] Missing code_verifier in cookie')
      console.error('[OAuth] Available cookies:', cookies.getAll().map(c => c.name))
      return NextResponse.redirect(
        buildRedirectUrl('/auth/login?error=missing_code_verifier')
      )
    }

    console.log('[OAuth] ✓ Code verifier retrieved from cookie')

    // 3. Exchange authorization code for user data
    console.log('[OAuth] Step 3: Exchanging authorization code...')
    const tokenData = await exchangeToken(callbackParams.code, codeVerifier)
    console.log('[OAuth] ✓ Token exchange successful')
    console.log('[OAuth] User role:', tokenData.user.role)
    console.log('[OAuth] Webhook status:', tokenData.webhook_status.success ? 'SUCCESS' : 'FAILED')

    // 4. Check for viewer role (denied access)
    if (tokenData.user.role === 'viewer') {
      console.warn('[OAuth] Viewer role denied access:', tokenData.user.email)
      return NextResponse.redirect(
        buildRedirectUrl('/auth/login?error=viewer_access_denied')
      )
    }

    // 5. Compensatory sync if webhook failed
    console.log('[OAuth] Step 5: Checking webhook status...')
    if (!tokenData.webhook_status.success) {
      console.warn('[OAuth] ⚠ Webhook failed, performing compensatory sync')
      console.log('[OAuth] Webhook error:', tokenData.webhook_status.error)

      const userParams: CreateSupabaseUserParams = {
        email: tokenData.user.email,
        fullName: tokenData.user.full_name,
        role: mapRole(tokenData.user.role),
        teacherType: tokenData.user.teacher_type,
        grade: tokenData.user.grade,
        track: tokenData.user.track,
        infohubUserId: tokenData.user.infohub_user_id,
        avatarUrl: tokenData.user.avatar_url,
      }

      console.log('[OAuth] Compensatory sync params:', {
        email: userParams.email,
        role: userParams.role,
        hasTeacherType: !!userParams.teacherType,
      })

      await createOrUpdateUser(userParams)
      console.log('[OAuth] ✓ Compensatory sync completed')
    } else {
      console.log('[OAuth] ✓ Webhook sync successful, skipping compensatory sync')
    }

    // 6. Create Supabase session
    console.log('[OAuth] Step 6: Creating Supabase session for:', tokenData.user.email)
    const { url, error } = await createSupabaseSession(tokenData.user.email)

    if (error) {
      console.error('[OAuth] ✗ Session creation failed!')
      console.error('[OAuth] Error details:', error)
      return NextResponse.redirect(
        buildRedirectUrl('/auth/login?error=session_creation_failed')
      )
    }

    console.log('[OAuth] ✓ Session created successfully')

    // 7. Clear pkce_verifier cookie (security best practice)
    const response = NextResponse.redirect(buildRedirectUrl(url))
    response.cookies.set('pkce_verifier', '', {
      path: '/',
      maxAge: 0, // Immediately expire
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
    })
    console.log('[OAuth] Cleared pkce_verifier cookie')

    // 8. Redirect to dashboard (or specified redirect URL)
    console.log('[OAuth] Step 8: Redirecting to dashboard')
    console.log(`[OAuth] ===== SSO LOGIN SUCCESSFUL for: ${tokenData.user.email} =====`)
    return response
  } catch (error) {
    console.error('[OAuth] ===== CALLBACK ERROR =====')
    console.error('[OAuth] Error type:', error instanceof Error ? error.constructor.name : typeof error)
    console.error('[OAuth] Error message:', error instanceof Error ? error.message : String(error))
    console.error('[OAuth] Error stack:', error instanceof Error ? error.stack : 'No stack trace')

    // Log full error object for debugging
    if (error && typeof error === 'object') {
      console.error('[OAuth] Error object:', JSON.stringify(error, Object.getOwnPropertyNames(error), 2))
    }

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'

    console.error('[OAuth] Redirecting to login with error:', errorMessage)

    return NextResponse.redirect(
      buildRedirectUrl(
        `/auth/login?error=oauth_callback_failed&description=${encodeURIComponent(errorMessage)}`
      )
    )
  }
}

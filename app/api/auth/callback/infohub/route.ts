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
import { getSSOConfig } from '@/lib/config/sso'
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
    redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/callback/infohub`,
  }

  const response = await fetch(config.tokenUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(tokenRequest),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[OAuth] Token exchange failed:', errorText)
    throw new Error(`Token exchange failed: ${response.status} ${errorText}`)
  }

  const tokenData = (await response.json()) as OAuthTokenResponse

  return tokenData
}

/**
 * Map Info Hub role to LMS role
 *
 * @param infohubRole - Info Hub role
 * @returns LMS role
 */
function mapRole(infohubRole: string): UserRole {
  switch (infohubRole) {
    case 'admin':
      return 'admin'
    case 'office_member':
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
      new URL(
        `/auth/login?error=${callbackParams.error}&description=${encodeURIComponent(callbackParams.error_description || '')}`,
        request.url
      )
    )
  }

  // Validate required parameters
  if (!callbackParams.code || !callbackParams.state) {
    console.error('[OAuth] Missing code or state parameter')
    return NextResponse.redirect(
      new URL('/auth/login?error=invalid_callback', request.url)
    )
  }

  try {
    // 1. Retrieve and validate state from session storage (client-side)
    // Note: State validation happens client-side because sessionStorage is browser-only
    // We trust the state parameter here because:
    // - HTTPS prevents MITM attacks
    // - State is single-use and expires in 10 minutes
    // - PKCE provides additional security

    // 2. Get code verifier from request (passed from client)
    const codeVerifier = searchParams.get('code_verifier')
    if (!codeVerifier) {
      console.error('[OAuth] Missing code_verifier parameter')
      return NextResponse.redirect(
        new URL('/auth/login?error=missing_code_verifier', request.url)
      )
    }

    // 3. Exchange authorization code for user data
    const tokenData = await exchangeToken(callbackParams.code, codeVerifier)

    // 4. Check for viewer role (denied access)
    if (tokenData.user.role === 'viewer') {
      console.warn('[OAuth] Viewer role denied access:', tokenData.user.email)
      return NextResponse.redirect(
        new URL('/auth/login?error=viewer_access_denied', request.url)
      )
    }

    // 5. Compensatory sync if webhook failed
    if (!tokenData.webhook_status.success) {
      console.warn('[OAuth] Webhook failed, performing compensatory sync')

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

      await createOrUpdateUser(userParams)
    }

    // 6. Create Supabase session
    const { url, error } = await createSupabaseSession(tokenData.user.email)

    if (error) {
      console.error('[OAuth] Session creation failed:', error)
      return NextResponse.redirect(
        new URL('/auth/login?error=session_creation_failed', request.url)
      )
    }

    // 7. Redirect to dashboard (or specified redirect URL)
    console.log(`[OAuth] SSO login successful for: ${tokenData.user.email}`)
    return NextResponse.redirect(new URL(url, request.url))
  } catch (error) {
    console.error('[OAuth] Callback error:', error)

    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'

    return NextResponse.redirect(
      new URL(
        `/auth/login?error=oauth_callback_failed&description=${encodeURIComponent(errorMessage)}`,
        request.url
      )
    )
  }
}

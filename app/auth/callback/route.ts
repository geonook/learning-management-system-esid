import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { buildRedirectUrl } from '@/lib/utils/url'

/**
 * OAuth Callback Route Handler
 *
 * Handles the OAuth callback from Google (and other providers)
 * Exchanges the authorization code for a user session
 *
 * Flow:
 * 1. User clicks "Sign in with Google" on login page
 * 2. Redirected to Google OAuth consent screen
 * 3. User authorizes → Google redirects back to this route with ?code=xxx
 * 4. This route exchanges code for session
 * 5. Redirects user to dashboard (or role-select for first-time users)
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  // If there's a code, exchange it for a session
  if (code) {
    const supabase = createClient()

    try {
      const { data, error } = await supabase.auth.exchangeCodeForSession(code)

      if (error) {
        console.error('OAuth callback error:', error)

        // Redirect to login with error message
        return NextResponse.redirect(
          buildRedirectUrl(`/auth/login?error=${encodeURIComponent(error.message)}`)
        )
      }

      if (data.session) {
        console.log('OAuth session established:', {
          userId: data.session.user.id,
          email: data.session.user.email,
          provider: data.session.user.app_metadata.provider
        })

        // Check if user exists in users table
        const { data: userProfile, error: profileError } = await supabase
          .from('users')
          .select('id, role, full_name')
          .eq('id', data.session.user.id)
          .single()

        if (profileError || !userProfile) {
          // First-time OAuth user - redirect to role selection
          console.log('First-time OAuth user, redirecting to role selection')
          return NextResponse.redirect(buildRedirectUrl('/auth/role-select'))
        }

        // Existing user - redirect to dashboard
        console.log('Existing user, redirecting to dashboard')
        return NextResponse.redirect(buildRedirectUrl('/dashboard'))
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
      console.error('OAuth exchange exception:', error)
      return NextResponse.redirect(
        buildRedirectUrl('/auth/login?error=' + encodeURIComponent('OAuth authentication failed'))
      )
    }
  }

  // No code present, redirect to login
  return NextResponse.redirect(buildRedirectUrl('/auth/login'))
}

/**
 * Client-Side Session Setup Page
 *
 * This page receives access_token and refresh_token from OAuth callback
 * and sets the session in the browser context (client-side).
 *
 * Flow:
 * 1. OAuth callback generates tokens (server-side)
 * 2. Redirects to this page with tokens as URL parameters
 * 3. This page sets session in browser (client-side)
 * 4. Redirects to dashboard with session cookies set
 *
 * @version 1.0.0
 * @date 2025-11-18
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default function SetSessionPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [errorMessage, setErrorMessage] = useState<string>('')

  useEffect(() => {
    const setupSession = async () => {
      try {
        // 1. Extract OTP parameters from URL
        const tokenHash = searchParams.get('token_hash')
        const type = searchParams.get('type')
        const email = searchParams.get('email')

        if (!tokenHash || !type || !email) {
          throw new Error('Missing authentication parameters')
        }

        console.log('[SetSession] Verifying OTP for:', email)

        // 2. Create Supabase client
        const supabase = createClient()

        // 3. Verify OTP in browser context (client-side)
        // This will automatically set session cookies in the browser
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as 'magiclink',
        })

        if (error) {
          throw error
        }

        if (!data.session) {
          throw new Error('Failed to create session')
        }

        console.log('[SetSession] ✓ Session established successfully')
        console.log('[SetSession] User:', data.session.user.email)

        setStatus('success')

        // 4. Redirect to dashboard with session cookies set
        setTimeout(() => {
          router.push('/dashboard')
        }, 500)

      } catch (error) {
        console.error('[SetSession] Error:', error)
        setStatus('error')
        setErrorMessage(error instanceof Error ? error.message : 'Unknown error occurred')

        // Redirect to login page with error after 3 seconds
        setTimeout(() => {
          router.push(`/auth/login?error=${encodeURIComponent('session_setup_failed')}&description=${encodeURIComponent(errorMessage || 'Failed to set up session')}`)
        }, 3000)
      }
    }

    setupSession()
  }, [searchParams, router, errorMessage])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-8 shadow-lg">
        {status === 'loading' && (
          <div className="text-center">
            <LoadingSpinner size="lg" className="mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900">
              Setting up your session...
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Please wait while we complete your login
            </p>
          </div>
        )}

        {status === 'success' && (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              Login successful!
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Redirecting to dashboard...
            </p>
          </div>
        )}

        {status === 'error' && (
          <div className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
              <svg
                className="h-6 w-6 text-red-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-900">
              Session setup failed
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              {errorMessage || 'An error occurred while setting up your session'}
            </p>
            <p className="mt-2 text-xs text-gray-500">
              Redirecting to login page...
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

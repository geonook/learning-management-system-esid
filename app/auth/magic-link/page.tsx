"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

/**
 * Magic Link Callback Page
 *
 * Handles magic link authentication from Supabase Admin API
 * Magic links contain tokens in the URL hash fragment (#access_token=...)
 * which can only be processed client-side
 *
 * Flow:
 * 1. Admin generates magic link via /api/admin/impersonate
 * 2. User clicks link → redirects to this page with hash fragment
 * 3. This page manually extracts token from hash and sets session
 * 4. Page redirects to dashboard
 */
export default function MagicLinkPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState("Processing magic link...")
  const hasProcessed = useRef(false)

  useEffect(() => {
    const handleMagicLink = async () => {
      if (hasProcessed.current) return
      hasProcessed.current = true

      const supabase = createClient()
      const hash = window.location.hash

      console.log("[MagicLink] Processing hash:", hash ? "present" : "empty")

      // No hash token - check for existing session or redirect to login
      if (!hash || !hash.includes("access_token")) {
        const { data: { session } } = await supabase.auth.getSession()

        if (session) {
          console.log("[MagicLink] Existing session found, redirecting to dashboard")
          router.replace("/dashboard")
        } else {
          console.log("[MagicLink] No token or session, redirecting to login")
          router.replace("/auth/login")
        }
        return
      }

      setStatus("Verifying authentication...")

      try {
        // Parse hash parameters manually
        const hashParams = new URLSearchParams(hash.substring(1))
        const accessToken = hashParams.get("access_token")
        const refreshToken = hashParams.get("refresh_token")

        console.log("[MagicLink] Tokens found:", {
          hasAccessToken: !!accessToken,
          hasRefreshToken: !!refreshToken
        })

        if (!accessToken) {
          setError("Invalid magic link: missing access token")
          return
        }

        // Manually set the session using the tokens from hash
        console.log("[MagicLink] Setting session with tokens...")
        const { data, error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || ""
        })

        if (sessionError) {
          console.error("[MagicLink] setSession error:", sessionError)
          setError(sessionError.message)
          return
        }

        if (data.session) {
          console.log("[MagicLink] Session established successfully:", data.session.user.email)
          setStatus("Login successful! Redirecting...")

          // Clear the hash from URL for cleaner appearance
          window.history.replaceState(null, "", window.location.pathname)

          // Redirect to dashboard
          setTimeout(() => {
            router.replace("/dashboard")
          }, 500)
        } else {
          console.error("[MagicLink] No session after setSession")
          setError("Failed to establish session. The link may have expired.")
        }
      } catch (err) {
        console.error("[MagicLink] Exception:", err)
        setError(err instanceof Error ? err.message : "An unexpected error occurred")
      }
    }

    handleMagicLink()
  }, [router])

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-primary">
        <div className="text-center p-8 max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-text-primary mb-2">Authentication Failed</h2>
          <p className="text-text-secondary mb-6">{error}</p>
          <button
            onClick={() => router.replace("/auth/login")}
            className="px-4 py-2 bg-accent-primary text-white rounded-lg hover:bg-accent-primary/90 transition-colors"
          >
            Return to Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-primary">
      <div className="text-center">
        <LoadingSpinner />
        <p className="mt-4 text-text-secondary">{status}</p>
      </div>
    </div>
  )
}

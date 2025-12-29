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
 * 3. Supabase SDK extracts token from hash and establishes session
 * 4. Page redirects to dashboard
 */
export default function MagicLinkPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState("Processing magic link...")
  const hasRedirected = useRef(false)

  useEffect(() => {
    const supabase = createClient()

    // Listen for auth state changes - this is the most reliable way
    // to detect when the session is established from the hash fragment
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("[MagicLink] Auth state changed:", event, session?.user?.email)

        if (hasRedirected.current) return

        if (event === "SIGNED_IN" && session) {
          hasRedirected.current = true
          setStatus("Login successful! Redirecting...")
          console.log("[MagicLink] SIGNED_IN event, redirecting to dashboard")

          // Small delay to show success message
          setTimeout(() => {
            router.replace("/dashboard")
          }, 500)
        }
      }
    )

    // Also check for existing session (in case auth state already changed)
    const checkExistingSession = async () => {
      // Check if we have a hash with access_token
      const hash = window.location.hash
      console.log("[MagicLink] Processing hash:", hash ? "present" : "empty")

      if (!hash || !hash.includes("access_token")) {
        // No magic link token, check for existing session
        const { data: { session } } = await supabase.auth.getSession()

        if (session && !hasRedirected.current) {
          hasRedirected.current = true
          console.log("[MagicLink] Existing session found, redirecting to dashboard")
          router.replace("/dashboard")
        } else if (!session) {
          console.log("[MagicLink] No token or session, redirecting to login")
          router.replace("/auth/login")
        }
        return
      }

      setStatus("Verifying authentication...")

      // Give Supabase SDK time to process the hash and trigger onAuthStateChange
      // The SDK automatically detects hash fragments and establishes session
      setTimeout(async () => {
        if (hasRedirected.current) return

        const { data: { session } } = await supabase.auth.getSession()

        if (session && !hasRedirected.current) {
          hasRedirected.current = true
          console.log("[MagicLink] Session found after delay, redirecting")
          setStatus("Login successful! Redirecting...")
          router.replace("/dashboard")
        } else if (!hasRedirected.current) {
          console.log("[MagicLink] No session after timeout, showing error")
          setError("Failed to establish session. Please try again.")
        }
      }, 3000) // Wait up to 3 seconds for SDK to process
    }

    checkExistingSession()

    return () => {
      subscription.unsubscribe()
    }
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

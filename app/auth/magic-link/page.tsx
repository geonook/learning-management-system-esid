"use client"

import { useEffect, useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

/**
 * Magic Link Callback Page
 *
 * 使用 onAuthStateChange 監聽方式，而非 await setSession()
 * 因為 setSession() 的 promise 可能不會 resolve
 */
export default function MagicLinkPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState("Processing magic link...")
  const hasProcessed = useRef(false)
  const hasRedirected = useRef(false)

  useEffect(() => {
    // 監聽 auth 狀態變化
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log("[MagicLink] Auth event:", event, session?.user?.email)

      if (hasRedirected.current) return

      if (event === "SIGNED_IN" && session?.user) {
        hasRedirected.current = true
        console.log("[MagicLink] SIGNED_IN detected, redirecting...")
        setStatus("Login successful! Redirecting...")

        // 清除 URL hash
        window.history.replaceState(null, "", window.location.pathname)

        // 使用完整頁面導航
        setTimeout(() => {
          window.location.href = "/dashboard"
        }, 300)
      }
    })

    // 處理 hash token
    const processToken = async () => {
      if (hasProcessed.current) return
      hasProcessed.current = true

      const hash = window.location.hash
      console.log("[MagicLink] Hash:", hash ? "present" : "empty")

      // 沒有 hash token
      if (!hash || !hash.includes("access_token")) {
        const { data: { user } } = await supabase.auth.getUser()
        if (user) {
          console.log("[MagicLink] Already logged in")
          window.location.href = "/dashboard"
        } else {
          console.log("[MagicLink] No token, redirecting to login")
          router.replace("/auth/login")
        }
        return
      }

      setStatus("Verifying authentication...")

      // 解析 token
      const hashParams = new URLSearchParams(hash.substring(1))
      const accessToken = hashParams.get("access_token")
      const refreshToken = hashParams.get("refresh_token")

      console.log("[MagicLink] Tokens parsed:", !!accessToken, !!refreshToken)

      if (!accessToken) {
        setError("Invalid magic link: missing access token")
        return
      }

      // 呼叫 setSession（不等待回傳，靠 onAuthStateChange 觸發 redirect）
      console.log("[MagicLink] Calling setSession (fire and forget)...")
      supabase.auth.setSession({
        access_token: accessToken,
        refresh_token: refreshToken || ""
      }).then(({ error }) => {
        if (error) {
          console.error("[MagicLink] setSession error:", error)
          setError(error.message)
        }
      }).catch((err) => {
        console.error("[MagicLink] setSession exception:", err)
        setError(err.message)
      })

      // 設定 timeout 以防 onAuthStateChange 不觸發
      setTimeout(() => {
        if (!hasRedirected.current) {
          console.log("[MagicLink] Timeout - checking session manually")
          supabase.auth.getUser().then(({ data: { user } }) => {
            if (user && !hasRedirected.current) {
              hasRedirected.current = true
              console.log("[MagicLink] Manual check found user, redirecting")
              window.location.href = "/dashboard"
            } else if (!user) {
              setError("Session verification timed out. Please try again.")
            }
          })
        }
      }, 5000)
    }

    processToken()

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

"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { supabase } from "@/lib/supabase/client"
import { LoadingSpinner } from "@/components/ui/loading-spinner"

/**
 * Magic Link Callback Page - Simplified Architecture
 *
 * 設計原則：
 * 這個頁面不依賴 AuthContext/useAuthReady，因為我們需要在
 * AuthContext 初始化之前處理 token。
 *
 * 流程：
 * 1. 解析 URL hash 中的 token
 * 2. 呼叫 supabase.auth.setSession() 設定 session
 * 3. 使用 supabase.auth.getUser() 驗證 session 成功
 * 4. 直接用 window.location.href 導向 dashboard（強制完整頁面載入）
 *
 * 為什麼用 window.location.href 而非 router.replace：
 * - router.replace 是 client-side navigation，不會重新載入 AuthContext
 * - window.location.href 強制完整頁面載入，AuthContext 會從新 session 初始化
 */
export default function MagicLinkPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState("Processing magic link...")

  useEffect(() => {
    const processToken = async () => {
      const hash = window.location.hash
      console.log("[MagicLink] Hash:", hash ? "present" : "empty")

      // Case 1: 沒有 hash token
      if (!hash || !hash.includes("access_token")) {
        // 檢查是否已有 session（可能是直接訪問這個頁面）
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          console.log("[MagicLink] User already logged in, redirecting")
          window.location.href = "/dashboard"
        } else {
          console.log("[MagicLink] No token and no session")
          router.replace("/auth/login")
        }
        return
      }

      // Case 2: 有 hash token，進行處理
      setStatus("Verifying authentication...")

      try {
        // 解析 token
        const hashParams = new URLSearchParams(hash.substring(1))
        const accessToken = hashParams.get("access_token")
        const refreshToken = hashParams.get("refresh_token")

        console.log("[MagicLink] Tokens:", {
          hasAccess: !!accessToken,
          hasRefresh: !!refreshToken
        })

        if (!accessToken) {
          setError("Invalid magic link: missing access token")
          return
        }

        // 設定 session
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken || ""
        })

        if (sessionError) {
          console.error("[MagicLink] setSession error:", sessionError)
          setError(sessionError.message)
          return
        }

        // 驗證 session 成功
        const { data: { user }, error: userError } = await supabase.auth.getUser()

        if (userError || !user) {
          console.error("[MagicLink] getUser error:", userError)
          setError("Failed to verify session. The link may have expired.")
          return
        }

        console.log("[MagicLink] Session verified for:", user.email)
        setStatus("Login successful! Redirecting...")

        // 關鍵：使用完整頁面導航而非 client-side navigation
        // 這確保 AuthContext 從新的 session 狀態初始化
        setTimeout(() => {
          window.location.href = "/dashboard"
        }, 300)

      } catch (err) {
        console.error("[MagicLink] Exception:", err)
        setError(err instanceof Error ? err.message : "An unexpected error occurred")
      }
    }

    processToken()
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

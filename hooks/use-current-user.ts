/**
 * @deprecated 請使用 useAuthReady hook 代替
 *
 * 這個 hook 已棄用，因為它有以下問題：
 * 1. 直接呼叫 Supabase auth，繞過 AuthContext
 * 2. 在 auth 事件時會重複 fetch
 * 3. 返回的 user 物件會導致 useEffect 無限迴圈
 *
 * 正確用法：
 * ```typescript
 * import { useAuthReady } from "@/hooks/useAuthReady";
 *
 * const { userId, isReady, role } = useAuthReady();
 *
 * useEffect(() => {
 *   if (!isReady) return;
 *   // ...
 * }, [userId]);
 * ```
 */
"use client"

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { UserProfile } from '@/lib/supabase/auth'

export function useCurrentUser() {
  const [user, setUser] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function fetchUser() {
      try {
        setLoading(true)
        setError(null)

        const supabase = createClient()
        
        // Get current auth user
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser()
        
        if (authError) {
          throw authError
        }

        if (!authUser) {
          if (isMounted) {
            setUser(null)
            setLoading(false)
          }
          return
        }

        // Get user profile from users table
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single()

        if (profileError) {
          throw profileError
        }

        if (isMounted) {
          setUser(profile)
        }

      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to fetch user')
          setUser(null)
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    fetchUser()

    // Listen to auth state changes
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT' || !session) {
        setUser(null)
        setLoading(false)
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        fetchUser()
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [])

  return {
    user,
    loading,
    error,
    isAuthenticated: !!user
  }
}
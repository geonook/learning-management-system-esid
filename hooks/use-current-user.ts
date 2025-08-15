/**
 * Client-side hook for getting current user profile
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
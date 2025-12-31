"use client"

import { createContext, useContext, useEffect, useState, useRef } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from './client'
import type { UserPermissions } from '@/lib/api/teacher-data'
import { authUserCache } from '@/lib/api/auth-cache'

interface AuthContextType {
  user: User | null
  userPermissions: UserPermissions | null
  loading: boolean
  signOut: () => Promise<void>
  refreshPermissions: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [userPermissions, setUserPermissions] = useState<UserPermissions | null>(null)
  const [loading, setLoading] = useState(true)
  const [isHydrated, setIsHydrated] = useState(false)
  const [isDevelopmentMockActive, setIsDevelopmentMockActive] = useState(false)

  // Ref 用於在 onAuthStateChange 回調中追蹤最新的 userPermissions
  // 這解決了閉包捕獲舊值的問題
  const userPermissionsRef = useRef<UserPermissions | null>(null)
  // 追蹤初始 session 載入是否完成
  const initialLoadCompleteRef = useRef(false)
  // 防止 React Strict Mode / SSR 水合導致的重複初始化
  const hasInitializedRef = useRef(false)

  const fetchUserPermissions = async (userId: string): Promise<UserPermissions | null> => {
    try {
      console.log('[AuthContext] Fetching permissions for userId:', userId)

      const { data, error } = await supabase
        .from('users')
        .select('id, role, grade_band, track, teacher_type, full_name')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('[AuthContext] Error fetching user permissions:', error)
        console.error('[AuthContext] Error code:', error.code)
        console.error('[AuthContext] Error message:', error.message)
        console.error('[AuthContext] Error details:', error.details)
        return null
      }

      console.log('[AuthContext] User permissions loaded:', {
        userId: data.id,
        role: data.role,
        full_name: data.full_name
      })

      return {
        userId: data.id,
        role: data.role,
        grade: data.grade_band,
        track: data.track,
        teacher_type: data.teacher_type,
        full_name: data.full_name
      }
    } catch (error) {
      console.error('[AuthContext] Exception fetching user permissions:', error)
      return null
    }
  }

  const refreshPermissions = async () => {
    if (user) {
      authUserCache.clear() // 強制重新查詢
      const permissions = await fetchUserPermissions(user.id)
      setUserPermissions(permissions)
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setUserPermissions(null)
    authUserCache.clear() // 清除快取
  }

  // 同步 ref 與 state，確保 onAuthStateChange 回調讀取到最新值
  useEffect(() => {
    userPermissionsRef.current = userPermissions
  }, [userPermissions])

  useEffect(() => {
    // 防止 React Strict Mode 或 SSR 水合導致的重複初始化
    if (hasInitializedRef.current) {
      console.log('[AuthContext] Already initialized, skipping duplicate mount')
      // 即使跳過初始化，也需要設置 hydrated 狀態以避免 UI 問題
      setIsHydrated(true)
      return
    }
    hasInitializedRef.current = true
    console.log('[AuthContext] Initializing auth context...')

    // Set hydrated state
    setIsHydrated(true)

    // Get initial session
    const getSession = async () => {
      // Check for environment variable to enable mock auth
      const useMockAuth = process.env.NEXT_PUBLIC_USE_MOCK_AUTH === 'true'
      
      if (useMockAuth && process.env.NODE_ENV === 'development') {
        const mockUser = {
          id: 'dev-admin-user-id',
          email: 'admin@dev.local',
          aud: 'authenticated',
          role: 'authenticated',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          app_metadata: {},
          user_metadata: {},
          identities: []
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any
        
        setUser(mockUser)
        setUserPermissions({
          userId: 'dev-admin-user-id',
          role: 'admin',
          grade: null,
          track: null,
          teacher_type: null,
          full_name: 'Development Admin'
        })
        setIsDevelopmentMockActive(true)
        console.log('Development mode: Using mock admin user')
        setLoading(false)
        return
      }
      
      // Real authentication: use actual Supabase session
      console.log('[AuthContext] Getting session...')
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        console.error('[AuthContext] Session error:', sessionError)
      }

      console.log('[AuthContext] Session result:', {
        hasSession: !!session,
        userEmail: session?.user?.email,
        userId: session?.user?.id
      })

      if (session?.user) {
        setUser(session.user)
        const permissions = await fetchUserPermissions(session.user.id)
        console.log('[AuthContext] Permissions result:', permissions)
        if (!permissions) {
          console.error('[AuthContext] WARNING: User has session but no permissions - user may not exist in database')
          console.error('[AuthContext] User ID:', session.user.id, 'Email:', session.user.email)
        }
        setUserPermissions(permissions)
      } else {
        console.log('[AuthContext] No session found, user will be redirected to login')
      }

      // 標記初始載入完成，讓 onAuthStateChange 知道可以開始處理事件
      initialLoadCompleteRef.current = true
      console.log('[AuthContext] Initial load complete, setting loading=false')
      setLoading(false)
    }

    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('[AuthContext] Auth state changed:', event, session?.user?.email)

        const useMockAuth = process.env.NEXT_PUBLIC_USE_MOCK_AUTH === 'true'

        // If mock auth is active, ignore real auth state changes
        if (useMockAuth && process.env.NODE_ENV === 'development' && isDevelopmentMockActive) {
          console.log('[AuthContext] Development mode: Ignoring auth state change')
          return
        }

        // 在初始載入完成前，忽略所有 auth 事件（讓 getSession() 處理）
        // 這避免了 onAuthStateChange 和 getSession() 的競爭條件
        if (!initialLoadCompleteRef.current) {
          console.log('[AuthContext] Initial load not complete, skipping auth event:', event)
          return
        }

        // Skip if this is the same user (no need to refetch permissions)
        // This covers TOKEN_REFRESHED, SIGNED_IN, and INITIAL_SESSION events
        // 使用 ref 而非 state，避免閉包捕獲舊值的問題
        const currentUserId = userPermissionsRef.current?.userId
        const sessionUserId = session?.user?.id
        console.log('[AuthContext] Auth event check:', {
          event,
          currentUserId,
          sessionUserId,
          isSameUser: currentUserId === sessionUserId
        })

        if (['TOKEN_REFRESHED', 'SIGNED_IN', 'INITIAL_SESSION'].includes(event)
            && currentUserId === sessionUserId) {
          console.log('[AuthContext] Same user auth event, skipping permission refetch:', event)
          return
        }

        if (session?.user) {
          // Set loading to true while fetching permissions to prevent race condition
          console.log('[AuthContext] Auth state changed with user, fetching permissions...')
          setLoading(true)
          setUser(session.user)
          const permissions = await fetchUserPermissions(session.user.id)
          if (!permissions) {
            console.error('[AuthContext] WARNING: Auth state changed but no permissions - user may not exist in database')
            console.error('[AuthContext] User ID:', session.user.id, 'Email:', session.user.email)
          }
          setUserPermissions(permissions)
          console.log('[AuthContext] Auth state change complete, setting loading=false')
          setLoading(false)
        } else {
          console.log('[AuthContext] Auth state changed: no session, clearing user')
          setUser(null)
          setUserPermissions(null)
          setLoading(false)
        }
      }
    )

    return () => {
      console.log('[AuthContext] Cleanup: unsubscribing auth listener')
      subscription.unsubscribe()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Prevent hydration mismatch by ensuring consistent initial render
  if (!isHydrated) {
    return (
      <AuthContext.Provider value={{
        user: null,
        userPermissions: null,
        loading: true,
        signOut: async () => {},
        refreshPermissions: async () => {}
      }}>
        {children}
      </AuthContext.Provider>
    )
  }

  const value: AuthContextType = {
    user,
    userPermissions,
    loading,
    signOut,
    refreshPermissions
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}
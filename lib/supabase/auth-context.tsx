"use client"

import { createContext, useContext, useEffect, useState } from 'react'
import { User } from '@supabase/supabase-js'
import { supabase } from './client'
import type { UserPermissions } from '@/lib/api/teacher-data'

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

  const fetchUserPermissions = async (userId: string): Promise<UserPermissions | null> => {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, role, grade, track, teacher_type, full_name')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching user permissions:', error)
        return null
      }

      return {
        userId: data.id,
        role: data.role,
        grade: data.grade,
        track: data.track,
        teacher_type: data.teacher_type,
        full_name: data.full_name
      }
    } catch (error) {
      console.error('Exception fetching user permissions:', error)
      return null
    }
  }

  const refreshPermissions = async () => {
    if (user) {
      const permissions = await fetchUserPermissions(user.id)
      setUserPermissions(permissions)
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setUserPermissions(null)
  }

  useEffect(() => {
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
      const { data: { session } } = await supabase.auth.getSession()
      
      if (session?.user) {
        setUser(session.user)
        const permissions = await fetchUserPermissions(session.user.id)
        setUserPermissions(permissions)
      }
      
      setLoading(false)
    }

    getSession()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email)
        
        const useMockAuth = process.env.NEXT_PUBLIC_USE_MOCK_AUTH === 'true'
        
        // If mock auth is active, ignore real auth state changes
        if (useMockAuth && process.env.NODE_ENV === 'development' && isDevelopmentMockActive) {
          console.log('Development mode: Ignoring auth state change - mock admin user is active')
          return
        }
        
        if (session?.user) {
          setUser(session.user)
          const permissions = await fetchUserPermissions(session.user.id)
          setUserPermissions(permissions)
        } else {
          setUser(null)
          setUserPermissions(null)
        }
        
        setLoading(false)
      }
    )

    return () => {
      subscription.unsubscribe()
    }
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
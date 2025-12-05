"use client"

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/supabase/auth-context'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface AuthGuardProps {
  children: React.ReactNode
  requiredRoles?: ('admin' | 'office_member' | 'head' | 'teacher' | 'student')[]
  redirectTo?: string
}

export function AuthGuard({
  children,
  requiredRoles = [],
  redirectTo = '/auth/login'
}: AuthGuardProps) {
  const { user, userPermissions, loading } = useAuth()
  const router = useRouter()
  const [authState, setAuthState] = useState<'loading' | 'authorized' | 'unauthorized' | 'unauthenticated' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const redirectAttempted = useRef(false)
  // Track if user was previously authorized to prevent loading flash on page return
  const wasAuthorizedRef = useRef(false)

  useEffect(() => {
    console.log('[AuthGuard] State check:', {
      loading,
      hasUser: !!user,
      hasPermissions: !!userPermissions,
      wasAuthorized: wasAuthorizedRef.current,
      authState
    })

    // 1. If loading but user was previously authorized, keep showing content
    // This prevents loading flash when returning to a page
    if (loading && wasAuthorizedRef.current) {
      console.log('[AuthGuard] Loading but was authorized, keeping content')
      return
    }

    // 2. Still loading auth state (first load only)
    if (loading) {
      setAuthState('loading')
      return
    }

    // 3. No user session - redirect to login
    if (!user) {
      console.log('[AuthGuard] No user session, redirecting to login')
      setAuthState('unauthenticated')
      wasAuthorizedRef.current = false
      if (!redirectAttempted.current) {
        redirectAttempted.current = true
        router.replace(redirectTo)
      }
      return
    }

    // 4. User exists but permissions not loaded - this is an error state
    // (could be RLS issue or user not in database)
    if (!userPermissions) {
      console.error('[AuthGuard] User session exists but permissions not loaded - possible RLS issue or user not in database')
      console.error('[AuthGuard] User ID:', user.id, 'Email:', user.email)
      setAuthState('error')
      setError('無法載入用戶權限。您的帳號可能尚未設定完成，請聯繫管理員。')
      wasAuthorizedRef.current = false
      return
    }

    // 5. Check role permissions
    if (requiredRoles.length > 0 && !requiredRoles.includes(userPermissions.role)) {
      console.log('[AuthGuard] User role not authorized:', userPermissions.role, 'required:', requiredRoles)
      setAuthState('unauthorized')
      wasAuthorizedRef.current = false
      if (!redirectAttempted.current) {
        redirectAttempted.current = true
        router.replace('/unauthorized')
      }
      return
    }

    // 6. User is authenticated and authorized
    console.log('[AuthGuard] User authorized:', userPermissions.role)
    setAuthState('authorized')
    wasAuthorizedRef.current = true
  }, [user, userPermissions, loading, router, requiredRoles, redirectTo, authState])

  // Error state - show friendly message instead of infinite loading
  if (authState === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface-primary">
        <div className="text-center p-8 max-w-md">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-text-primary mb-2">權限載入失敗</h2>
          <p className="text-text-secondary mb-6">{error}</p>
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 transition-colors"
            >
              重新載入
            </button>
            <button
              onClick={() => router.replace('/auth/login')}
              className="w-full px-4 py-2 bg-surface-tertiary text-text-primary rounded-lg hover:bg-surface-secondary transition-colors"
            >
              返回登入
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Show loading spinner only on initial load (not when returning to page)
  if (authState !== 'authorized' && !wasAuthorizedRef.current) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  // User is authenticated and authorized (or was previously authorized during loading)
  return <>{children}</>
}

export default AuthGuard
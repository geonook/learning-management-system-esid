"use client"

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthReady } from '@/hooks/useAuthReady'
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
  const { userId, permissions: userPermissions, isLoading: loading } = useAuthReady()
  const router = useRouter()
  const [authState, setAuthState] = useState<'loading' | 'authorized' | 'unauthorized' | 'unauthenticated' | 'error'>('loading')
  const [error, setError] = useState<string | null>(null)
  const redirectAttempted = useRef(false)
  // Track if user was previously authorized to prevent loading flash on page return
  const wasAuthorizedRef = useRef(false)

  useEffect(() => {
    // 1. If loading but we already have valid user data, keep showing content
    // This prevents loading flash when onAuthStateChange triggers during page navigation
    if (loading && userId && userPermissions) {
      return
    }

    // 2. If loading but user was previously authorized (for edge cases), keep showing content
    if (loading && wasAuthorizedRef.current) {
      return
    }

    // 3. Still loading auth state (first load only)
    if (loading) {
      if (authState !== 'loading') {
        setAuthState('loading')
      }
      return
    }

    // 4. No user session - redirect to login
    if (!userId) {
      wasAuthorizedRef.current = false
      if (authState !== 'unauthenticated') {
        setAuthState('unauthenticated')
      }
      if (!redirectAttempted.current) {
        redirectAttempted.current = true
        router.replace(redirectTo)
      }
      return
    }

    // 5. User exists but permissions not loaded - this is an error state
    // (could be RLS issue or user not in database)
    if (!userPermissions) {
      console.error('[AuthGuard] User session exists but permissions not loaded - possible RLS issue')
      console.error('[AuthGuard] User ID:', userId)
      wasAuthorizedRef.current = false
      if (authState !== 'error') {
        setAuthState('error')
        setError('無法載入用戶權限。您的帳號可能尚未設定完成，請聯繫管理員。')
      }
      return
    }

    // 6. Check role permissions
    if (requiredRoles.length > 0 && !requiredRoles.includes(userPermissions.role)) {
      wasAuthorizedRef.current = false
      if (authState !== 'unauthorized') {
        setAuthState('unauthorized')
      }
      if (!redirectAttempted.current) {
        redirectAttempted.current = true
        router.replace('/unauthorized')
      }
      return
    }

    // 7. User is authenticated and authorized
    wasAuthorizedRef.current = true
    if (authState !== 'authorized') {
      setAuthState('authorized')
    }
  }, [userId, userPermissions, loading, router, requiredRoles, redirectTo, authState])

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

  // If we have valid user data with correct role, show content regardless of loading/authState
  // This is the key fix for Phase E2: prevents loading flash when data already exists
  const hasValidAuth = userId && userPermissions &&
    (requiredRoles.length === 0 || requiredRoles.includes(userPermissions.role))

  if (hasValidAuth) {
    return <>{children}</>
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
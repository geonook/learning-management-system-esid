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
  const [authState, setAuthState] = useState<'loading' | 'authorized' | 'unauthorized' | 'unauthenticated'>('loading')
  const redirectAttempted = useRef(false)
  // Track if user was previously authorized to prevent loading flash on page return
  const wasAuthorizedRef = useRef(false)

  useEffect(() => {
    // If loading but user was previously authorized, keep showing content
    // This prevents loading flash when returning to a page
    if (loading && wasAuthorizedRef.current) {
      // Don't change authState - keep showing authorized content
      return
    }

    // Still loading auth state (first load only)
    if (loading) {
      setAuthState('loading')
      return
    }

    // No user or permissions - unauthenticated
    if (!user || !userPermissions) {
      console.log('[AuthGuard] No user/permissions, redirecting to login')
      setAuthState('unauthenticated')
      wasAuthorizedRef.current = false
      if (!redirectAttempted.current) {
        redirectAttempted.current = true
        router.replace(redirectTo)
      }
      return
    }

    // Check role permissions
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

    // User is authenticated and authorized
    console.log('[AuthGuard] User authorized:', userPermissions.role)
    setAuthState('authorized')
    wasAuthorizedRef.current = true
  }, [user, userPermissions, loading, router, requiredRoles, redirectTo])

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
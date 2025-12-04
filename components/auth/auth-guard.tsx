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

  useEffect(() => {
    // Still loading auth state
    if (loading) {
      setAuthState('loading')
      return
    }

    // No user or permissions - unauthenticated
    if (!user || !userPermissions) {
      console.log('[AuthGuard] No user/permissions, redirecting to login')
      setAuthState('unauthenticated')
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
      if (!redirectAttempted.current) {
        redirectAttempted.current = true
        router.replace('/unauthorized')
      }
      return
    }

    // User is authenticated and authorized
    console.log('[AuthGuard] User authorized:', userPermissions.role)
    setAuthState('authorized')
  }, [user, userPermissions, loading, router, requiredRoles, redirectTo])

  // Show loading spinner for any non-authorized state
  if (authState !== 'authorized') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  // User is authenticated and authorized
  return <>{children}</>
}

export default AuthGuard
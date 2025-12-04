"use client"

import { useEffect, useState } from 'react'
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
  const [isRedirecting, setIsRedirecting] = useState(false)

  useEffect(() => {
    // Don't do anything while loading or already redirecting
    if (loading || isRedirecting) {
      return
    }

    if (!user || !userPermissions) {
      // No authenticated user, redirect to login
      console.log('[AuthGuard] No user/permissions, redirecting to login')
      setIsRedirecting(true)
      router.push(redirectTo)
      return
    }

    if (requiredRoles.length > 0 && !requiredRoles.includes(userPermissions.role)) {
      // User doesn't have required role, redirect to unauthorized page
      console.log('[AuthGuard] User role not authorized:', userPermissions.role)
      setIsRedirecting(true)
      router.push('/unauthorized')
      return
    }
  }, [user, userPermissions, loading, router, requiredRoles, redirectTo, isRedirecting])

  // Show loading while auth state is being determined
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  // If redirecting, show loading
  if (isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  // If no user or permissions after loading is done, show loading while redirect happens
  if (!user || !userPermissions) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  // Check role permissions - if user doesn't have required role, show loading while redirect happens
  if (requiredRoles.length > 0 && !requiredRoles.includes(userPermissions.role)) {
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
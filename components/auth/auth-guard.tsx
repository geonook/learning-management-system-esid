"use client"

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/supabase/auth-context'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface AuthGuardProps {
  children: React.ReactNode
  requiredRoles?: ('admin' | 'head' | 'teacher' | 'student')[]
  redirectTo?: string
}

export function AuthGuard({ 
  children, 
  requiredRoles = [],
  redirectTo = '/auth/login' 
}: AuthGuardProps) {
  const { user, userPermissions, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading) {
      if (!user || !userPermissions) {
        // No authenticated user, redirect to login
        router.push(redirectTo)
        return
      }

      if (requiredRoles.length > 0 && !requiredRoles.includes(userPermissions.role)) {
        // User doesn't have required role, redirect to unauthorized page
        router.push('/unauthorized')
        return
      }
    }
  }, [user, userPermissions, loading, router, requiredRoles, redirectTo])

  // Show loading while auth state is being determined
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner />
      </div>
    )
  }

  // Show nothing while redirecting
  if (!user || !userPermissions) {
    return null
  }

  // Check role permissions
  if (requiredRoles.length > 0 && !requiredRoles.includes(userPermissions.role)) {
    return null
  }

  // User is authenticated and authorized
  return <>{children}</>
}

export default AuthGuard
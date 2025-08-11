"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useAppStore } from "@/lib/store"
import { Shield, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

type Role = "admin" | "head" | "teacher" | "student"

interface RoleGuardProps {
  allowedRoles: Role[]
  children: React.ReactNode
  fallback?: React.ReactNode
}

export default function RoleGuard({ allowedRoles, children, fallback }: RoleGuardProps) {
  const [isChecking, setIsChecking] = useState(true)
  const role = useAppStore((s) => s.role)
  const router = useRouter()

  useEffect(() => {
    // If no role is set, redirect to role selection
    if (!role) {
      router.push("/auth/role-select")
      return
    }
    
    setIsChecking(false)
  }, [role, router])

  if (isChecking) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-pulse">Checking permissions...</div>
      </div>
    )
  }

  // If user doesn't have required role, show access denied
  if (role && !allowedRoles.includes(role)) {
    if (fallback) {
      return <>{fallback}</>
    }

    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <Shield className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You don't have permission to access this page.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">
                <strong>Your role:</strong> {role}
              </p>
              <p className="text-sm text-muted-foreground">
                <strong>Required roles:</strong> {allowedRoles.join(", ")}
              </p>
            </div>
            
            <div className="flex flex-col gap-2">
              <Button onClick={() => router.back()} variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Back
              </Button>
              <Button onClick={() => router.push("/")}>
                Go to Home
              </Button>
            </div>
            
            <p className="text-xs text-muted-foreground">
              Contact your administrator if you believe this is an error.
            </p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <>{children}</>
}

// Higher-order component for easy page wrapping
export function withRoleGuard<P extends object>(
  Component: React.ComponentType<P>,
  allowedRoles: Role[]
) {
  return function ProtectedComponent(props: P) {
    return (
      <RoleGuard allowedRoles={allowedRoles}>
        <Component {...props} />
      </RoleGuard>
    )
  }
}
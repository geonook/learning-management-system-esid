"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { GraduationCap } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { SSOLoginButton } from "@/components/auth/SSOLoginButton"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  // Handle SSO error messages from URL parameters
  useEffect(() => {
    const error = searchParams.get('error')
    const description = searchParams.get('description')

    if (error) {
      const errorMessages: Record<string, string> = {
        'viewer_access_denied': 'Viewer role cannot access LMS system',
        'oauth_callback_failed': 'OAuth callback failed',
        'session_creation_failed': 'Session creation failed',
        'invalid_callback': 'Invalid callback parameters',
        'missing_code_verifier': 'Missing PKCE verification code',
        'access_denied': 'User denied authorization',
      }

      toast({
        title: 'SSO Login Failed',
        description: errorMessages[error] || description || error,
        variant: 'destructive',
      })

      // Clear error parameters from URL
      router.replace('/auth/login')
    }
  }, [searchParams, toast, router])

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <div className="w-full max-w-md">
        {/* Login Card */}
        <Card className="border-0 shadow-xl">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary">
              <GraduationCap className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-2xl">Welcome to LMS ESID</CardTitle>
              <CardDescription>
                Sign in with your school account
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Info Hub SSO Login Button (rebranded) */}
            <SSOLoginButton />

            {/* Subtitle */}
            <p className="text-center text-sm text-muted-foreground">
              Secure authentication via Info Hub
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
"use client"

import { useEffect, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { GraduationCap } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"
import { SSOLoginButton } from "@/components/auth/SSOLoginButton"
import { generatePKCEParams } from "@/lib/auth/pkce"
import { initiateSSOLogin } from "@/lib/auth/sso-state"
import { getPublicSSOConfig, getOAuthCallbackUrl } from "@/lib/config/sso"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const autoSSOTriggered = useRef(false)

  // Handle auto_sso parameter - automatically trigger SSO flow when coming from Info Hub
  useEffect(() => {
    const autoSSO = searchParams?.get('auto_sso')

    // Only trigger once and only if auto_sso=true
    if (autoSSO === 'true' && !autoSSOTriggered.current) {
      autoSSOTriggered.current = true

      const triggerAutoSSO = async () => {
        try {
          console.log('[SSO] Auto SSO triggered from Info Hub')

          // Check if SSO is enabled
          const config = getPublicSSOConfig()
          if (!config.enableSSO) {
            console.warn('[SSO] SSO not enabled, falling back to manual login')
            return
          }

          // Generate PKCE parameters
          const pkceParams = await generatePKCEParams()

          // Generate state token
          const stateToken = initiateSSOLogin(pkceParams.codeVerifier, '/dashboard')

          // Build OAuth authorization URL
          const callbackUri = getOAuthCallbackUrl()

          const authParams = new URLSearchParams({
            client_id: config.clientId,
            redirect_uri: callbackUri,
            response_type: 'code',
            code_challenge: pkceParams.codeChallenge,
            code_challenge_method: 'S256',
            state: stateToken,
            scope: 'openid profile email',
          })

          const authUrl = `${config.authUrl}?${authParams.toString()}`

          // Store PKCE verifier and state in cookies
          const cookieOpts = '; path=/; SameSite=Lax; Secure; max-age=900'
          document.cookie = `pkce_verifier=${pkceParams.codeVerifier}${cookieOpts}`
          document.cookie = `sso_state=${stateToken}${cookieOpts}`

          console.log('[SSO] Redirecting to Info Hub OAuth...')
          window.location.href = authUrl
        } catch (error) {
          console.error('[SSO] Auto SSO failed:', error)
          // Fall back to manual login - user can click the button
        }
      }

      triggerAutoSSO()
    }
  }, [searchParams])

  // Handle SSO error messages from URL parameters
  useEffect(() => {
    const error = searchParams?.get('error')
    const description = searchParams?.get('description')

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
/**
 * Info Hub SSO Login Button Component
 * OAuth 2.0 + PKCE Client-side Flow
 *
 * @version 1.0.0
 * @date 2025-11-13
 */

'use client'

import { useState } from 'react'
import { Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { useToast } from '@/hooks/use-toast'
import { generatePKCEParams } from '@/lib/auth/pkce'
import { initiateSSOLogin } from '@/lib/auth/sso-state'
import { getPublicSSOConfig } from '@/lib/config/sso'

interface SSOLoginButtonProps {
  /** Button variant */
  variant?: 'default' | 'outline' | 'secondary' | 'ghost'
  /** Full width button */
  fullWidth?: boolean
  /** Disabled state */
  disabled?: boolean
  /** Redirect URL after successful login */
  redirectUrl?: string
}

export function SSOLoginButton({
  variant = 'outline',
  fullWidth = true,
  disabled = false,
  redirectUrl = '/dashboard',
}: SSOLoginButtonProps) {
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleSSOLogin = async () => {
    setLoading(true)

    try {
      // 1. Check if SSO is enabled
      const config = getPublicSSOConfig()
      if (!config.enableSSO) {
        toast({
          title: 'SSO 未啟用',
          description: 'SSO 功能目前未啟用，請使用 Email/密碼登入',
          variant: 'destructive',
        })
        setLoading(false)
        return
      }

      // 2. Generate PKCE parameters (RFC 7636)
      console.log('[SSO] Generating PKCE parameters...')
      const pkceParams = await generatePKCEParams()
      console.log('[SSO] PKCE Code Challenge generated:', pkceParams.codeChallenge.substring(0, 10) + '...')

      // 3. Generate and save state token (CSRF protection)
      console.log('[SSO] Generating state token...')
      const stateToken = initiateSSOLogin(pkceParams.codeVerifier, redirectUrl)
      console.log('[SSO] State token saved to sessionStorage')

      // 4. Build OAuth authorization URL
      const callbackUri = `${window.location.origin}/api/auth/callback/infohub`

      const authParams = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: callbackUri,
        response_type: 'code',
        code_challenge: pkceParams.codeChallenge,
        code_challenge_method: 'S256',
        state: stateToken,
        scope: 'openid profile email', // Request basic user info
      })

      const authUrl = `${config.authUrl}?${authParams.toString()}`

      console.log('[SSO] Redirecting to Info Hub authorization page...')
      console.log('[SSO] Redirect URI:', callbackUri)

      // 5. Redirect to Info Hub OAuth authorization page
      window.location.href = authUrl

      // Note: Browser will redirect, so no need to setLoading(false)
    } catch (error) {
      console.error('[SSO] Login error:', error)

      toast({
        title: 'SSO 登入失敗',
        description: error instanceof Error ? error.message : '發生未預期的錯誤',
        variant: 'destructive',
      })

      setLoading(false)
    }
  }

  return (
    <Button
      type="button"
      variant={variant}
      className={fullWidth ? 'w-full' : ''}
      onClick={handleSSOLogin}
      disabled={disabled || loading}
    >
      {loading ? (
        <>
          <LoadingSpinner size="sm" className="mr-2" />
          連接 Info Hub...
        </>
      ) : (
        <>
          <Building2 className="mr-2 h-5 w-5" />
          使用 Info Hub SSO 登入
        </>
      )}
    </Button>
  )
}

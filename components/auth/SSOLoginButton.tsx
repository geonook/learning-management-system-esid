/**
 * Info Hub SSO Login Button Component
 * OAuth 2.0 + PKCE Client-side Flow
 *
 * @version 1.0.0
 * @date 2025-11-13
 */

"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useToast } from "@/hooks/use-toast";
import { GoogleIcon } from "@/components/icons/google-icon";
import { generatePKCEParams } from "@/lib/auth/pkce";
import { initiateSSOLogin } from "@/lib/auth/sso-state";
import { getPublicSSOConfig, getOAuthCallbackUrl } from "@/lib/config/sso";

interface SSOLoginButtonProps {
  /** Button variant */
  variant?: "default" | "outline" | "secondary" | "ghost";
  /** Full width button */
  fullWidth?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Redirect URL after successful login */
  redirectUrl?: string;
}

export function SSOLoginButton({
  variant = "outline",
  fullWidth = true,
  disabled = false,
  redirectUrl = "/dashboard",
}: SSOLoginButtonProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSSOLogin = async () => {
    setLoading(true);

    try {
      // 1. Check if SSO is enabled
      const config = getPublicSSOConfig();
      if (!config.enableSSO) {
        toast({
          title: "SSO Not Enabled",
          description:
            "SSO authentication is currently disabled. Please contact IT support.",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // 2. Generate PKCE parameters (RFC 7636)
      console.log("[SSO] Generating PKCE parameters...");
      const pkceParams = await generatePKCEParams();
      console.log(
        "[SSO] PKCE Code Challenge generated:",
        pkceParams.codeChallenge.substring(0, 10) + "..."
      );

      // 3. Generate and save state token (CSRF protection)
      console.log("[SSO] Generating state token...");
      const stateToken = initiateSSOLogin(pkceParams.codeVerifier, redirectUrl);
      console.log("[SSO] State token saved to sessionStorage");

      // 4. Build OAuth authorization URL
      // Use unified callback URL helper to ensure consistency with token exchange
      const callbackUri = getOAuthCallbackUrl();

      // 🔍 DIAGNOSTIC: Log all configuration values
      console.log("[SSO] ===== DIAGNOSTIC START =====");
      console.log("[SSO] window.location.origin:", window.location.origin);
      console.log("[SSO] config.clientId:", config.clientId);
      console.log("[SSO] config.authUrl:", config.authUrl);
      console.log("[SSO] callbackUri (computed):", callbackUri);

      const authParams = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: callbackUri,
        response_type: "code",
        code_challenge: pkceParams.codeChallenge,
        code_challenge_method: "S256",
        state: stateToken,
        scope: "openid profile email", // Request basic user info
      });

      const authUrl = `${config.authUrl}?${authParams.toString()}`;

      // 🔍 DIAGNOSTIC: Log complete authorization URL
      console.log("[SSO] Complete authUrl:", authUrl);
      console.log("[SSO] authParams breakdown:");
      authParams.forEach((value, key) => {
        if (key === "code_challenge" || key === "state") {
          console.log(`  ${key}: ${value.substring(0, 20)}...`);
        } else {
          console.log(`  ${key}: ${value}`);
        }
      });
      console.log("[SSO] ===== DIAGNOSTIC END =====");

      // Store code_verifier AND state in secure cookies for server-side callback
      // Required because server-side API routes cannot access sessionStorage
      // Cookie security: Secure (HTTPS only), SameSite=Lax (CSRF protection), max-age=900 (15 min)
      const cookieOpts = "; path=/; SameSite=Lax; Secure; max-age=900";
      document.cookie = `pkce_verifier=${pkceParams.codeVerifier}${cookieOpts}`;
      document.cookie = `sso_state=${stateToken}${cookieOpts}`;

      console.log("[SSO] Security tokens stored in cookies (verifier + state)");

      console.log("[SSO] Redirecting to Info Hub authorization page...");
      console.log("[SSO] Redirect URI:", callbackUri);
      console.log("[SSO] About to execute: window.location.href =", authUrl);

      // 5. Redirect to Info Hub OAuth authorization page
      window.location.href = authUrl;

      // Note: Browser will redirect, so no need to setLoading(false)
    } catch (error) {
      console.error("[SSO] Login error:", error);

      toast({
        title: "Login Failed",
        description:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred",
        variant: "destructive",
      });

      setLoading(false);
    }
  };

  return (
    <Button
      type="button"
      variant={variant}
      className={fullWidth ? "w-full" : ""}
      onClick={handleSSOLogin}
      disabled={disabled || loading}
    >
      {loading ? (
        <>
          <LoadingSpinner size="sm" className="mr-2" />
          Redirecting to Google authentication...
        </>
      ) : (
        <>
          <GoogleIcon className="mr-2 h-5 w-5" />
          Login with Google
        </>
      )}
    </Button>
  );
}

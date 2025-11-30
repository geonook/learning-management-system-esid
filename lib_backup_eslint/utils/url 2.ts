/**
 * URL Utility Functions for OAuth and Redirects
 *
 * These utilities solve the reverse proxy issue where Next.js request.url
 * contains the internal container address (localhost:8080) instead of the
 * public domain when deployed behind Zeabur reverse proxy.
 *
 * Solution: Explicitly use NEXT_PUBLIC_APP_URL environment variable to
 * construct absolute URLs for redirects.
 */

/**
 * Get the base URL for the application
 *
 * Handles both development and production environments:
 * - Production: Uses NEXT_PUBLIC_APP_URL from environment (required)
 * - Development: Falls back to localhost:3000
 *
 * @throws {Error} If NEXT_PUBLIC_APP_URL is not set in production
 * @returns The base URL (e.g., "https://lms-staging.zeabur.app" or "http://localhost:3000")
 */
export function getBaseUrl(): string {
  // Production: Always require NEXT_PUBLIC_APP_URL
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.NEXT_PUBLIC_APP_URL) {
      throw new Error(
        'NEXT_PUBLIC_APP_URL must be set in production environment'
      )
    }
    return process.env.NEXT_PUBLIC_APP_URL
  }

  // Development: Use env var if set, otherwise default to localhost
  return process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
}

/**
 * Build absolute URL for redirects
 *
 * Constructs a full URL by combining the base URL with a relative path.
 * This ensures redirects work correctly in all deployment environments
 * (local, staging, production) regardless of reverse proxy configuration.
 *
 * @param path - Relative path (e.g., '/dashboard', '/auth/login?error=xxx')
 * @returns Absolute URL (e.g., 'https://lms-staging.zeabur.app/dashboard')
 *
 * @example
 * ```typescript
 * // In production (NEXT_PUBLIC_APP_URL=https://lms-staging.zeabur.app)
 * buildRedirectUrl('/dashboard')
 * // Returns: 'https://lms-staging.zeabur.app/dashboard'
 *
 * buildRedirectUrl('/auth/login?error=invalid_callback')
 * // Returns: 'https://lms-staging.zeabur.app/auth/login?error=invalid_callback'
 * ```
 */
export function buildRedirectUrl(path: string): string {
  const baseUrl = getBaseUrl()

  // Handle paths that already start with /
  const cleanPath = path.startsWith('/') ? path : `/${path}`

  return `${baseUrl}${cleanPath}`
}

/**
 * Environment Variables Validation
 * Using Zod for runtime validation and type safety
 *
 * Security Features:
 * - Validates all required environment variables at startup
 * - Provides type-safe access to env vars
 * - Prevents runtime errors from missing/invalid configuration
 * - Clear error messages for misconfiguration
 */

import { z } from 'zod'

// Define the schema for environment variables
const envSchema = z.object({
  // Supabase Configuration (Public - safe to expose to client)
  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url('NEXT_PUBLIC_SUPABASE_URL must be a valid URL')
    .startsWith('https://', 'NEXT_PUBLIC_SUPABASE_URL must use HTTPS'),

  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required')
    .startsWith('eyJ', 'NEXT_PUBLIC_SUPABASE_ANON_KEY must be a valid JWT token'),

  // Supabase Service Role Key (Secret - server-side only)
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, 'SUPABASE_SERVICE_ROLE_KEY is required for server-side operations')
    .startsWith('eyJ', 'SUPABASE_SERVICE_ROLE_KEY must be a valid JWT token')
    .optional(), // Optional for client-side builds

  // Node Environment
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  // Optional: Mock Auth (for testing)
  NEXT_PUBLIC_USE_MOCK_AUTH: z
    .string()
    .transform((val) => val === 'true')
    .optional()
    .default('false'),
})

// Type inference from schema
export type Env = z.infer<typeof envSchema>

// Validate and parse environment variables
function validateEnv(): Env {
  try {
    // Parse and validate
    const parsed = envSchema.parse({
      NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
      NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
      NODE_ENV: process.env.NODE_ENV,
      NEXT_PUBLIC_USE_MOCK_AUTH: process.env.NEXT_PUBLIC_USE_MOCK_AUTH,
    })

    return parsed
  } catch (error) {
    if (error instanceof z.ZodError) {
      // Format validation errors
      const errors = error.errors.map((err) => {
        return `  - ${err.path.join('.')}: ${err.message}`
      }).join('\n')

      throw new Error(
        `❌ Environment variable validation failed:\n${errors}\n\n` +
        `Please check your .env.local file and ensure all required variables are set correctly.`
      )
    }
    throw error
  }
}

// Export validated environment variables
export const env = validateEnv()

// Export individual variables for convenience (type-safe)
export const {
  NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY,
  NODE_ENV,
  NEXT_PUBLIC_USE_MOCK_AUTH,
} = env

// Environment checks (utility functions)
export const isDevelopment = NODE_ENV === 'development'
export const isProduction = NODE_ENV === 'production'
export const isTest = NODE_ENV === 'test'

// Security warnings for development
if (isDevelopment) {
  // Warn if using production Supabase URL in development
  if (NEXT_PUBLIC_SUPABASE_URL.includes('supabase.co') && !NEXT_PUBLIC_SUPABASE_URL.includes('local')) {
    console.warn(
      '⚠️  WARNING: Using production Supabase URL in development mode.\n' +
      '   This may lead to accidental data modifications in production.\n' +
      '   Consider using a separate development project.'
    )
  }

  // Warn if Service Role Key is exposed
  if (typeof window !== 'undefined' && SUPABASE_SERVICE_ROLE_KEY) {
    console.error(
      '🚨 CRITICAL: Service Role Key detected in client-side code!\n' +
      '   This is a serious security vulnerability.\n' +
      '   Service Role Key should NEVER be used in client-side code.'
    )
  }
}

// Log successful validation in development
if (isDevelopment && typeof window === 'undefined') {
  console.log('✅ Environment variables validated successfully')
  console.log(`   - Environment: ${NODE_ENV}`)
  console.log(`   - Supabase URL: ${NEXT_PUBLIC_SUPABASE_URL}`)
  console.log(`   - Mock Auth: ${NEXT_PUBLIC_USE_MOCK_AUTH}`)
}

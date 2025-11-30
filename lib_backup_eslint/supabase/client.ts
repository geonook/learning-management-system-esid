import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database'
import { NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY } from '@/lib/env'

// Client-side Supabase client for browser environment
// Uses validated environment variables from lib/env.ts
export function createClient() {
  return createBrowserClient<Database>(
    NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY
    // Removed custom fetch with AbortSignal.timeout for better browser compatibility
    // Supabase SDK handles timeout internally
  )
}

// Export a singleton instance for convenience
export const supabase = createClient()
import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database'

// Client-side Supabase client for browser environment
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    // Removed custom fetch with AbortSignal.timeout for better browser compatibility
    // Supabase SDK handles timeout internally
  )
}

// Export a singleton instance for convenience
export const supabase = createClient()
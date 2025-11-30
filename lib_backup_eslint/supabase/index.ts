// Re-export with specific names to avoid conflicts
export { createClient as createClientBrowser, supabase } from './client'
export { createClient as createServerClient, createServiceRoleClient } from './server'
export * from './auth'
export * from './middleware'
/**
 * Analytics API for Primary School LMS
 * Main entry point for analytics functionality
 */

export * from './types'
export * from './utils'
export * from './core'
export * from './queries'

// Re-export the main analytics engine
export { analyticsEngine as default } from './core'
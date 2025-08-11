import { useIsHydrated } from '@/lib/hooks/use-is-hydrated'

interface NoSSRProps {
  children: React.ReactNode
  fallback?: React.ReactNode
}

/**
 * Component that only renders its children on the client side after hydration.
 * Prevents server-client rendering mismatches for dynamic content.
 */
export function NoSSR({ children, fallback = null }: NoSSRProps) {
  const isHydrated = useIsHydrated()
  
  if (!isHydrated) {
    return <>{fallback}</>
  }
  
  return <>{children}</>
}
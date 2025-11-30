import { useState, useEffect } from 'react'

/**
 * Hook to check if the component has been hydrated on the client side.
 * This prevents hydration mismatches by ensuring server and client render the same initial content.
 */
export function useIsHydrated(): boolean {
  const [hydrated, setHydrated] = useState(false)
  
  useEffect(() => {
    setHydrated(true)
  }, [])
  
  return hydrated
}
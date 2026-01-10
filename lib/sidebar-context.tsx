"use client"

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react"

interface SidebarContextType {
  isCollapsed: boolean
  toggleSidebar: () => void
  setCollapsed: (value: boolean) => void
}

const SidebarContext = createContext<SidebarContextType | null>(null)

const STORAGE_KEY = 'lms-sidebar-collapsed'

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isHydrated, setIsHydrated] = useState(false)

  // Load saved state from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      if (saved) {
        setIsCollapsed(JSON.parse(saved))
      }
    } catch {
      // Ignore errors, use default
    }
    setIsHydrated(true)
  }, [])

  // Save to localStorage
  const setCollapsed = useCallback((value: boolean) => {
    setIsCollapsed(value)
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(value))
    } catch {
      // Ignore storage errors
    }
  }, [])

  const toggleSidebar = useCallback(() => {
    setCollapsed(!isCollapsed)
  }, [isCollapsed, setCollapsed])

  // Avoid hydration mismatch - always start expanded
  const contextValue: SidebarContextType = {
    isCollapsed: isHydrated ? isCollapsed : false,
    toggleSidebar,
    setCollapsed
  }

  return (
    <SidebarContext.Provider value={contextValue}>
      {children}
    </SidebarContext.Provider>
  )
}

export function useSidebar() {
  const context = useContext(SidebarContext)
  if (!context) {
    throw new Error("useSidebar must be used within SidebarProvider")
  }
  return context
}

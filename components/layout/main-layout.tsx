"use client"

import { useEffect } from "react"
import { usePathname } from "next/navigation"
import { useAppStore } from "@/lib/store"
import Sidebar from "./sidebar"
import Header from "./header"

interface MainLayoutProps {
  children: React.ReactNode
}

// Pages that don't need the main layout (auth pages, landing, etc.)
const noLayoutPages = [
  "/auth/login",
  "/auth/role-select",
  "/auth/signup",
  "/_not-found"
]

export default function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname()
  const role = useAppStore((s) => s.role)
  
  // Mock role assignment for development
  useEffect(() => {
    if (!role && !noLayoutPages.includes(pathname)) {
      // In development, auto-assign teacher role
      // In production, this would redirect to login
      useAppStore.getState().setRole("teacher")
    }
  }, [role, pathname])

  // If it's an auth page or no-layout page, render without layout
  if (noLayoutPages.includes(pathname)) {
    return <>{children}</>
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar />
      
      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <Header />
        
        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
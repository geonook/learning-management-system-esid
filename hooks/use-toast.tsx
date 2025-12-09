"use client"

import * as React from "react"
import { toast as sonnerToast } from "sonner"
import { Info, AlertTriangle } from "lucide-react"

export function useToast() {
  const toast = React.useCallback(
    ({
      title,
      description,
      variant = "default",
    }: {
      title: string
      description?: string
      variant?: "default" | "destructive" | "info" | "warning"
    }) => {
      switch (variant) {
        case "destructive":
          sonnerToast.error(title, { description })
          break
        case "info":
          sonnerToast(title, {
            description,
            icon: <Info className="h-4 w-4 text-blue-500" />,
          })
          break
        case "warning":
          sonnerToast(title, {
            description,
            icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
          })
          break
        default:
          sonnerToast.success(title, { description })
      }
    },
    []
  )

  // Info toast shortcut
  const info = React.useCallback((title: string, description?: string) => {
    sonnerToast(title, {
      description,
      icon: <Info className="h-4 w-4 text-blue-500" />,
    })
  }, [])

  // Warning toast shortcut
  const warning = React.useCallback((title: string, description?: string) => {
    sonnerToast(title, {
      description,
      icon: <AlertTriangle className="h-4 w-4 text-amber-500" />,
    })
  }, [])

  // Promise toast for async operations
  const promise = React.useCallback(
    <T,>(
      promiseFn: Promise<T>,
      messages: { loading: string; success: string; error: string }
    ) => {
      return sonnerToast.promise(promiseFn, messages)
    },
    []
  )

  return { toast, info, warning, promise }
}
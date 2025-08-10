"use client"

import * as React from "react"
import { toast as sonnerToast } from "sonner"

export function useToast() {
  const toast = React.useCallback(
    ({
      title,
      description,
      variant = "default",
    }: {
      title: string
      description?: string
      variant?: "default" | "destructive"
    }) => {
      if (variant === "destructive") {
        sonnerToast.error(title, {
          description,
        })
      } else {
        sonnerToast.success(title, {
          description,
        })
      }
    },
    []
  )

  return { toast }
}
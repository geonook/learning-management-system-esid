"use client"

import type React from "react"

import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card"
import { cn } from "@/lib/utils"

export default function StatCard({
  label = "Label",
  value = "0",
  delta = "+0%",
  icon,
  tone = "default",
}: {
  label?: string
  value?: string | number
  delta?: string
  icon?: React.ReactNode
  tone?: "default" | "success" | "warning" | "danger"
}) {
  const toneClass =
    tone === "success"
      ? "text-emerald-600 dark:text-emerald-400"
      : tone === "warning"
        ? "text-amber-600 dark:text-amber-400"
        : tone === "danger"
          ? "text-rose-600 dark:text-rose-400"
          : "text-muted-foreground"
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardDescription className="flex items-center gap-2">{label}</CardDescription>
        {icon}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
        <div className={cn("text-xs mt-1", toneClass)} aria-live="polite">
          {delta}
        </div>
      </CardContent>
    </Card>
  )
}
"use client"

import type React from "react"

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export default function ChartCard({
  title = "Chart Title",
  subtitle = "",
  children,
  right = null,
}: {
  title?: string
  subtitle?: string
  children: React.ReactNode
  right?: React.ReactNode
}) {
  return (
    <Card role="group">
      <CardHeader className="flex flex-row items-start justify-between gap-2">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          {subtitle ? <CardDescription>{subtitle}</CardDescription> : null}
        </div>
        {right}
      </CardHeader>
      <CardContent className="pt-0">{children}</CardContent>
    </Card>
  )
}
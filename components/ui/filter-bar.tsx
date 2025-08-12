"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ChevronDown, Filter } from "lucide-react"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { motion, AnimatePresence } from "framer-motion"
import { useAppStore } from "@/lib/store"

export default function FilterBar({
  showTrack = true,
  extra = null,
}: {
  showTrack?: boolean
  extra?: React.ReactNode
}) {
  const { grade, klass, track } = useAppStore((s) => s.selections)
  const setSelections = useAppStore((s) => s.setSelections)
  const [open, setOpen] = useState(true)

  return (
    <div className="mb-3">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" className="gap-1" onClick={() => setOpen((v) => !v)}>
          <Filter className="w-4 h-4" />
          Filters
          <ChevronDown className="w-4 h-4" />
        </Button>
        <div className="hidden md:flex items-center gap-1 text-xs text-muted-foreground">
          <Badge variant="secondary">Grade {grade}</Badge>
          <Badge variant="secondary">Class {klass}</Badge>
          {showTrack && <Badge variant="secondary">Campus {track}</Badge>}
        </div>
        <div className="ml-auto">{extra}</div>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="grid gap-2 sm:grid-cols-3 mt-2"
          >
            <Select value={grade} onValueChange={(v) => setSelections({ grade: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Grade" />
              </SelectTrigger>
              <SelectContent>
                {["1", "2", "3", "4", "5", "6"].map((g) => (
                  <SelectItem key={g} value={g}>
                    Grade {g}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={klass} onValueChange={(v) => setSelections({ klass: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Class" />
              </SelectTrigger>
              <SelectContent>
                {["A", "B", "C", "D"].map((c) => (
                  <SelectItem key={c} value={c}>
                    Class {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {showTrack && (
              <Select value={track} onValueChange={(v) => setSelections({ track: v as any })}>
                <SelectTrigger>
                  <SelectValue placeholder="Campus" />
                </SelectTrigger>
                <SelectContent>
                  {[
                    { value: "local", label: "Local Campus" },
                    { value: "international", label: "International Campus" }
                  ].map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
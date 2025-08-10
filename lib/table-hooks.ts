"use client"

import { useMemo, useState } from "react"
import { getScores } from "./mock-data"

export function useScoresTable() {
  const initial = useMemo(() => getScores(), [])
  const [rows, setRows] = useState(initial)

  function onEdit(id: string, type: "FA" | "SA" | "Final", idx: number, value: number) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r
        if (type === "Final") return { ...r, Final: clamp(value) }
        if (type === "FA") {
          const FA = [...r.FA]
          FA[idx] = clamp(value)
          return { ...r, FA }
        }
        // type === "SA"
        const SA = [...r.SA]
        SA[idx] = clamp(value)
        return { ...r, SA }
      }),
    )
  }

  return { rows, onEdit }
}

function clamp(v: number): number {
  if (isNaN(v)) return 0
  return Math.max(0, Math.min(100, Math.round(v)))
}
"use client"

import { useMemo, useState } from "react"
import { getStudentsFor } from "./mock-data"

type AttendanceStatus = "P" | "L" | "A" | "S" // Present, Leave, Absent, Sick

export function useTodayAttendance() {
  const students = useMemo(() => getStudentsFor().slice(0, 24), [])
  const [rows, setRows] = useState(
    students.map((s) => ({ 
      id: s.id, 
      name: s.name, 
      status: "P" as AttendanceStatus, 
      _dirty: false 
    })),
  )
  const [hasChanges, setHasChanges] = useState(false)

  function setAll(status: AttendanceStatus) {
    setRows((prev) => prev.map((r) => ({ ...r, status, _dirty: true })))
    setHasChanges(true)
  }
  
  function setOne(id: string, status: AttendanceStatus) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status, _dirty: true } : r)))
    setHasChanges(true)
  }
  
  function save() {
    // In real implementation, this would save to Supabase
    setRows((prev) => prev.map((r) => ({ ...r, _dirty: false })))
    setHasChanges(false)
  }

  return { rows, setAll, setOne, hasChanges, save }
}

export function useWeeklyAttendance() {
  const students = useMemo(() => getStudentsFor().slice(0, 16), [])
  const [rows, setRows] = useState(
    students.map((s) => ({
      id: s.id,
      name: s.name,
      cells: Array.from({ length: 10 }).map(() => 
        Math.random() < 0.9 ? "P" : "A"
      ) as AttendanceStatus[],
      notes: {} as Record<number, string>,
    })),
  )

  function toggle(id: string, index: number) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r
        const cells = [...r.cells]
        cells[index] = cells[index] === "P" ? "A" : "P"
        return { ...r, cells }
      }),
    )
  }
  
  function noteFor(id: string, index: number): string | undefined {
    const row = rows.find((r) => r.id === id)
    return row?.notes[index]
  }

  return { rows, toggle, noteFor }
}
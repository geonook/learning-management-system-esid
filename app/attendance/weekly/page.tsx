"use client"

import FilterBar from "@/components/ui/filter-bar"
import { useWeeklyAttendance } from "@/lib/attendance-hooks"
import { Button } from "@/components/ui/button"

const periods = ["Mon-1", "Mon-2", "Tue-1", "Tue-2", "Wed-1", "Wed-2", "Thu-1", "Thu-2", "Fri-1", "Fri-2"]

export default function AttendanceWeekly() {
  const { rows, toggle, noteFor } = useWeeklyAttendance()

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Attendance • Weekly</h1>
      <FilterBar />
      <div className="overflow-auto border rounded-md">
        <table className="w-full text-sm" role="grid" aria-label="Weekly attendance grid">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-2 sticky left-0 bg-muted/50">Student</th>
              {periods.map((p) => (
                <th key={p} className="text-center p-2">
                  {p}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t">
                <td className="p-2 font-medium sticky left-0 bg-background">{r.name}</td>
                {r.cells.map((c, i) => (
                  <td key={i} className="p-1">
                    <Button
                      size="sm"
                      variant={c === "P" ? "secondary" : c === "A" ? "destructive" : "outline"}
                      className="w-full"
                      onClick={() => toggle(r.id, i)}
                      aria-label={`Toggle ${r.name} ${periods[i]}`}
                      title={noteFor(r.id, i) || ""}
                    >
                      {c}
                    </Button>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
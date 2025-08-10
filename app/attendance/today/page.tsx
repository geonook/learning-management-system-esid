"use client"

import FilterBar from "@/components/ui/filter-bar"
import { Button } from "@/components/ui/button"
import { useTodayAttendance } from "@/lib/attendance-hooks"
import { Check, Clock, Minus, X } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function AttendanceToday() {
  const { rows, setAll, setOne, hasChanges, save } = useTodayAttendance()
  const { toast } = useToast()

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Attendance • Today</h1>
      <FilterBar
        showTrack={true}
        extra={
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={() => setAll("P")}>
              Mark All Present
            </Button>
            <Button
              onClick={() => {
                save()
                toast({ title: "Saved", description: "Attendance saved (mock)." })
              }}
              disabled={!hasChanges}
            >
              Save Changes
            </Button>
          </div>
        }
      />
      <div className="grid gap-2">
        {rows.map((r) => (
          <div
            key={r.id}
            className={`flex items-center justify-between border rounded-md p-2 ${r._dirty ? "ring-2 ring-blue-200 dark:ring-blue-900" : ""}`}
          >
            <div className="font-medium">
              {r.name} <span className="text-xs text-muted-foreground">({r.id})</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                size="sm"
                variant={r.status === "P" ? "default" : "outline"}
                onClick={() => setOne(r.id, "P")}
                aria-label="Present"
              >
                <Check className="w-4 h-4" /> Present
              </Button>
              <Button
                size="sm"
                variant={r.status === "L" ? "default" : "outline"}
                onClick={() => setOne(r.id, "L")}
                aria-label="Leave"
              >
                <Clock className="w-4 h-4" /> Leave
              </Button>
              <Button
                size="sm"
                variant={r.status === "A" ? "default" : "outline"}
                onClick={() => setOne(r.id, "A")}
                aria-label="Absent"
              >
                <X className="w-4 h-4" /> Absent
              </Button>
              <Button
                size="sm"
                variant={r.status === "S" ? "default" : "outline"}
                onClick={() => setOne(r.id, "S")}
                aria-label="Sick"
              >
                <Minus className="w-4 h-4" /> Sick
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
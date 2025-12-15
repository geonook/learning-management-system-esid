"use client"

import { useMemo, useState } from "react"
import FilterBar from "@/components/ui/filter-bar"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getStudentsFor } from "@/lib/mock-data"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer"
import { ResponsiveContainer, LineChart, Line } from "recharts"

export default function StudentsPage() {
  const [q, setQ] = useState("")
  const students = useMemo(() => getStudentsFor(), [])
  const list = students.filter((s) => s.name.toLowerCase().includes(q.toLowerCase()))
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState<string | null>(null)

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Students</h1>
      <FilterBar extra={<Input placeholder="Search students…" value={q} onChange={(e) => setQ(e.target.value)} />} />

      <div className="overflow-auto border rounded-md">
        <table className="w-full text-sm" role="table" aria-label="Students table">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left p-2">Name</th>
              <th className="text-left p-2">ID</th>
              <th className="text-left p-2">Class</th>
              <th className="text-left p-2">Track</th>
              <th className="text-left p-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {list.map((s) => (
              <tr key={s.id} className="border-t">
                <td className="p-2">{s.name}</td>
                <td className="p-2">{s.id}</td>
                <td className="p-2">
                  {s.grade}-{s.class}
                </td>
                <td className="p-2">{s.track}</td>
                <td className="p-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      setActive(s.id)
                      setOpen(true)
                    }}
                  >
                    View
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Student Panel</DrawerTitle>
          </DrawerHeader>
          <div className="grid gap-3 p-4 md:grid-cols-2">
            <Card>
              <CardContent className="p-3">
                <div className="font-medium">Profile</div>
                <div className="text-sm text-muted-foreground">Mock avatar, email, phone</div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3">
                <div className="text-sm font-medium mb-2">Attendance trend</div>
                <div className="h-[120px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={Array.from({ length: 14 }).map((_, i) => ({
                        x: i,
                        y: Math.round(60 + Math.random() * 40),
                      }))}
                    >
                      <Line type="monotone" dataKey="y" stroke="#10b981" dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
            <Card className="md:col-span-2">
              <CardContent className="p-3">
                <div className="text-sm font-medium mb-2">Quick links</div>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" onClick={() => location.assign("/scores")}>
                    Open in Scores
                  </Button>
                  <Button variant="outline" onClick={() => location.assign("/attendance/today")}>
                    Open in Attendance
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  )
}
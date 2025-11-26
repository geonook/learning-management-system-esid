"use client"

import FilterBar from "@/components/ui/filter-bar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"

export default function ReportsPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Reports</h1>
      <FilterBar />
      <div className="grid gap-3 md:grid-cols-3">
        {[{ t: "Weekly Attendance (CSV)" }, { t: "Grade Distribution (CSV)" }, { t: "Alerts (CSV)" }].map((c, i) => (
          <Card key={i}>
            <CardHeader>
              <CardTitle>{c.t}</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">Generate mock preview</div>
              <Button>Generate Preview</Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
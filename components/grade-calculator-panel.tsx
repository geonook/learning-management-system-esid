"use client"

import { useMemo, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from "recharts"
import { ScoresMap, calculateGrades, FORMATIVE_CODES, SUMMATIVE_CODES } from "@/lib/grade"

const COLORS = ["#10b981", "#3b82f6", "#f59e0b"]

// Mock student data for now - will be replaced with Supabase data
const mockStudents = [
  { id: "STU-7001", name: "Alice Chen" },
  { id: "STU-7002", name: "Bob Li" },
  { id: "STU-7003", name: "Carol Wang" },
]

const mockScores: Record<string, ScoresMap> = {
  "STU-7001": {
    FA1: 85, FA2: 78, FA3: 92, FA4: 88, FA5: 0, FA6: null, FA7: null, FA8: null,
    SA1: 90, SA2: 87, SA3: null, SA4: null,
    FINAL: 89
  },
  "STU-7002": {
    FA1: 72, FA2: null, FA3: 80, FA4: null, FA5: 75, FA6: null, FA7: null, FA8: null,
    SA1: 82, SA2: null, SA3: 78, SA4: null,
    FINAL: 85
  },
  "STU-7003": {
    FA1: 95, FA2: 88, FA3: null, FA4: 92, FA5: null, FA6: null, FA7: null, FA8: null,
    SA1: 94, SA2: 91, SA3: null, SA4: null,
    FINAL: 93
  },
}

export default function GradeCalculatorPanel({
  widthClass = "w-full",
  compact = false,
}: {
  widthClass?: string
  compact?: boolean
}) {
  const [studentId, setStudentId] = useState<string>(mockStudents[0]?.id || "")
  const selected = studentId || mockStudents[0]?.id

  const scores = mockScores[selected] || {
    FA1: null, FA2: null, FA3: null, FA4: null, FA5: null, FA6: null, FA7: null, FA8: null,
    SA1: null, SA2: null, SA3: null, SA4: null,
    FINAL: null
  }

  const result = calculateGrades({
    scores,
    studentId: selected,
    classId: "mock-class",
  })

  const weightData = [
    { name: "Formative", value: 0.15, color: COLORS[0] },
    { name: "Summative", value: 0.20, color: COLORS[1] },
    { name: "Final", value: 0.10, color: COLORS[2] },
  ]

  return (
    <Card
      className={`${widthClass} lg:sticky lg:top-20 ${compact ? "" : "border-2 border-blue-200 dark:border-blue-900"}`}
    >
      <CardHeader>
        <CardTitle>Grade Calculation</CardTitle>
        <CardDescription>
          Weighted calculation using FA/SA/FINAL codes. Only scores &gt; 0 are included.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <div>
          <div className="text-xs font-medium mb-1">Formula</div>
          <div className="text-xs rounded-md bg-muted p-3 leading-relaxed" role="note" aria-label="Grade formula">
            {"Formative Avg = Average of FA scores > 0"}
            <br />
            {"Summative Avg = Average of SA scores > 0"}
            <br />
            {"Semester = (Formative×0.15 + Summative×0.2 + Final×0.1) ÷ 0.45"}
          </div>
        </div>

        <div className="grid gap-2">
          <div className="text-xs font-medium">Weights Distribution</div>
          <div className={compact ? "h-[120px]" : "h-[160px]"}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie 
                  data={weightData} 
                  dataKey="value" 
                  innerRadius={40} 
                  outerRadius={compact ? 55 : 65} 
                  paddingAngle={2}
                >
                  {weightData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  formatter={(value: number) => [`${(value * 100).toFixed(1)}%`, "Weight"]}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline" className="border-emerald-500 text-emerald-600">
              Formative 15%
            </Badge>
            <Badge variant="outline" className="border-blue-500 text-blue-600">
              Summative 20%
            </Badge>
            <Badge variant="outline" className="border-amber-500 text-amber-600">
              Final 10%
            </Badge>
          </div>
        </div>

        <div className="grid gap-2">
          <div className="text-xs font-medium">Student</div>
          <Select value={selected} onValueChange={setStudentId}>
            <SelectTrigger>
              <SelectValue placeholder="Select student" />
            </SelectTrigger>
            <SelectContent>
              {mockStudents.map((student) => (
                <SelectItem key={student.id} value={student.id}>
                  {student.name} ({student.id})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <div className="text-xs font-medium">Formative Assessments</div>
          <div className="flex flex-wrap gap-1">
            {FORMATIVE_CODES.map((code, i) => {
              const score = scores[code]
              return (
                <Badge 
                  key={code} 
                  variant={score && score > 0 ? "secondary" : "outline"} 
                  className={!score || score === 0 ? "opacity-60" : ""}
                >
                  {`${code}: ${score ?? 0}`}
                </Badge>
              )
            })}
          </div>
          <div className="text-xs text-muted-foreground">
            Used: {result.formativeScoresUsed} | Average: {result.formativeAvg?.toFixed(1) || "N/A"}
          </div>
        </div>

        <div className="grid gap-2">
          <div className="text-xs font-medium">Summative Assessments</div>
          <div className="flex flex-wrap gap-1">
            {SUMMATIVE_CODES.map((code, i) => {
              const score = scores[code]
              return (
                <Badge 
                  key={code} 
                  variant={score && score > 0 ? "secondary" : "outline"} 
                  className={!score || score === 0 ? "opacity-60" : ""}
                >
                  {`${code}: ${score ?? 0}`}
                </Badge>
              )
            })}
          </div>
          <div className="text-xs text-muted-foreground">
            Used: {result.summativeScoresUsed} | Average: {result.summativeAvg?.toFixed(1) || "N/A"}
          </div>
        </div>

        <div className="grid gap-2">
          <div className="text-xs font-medium">Final Examination</div>
          <Badge variant={result.finalScoreUsed ? "secondary" : "outline"}>
            FINAL: {scores.FINAL ?? 0}
          </Badge>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-center">
          <div className="rounded-md bg-muted p-2">
            <div className="text-xs text-muted-foreground">Formative</div>
            <div className="text-lg font-semibold">
              {result.formativeAvg?.toFixed(1) || "N/A"}
            </div>
          </div>
          <div className="rounded-md bg-muted p-2">
            <div className="text-xs text-muted-foreground">Summative</div>
            <div className="text-lg font-semibold">
              {result.summativeAvg?.toFixed(1) || "N/A"}
            </div>
          </div>
          <div className="rounded-md bg-primary/10 p-2 border border-primary/20">
            <div className="text-xs text-muted-foreground">Semester</div>
            <div className="text-lg font-semibold text-primary">
              {result.semesterGrade?.toFixed(1) || "N/A"}
            </div>
          </div>
        </div>
        
        <div className="text-xs text-muted-foreground">
          Total scores used: {result.totalScoresUsed} | Only scores &gt; 0 are averaged
        </div>
      </CardContent>
    </Card>
  )
}
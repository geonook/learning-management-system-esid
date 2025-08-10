"use client"

import FilterBar from "@/components/ui/filter-bar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer"
import CsvUploadDialog from "@/components/ui/csv-upload-dialog"
import GradeCalculatorPanel from "@/components/grade-calculator-panel"
import { useScoresTable } from "@/lib/table-hooks"
import { Plus } from "lucide-react"
import { useState } from "react"
import AssessmentTitlesDialog from "@/components/ui/assessment-titles-dialog"
import { useAppStore } from "@/lib/store"

function NewAssessmentDrawer() {
  const [open, setOpen] = useState(false)
  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <Button className="gap-2">
          <Plus className="w-4 h-4" /> New Assessment
        </Button>
      </DrawerTrigger>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>New Assessment (UI only)</DrawerTitle>
        </DrawerHeader>
        <div className="grid gap-2 p-4">
          <div className="text-sm text-muted-foreground">
            Fields: Exam Type (F.A./S.A./Final), Index, Weight, Grade/Class, Track, Due date
          </div>
          <div className="grid gap-2 md:grid-cols-2">
            <input className="border rounded-md p-2 bg-background" placeholder="Exam Type (F.A./S.A./Final)" />
            <input className="border rounded-md p-2 bg-background" placeholder="Index (1-8 / 1-4)" />
            <input className="border rounded-md p-2 bg-background" placeholder="Weight (auto)" />
            <input className="border rounded-md p-2 bg-background" placeholder="Grade/Class/Track" />
            <input className="border rounded-md p-2 bg-background" placeholder="Due date" />
          </div>
          <div className="flex justify-end">
            <Button onClick={() => setOpen(false)}>Save (mock)</Button>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}

export default function ScoresPage() {
  const { rows, onEdit } = useScoresTable()
  const [calcOpen, setCalcOpen] = useState(false)
  const role = useAppStore((s) => s.role)
  const titles = useAppStore((s) => s.assessmentTitles)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Scores</h1>
      </div>

      <FilterBar
        extra={
          <div className="flex flex-wrap items-center gap-2">
            <NewAssessmentDrawer />
            <CsvUploadDialog />
            {role === "head" && <AssessmentTitlesDialog />}
            <Button variant="outline">Export CSV</Button>
          </div>
        }
      />

      {/* 主體：行動版單欄；lg 以上雙欄 */}
      <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
        {/* 左側成績表 */}
        <Card className="overflow-hidden">
          <CardHeader>
            <CardTitle>Gradebook</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="relative">
              {/* 水平捲動容器 */}
              <div className="overflow-x-auto">
                {/* 垂直捲動容器（限制高度） */}
                <div className="max-h-[60vh] md:max-h-[560px] overflow-y-auto">
                  <Table role="grid" aria-label="Scores grid" className="min-w-[1200px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[200px] sticky left-0 bg-background z-10">Student</TableHead>
                        {titles.FA.map((label, i) => (
                          <TableHead key={`fa-${i}`}>{label || `F.A.${i + 1}`}</TableHead>
                        ))}
                        {titles.SA.map((label, i) => (
                          <TableHead key={`sa-${i}`}>{label || `S.A.${i + 1}`}</TableHead>
                        ))}
                        <TableHead>{titles.final || "Final"}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rows.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="sticky left-0 bg-background z-10 font-medium">
                            {r.name} <span className="text-xs text-muted-foreground">({r.id})</span>
                          </TableCell>
                          {r.FA.map((v, i) => (
                            <EditableCell
                              key={`fa-${r.id}-${i}`}
                              value={v}
                              onChange={(nv) => onEdit(r.id, "FA", i, nv)}
                            />
                          ))}
                          {r.SA.map((v, i) => (
                            <EditableCell
                              key={`sa-${r.id}-${i}`}
                              value={v}
                              onChange={(nv) => onEdit(r.id, "SA", i, nv)}
                            />
                          ))}
                          <EditableCell value={r.Final} onChange={(nv) => onEdit(r.id, "Final", 0, nv)} />
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 右欄：桌面版固定顯示；行動版改為 Drawer */}
        <div className="hidden lg:block">
          <GradeCalculatorPanel />
        </div>

        {/* 行動版：置於段落底部的抽屜開關 */}
        <div className="lg:hidden">
          <Drawer open={calcOpen} onOpenChange={setCalcOpen}>
            <DrawerTrigger asChild>
              <Button variant="secondary" className="w-full">
                Open Grade Calculation
              </Button>
            </DrawerTrigger>
            <DrawerContent>
              <DrawerHeader>
                <DrawerTitle>Grade Calculation</DrawerTitle>
              </DrawerHeader>
              <div className="p-4">
                <GradeCalculatorPanel compact />
              </div>
            </DrawerContent>
          </Drawer>
        </div>
      </div>
    </div>
  )
}

function EditableCell({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const invalid = value < 0 || value > 100
  return (
    <TableCell className={invalid ? "bg-rose-50 dark:bg-rose-950/30" : ""}>
      <input
        type="number"
        inputMode="numeric"
        className="w-14 md:w-16 text-sm bg-background border rounded-md p-1.5"
        aria-invalid={invalid}
        aria-label="Score cell"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        min={0}
        max={100}
      />
    </TableCell>
  )
}
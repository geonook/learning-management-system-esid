"use client"

import type React from "react"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { UploadCloud } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type RowPreview = { row: number; studentId: string; score: number; error?: string }

export default function CsvUploadDialog({
  onConfirm,
}: {
  onConfirm?: (rows: RowPreview[]) => void
}) {
  const [open, setOpen] = useState(false)
  const [rows, setRows] = useState<RowPreview[]>([])

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    // Mock parse: generate a few rows with some "errors"
    const mock: RowPreview[] = Array.from({ length: 10 }).map((_, i) => ({
      row: i + 1,
      studentId: `STU-${(7000 + i).toString()}`,
      score: Math.max(0, Math.min(100, Math.round(70 + (Math.random() - 0.5) * 40))),
      error: Math.random() < 0.15 ? "Invalid score" : undefined,
    }))
    setRows(mock)
  }

  function confirm() {
    onConfirm?.(rows)
    setOpen(false)
  }

  function downloadTemplate() {
    const headers = "studentId,assessmentCode,score\n"
    const sample = [
      "STU-7001,FA1,85",
      "STU-7002,FA1,0", 
      "STU-7003,FA1,92",
      "STU-7001,SA1,88",
      "STU-7002,SA1,90"
    ].join("\n")
    const blob = new Blob([headers + sample], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "scores-template.csv"
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 bg-transparent">
          <UploadCloud className="w-4 h-4" />
          Upload CSV
        </Button>
      </DialogTrigger>
      <DialogContent aria-describedby="csv-desc">
        <DialogHeader>
          <DialogTitle>Upload CSV Scores</DialogTitle>
          <DialogDescription id="csv-desc">
            Upload CSV with student scores. Preview and validate before import.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2">
          <label className="border-2 border-dashed rounded-md p-6 text-center cursor-pointer hover:bg-muted/50">
            <input type="file" accept=".csv" className="hidden" onChange={onFile} />
            <div className="text-sm">Drop CSV here or click to browse</div>
          </label>
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">Required columns: studentId, assessmentCode, score</div>
            <Button variant="secondary" size="sm" onClick={downloadTemplate}>
              Download Template
            </Button>
          </div>
          <ScrollArea className="h-[220px] border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Row</TableHead>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.row} className={r.error ? "bg-amber-50 dark:bg-amber-950/30" : ""}>
                    <TableCell>{r.row}</TableCell>
                    <TableCell>{r.studentId}</TableCell>
                    <TableCell>{r.score}</TableCell>
                    <TableCell>{r.error ? r.error : "OK"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirm} disabled={rows.length === 0}>
              Confirm Import ({rows.length} rows)
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
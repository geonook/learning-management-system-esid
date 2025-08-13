"use client"

import FilterBar from "@/components/ui/filter-bar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"
import CsvUploadDialog from "@/components/ui/csv-upload-dialog"
import GradeCalculatorPanel from "@/components/grade-calculator-panel"
import { useTeacherCourses, useTeacherScores } from "@/lib/table-hooks"
import { Plus, BookOpen, Users, RefreshCw } from "lucide-react"
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
  const [calcOpen, setCalcOpen] = useState(false)
  const [selectedCourseId, setSelectedCourseId] = useState<string>('')
  const role = useAppStore((s) => s.role)
  const titles = useAppStore((s) => s.assessmentTitles)
  
  // Fetch teacher's courses
  const { courses, loading: coursesLoading, error: coursesError } = useTeacherCourses()
  
  // Fetch scores for selected course
  const { rows, loading: scoresLoading, error: scoresError, saving, onEdit, refetch } = useTeacherScores(selectedCourseId)
  
  const selectedCourse = courses.find(c => c.id === selectedCourseId)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Scores</h1>
          {selectedCourse && (
            <p className="text-sm text-muted-foreground mt-1">
              <BookOpen className="w-4 h-4 inline mr-1" />
              {selectedCourse.course_name} - {selectedCourse.class_name}
              <Users className="w-4 h-4 inline ml-3 mr-1" />
              {selectedCourse.student_count} students
            </p>
          )}
        </div>
        {selectedCourseId && (
          <Button variant="outline" size="sm" onClick={refetch} disabled={scoresLoading}>
            <RefreshCw className={`w-4 h-4 mr-1 ${scoresLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        )}
      </div>
      
      {/* Course Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Select Course</CardTitle>
        </CardHeader>
        <CardContent>
          {coursesLoading ? (
            <div className="text-sm text-muted-foreground">Loading your courses...</div>
          ) : coursesError ? (
            <Alert variant="destructive">
              <AlertDescription>Failed to load courses: {coursesError}</AlertDescription>
            </Alert>
          ) : courses.length === 0 ? (
            <Alert>
              <AlertDescription>
                No courses assigned to you. Please contact the administrator if this is incorrect.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-4">
              <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a course to view and edit scores" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map((course) => (
                    <SelectItem key={course.id} value={course.id}>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{course.course_type}</span>
                        <span className="text-muted-foreground">-</span>
                        <span>{course.class_name}</span>
                        <span className="text-xs text-muted-foreground">({course.student_count} students)</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {courses.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  {courses.map((course) => (
                    <div key={course.id} className="p-3 rounded-lg border bg-muted/50">
                      <div className="font-medium">{course.course_type}</div>
                      <div className="text-muted-foreground">{course.class_name}</div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Grade {course.grade} • {course.student_count} students
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedCourseId && (
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
      )}

      {/* 主體：行動版單欄；lg 以上雙欄 */}
      {selectedCourseId ? (
        scoresError ? (
          <Alert variant="destructive">
            <AlertDescription>Failed to load scores: {scoresError}</AlertDescription>
          </Alert>
        ) : (
          <div className="grid gap-4 lg:grid-cols-[1fr_360px]">
            {/* 左側成績表 */}
            <Card className="overflow-hidden">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Gradebook</span>
                  {scoresLoading && (
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Loading...
                    </div>
                  )}
                  {saving && (
                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Saving...
                    </div>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {scoresLoading ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2" />
                    Loading scores...
                  </div>
                ) : rows.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    <Users className="w-8 h-8 mx-auto mb-2" />
                    No students enrolled in this course.
                  </div>
                ) : (
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
                                  {r.name} <span className="text-xs text-muted-foreground">({r.student_id})</span>
                                </TableCell>
                                {r.FA.map((v, i) => (
                                  <EditableCell
                                    key={`fa-${r.id}-${i}`}
                                    value={v}
                                    onChange={(nv) => onEdit(r.id, "FA", i, nv)}
                                    disabled={saving}
                                  />
                                ))}
                                {r.SA.map((v, i) => (
                                  <EditableCell
                                    key={`sa-${r.id}-${i}`}
                                    value={v}
                                    onChange={(nv) => onEdit(r.id, "SA", i, nv)}
                                    disabled={saving}
                                  />
                                ))}
                                <EditableCell 
                                  value={r.Final} 
                                  onChange={(nv) => onEdit(r.id, "Final", 0, nv)}
                                  disabled={saving}
                                />
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* 右欄：桌面版固定顯示；行動版改為 Drawer */}
            <div className="hidden lg:block">
              <GradeCalculatorPanel />
            </div>
          </div>
        )
      ) : (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            <BookOpen className="w-12 h-12 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Course Selected</h3>
            <p>Please select a course above to view and edit student scores.</p>
          </CardContent>
        </Card>
      )}

      {/* 行動版：置於段落底部的抽屜開關 */}
      {selectedCourseId && (
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
      )}
    </div>
  )
}

function EditableCell({ 
  value, 
  onChange, 
  disabled = false 
}: { 
  value: number; 
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  const invalid = value < 0 || value > 100
  return (
    <TableCell className={invalid ? "bg-rose-50 dark:bg-rose-950/30" : ""}>
      <input
        type="number"
        inputMode="numeric"
        className="w-14 md:w-16 text-sm bg-background border rounded-md p-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
        aria-invalid={invalid}
        aria-label="Score cell"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        disabled={disabled}
        min={0}
        max={100}
      />
    </TableCell>
  )
}
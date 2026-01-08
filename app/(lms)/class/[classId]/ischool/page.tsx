'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { AuthGuard } from '@/components/auth/auth-guard'
import { useAuthReady } from '@/hooks/useAuthReady'
import { supabase } from '@/lib/supabase/client'
import {
  FileOutput,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronRight,
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ISchoolExportTable, ISchoolExportPreview } from '@/components/ischool'
import {
  getISchoolExportData,
  upsertISchoolComment,
} from '@/lib/api/ischool'
import type { ISchoolExportRow } from '@/types/ischool'
import { termRequiresComments } from '@/types/ischool'
import type { Term } from '@/types/academic-year'

interface ClassInfo {
  id: string
  name: string
  grade: number
  academic_year: string
}

export default function ISchoolExportPage() {
  const params = useParams()
  const classId = params?.classId as string
  const { userId, role, isReady } = useAuthReady()

  const [classInfo, setClassInfo] = useState<ClassInfo | null>(null)
  const [courseId, setCourseId] = useState<string | null>(null)
  const [selectedTerm, setSelectedTerm] = useState<Term>(2) // Default to Term 2
  const [exportData, setExportData] = useState<ISchoolExportRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasAccess, setHasAccess] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  // Check access and fetch class info
  useEffect(() => {
    if (!isReady || !classId) return

    const fetchClassInfo = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Get class info
        const { data: classData, error: classError } = await supabase
          .from('classes')
          .select('id, name, grade, academic_year')
          .eq('id', classId)
          .single()

        if (classError) throw new Error('Failed to load class info')
        setClassInfo(classData)

        // Get LT course and check access (filter by academic_year to ensure correct course)
        const { data: course, error: courseError } = await supabase
          .from('courses')
          .select('id, teacher_id')
          .eq('class_id', classId)
          .eq('course_type', 'LT')
          .eq('academic_year', classData.academic_year)
          .eq('is_active', true)
          .single()

        if (courseError || !course) {
          setError('No LT course found for this class')
          setIsLoading(false)
          return
        }

        setCourseId(course.id)

        // Check access: admin or LT teacher
        const isAdmin = role === 'admin'
        const isLTTeacher = course.teacher_id === userId

        if (!isAdmin && !isLTTeacher) {
          setError('Access denied. Only LT teachers and admins can access this page.')
          setHasAccess(false)
        } else {
          setHasAccess(true)
        }
      } catch (err) {
        console.error('Error fetching class info:', err)
        setError('Failed to load class information')
      } finally {
        setIsLoading(false)
      }
    }

    fetchClassInfo()
  }, [classId, userId, role, isReady])

  // Fetch export data when term changes
  useEffect(() => {
    if (!classInfo || !hasAccess) return

    const fetchExportData = async () => {
      setIsLoading(true)
      try {
        const data = await getISchoolExportData(
          classId,
          classInfo.academic_year,
          selectedTerm
        )
        setExportData(data)
      } catch (err) {
        console.error('Error fetching export data:', err)
        setError('Failed to load export data')
      } finally {
        setIsLoading(false)
      }
    }

    fetchExportData()
  }, [classId, classInfo, selectedTerm, hasAccess])

  // Handle comment change with debounce
  const handleCommentChange = useCallback(async (studentId: string, comment: string) => {
    if (!courseId || !classInfo) return

    // Only save for Term 2 and 4
    if (!termRequiresComments(selectedTerm)) return

    try {
      await upsertISchoolComment({
        studentId,
        courseId,
        academicYear: classInfo.academic_year,
        term: selectedTerm as 2 | 4,
        comment,
      })

      // Update local state
      setExportData(prev =>
        prev.map(row =>
          row.studentId === studentId
            ? { ...row, teacherComment: comment }
            : row
        )
      )
    } catch (err) {
      console.error('Error saving comment:', err)
    }
  }, [courseId, classInfo, selectedTerm])

  const getTermLabel = (term: Term): string => {
    switch (term) {
      case 1: return 'Term 1 (Fall Midterm)'
      case 2: return 'Term 2 (Fall Final)'
      case 3: return 'Term 3 (Spring Midterm)'
      case 4: return 'Term 4 (Spring Final)'
      default: return `Term ${term}`
    }
  }

  return (
    <AuthGuard>
      <div className="container mx-auto py-6 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <FileOutput className="w-6 h-6 text-primary" />
            <div>
              <h1 className="text-2xl font-bold">iSchool Export</h1>
              {classInfo && (
                <p className="text-sm text-muted-foreground">
                  {classInfo.name} • {classInfo.academic_year}
                </p>
              )}
            </div>
          </div>

          {/* Term Selector */}
          <Select
            value={String(selectedTerm)}
            onValueChange={(value) => setSelectedTerm(Number(value) as Term)}
          >
            <SelectTrigger className="w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1">{getTermLabel(1)}</SelectItem>
              <SelectItem value="2">{getTermLabel(2)}</SelectItem>
              <SelectItem value="3">{getTermLabel(3)}</SelectItem>
              <SelectItem value="4">{getTermLabel(4)}</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Loading State */}
        {isLoading && !exportData.length ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
          </div>
        ) : hasAccess && (
          <div className="space-y-4">
            {/* Export Controls - 置頂工具列 */}
            <ISchoolExportPreview
              data={exportData}
              term={selectedTerm}
              isCollapsible
              isOpen={isPreviewOpen}
              onToggle={() => setIsPreviewOpen(!isPreviewOpen)}
            />

            {/* Student Grades Table - 全寬度 */}
            <div className="bg-card rounded-lg border shadow-sm">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold">
                  Student Grades
                  {termRequiresComments(selectedTerm) && (
                    <span className="ml-2 text-sm font-normal text-muted-foreground">
                      (with Teacher Comments - max 400 chars)
                    </span>
                  )}
                </h2>
              </div>
              <div className="p-4">
                <ISchoolExportTable
                  data={exportData}
                  term={selectedTerm}
                  onCommentChange={handleCommentChange}
                  isLoading={isLoading}
                />
              </div>
            </div>

            {/* Term Info - 簡化版 */}
            <div className="text-xs text-muted-foreground bg-muted/30 rounded-lg px-4 py-2">
              <span className="font-medium">Term {selectedTerm}:</span>
              {selectedTerm === 1 || selectedTerm === 3 ? (
                <span className="ml-2">FA1-4 avg • SA1-2 avg • MID</span>
              ) : (
                <span className="ml-2">FA5-8 avg • SA3-4 avg • FINAL • Comments (400 chars)</span>
              )}
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  )
}

'use client'

import { useEffect, useState, useCallback, useMemo } from 'react'
import { useParams } from 'next/navigation'
import { AuthGuard } from '@/components/auth/auth-guard'
import { useAuthReady } from '@/hooks/useAuthReady'
import { supabase } from '@/lib/supabase/client'
import {
  FileOutput,
  Loader2,
  AlertCircle,
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
  getAvailableISchoolCourses,
  upsertISchoolComment,
} from '@/lib/api/ischool'
import type { ISchoolCourseInfo, CourseType, ISchoolExportRowWithScores } from '@/lib/api/ischool'
import type { ISchoolExportRow } from '@/types/ischool'
import { termRequiresComments } from '@/types/ischool'
import type { Term } from '@/types/academic-year'
import { FormulaEngine } from '@/lib/gradebook/FormulaEngine'

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
  const [courses, setCourses] = useState<ISchoolCourseInfo[]>([])
  const [selectedCourseType, setSelectedCourseType] = useState<CourseType>('LT')
  const [courseId, setCourseId] = useState<string | null>(null)
  const [selectedTerm, setSelectedTerm] = useState<Term>(2) // Default to Term 2
  const [rawExportData, setRawExportData] = useState<ISchoolExportRowWithScores[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasAccess, setHasAccess] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isReadOnly, setIsReadOnly] = useState(false)

  // Calculate FA/SA averages using FormulaEngine (same as Gradebook)
  const exportData: ISchoolExportRow[] = useMemo(() => {
    return rawExportData.map(row => {
      // Use FormulaEngine to calculate averages - same as Gradebook display
      const formativeAvg = FormulaEngine.getFormativeAverage(row.rawScores)
      const summativeAvg = FormulaEngine.getSummativeAverage(row.rawScores)

      return {
        studentId: row.studentId,
        studentNumber: row.studentNumber,
        studentName: row.studentName,
        chineseName: row.chineseName,
        seatNo: row.seatNo,
        formativeAvg,
        summativeAvg,
        examScore: row.examScore,
        teacherComment: row.teacherComment,
      }
    })
  }, [rawExportData])

  // Check access and fetch class info + available courses
  useEffect(() => {
    if (!isReady || !classId) return

    const fetchClassInfoAndCourses = async () => {
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

        // Get all available courses for this class
        const allCourses = await getAvailableISchoolCourses(classId, classData.academic_year)

        if (allCourses.length === 0) {
          setError('No courses found for this class')
          setIsLoading(false)
          return
        }

        // Filter courses based on role
        const isAdmin = role === 'admin'
        const isOffice = role === 'office_member'

        let visibleCourses = allCourses

        if (!isAdmin && !isOffice) {
          // Regular teacher: only see their own courses
          visibleCourses = allCourses.filter(c => c.teacher_id === userId)
        }
        // Admin and Office can see all courses

        if (visibleCourses.length === 0) {
          setError('Access denied. You do not have permission to export grades for this class.')
          setHasAccess(false)
          setIsLoading(false)
          return
        }

        setCourses(visibleCourses)

        // Set initial course type (prefer LT if available)
        const initialCourse = visibleCourses.find(c => c.course_type === 'LT') || visibleCourses[0]
        if (initialCourse) {
          setSelectedCourseType(initialCourse.course_type)
          setCourseId(initialCourse.id)
          setHasAccess(true)
        }

        // Office members are read-only
        setIsReadOnly(isOffice)
      } catch (err) {
        console.error('Error fetching class info:', err)
        setError('Failed to load class information')
      } finally {
        setIsLoading(false)
      }
    }

    fetchClassInfoAndCourses()
  }, [classId, userId, role, isReady])

  // Update courseId when course type changes
  useEffect(() => {
    const course = courses.find(c => c.course_type === selectedCourseType)
    if (course) {
      setCourseId(course.id)
    }
  }, [selectedCourseType, courses])

  // Fetch export data when term or course type changes
  useEffect(() => {
    if (!classInfo || !hasAccess || !courseId) return

    const fetchExportData = async () => {
      setIsLoading(true)
      try {
        const data = await getISchoolExportData(
          classId,
          classInfo.academic_year,
          selectedTerm,
          selectedCourseType
        )
        setRawExportData(data)
      } catch (err) {
        console.error('Error fetching export data:', err)
        setError('Failed to load export data')
      } finally {
        setIsLoading(false)
      }
    }

    fetchExportData()
  }, [classId, classInfo, selectedTerm, selectedCourseType, courseId, hasAccess])

  // Handle comment change with debounce
  const handleCommentChange = useCallback(async (studentId: string, comment: string) => {
    if (!courseId || !classInfo) return

    // Read-only mode: don't save
    if (isReadOnly) return

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

      // Update local state (rawExportData - the calculated exportData will update via useMemo)
      setRawExportData(prev =>
        prev.map(row =>
          row.studentId === studentId
            ? { ...row, teacherComment: comment }
            : row
        )
      )
    } catch (err) {
      console.error('Error saving comment:', err)
    }
  }, [courseId, classInfo, selectedTerm, isReadOnly])

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
                  {isReadOnly && (
                    <span className="ml-2 text-yellow-600">(Read-only)</span>
                  )}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Course Selector - only show if multiple courses */}
            {courses.length > 1 && (
              <Select
                value={selectedCourseType}
                onValueChange={(value) => setSelectedCourseType(value as CourseType)}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {courses.map(course => (
                    <SelectItem key={course.id} value={course.course_type}>
                      {course.course_type}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {/* Single course badge */}
            {courses.length === 1 && (
              <span className="px-3 py-1.5 text-sm font-medium bg-primary/10 text-primary rounded-md">
                {selectedCourseType}
              </span>
            )}

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
                  isReadOnly={isReadOnly}
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

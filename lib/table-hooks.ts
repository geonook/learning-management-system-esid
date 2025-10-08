"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { getTeacherCourses, getCourseStudentsWithScores, upsertScoreWithCourse, type TeacherCourse } from "./api/scores"
import { useAuth } from "./supabase/auth-context"

// Course-based score row for UI
export type CourseScoreRow = {
  id: string // student_id
  name: string
  student_id: string // external student ID
  FA: number[]
  SA: number[]
  Final: number
}

// Teacher courses hook
export function useTeacherCourses() {
  const [courses, setCourses] = useState<TeacherCourse[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { user } = useAuth()

  const fetchCourses = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const teacherCourses = await getTeacherCourses()
      setCourses(teacherCourses)
      setError(null)
    } catch (err: any) {
      console.error('Error fetching teacher courses:', err)
      setError(err.message)
      setCourses([])
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    fetchCourses()
  }, [fetchCourses])

  return { courses, loading, error, refetch: fetchCourses }
}

// Course-based scores hook (replaces useScoresTable)
export function useTeacherScores(courseId?: string) {
  const [rows, setRows] = useState<CourseScoreRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const { user } = useAuth()

  // Convert API data to UI format
  const convertToScoreRows = (studentsData: any[]): CourseScoreRow[] => {
    return studentsData.map(student => {
      // Initialize empty score arrays
      const FA = Array(8).fill(0)
      const SA = Array(4).fill(0)
      let Final = 0

      // Fill in actual scores
      student.scores?.forEach((score: any) => {
        const code = score.assessment_code
        const value = score.score || 0

        if (code.startsWith('FA')) {
          const index = parseInt(code.substring(2)) - 1
          if (index >= 0 && index < 8) {
            FA[index] = value
          }
        } else if (code.startsWith('SA')) {
          const index = parseInt(code.substring(2)) - 1
          if (index >= 0 && index < 4) {
            SA[index] = value
          }
        } else if (code === 'FINAL') {
          Final = value
        }
      })

      return {
        id: student.student_id,
        name: student.student_name,
        student_id: student.external_student_id,
        FA,
        SA,
        Final
      }
    })
  }

  // Fetch scores for the selected course
  const fetchScores = useCallback(async () => {
    if (!user || !courseId) {
      setRows([])
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      const studentsData = await getCourseStudentsWithScores(courseId)
      const scoreRows = convertToScoreRows(studentsData)
      setRows(scoreRows)
      setError(null)
    } catch (err: any) {
      console.error('Error fetching course scores:', err)
      setError(err.message)
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [user, courseId])

  useEffect(() => {
    fetchScores()
  }, [fetchScores])

  // Update score function
  async function onEdit(id: string, type: "FA" | "SA" | "Final", idx: number, value: number) {
    if (!courseId || !user) return

    const clampedValue = clamp(value)
    
    // Optimistically update UI
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r
        if (type === "Final") return { ...r, Final: clampedValue }
        if (type === "FA") {
          const FA = [...r.FA]
          FA[idx] = clampedValue
          return { ...r, FA }
        }
        // type === "SA"
        const SA = [...r.SA]
        SA[idx] = clampedValue
        return { ...r, SA }
      }),
    )

    // Save to database
    try {
      setSaving(true)
      
      // Determine assessment code
      let assessment_code: string
      if (type === "Final") {
        assessment_code = "FINAL"
      } else if (type === "FA") {
        assessment_code = `FA${idx + 1}`
      } else {
        assessment_code = `SA${idx + 1}`
      }

      await upsertScoreWithCourse({
        student_id: id,
        course_id: courseId,
        assessment_code,
        score: clampedValue,
        entered_by: user.id,
        entered_at: new Date().toISOString()
      })
    } catch (err: any) {
      console.error('Error saving score:', err)
      setError(`Failed to save score: ${err.message}`)
      // Revert optimistic update on error by refetching data
      fetchScores()
    } finally {
      setSaving(false)
    }
  }

  return { 
    rows, 
    loading, 
    error, 
    saving, 
    onEdit,
    refetch: async () => {
      if (courseId) {
        // Re-fetch data
        try {
          setLoading(true)
          const studentsData = await getCourseStudentsWithScores(courseId)
          const scoreRows = convertToScoreRows(studentsData)
          setRows(scoreRows)
          setError(null)
        } catch (err: any) {
          console.error('Error refetching course scores:', err)
          setError(err.message)
        } finally {
          setLoading(false)
        }
      }
    }
  }
}

// Legacy hook for backward compatibility
export function useScoresTable() {
  // Return mock data for backward compatibility
  const initial = useMemo(() => {
    // Simple mock data
    return Array.from({ length: 5 }, (_, i) => ({
      id: `student-${i}`,
      name: `Student ${i + 1}`,
      FA: Array(8).fill(0),
      SA: Array(4).fill(0),
      Final: 0
    }))
  }, [])
  
  const [rows, setRows] = useState(initial)

  function onEdit(id: string, type: "FA" | "SA" | "Final", idx: number, value: number) {
    setRows((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r
        if (type === "Final") return { ...r, Final: clamp(value) }
        if (type === "FA") {
          const FA = [...r.FA]
          FA[idx] = clamp(value)
          return { ...r, FA }
        }
        // type === "SA"
        const SA = [...r.SA]
        SA[idx] = clamp(value)
        return { ...r, SA }
      }),
    )
  }

  return { rows, onEdit }
}

function clamp(v: number): number {
  if (isNaN(v)) return 0
  return Math.max(0, Math.min(100, Math.round(v)))
}
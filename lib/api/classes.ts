/**
 * ⚠️ LEGACY WARNING: This file uses track-based filtering
 * For course-based class queries in grade entry, use course APIs from /lib/api/scores.ts
 * This API is maintained for general class management features only
 */

import { supabase } from '@/lib/supabase/client'
import { Database } from '@/types/database'

export type Class = Database['public']['Tables']['classes']['Row']
export type ClassInsert = Database['public']['Tables']['classes']['Insert']
export type ClassUpdate = Database['public']['Tables']['classes']['Update']

// Extended class type with teacher information
export type ClassWithTeacher = Class & {
  teacher?: {
    id: string
    full_name: string
    email: string
  }
}

// Get all classes for current academic year (simplified version)
export async function getClasses(academicYear?: string) {
  const currentYear = academicYear || new Date().getFullYear().toString()
  
  const { data, error } = await supabase
    .from('classes')
    .select('*')
    .eq('academic_year', currentYear)
    .eq('is_active', true)
    .order('grade')
    .order('name')

  if (error) {
    console.error('Error fetching classes:', error)
    throw new Error(`Failed to fetch classes: ${error.message}`)
  }

  return data as Class[]
}

// Get classes by grade and track (simplified)
export async function getClassesByGradeTrack(
  grade: number,
  track: 'local' | 'international',
  academicYear?: string
) {
  const currentYear = academicYear || new Date().getFullYear().toString()
  
  const { data, error } = await supabase
    .from('classes')
    .select('*')
    .eq('academic_year', currentYear)
    .eq('grade', grade)
    .eq('track', track)
    .eq('is_active', true)
    .order('name')

  if (error) {
    console.error('Error fetching classes by grade/track:', error)
    throw new Error(`Failed to fetch classes: ${error.message}`)
  }

  return data as Class[]
}

// Get classes by teacher ID (via courses table - "one class, three teachers" architecture)
export async function getClassesByTeacher(
  teacherId: string,
  academicYear?: string
) {
  const currentYear = academicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`

  // Query classes through courses table (teacher_id is in courses, not classes)
  const { data, error } = await supabase
    .from('courses')
    .select(`
      class_id,
      classes!inner (
        id,
        name,
        grade,
        level,
        track,
        academic_year,
        is_active,
        created_at,
        updated_at
      )
    `)
    .eq('teacher_id', teacherId)
    .eq('classes.academic_year', currentYear)
    .eq('classes.is_active', true)
    .order('classes(grade)')
    .order('classes(name)')

  if (error) {
    console.error('Error fetching teacher classes:', error)
    throw new Error(`Failed to fetch teacher classes: ${error.message}`)
  }

  // Extract unique classes from the result
  const classMap = new Map<string, Class>()
  for (const course of data || []) {
    const cls = course.classes as unknown as Class
    if (cls && !classMap.has(cls.id)) {
      classMap.set(cls.id, cls)
    }
  }

  return Array.from(classMap.values())
}

// Get classes by grade band (for Head Teachers)
// grade_band can be: "1", "2", "3-4", "5-6", "1-2", "1-6"
export async function getClassesByGradeBand(
  gradeBand: string,
  academicYear?: string
) {
  const currentYear = academicYear || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`

  // Parse grade band to get grade numbers
  // "1" -> [1], "3-4" -> [3,4], "1-6" -> [1,2,3,4,5,6]
  let grades: number[] = []
  if (gradeBand.includes('-')) {
    const parts = gradeBand.split('-').map(Number)
    const start = parts[0] ?? 1
    const end = parts[1] ?? start
    for (let i = start; i <= end; i++) {
      grades.push(i)
    }
  } else {
    grades = [Number(gradeBand)]
  }

  const { data, error } = await supabase
    .from('classes')
    .select('*')
    .in('grade', grades)
    .eq('academic_year', currentYear)
    .eq('is_active', true)
    .order('grade')
    .order('name')

  if (error) {
    console.error('Error fetching classes by grade band:', error)
    throw new Error(`Failed to fetch classes by grade band: ${error.message}`)
  }

  return data as Class[]
}

// Get single class by ID (simplified)
export async function getClass(id: string) {
  const { data, error } = await supabase
    .from('classes')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching class:', error)
    throw new Error(`Failed to fetch class: ${error.message}`)
  }

  return data as Class
}

// Create new class (simplified)
export async function createClass(classData: ClassInsert) {
  const { data, error } = await supabase
    .from('classes')
    .insert(classData)
    .select('*')
    .single()

  if (error) {
    console.error('Error creating class:', error)
    throw new Error(`Failed to create class: ${error.message}`)
  }

  return data as Class
}

// Update class (simplified)
export async function updateClass(id: string, updates: ClassUpdate) {
  const { data, error } = await supabase
    .from('classes')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    console.error('Error updating class:', error)
    throw new Error(`Failed to update class: ${error.message}`)
  }

  return data as Class
}

// Soft delete class (mark as inactive)
export async function deleteClass(id: string) {
  const { error } = await supabase
    .from('classes')
    .update({
      is_active: false,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)

  if (error) {
    console.error('Error deleting class:', error)
    throw new Error(`Failed to delete class: ${error.message}`)
  }

  return true
}

// Get all academic years
export async function getAcademicYears() {
  const { data, error } = await supabase
    .from('classes')
    .select('academic_year')
    .order('academic_year', { ascending: false })

  if (error) {
    console.error('Error fetching academic years:', error)
    throw new Error(`Failed to fetch academic years: ${error.message}`)
  }

  // Return unique academic years
  const uniqueYears = [...new Set(data.map(item => item.academic_year))]
  return uniqueYears
}

// Extended class type with student count and course teachers
export type ClassWithDetails = Class & {
  level?: string | null  // Level field from actual database
  student_count: number
  courses: Array<{
    id: string
    course_type: 'LT' | 'IT' | 'KCFS'
    teacher: {
      id: string
      full_name: string
    } | null
  }>
}

// Get all classes with student counts and course teachers for Browse page
export async function getClassesWithDetails(options?: {
  academicYear?: string
  grade?: number
  search?: string
}): Promise<ClassWithDetails[]> {
  const academicYear = options?.academicYear || '2025-2026'

  // Build query for classes
  let query = supabase
    .from('classes')
    .select('*')
    .eq('academic_year', academicYear)
    .eq('is_active', true)
    .order('grade')
    .order('name')

  // Apply grade filter if provided
  if (options?.grade) {
    query = query.eq('grade', options.grade)
  }

  // Apply search filter if provided
  if (options?.search) {
    query = query.ilike('name', `%${options.search}%`)
  }

  const { data: classes, error: classError } = await query

  if (classError) {
    console.error('Error fetching classes:', classError)
    throw new Error(`Failed to fetch classes: ${classError.message}`)
  }

  if (!classes || classes.length === 0) {
    return []
  }

  // Get student counts for all classes
  const classIds = classes.map(c => c.id)
  const { data: studentCounts, error: studentError } = await supabase
    .from('students')
    .select('class_id')
    .in('class_id', classIds)
    .eq('is_active', true)

  if (studentError) {
    console.error('Error fetching student counts:', studentError)
  }

  // Create student count map
  const countMap: Record<string, number> = {}
  studentCounts?.forEach(s => {
    countMap[s.class_id] = (countMap[s.class_id] || 0) + 1
  })

  // Get courses with teachers for all classes
  const { data: courses, error: courseError } = await supabase
    .from('courses')
    .select(`
      id,
      class_id,
      course_type,
      users:teacher_id (
        id,
        full_name
      )
    `)
    .in('class_id', classIds)
    .eq('is_active', true)

  if (courseError) {
    console.error('Error fetching courses:', courseError)
  }

  // Create course map by class_id
  const courseMap: Record<string, ClassWithDetails['courses']> = {}
  if (courses) {
    for (const course of courses) {
      const classId = course.class_id
      if (!courseMap[classId]) {
        courseMap[classId] = []
      }
      // Handle users which could be an object or null
      const teacher = course.users && typeof course.users === 'object' && !Array.isArray(course.users)
        ? { id: (course.users as { id: string }).id, full_name: (course.users as { full_name: string }).full_name }
        : null
      courseMap[classId]!.push({
        id: course.id,
        course_type: course.course_type as 'LT' | 'IT' | 'KCFS',
        teacher
      })
    }
  }

  // Combine all data
  const result: ClassWithDetails[] = classes.map(cls => ({
    ...cls,
    student_count: countMap[cls.id] || 0,
    courses: courseMap[cls.id] || []
  }))

  return result
}

// Get class statistics
export async function getClassStatistics(academicYear?: string) {
  const currentYear = academicYear || new Date().getFullYear().toString()
  
  const { data, error } = await supabase
    .from('classes')
    .select('grade, track')
    .eq('academic_year', currentYear)
    .eq('is_active', true)

  if (error) {
    console.error('Error fetching class statistics:', error)
    throw new Error(`Failed to fetch class statistics: ${error.message}`)
  }

  const stats = {
    total: data.length,
    byGrade: {} as Record<number, number>,
    byTrack: {
      local: 0,
      international: 0
    }
  }

  data.forEach(cls => {
    stats.byGrade[cls.grade] = (stats.byGrade[cls.grade] || 0) + 1
    if (cls.track === 'local' || cls.track === 'international') {
      stats.byTrack[cls.track as 'local' | 'international'] += 1
    }
  })

  return stats
}
import { supabase } from '@/lib/supabase/client'
import { Database } from '@/types/database'

export type Student = Database['public']['Tables']['students']['Row']
export type StudentInsert = Database['public']['Tables']['students']['Insert']
export type StudentUpdate = Database['public']['Tables']['students']['Update']

// Extended student type with class information
export type StudentWithClass = Student & {
  class?: {
    id: string
    name: string
    grade: number
    track: 'local' | 'international'
    academic_year: string
  }
}

// Get all students (simplified version)
export async function getStudents() {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('is_active', true)
    .order('grade')
    .order('full_name')

  if (error) {
    console.error('Error fetching students:', error)
    throw new Error(`Failed to fetch students: ${error.message}`)
  }

  return data as Student[]
}

// Get students by class (simplified)
export async function getStudentsByClass(classId: string) {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('class_id', classId)
    .eq('is_active', true)
    .order('full_name')

  if (error) {
    console.error('Error fetching students by class:', error)
    throw new Error(`Failed to fetch students: ${error.message}`)
  }

  return data as Student[]
}

// Get students by grade and track (simplified)
export async function getStudentsByGradeTrack(
  grade: number,
  track: 'local' | 'international'
) {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('grade', grade)
    .eq('track', track)
    .eq('is_active', true)
    .order('full_name')

  if (error) {
    console.error('Error fetching students by grade/track:', error)
    throw new Error(`Failed to fetch students: ${error.message}`)
  }

  return data as Student[]
}

// Get single student by ID (simplified)
export async function getStudent(id: string) {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    console.error('Error fetching student:', error)
    throw new Error(`Failed to fetch student: ${error.message}`)
  }

  return data as Student
}

// Get student by student ID (external ID) - simplified
export async function getStudentByStudentId(studentId: string) {
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('student_id', studentId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Student not found
    }
    console.error('Error fetching student by student ID:', error)
    throw new Error(`Failed to fetch student: ${error.message}`)
  }

  return data as Student
}

// Create new student (simplified)
export async function createStudent(studentData: StudentInsert) {
  // Check if student_id already exists
  const existing = await getStudentByStudentId(studentData.student_id)
  if (existing) {
    throw new Error(`Student with ID ${studentData.student_id} already exists`)
  }

  const { data, error } = await supabase
    .from('students')
    .insert(studentData)
    .select('*')
    .single()

  if (error) {
    console.error('Error creating student:', error)
    throw new Error(`Failed to create student: ${error.message}`)
  }

  return data as Student
}

// Bulk create students (simplified)
export async function createStudentsBulk(studentsData: StudentInsert[]) {
  const { data, error } = await supabase
    .from('students')
    .insert(studentsData)
    .select('*')

  if (error) {
    console.error('Error creating students in bulk:', error)
    throw new Error(`Failed to create students: ${error.message}`)
  }

  return data as Student[]
}

// Update student (simplified)
export async function updateStudent(id: string, updates: StudentUpdate) {
  const { data, error } = await supabase
    .from('students')
    .update({
      ...updates,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    console.error('Error updating student:', error)
    throw new Error(`Failed to update student: ${error.message}`)
  }

  return data as Student
}

// Assign student to class (simplified)
export async function assignStudentToClass(studentId: string, classId: string) {
  const { data, error } = await supabase
    .from('students')
    .update({
      class_id: classId,
      updated_at: new Date().toISOString()
    })
    .eq('id', studentId)
    .select('*')
    .single()

  if (error) {
    console.error('Error assigning student to class:', error)
    throw new Error(`Failed to assign student to class: ${error.message}`)
  }

  return data as Student
}

// Remove student from class (simplified)
export async function removeStudentFromClass(studentId: string) {
  const { data, error } = await supabase
    .from('students')
    .update({
      class_id: null,
      updated_at: new Date().toISOString()
    })
    .eq('id', studentId)
    .select('*')
    .single()

  if (error) {
    console.error('Error removing student from class:', error)
    throw new Error(`Failed to remove student from class: ${error.message}`)
  }

  return data as Student
}

// Soft delete student (mark as inactive)
export async function deleteStudent(id: string) {
  const { error } = await supabase
    .from('students')
    .update({
      is_active: false,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)

  if (error) {
    console.error('Error deleting student:', error)
    throw new Error(`Failed to delete student: ${error.message}`)
  }

  return true
}

// Get student statistics
export async function getStudentStatistics() {
  const { data, error } = await supabase
    .from('students')
    .select('grade, track, class_id')
    .eq('is_active', true)

  if (error) {
    console.error('Error fetching student statistics:', error)
    throw new Error(`Failed to fetch student statistics: ${error.message}`)
  }

  const stats = {
    total: data.length,
    byGrade: {} as Record<number, number>,
    byTrack: {
      local: 0,
      international: 0
    },
    unassigned: 0
  }

  data.forEach(student => {
    stats.byGrade[student.grade] = (stats.byGrade[student.grade] || 0) + 1
    stats.byTrack[student.track] += 1
    if (!student.class_id) {
      stats.unassigned += 1
    }
  })

  return stats
}

// Promote students to next grade (for new academic year)
export async function promoteStudents(fromGrade: number, toGrade: number) {
  // Don't promote Grade 12 students
  if (fromGrade === 12) {
    throw new Error('Grade 12 students cannot be promoted')
  }

  const { data, error } = await supabase
    .from('students')
    .update({
      grade: toGrade,
      class_id: null, // Remove from current class
      updated_at: new Date().toISOString()
    })
    .eq('grade', fromGrade)
    .eq('is_active', true)
    .select()

  if (error) {
    console.error('Error promoting students:', error)
    throw new Error(`Failed to promote students: ${error.message}`)
  }

  return data.length
}
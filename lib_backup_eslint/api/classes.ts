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

// Get classes by teacher ID (simplified)
export async function getClassesByTeacher(
  teacherId: string,
  academicYear?: string
) {
  const currentYear = academicYear || new Date().getFullYear().toString()
  
  const { data, error } = await supabase
    .from('classes')
    .select('*')
    .eq('teacher_id', teacherId)
    .eq('academic_year', currentYear)
    .eq('is_active', true)
    .order('grade')
    .order('name')

  if (error) {
    console.error('Error fetching teacher classes:', error)
    throw new Error(`Failed to fetch teacher classes: ${error.message}`)
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
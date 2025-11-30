// Mock API functions that use the server-side mock endpoints
// This completely bypasses the problematic Supabase client

import { Database } from '@/types/database'

export type User = Database['public']['Tables']['users']['Row']
export type Class = Database['public']['Tables']['classes']['Row'] 
export type Student = Database['public']['Tables']['students']['Row']
export type Exam = Database['public']['Tables']['exams']['Row']

interface MockAPIResponse<T> {
  success: boolean
  data: T
  count: number
  message: string
}

// Base URL for our mock API endpoints
const MOCK_API_BASE = '/api/mock'

// Generic fetch function for mock APIs
async function fetchMockAPI<T>(endpoint: string): Promise<T> {
  try {
    const response = await fetch(`${MOCK_API_BASE}${endpoint}`)
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const result: MockAPIResponse<T> = await response.json()
    
    if (!result.success) {
      throw new Error(result.message || 'API request failed')
    }
    
    return result.data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error(`Mock API error (${endpoint}):`, error)
    throw new Error(`Failed to fetch ${endpoint}: ${error.message}`)
  }
}

// Mock API functions that replace the problematic Supabase ones

export async function getUsers(): Promise<User[]> {
  return fetchMockAPI<User[]>('/users')
}
  // eslint-disable-next-line @typescript-eslint/no-unused-vars

export async function getClasses(academicYear?: string): Promise<Class[]> {
  // For now, ignore academicYear parameter since mock data is static
  return fetchMockAPI<Class[]>('/classes')
}

export async function getStudents(): Promise<Student[]> {
  return fetchMockAPI<Student[]>('/students')
}

export async function getExams(): Promise<Exam[]> {
  return fetchMockAPI<Exam[]>('/exams')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
}

export async function getAssessmentCodes(): Promise<any[]> {
  return fetchMockAPI<any[]>('/assessment-codes')
}

export async function getAcademicYears(): Promise<string[]> {
  return fetchMockAPI<string[]>('/academic-years')
}

// Additional utility functions
export async function getUsersByRole(role: string): Promise<User[]> {
  const users = await getUsers()
  return users.filter(user => user.role === role)
}

export async function getClassesByGrade(grade: number): Promise<Class[]> {
  const classes = await getClasses()
  return classes.filter(cls => cls.grade === grade)
}

export async function getStudentsByClass(classId: string): Promise<Student[]> {
  const students = await getStudents()
  return students.filter(student => student.class_id === classId)
}
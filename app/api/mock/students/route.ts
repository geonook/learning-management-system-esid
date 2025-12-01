import { NextResponse } from 'next/server'

// Mock students data that matches the database schema
const mockStudents = [
  {
    id: '660e8400-e29b-41d4-a716-446655440001',
    student_id: 'STU001',
    full_name: '張小明',
    grade: 7,
    track: 'local' as const,
    class_id: '550e8400-e29b-41d4-a716-446655440001',
    is_active: true,
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z'
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440002',
    student_id: 'STU002',
    full_name: '李小華',
    grade: 7,
    track: 'local' as const,
    class_id: '550e8400-e29b-41d4-a716-446655440001',
    is_active: true,
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z'
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440003',
    student_id: 'STU003',
    full_name: 'John Smith',
    grade: 8,
    track: 'international' as const,
    class_id: '550e8400-e29b-41d4-a716-446655440003',
    is_active: true,
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z'
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440004',
    student_id: 'STU004',
    full_name: 'Maria Garcia',
    grade: 8,
    track: 'international' as const,
    class_id: '550e8400-e29b-41d4-a716-446655440003',
    is_active: true,
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z'
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440005',
    student_id: 'STU005',
    full_name: '王小美',
    grade: 9,
    track: 'local' as const,
    class_id: '550e8400-e29b-41d4-a716-446655440004',
    is_active: true,
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z'
  },
  {
    id: '660e8400-e29b-41d4-a716-446655440006',
    student_id: 'STU006',
    full_name: 'Emma Johnson',
    grade: 10,
    track: 'international' as const,
    class_id: '550e8400-e29b-41d4-a716-446655440005',
    is_active: true,
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z'
  }
]

export async function GET() {
  try {
    // Simulate a small delay like a real API call
    await new Promise(resolve => setTimeout(resolve, 100))
    
    return NextResponse.json({
      success: true,
      data: mockStudents,
      count: mockStudents.length,
      message: 'Mock students data retrieved successfully'
    })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      data: null
    }, { status: 500 })
  }
}
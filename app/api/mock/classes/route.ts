import { NextResponse } from 'next/server'

// Mock classes data that matches the database schema
const mockClasses = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: '7A',
    grade: 7,
    track: 'local' as const,
    teacher_id: '550e8400-e29b-41d4-a716-446655440010',
    academic_year: '2024',
    is_active: true,
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    name: '7B',
    grade: 7,
    track: 'local' as const,
    teacher_id: '550e8400-e29b-41d4-a716-446655440011',
    academic_year: '2024',
    is_active: true,
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    name: '8A',
    grade: 8,
    track: 'international' as const,
    teacher_id: '550e8400-e29b-41d4-a716-446655440012',
    academic_year: '2024',
    is_active: true,
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440004',
    name: '9A',
    grade: 9,
    track: 'local' as const,
    teacher_id: '550e8400-e29b-41d4-a716-446655440013',
    academic_year: '2024',
    is_active: true,
    created_at: '2024-01-15T00:00:00Z',
    updated_at: '2024-01-15T00:00:00Z'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440005',
    name: '10A',
    grade: 10,
    track: 'international' as const,
    teacher_id: '550e8400-e29b-41d4-a716-446655440014',
    academic_year: '2024',
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
      data: mockClasses,
      count: mockClasses.length,
      message: 'Mock classes data retrieved successfully'
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      data: null
    }, { status: 500 })
  }
}
import { NextResponse } from 'next/server'

// Mock users data that matches the database schema
const mockUsers = [
  {
    id: '550e8400-e29b-41d4-a716-446655440010',
    email: 'admin@school.edu',
    full_name: '系統管理員',
    role: 'admin' as const,
    teacher_type: null,
    grade: null,
    track: null,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440011',
    email: 'head7@school.edu',
    full_name: '七年級主任',
    role: 'head' as const,
    teacher_type: null,
    grade: 7,
    track: 'local' as const,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440012',
    email: 'head8@school.edu',
    full_name: 'Grade 8 Head Teacher',
    role: 'head' as const,
    teacher_type: null,
    grade: 8,
    track: 'international' as const,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440013',
    email: 'teacher.local@school.edu',
    full_name: '本土語老師',
    role: 'teacher' as const,
    teacher_type: 'LT' as const,
    grade: null,
    track: null,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440014',
    email: 'teacher.international@school.edu',
    full_name: 'International Teacher',
    role: 'teacher' as const,
    teacher_type: 'IT' as const,
    grade: null,
    track: null,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440015',
    email: 'teacher.kcfs@school.edu',
    full_name: 'KCFS Teacher',
    role: 'teacher' as const,
    teacher_type: 'KCFS' as const,
    grade: null,
    track: null,
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z'
  }
]

export async function GET() {
  try {
    // Simulate a small delay like a real API call
    await new Promise(resolve => setTimeout(resolve, 100))
    
    return NextResponse.json({
      success: true,
      data: mockUsers,
      count: mockUsers.length,
      message: 'Mock users data retrieved successfully'
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
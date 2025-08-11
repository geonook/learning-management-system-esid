import { NextResponse } from 'next/server'

// Mock exams data that matches the database schema
const mockExams = [
  {
    id: '770e8400-e29b-41d4-a716-446655440001',
    name: 'Mid-term Exam - Math',
    description: 'First semester mid-term mathematics examination',
    class_id: '550e8400-e29b-41d4-a716-446655440001',
    exam_date: '2024-03-15',
    is_published: true,
    created_by: '550e8400-e29b-41d4-a716-446655440011',
    created_at: '2024-02-01T00:00:00Z',
    updated_at: '2024-02-01T00:00:00Z'
  },
  {
    id: '770e8400-e29b-41d4-a716-446655440002',
    name: 'Mid-term Exam - English',
    description: 'First semester mid-term English examination',
    class_id: '550e8400-e29b-41d4-a716-446655440001',
    exam_date: '2024-03-18',
    is_published: true,
    created_by: '550e8400-e29b-41d4-a716-446655440011',
    created_at: '2024-02-01T00:00:00Z',
    updated_at: '2024-02-01T00:00:00Z'
  },
  {
    id: '770e8400-e29b-41d4-a716-446655440003',
    name: 'Final Exam - Science',
    description: 'Year-end science examination',
    class_id: '550e8400-e29b-41d4-a716-446655440003',
    exam_date: '2024-06-20',
    is_published: false,
    created_by: '550e8400-e29b-41d4-a716-446655440012',
    created_at: '2024-05-01T00:00:00Z',
    updated_at: '2024-05-01T00:00:00Z'
  },
  {
    id: '770e8400-e29b-41d4-a716-446655440004',
    name: 'Quiz - History',
    description: 'Monthly history quiz',
    class_id: '550e8400-e29b-41d4-a716-446655440004',
    exam_date: '2024-04-10',
    is_published: true,
    created_by: '550e8400-e29b-41d4-a716-446655440013',
    created_at: '2024-03-15T00:00:00Z',
    updated_at: '2024-03-15T00:00:00Z'
  }
]

export async function GET() {
  try {
    // Simulate a small delay like a real API call
    await new Promise(resolve => setTimeout(resolve, 100))
    
    return NextResponse.json({
      success: true,
      data: mockExams,
      count: mockExams.length,
      message: 'Mock exams data retrieved successfully'
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      data: null
    }, { status: 500 })
  }
}
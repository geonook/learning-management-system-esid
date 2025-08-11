import { NextResponse } from 'next/server'

// Mock assessment codes data that matches the database schema
const mockAssessmentCodes = [
  {
    code: 'FA1',
    category: 'formative' as const,
    sequence_order: 1,
    is_active: true
  },
  {
    code: 'FA2',
    category: 'formative' as const,
    sequence_order: 2,
    is_active: true
  },
  {
    code: 'FA3',
    category: 'formative' as const,
    sequence_order: 3,
    is_active: true
  },
  {
    code: 'FA4',
    category: 'formative' as const,
    sequence_order: 4,
    is_active: true
  },
  {
    code: 'FA5',
    category: 'formative' as const,
    sequence_order: 5,
    is_active: true
  },
  {
    code: 'FA6',
    category: 'formative' as const,
    sequence_order: 6,
    is_active: true
  },
  {
    code: 'FA7',
    category: 'formative' as const,
    sequence_order: 7,
    is_active: true
  },
  {
    code: 'FA8',
    category: 'formative' as const,
    sequence_order: 8,
    is_active: true
  },
  {
    code: 'SA1',
    category: 'summative' as const,
    sequence_order: 9,
    is_active: true
  },
  {
    code: 'SA2',
    category: 'summative' as const,
    sequence_order: 10,
    is_active: true
  },
  {
    code: 'SA3',
    category: 'summative' as const,
    sequence_order: 11,
    is_active: true
  },
  {
    code: 'SA4',
    category: 'summative' as const,
    sequence_order: 12,
    is_active: true
  },
  {
    code: 'FINAL',
    category: 'final' as const,
    sequence_order: 13,
    is_active: true
  }
]

export async function GET() {
  try {
    // Simulate a small delay like a real API call
    await new Promise(resolve => setTimeout(resolve, 100))
    
    return NextResponse.json({
      success: true,
      data: mockAssessmentCodes,
      count: mockAssessmentCodes.length,
      message: 'Mock assessment codes retrieved successfully'
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      data: null
    }, { status: 500 })
  }
}
import { NextResponse } from 'next/server'

// Mock academic years data
const mockAcademicYears = ['2024', '2023', '2022', '2021']

export async function GET() {
  try {
    // Simulate a small delay like a real API call
    await new Promise(resolve => setTimeout(resolve, 50))
    
    return NextResponse.json({
      success: true,
      data: mockAcademicYears,
      count: mockAcademicYears.length,
      message: 'Mock academic years retrieved successfully'
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      data: null
    }, { status: 500 })
  }
}
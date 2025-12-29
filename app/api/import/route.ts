import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { executeCleanImport } from '@/lib/import/clean-batch-processor'

export async function POST(request: NextRequest) {
  try {
    // Parse request body
    const body = await request.json()
    const { validationResults, userId } = body

    // Validate required fields
    if (!validationResults || !userId) {
      return NextResponse.json(
        { error: 'Missing required fields: validationResults and userId' },
        { status: 400 }
      )
    }

    // Create authenticated Supabase client
    const supabase = createClient()
    
    // Verify user authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    // Verify user authentication - no development bypass for security
    if (authError || !user || user.id !== userId) {
      console.error('Authentication failed:', { authError: authError?.message, hasUser: !!user, userIdMatch: user?.id === userId })
      return NextResponse.json(
        { error: 'Unauthorized', details: 'User authentication failed' },
        { status: 401 }
      )
    }

    // Verify user has admin permissions
    const { data: userProfile, error: profileError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single()

    if (profileError || !userProfile || userProfile.role !== 'admin') {
      console.error('Permission check failed:', {
        profileError: profileError?.message,
        hasProfile: !!userProfile,
        role: userProfile?.role
      })
      return NextResponse.json(
        {
          error: 'Insufficient permissions',
          details: profileError?.message || `User role: ${userProfile?.role || 'unknown'}`
        },
        { status: 403 }
      )
    }

    // Execute the clean import
    console.log('Starting clean CSV import for user:', userId)
    const result = await executeCleanImport(validationResults, userId)
    
    console.log('Import completed:', {
      success: result.success,
      summary: result.summary,
      errors: result.errors.length,
      warnings: result.warnings.length
    })

    return NextResponse.json(result)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('Import API error:', error)
    return NextResponse.json(
      { 
        error: 'Import failed', 
        message: error.message,
        success: false
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json(
    { message: 'CSV Import API - Use POST method to import data' },
    { status: 200 }
  )
}
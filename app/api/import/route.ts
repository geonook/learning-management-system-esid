import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { executeImport } from '@/lib/import/import-executor-server'
import type { ImportValidationResult } from '@/lib/import/types'

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
    
    // Development bypass for mock users
    if (process.env.NODE_ENV === 'development' && userId === 'dev-admin-user-id') {
      console.log('Development mode: Bypassing authentication for mock admin user')
    } else {
      if (authError || !user || user.id !== userId) {
        return NextResponse.json(
          { error: 'Unauthorized' },
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
        return NextResponse.json(
          { error: 'Insufficient permissions' },
          { status: 403 }
        )
      }
    }

    // Execute the import
    console.log('Starting CSV import for user:', userId)
    const result = await executeImport(validationResults, userId)
    
    console.log('Import completed:', {
      success: result.success,
      summary: result.summary,
      errors: result.errors.length,
      warnings: result.warnings.length
    })

    return NextResponse.json(result)

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
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { executeCleanDryRun } from '@/lib/import/clean-batch-processor'
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
      console.log('Development mode: Bypassing authentication and permissions for mock admin user (dry run)')
      // Skip all authentication and permission checks for development
    } else {
      if (authError || !user || user.id !== userId) {
        console.error('Authentication failed (dry run):', { authError: authError?.message, hasUser: !!user, userIdMatch: user?.id === userId })
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
        console.error('Permission check failed (dry run):', { 
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
    }

    // Execute the clean dry run
    console.log('Starting clean CSV dry run for user:', userId)
    const result = await executeCleanDryRun(validationResults)
    
    console.log('Dry run completed:', {
      wouldCreate: result.wouldCreate,
      potentialWarnings: result.potentialWarnings.length
    })

    return NextResponse.json(result)

  } catch (error: any) {
    console.error('Dry run API error:', error)
    return NextResponse.json(
      { 
        error: 'Dry run failed', 
        message: error.message
      },
      { status: 500 }
    )
  }
}

export async function GET() {
  return NextResponse.json(
    { message: 'CSV Import Dry Run API - Use POST method to validate data' },
    { status: 200 }
  )
}
import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * User Creation API (Simplified)
 *
 * POST /api/users/create
 * Creates a new teacher record in the public.users table
 * Called from the role-select page after Google OAuth
 *
 * Request Body:
 * {
 *   teacherType: 'LT' | 'IT' | 'KCFS'  // Required
 * }
 *
 * Automatic Fields:
 * - full_name: Extracted from Google OAuth user_metadata
 * - role: Always 'teacher' (fixed)
 * - email: From authenticated session
 * - is_active: false (requires admin approval)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()

    // Verify authenticated user
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()

    if (sessionError || !session) {
      return NextResponse.json(
        { error: 'Unauthorized - Please sign in first' },
        { status: 401 }
      )
    }

    const userId = session.user.id
    const userEmail = session.user.email

    if (!userEmail) {
      return NextResponse.json(
        { error: 'Email not found in session' },
        { status: 400 }
      )
    }

    // Extract full name from Google OAuth metadata
    const fullName =
      session.user.user_metadata?.full_name ||
      session.user.user_metadata?.name ||
      session.user.user_metadata?.display_name ||
      userEmail.split('@')[0] // Fallback to email username

    console.log('Extracted user info from OAuth:', {
      userId,
      email: userEmail,
      fullName,
      metadata: session.user.user_metadata
    })

    // Parse request body
    const body = await request.json()
    const { teacherType } = body

    // Validate teacher type
    if (!teacherType) {
      return NextResponse.json(
        { error: 'Teacher type is required' },
        { status: 400 }
      )
    }

    const validTypes = ['LT', 'IT', 'KCFS']
    if (!validTypes.includes(teacherType)) {
      return NextResponse.json(
        { error: `Invalid teacherType. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      )
    }

    // Check if user already exists
    const { data: existingUser, error: checkError } = await supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: 'User already exists. You cannot register again.' },
        { status: 409 }
      )
    }

    // Ignore checkError if it's just "no rows found" (PGRST116)
    if (checkError && checkError.code !== 'PGRST116') {
      console.error('Error checking existing user:', checkError)
      return NextResponse.json(
        { error: 'Database error while checking existing user' },
        { status: 500 }
      )
    }

    // Create user record - ALL new users are 'teacher' role
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const userData: any = {
      id: userId,
      email: userEmail,
      full_name: fullName,
      role: 'teacher',  // Fixed - always teacher
      teacher_type: teacherType,
      grade: null,  // Not applicable for teachers (only for Head Teachers)
      track: null,  // Not applicable for teachers (track is for classes, not individual teachers)
      is_active: false,  // Requires admin approval
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }

    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert(userData)
      .select()
      .single()

    if (insertError) {
      console.error('Error creating user:', insertError)
      return NextResponse.json(
        { error: 'Failed to create user record', details: insertError.message },
        { status: 500 }
      )
    }

    console.log('User created successfully:', {
      userId: newUser.id,
      email: newUser.email,
      fullName: newUser.full_name,
      role: newUser.role,
      teacherType: newUser.teacher_type,
      isActive: newUser.is_active
    })

    return NextResponse.json(
      {
        success: true,
        message: 'User created successfully. Pending admin approval.',
        user: {
          id: newUser.id,
          email: newUser.email,
          fullName: newUser.full_name,
          role: newUser.role,
          teacherType: newUser.teacher_type,
          isActive: newUser.is_active
        }
      },
      { status: 201 }
    )

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('User creation exception:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

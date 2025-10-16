import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

/**
 * User Creation API
 *
 * POST /api/users/create
 * Creates a new user record in the public.users table
 * Called from the role-select page after Google OAuth
 *
 * Request Body:
 * {
 *   fullName: string
 *   role: 'teacher' | 'head' | 'admin'
 *   teacherType?: 'LT' | 'IT' | 'KCFS'  // Required for teacher role
 *   grade?: number  // Required for head role
 *   campus?: 'local' | 'international'  // Required for head role
 * }
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

    // Parse request body
    const body = await request.json()
    const { fullName, role, teacherType, grade, campus } = body

    // Validate required fields
    if (!fullName || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: fullName and role' },
        { status: 400 }
      )
    }

    // Validate role-specific fields
    if (role === 'teacher' && !teacherType) {
      return NextResponse.json(
        { error: 'Teacher role requires teacherType (LT, IT, or KCFS)' },
        { status: 400 }
      )
    }

    if (role === 'head' && (!grade || !campus)) {
      return NextResponse.json(
        { error: 'Head role requires grade and campus' },
        { status: 400 }
      )
    }

    // Validate role value
    const validRoles = ['teacher', 'head', 'admin']
    if (!validRoles.includes(role)) {
      return NextResponse.json(
        { error: `Invalid role. Must be one of: ${validRoles.join(', ')}` },
        { status: 400 }
      )
    }

    // Validate teacher type
    if (teacherType) {
      const validTypes = ['LT', 'IT', 'KCFS']
      if (!validTypes.includes(teacherType)) {
        return NextResponse.json(
          { error: `Invalid teacherType. Must be one of: ${validTypes.join(', ')}` },
          { status: 400 }
        )
      }
    }

    // Validate campus
    if (campus) {
      const validCampus = ['local', 'international']
      if (!validCampus.includes(campus)) {
        return NextResponse.json(
          { error: `Invalid campus. Must be one of: ${validCampus.join(', ')}` },
          { status: 400 }
        )
      }
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

    // Create user record
    const userData: any = {
      id: userId,
      email: userEmail,
      full_name: fullName,
      role: role,
      teacher_type: role === 'teacher' ? teacherType : null,
      grade: role === 'head' ? grade : null,
      campus: role === 'head' ? campus : null,
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
      role: newUser.role,
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
          isActive: newUser.is_active
        }
      },
      { status: 201 }
    )

  } catch (error: any) {
    console.error('User creation exception:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}

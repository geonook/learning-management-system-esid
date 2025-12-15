import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'

// Server-side API route to test direct database access
export async function GET() {
  try {
    // Create server client with potentially different settings
    const supabase = createClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        db: {
          schema: 'public',
        },
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false
        }
      }
    )

    const results: any = {}
    const errors: string[] = []

    // Test each table with the simplest possible queries
    try {
      console.log('Testing users table...')
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('id, email, full_name, role')
        .limit(5)

      if (usersError) {
        console.error('Users error:', usersError)
        errors.push(`Users: ${usersError.message}`)
      } else {
        results.users = users
        console.log(`Users: ${users?.length || 0} records`)
      }
    } catch (err: any) {
      console.error('Users exception:', err)
      errors.push(`Users exception: ${err.message}`)
    }

    try {
      console.log('Testing classes table...')
      const { data: classes, error: classesError } = await supabase
        .from('classes')
        .select('id, name, grade, track')
        .limit(5)

      if (classesError) {
        console.error('Classes error:', classesError)
        errors.push(`Classes: ${classesError.message}`)
      } else {
        results.classes = classes
        console.log(`Classes: ${classes?.length || 0} records`)
      }
    } catch (err: any) {
      console.error('Classes exception:', err)
      errors.push(`Classes exception: ${err.message}`)
    }

    try {
      console.log('Testing students table...')
      const { data: students, error: studentsError } = await supabase
        .from('students')
        .select('id, student_id, full_name, grade')
        .limit(5)

      if (studentsError) {
        console.error('Students error:', studentsError)
        errors.push(`Students: ${studentsError.message}`)
      } else {
        results.students = students
        console.log(`Students: ${students?.length || 0} records`)
      }
    } catch (err: any) {
      console.error('Students exception:', err)
      errors.push(`Students exception: ${err.message}`)
    }

    try {
      console.log('Testing assessment_codes table...')
      const { data: codes, error: codesError } = await supabase
        .from('assessment_codes')
        .select('code, category, sequence_order')
        .limit(10)

      if (codesError) {
        console.error('Assessment codes error:', codesError)
        errors.push(`Assessment codes: ${codesError.message}`)
      } else {
        results.assessment_codes = codes
        console.log(`Assessment codes: ${codes?.length || 0} records`)
      }
    } catch (err: any) {
      console.error('Assessment codes exception:', err)
      errors.push(`Assessment codes exception: ${err.message}`)
    }

    return NextResponse.json({
      success: errors.length === 0,
      results,
      errors,
      message: errors.length === 0 ? 'All direct queries successful' : 'Some queries failed'
    })

  } catch (error: any) {
    console.error('API route error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      results: null
    }, { status: 500 })
  }
}
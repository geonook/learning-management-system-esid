import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * Database Reset API
 * Safely removes all migration baggage and prepares for clean schema deployment
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function POST(_request: NextRequest) {
  try {
    const supabase = createServiceRoleClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const resetLog = {
      timestamp: new Date().toISOString(),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      steps: [] as any[],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      errors: [] as any[],
      success: false
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const addStep = (step: string, success: boolean, details?: any) => {
      resetLog.steps.push({
        step,
        success,
        details,
        timestamp: new Date().toISOString()
      })
      if (!success && details?.error) {
        resetLog.errors.push({ step, error: details.error })
      }
    }

    // Step 1: Drop all tables in reverse dependency order
    const tablesToDrop = [
      'scores',
      'assessment_titles',
      'exams', 
      'students',
      'courses',
      'classes',
      'users',
      'schema_versions'
    ]

    addStep('Starting database reset', true, { tables_to_drop: tablesToDrop })

    for (const table of tablesToDrop) {
      try {
        // Use raw SQL to ensure clean drop
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any).rpc('exec_sql', {
          sql_query: `DROP TABLE IF EXISTS ${table} CASCADE;`
        })

        if (error) {
          // Fallback: try without CASCADE
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const { error: fallbackError } = await (supabase as any).rpc('exec_sql', {
            sql_query: `DROP TABLE IF EXISTS ${table};`
          })
          
          addStep(`Drop table ${table}`, !fallbackError, { 
            error: fallbackError?.message || null,
            method: 'fallback'
          })
        } else {
          addStep(`Drop table ${table}`, true, { method: 'cascade' })
        }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        // If exec_sql function doesn't exist, skip this step
        addStep(`Drop table ${table}`, false, { 
          error: `exec_sql function not available: ${e.message}`,
          skipped: true
        })
      }
    }

    // Step 2: Drop custom types (enums)
    const typesToDrop = [
      'assessment_code',
      'level_type', 
      'course_type',
      'track_type',
      'teacher_type',
      'user_role'
    ]

    for (const type of typesToDrop) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any).rpc('exec_sql', {
          sql_query: `DROP TYPE IF EXISTS ${type} CASCADE;`
        })

        addStep(`Drop type ${type}`, !error, { error: error?.message || null })
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (e: any) {
        addStep(`Drop type ${type}`, false, { 
          error: `Could not drop type: ${e.message}`,
          skipped: true
        })
      }
    }

    // Step 3: Verify clean state
    try {
      // Try to count remaining tables
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: remainingTables, error: tablesError } = await (supabase as any)
        .rpc('exec_sql', {
          sql_query: `
            SELECT count(*) as table_count 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_type = 'BASE TABLE';
          `
        })

      if (!tablesError && remainingTables) {
        addStep('Verify clean state', true, { 
          remaining_tables: remainingTables[0]?.table_count || 'unknown'
        })
      } else {
        addStep('Verify clean state', false, { error: tablesError?.message })
      }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e: any) {
      addStep('Verify clean state', false, { error: e.message })
    }

    // Determine overall success
    const failedSteps = resetLog.steps.filter(s => !s.success && !s.details?.skipped)
    resetLog.success = failedSteps.length === 0

    return NextResponse.json({
      success: resetLog.success,
      message: resetLog.success ? 
        'Database reset completed - ready for clean schema deployment' :
        'Database reset completed with some errors - review log',
      resetLog,
      next_step: 'Deploy clean primary school schema'
    })

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      resetLog: null,
      next_step: 'Fix reset errors before proceeding'
    }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'Database Reset API - Use POST method to execute reset',
    warning: 'This will delete all existing tables and data',
    required_permissions: 'service_role'
  })
}
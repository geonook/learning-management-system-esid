import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

/**
 * Database Connection Test API
 * Tests both regular client and service role client connections
 */
export async function GET(request: NextRequest) {
  const results = {
    timestamp: new Date().toISOString(),
    tests: {
      regular_client: { status: 'pending', details: null as any },
      service_role_client: { status: 'pending', details: null as any },
      basic_write_test: { status: 'pending', details: null as any }
    },
    environment: {
      NODE_ENV: process.env.NODE_ENV,
      has_supabase_url: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      has_anon_key: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      has_service_key: !!process.env.SUPABASE_SERVICE_ROLE_KEY
    },
    recommendations: [] as string[]
  }

  // Test 1: Regular client connection
  try {
    const supabase = createClient()
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1)
    
    if (error) {
      results.tests.regular_client = {
        status: 'failed',
        details: { error: error.message, code: error.code }
      }
    } else {
      results.tests.regular_client = {
        status: 'success',
        details: { message: 'Regular client connection successful' }
      }
    }
  } catch (error: any) {
    results.tests.regular_client = {
      status: 'error',
      details: { error: error.message }
    }
  }

  // Test 2: Service role client connection
  try {
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      results.tests.service_role_client = {
        status: 'failed',
        details: { error: 'SUPABASE_SERVICE_ROLE_KEY not configured' }
      }
      results.recommendations.push('Add SUPABASE_SERVICE_ROLE_KEY to .env.local')
    } else {
      const serviceSupabase = createServiceRoleClient()
      const { data, error } = await serviceSupabase
        .from('users')
        .select('count')
        .limit(1)
      
      if (error) {
        results.tests.service_role_client = {
          status: 'failed', 
          details: { error: error.message, code: error.code }
        }
      } else {
        results.tests.service_role_client = {
          status: 'success',
          details: { message: 'Service role client connection successful' }
        }
      }
    }
  } catch (error: any) {
    results.tests.service_role_client = {
      status: 'error',
      details: { error: error.message }
    }
  }

  // Test 3: Basic write test (if service role works)
  if (results.tests.service_role_client.status === 'success') {
    try {
      const serviceSupabase = createServiceRoleClient()
      
      // Try to insert a test user
      const testUser = {
        id: '00000000-0000-0000-0000-000000000001', // Test UUID
        email: `test-${Date.now()}@test.local`,
        full_name: 'Database Test User',
        role: 'admin' as const,
        is_active: false // Mark as test data
      }
      
      const { data, error } = await serviceSupabase
        .from('users')
        .upsert(testUser, { onConflict: 'id' })
        .select()
      
      if (error) {
        results.tests.basic_write_test = {
          status: 'failed',
          details: { 
            error: error.message, 
            code: error.code,
            hint: error.hint 
          }
        }
        
        // Analyze common errors
        if (error.code === '42P01') {
          results.recommendations.push('Table "users" does not exist - run primary_school_clean_schema.sql')
        } else if (error.code === '42501') {
          results.recommendations.push('Insufficient permissions - check service role key')
        } else if (error.message.includes('RLS')) {
          results.recommendations.push('RLS policies may be blocking service role - check schema deployment')
        }
      } else {
        results.tests.basic_write_test = {
          status: 'success',
          details: { 
            message: 'Successfully wrote test data to database',
            inserted_count: data?.length || 0
          }
        }
        
        // Clean up test data
        await serviceSupabase
          .from('users')
          .delete()
          .eq('id', testUser.id)
      }
    } catch (error: any) {
      results.tests.basic_write_test = {
        status: 'error',
        details: { error: error.message }
      }
    }
  } else {
    results.tests.basic_write_test = {
      status: 'skipped',
      details: { reason: 'Service role client not available' }
    }
  }

  // Add recommendations based on results
  if (!results.environment.has_service_key) {
    results.recommendations.push('Configure SUPABASE_SERVICE_ROLE_KEY in .env.local for CSV imports to work')
  }
  
  if (results.tests.regular_client.status === 'failed' && results.tests.service_role_client.status === 'failed') {
    results.recommendations.push('Check Supabase URL and keys - both clients failed')
  }

  // Determine overall status
  const overallStatus = 
    results.tests.basic_write_test.status === 'success' ? 'ready_for_import' :
    results.tests.service_role_client.status === 'success' ? 'needs_schema' :
    results.tests.regular_client.status === 'success' ? 'needs_service_key' :
    'connection_failed'

  return NextResponse.json({
    overall_status: overallStatus,
    ...results
  }, { 
    status: overallStatus === 'ready_for_import' ? 200 : 500 
  })
}

export async function POST() {
  return NextResponse.json(
    { message: 'Use GET method to test database connections' },
    { status: 405 }
  )
}
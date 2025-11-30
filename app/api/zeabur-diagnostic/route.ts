import { NextRequest, NextResponse } from 'next/server'

/**
 * Zeabur Supabase Diagnostic API
 * Helps identify the correct configuration for self-hosted Supabase on Zeabur
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function GET(_request: NextRequest) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const diagnostics = {
    timestamp: new Date().toISOString(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    zeabur_detection: {} as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    environment_analysis: {} as any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    connection_attempts: {} as any,
    recommendations: [] as string[]
  }

  // Analyze current environment variables
  const urlAnalysis = {
    is_zeabur_domain: process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('zeabur.app') || false,
    is_localhost: process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('localhost') || false,
    is_supabase_cloud: process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('supabase.co') || false,
    detected_pattern: process.env.NEXT_PUBLIC_SUPABASE_URL ? 
      (process.env.NEXT_PUBLIC_SUPABASE_URL.includes('zeabur.app') ? 'ZEABUR_SELF_HOSTED' :
       process.env.NEXT_PUBLIC_SUPABASE_URL.includes('supabase.co') ? 'SUPABASE_CLOUD' :
       process.env.NEXT_PUBLIC_SUPABASE_URL.includes('localhost') ? 'LOCAL_DEVELOPMENT' : 'UNKNOWN') : 'NO_URL'
  }

  diagnostics.environment_analysis = {
    NODE_ENV: process.env.NODE_ENV,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT_SET',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 
      `${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.substring(0, 10)}...` : 'NOT_SET',
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY ? 
      `${process.env.SUPABASE_SERVICE_ROLE_KEY.substring(0, 10)}...` : 'NOT_SET',
    
    // Check for common Zeabur environment patterns
    ZEABUR_ENVIRONMENT: process.env.ZEABUR_ENVIRONMENT || 'NOT_DETECTED',
    DATABASE_URL: process.env.DATABASE_URL ? 'PRESENT' : 'NOT_SET',
    
    // Analyze URL pattern
    url_analysis: urlAnalysis
  }

  // Zeabur specific detection
  diagnostics.zeabur_detection = {
    deployment_type: urlAnalysis.detected_pattern,
    expected_config_location: urlAnalysis.detected_pattern === 'ZEABUR_SELF_HOSTED' ? 
      'Zeabur Console > Kong Service > Environment Variables' : 'Unknown',
    
    // Check JWT token patterns
    anon_key_analysis: {
      present: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      format_valid: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.startsWith('eyJ') || false,
      estimated_length: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.length || 0
    },
    service_key_analysis: {
      present: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
      format_valid: process.env.SUPABASE_SERVICE_ROLE_KEY?.startsWith('eyJ') || false,
      estimated_length: process.env.SUPABASE_SERVICE_ROLE_KEY?.length || 0
    }
  }

  // Connection test attempts
  try {
    // Try to decode JWT tokens to validate format
    if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      try {
        const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        if (!anonKey) throw new Error('No anon key')
        
        const keyParts = anonKey.split('.')
        if (keyParts.length !== 3) throw new Error('Invalid JWT format')
        
        const base64Payload = keyParts[1]
        if (!base64Payload) throw new Error('Missing JWT payload')
        
        const anonPayload = JSON.parse(
          Buffer.from(base64Payload, 'base64').toString()
        )
        diagnostics.connection_attempts.anon_jwt_decode = {
          success: true,
          role: anonPayload.role,
          iss: anonPayload.iss
        }
      } catch (e) {
        diagnostics.connection_attempts.anon_jwt_decode = {
          success: false,
          error: 'Invalid JWT format'
        }
      }
    }

    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      try {
        const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
        if (!serviceKey) throw new Error('No service key')
        
        const keyParts = serviceKey.split('.')
        if (keyParts.length !== 3) throw new Error('Invalid JWT format')
        
        const base64Payload = keyParts[1]
        if (!base64Payload) throw new Error('Missing JWT payload')
        
        const servicePayload = JSON.parse(
          Buffer.from(base64Payload, 'base64').toString()
        )
        diagnostics.connection_attempts.service_jwt_decode = {
          success: true,
          role: servicePayload.role,
          iss: servicePayload.iss
        }
      } catch (e) {
        diagnostics.connection_attempts.service_jwt_decode = {
          success: false,
          error: 'Invalid JWT format'
        }
      }
    }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    diagnostics.connection_attempts.jwt_analysis_error = error.message
  }

  // Generate recommendations
  if (urlAnalysis.detected_pattern === 'ZEABUR_SELF_HOSTED') {
    diagnostics.recommendations.push('✅ Zeabur self-hosted Supabase detected')
    
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      diagnostics.recommendations.push('🚨 CRITICAL: Get Service Role Key from Zeabur Console > Kong Service > Environment Variables')
    } else if (!diagnostics.zeabur_detection.service_key_analysis.format_valid) {
      diagnostics.recommendations.push('⚠️ Service Role Key format invalid - should start with "eyJ"')
    }
    
    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      diagnostics.recommendations.push('🚨 CRITICAL: Get Anon Key from Zeabur Console > Kong Service > Environment Variables')
    } else if (!diagnostics.zeabur_detection.anon_key_analysis.format_valid) {
      diagnostics.recommendations.push('⚠️ Anon Key format invalid - should start with "eyJ"')
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const serviceJwtDecode = (diagnostics.connection_attempts as any).service_jwt_decode
    if (serviceJwtDecode?.success && serviceJwtDecode?.role !== 'service_role') {
      diagnostics.recommendations.push('⚠️ Service Role Key may not have correct role permissions')
    }
  } else if (urlAnalysis.detected_pattern === 'SUPABASE_CLOUD') {
    diagnostics.recommendations.push('❓ Supabase Cloud detected, but you mentioned Zeabur deployment')
    diagnostics.recommendations.push('Check if URL should point to your Zeabur instance instead')
  } else {
    diagnostics.recommendations.push('❓ Could not detect deployment type')
    diagnostics.recommendations.push('Please verify NEXT_PUBLIC_SUPABASE_URL is correct')
  }

  return NextResponse.json({
    status: 'diagnostic_complete',
    ...diagnostics
  })
}

export async function POST() {
  return NextResponse.json(
    { message: 'Use GET method for Zeabur Supabase diagnostics' },
    { status: 405 }
  )
}
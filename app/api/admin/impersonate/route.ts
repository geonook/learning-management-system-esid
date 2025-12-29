import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

/**
 * Admin Impersonate API
 * Allows admins to generate a magic link to log in as another user
 * All impersonation actions are logged for audit purposes
 */
export async function POST(request: NextRequest) {
  try {
    // 1. Verify admin authentication
    const supabase = createServiceRoleClient()

    // Get the current user from the request
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.split(' ')[1]
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !currentUser) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // 2. Verify the current user is an admin
    const { data: adminUser, error: userError } = await supabase
      .from('users')
      .select('id, role, email, full_name')
      .eq('id', currentUser.id)
      .single()

    if (userError || !adminUser || adminUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can impersonate users' },
        { status: 403 }
      )
    }

    // 3. Get target user from request body
    const body = await request.json()
    const { targetUserId, targetEmail } = body

    if (!targetUserId && !targetEmail) {
      return NextResponse.json(
        { error: 'Either targetUserId or targetEmail is required' },
        { status: 400 }
      )
    }

    // 4. Find the target user
    let targetUserQuery = supabase
      .from('users')
      .select('id, email, full_name, role')

    if (targetUserId) {
      targetUserQuery = targetUserQuery.eq('id', targetUserId)
    } else if (targetEmail) {
      targetUserQuery = targetUserQuery.eq('email', targetEmail)
    }

    const { data: targetUser, error: targetError } = await targetUserQuery.single()

    if (targetError || !targetUser) {
      return NextResponse.json(
        { error: 'Target user not found' },
        { status: 404 }
      )
    }

    // 5. Generate magic link using Supabase Admin API
    const supabaseAdmin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: linkData, error: linkError } = await supabaseAdmin.auth.admin.generateLink({
      type: 'magiclink',
      email: targetUser.email,
      options: {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/dashboard`
      }
    })

    if (linkError) {
      console.error('Failed to generate magic link:', linkError)
      return NextResponse.json(
        { error: 'Failed to generate impersonation link', details: linkError.message },
        { status: 500 }
      )
    }

    // 6. Log the impersonation action
    await supabase.from('admin_audit_logs').insert({
      admin_id: adminUser.id,
      action: 'impersonate',
      target_user_id: targetUser.id,
      metadata: {
        admin_email: adminUser.email,
        admin_name: adminUser.full_name,
        target_email: targetUser.email,
        target_name: targetUser.full_name,
        target_role: targetUser.role,
        timestamp: new Date().toISOString(),
        user_agent: request.headers.get('user-agent')
      }
    })

    // 7. Return the magic link
    return NextResponse.json({
      success: true,
      message: `Impersonation link generated for ${targetUser.email}`,
      url: linkData.properties.action_link,
      targetUser: {
        id: targetUser.id,
        email: targetUser.email,
        name: targetUser.full_name,
        role: targetUser.role
      }
    })

  } catch (error) {
    console.error('Impersonate API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * Get audit logs for impersonation actions
 * Only accessible by admins
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = createServiceRoleClient()

    // Get the current user from the request
    const authHeader = request.headers.get('authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing authorization header' },
        { status: 401 }
      )
    }

    const token = authHeader.split(' ')[1]
    const { data: { user: currentUser }, error: authError } = await supabase.auth.getUser(token)

    if (authError || !currentUser) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      )
    }

    // Verify the current user is an admin
    const { data: adminUser, error: userError } = await supabase
      .from('users')
      .select('id, role')
      .eq('id', currentUser.id)
      .single()

    if (userError || !adminUser || adminUser.role !== 'admin') {
      return NextResponse.json(
        { error: 'Only admins can view audit logs' },
        { status: 403 }
      )
    }

    // Get audit logs
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    const { data: logs, error: logsError } = await supabase
      .from('admin_audit_logs')
      .select('*')
      .eq('action', 'impersonate')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (logsError) {
      return NextResponse.json(
        { error: 'Failed to fetch audit logs' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      logs,
      pagination: {
        limit,
        offset
      }
    })

  } catch (error) {
    console.error('Audit logs API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

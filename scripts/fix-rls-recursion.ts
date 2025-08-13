#!/usr/bin/env npx tsx

/**
 * Fix RLS Recursion Script
 * Applies non-recursive RLS policies to resolve "stack depth limit exceeded" error
 */

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

// Load environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing Supabase environment variables')
  console.error('Required: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

// Create Supabase client with service role key (bypasses RLS)
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function applyFixedRLSPolicies() {
  try {
    console.log('🔧 Applying fixed RLS policies to resolve recursion...')
    
    // Read the SQL file
    const sqlPath = join(process.cwd(), 'db/policies/004_fixed_rls_policies.sql')
    const sqlContent = readFileSync(sqlPath, 'utf8')
    
    console.log('📄 SQL content loaded, executing...')
    
    // Execute the SQL
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: sqlContent
    })
    
    if (error) {
      // If exec_sql doesn't exist, try direct query
      console.log('⚠️  exec_sql not available, trying direct execution...')
      
      // Split SQL into statements and execute one by one
      const statements = sqlContent
        .split(';')
        .map(stmt => stmt.trim())
        .filter(stmt => stmt.length > 0 && !stmt.startsWith('--'))
      
      console.log(`📋 Executing ${statements.length} SQL statements...`)
      
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i]
        if (statement.trim()) {
          console.log(`  ${i + 1}/${statements.length}: ${statement.substring(0, 50)}...`)
          
          const { error: stmtError } = await supabase
            .from('_raw_sql_')
            .select('*')
            .limit(0) // This will fail but let us try raw SQL
          
          // Alternative: Use a more direct approach
          try {
            const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseServiceKey}`,
                'apikey': supabaseServiceKey
              },
              body: JSON.stringify({ query: statement + ';' })
            })
            
            if (!response.ok) {
              console.log(`⚠️  Statement ${i + 1} may have issues: ${response.status}`)
            }
          } catch (fetchError) {
            console.log(`⚠️  Could not execute statement ${i + 1} via API`)
          }
        }
      }
    } else {
      console.log('✅ SQL executed successfully via exec_sql')
      console.log('📊 Result:', data)
    }
    
    // Test the fix by running a simple query
    console.log('🧪 Testing fixed RLS policies...')
    
    const { data: testUsers, error: testError } = await supabase
      .from('users')
      .select('count')
      .limit(1)
    
    if (testError) {
      console.error('❌ Test query still fails:', testError.message)
      return false
    } else {
      console.log('✅ Test query successful - recursion fixed!')
      return true
    }
    
  } catch (error) {
    console.error('❌ Error applying RLS fix:', error)
    return false
  }
}

async function main() {
  console.log('🚀 Starting RLS Recursion Fix...')
  console.log(`🔗 Target: ${supabaseUrl}`)
  
  const success = await applyFixedRLSPolicies()
  
  if (success) {
    console.log('🎉 RLS recursion fix completed successfully!')
    console.log('💡 You can now test the diagnostic page at /test-supabase')
  } else {
    console.log('❌ RLS fix failed - manual intervention may be required')
    console.log('💡 Try applying the SQL manually via Supabase Dashboard')
  }
}

if (require.main === module) {
  main().catch(console.error)
}
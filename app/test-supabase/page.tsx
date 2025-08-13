"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase/client'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default function TestSupabasePage() {
  const [testing, setTesting] = useState(false)
  const [results, setResults] = useState<any[]>([])

  const addResult = (test: string, status: 'success' | 'error', message: string, duration?: number) => {
    setResults(prev => [...prev, { test, status, message, duration, timestamp: new Date().toISOString() }])
  }

  const quickZeaburTest = async () => {
    setResults([])
    
    // Quick Zeabur ping test
    try {
      const start = Date.now()
      const response = await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL + '/rest/v1/', { 
        method: 'HEAD',
        headers: {
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''
        }
      })
      const duration = Date.now() - start
      
      if (response.ok) {
        addResult('🚀 Zeabur 快速測試', 'success', `Zeabur 連線正常 (${duration}ms)`, duration)
      } else {
        addResult('🚀 Zeabur 快速測試', 'error', `HTTP ${response.status}: ${response.statusText}`, duration)
      }
    } catch (err: any) {
      addResult('🚀 Zeabur 快速測試', 'error', `Zeabur 連線失敗: ${err.message}`)
    }
    
    // Quick database test
    try {
      const start = Date.now()
      const { error } = await supabase.from('users').select('count').limit(1)
      const duration = Date.now() - start
      
      if (error) {
        if (error.message.includes('stack depth limit')) {
          addResult('🔍 快速資料庫測試', 'error', `RLS 遞迴問題仍存在`, duration)
        } else {
          addResult('🔍 快速資料庫測試', 'error', `資料庫錯誤: ${error.message}`, duration)
        }
      } else {
        const status = duration < 500 ? 'success' : 'error'
        const message = duration < 500 
          ? `資料庫查詢正常 (${duration}ms - 良好)` 
          : `資料庫查詢緩慢 (${duration}ms - 需要調查)`
        addResult('🔍 快速資料庫測試', status, message, duration)
      }
    } catch (err: any) {
      addResult('🔍 快速資料庫測試', 'error', `資料庫測試失敗: ${err.message}`)
    }
  }

  const runTests = async () => {
    setTesting(true)
    setResults([])

    // Test 0: Zeabur Network Latency
    try {
      const start = Date.now()
      // Simple ping test to Zeabur endpoint
      const response = await fetch(process.env.NEXT_PUBLIC_SUPABASE_URL + '/health', { 
        method: 'HEAD',
        cache: 'no-cache'
      })
      const duration = Date.now() - start
      addResult('🌐 Zeabur 網路延遲', 'success', `網路往返時間: ${duration}ms`, duration)
    } catch (err: any) {
      addResult('🌐 Zeabur 網路延遲', 'error', `網路連接失敗: ${err.message}`)
    }

    // Test 1: Basic connection with RLS status check
    try {
      const start = Date.now()
      const { data, error } = await supabase.from('users').select('count').limit(1)
      const duration = Date.now() - start
      
      if (error) {
        if (error.message.includes('stack depth limit')) {
          addResult('🔒 基本連接 (RLS檢查)', 'error', `RLS 遞迴尚未修復: ${error.message}`, duration)
        } else {
          addResult('🔒 基本連接 (RLS檢查)', 'error', `連接失敗: ${error.message}`, duration)
        }
      } else {
        addResult('🔒 基本連接 (RLS檢查)', 'success', `連接成功 - RLS 問題已解決`, duration)
      }
    } catch (err: any) {
      addResult('🔒 基本連接 (RLS檢查)', 'error', `例外錯誤: ${err.message}`)
    }

    // Test 2: Auth test
    try {
      const start = Date.now()
      const { data, error } = await supabase.auth.getSession()
      const duration = Date.now() - start
      
      if (error) {
        addResult('身份驗證服務', 'error', `Auth 錯誤: ${error.message}`, duration)
      } else {
        addResult('身份驗證服務', 'success', `Auth 服務正常`, duration)
      }
    } catch (err: any) {
      addResult('身份驗證服務', 'error', `Auth 例外: ${err.message}`)
    }

    // Test 3: Test login with demo account
    try {
      const start = Date.now()
      const { data, error } = await supabase.auth.signInWithPassword({
        email: 'teacher.lt@esid.edu',
        password: 'teacher123'
      })
      const duration = Date.now() - start
      
      if (error) {
        addResult('測試登入', 'error', `登入失敗: ${error.message}`, duration)
      } else {
        addResult('測試登入', 'success', `登入成功`, duration)
        
        // Sign out immediately
        await supabase.auth.signOut()
        addResult('測試登出', 'success', '登出成功')
      }
    } catch (err: any) {
      addResult('測試登入', 'error', `登入例外: ${err.message}`)
    }

    // Test 4: RLS Status Check (verify it's disabled)
    try {
      const start = Date.now()
      // Check if we can query system tables to see RLS status
      const { data: rlsData, error: rlsError } = await supabase
        .from('pg_class')
        .select('relname, relrowsecurity')
        .in('relname', ['users', 'classes', 'courses', 'students', 'exams', 'scores'])
      const duration = Date.now() - start
      
      if (rlsError) {
        addResult('🔐 RLS 狀態檢查', 'error', `無法檢查 RLS 狀態: ${rlsError.message}`, duration)
      } else {
        const enabledTables = rlsData?.filter(table => table.relrowsecurity) || []
        if (enabledTables.length > 0) {
          addResult('🔐 RLS 狀態檢查', 'error', `仍有 ${enabledTables.length} 個表格啟用 RLS: ${enabledTables.map(t => t.relname).join(', ')}`, duration)
        } else {
          addResult('🔐 RLS 狀態檢查', 'success', `RLS 已在所有表格停用`, duration)
        }
      }
    } catch (err: any) {
      addResult('🔐 RLS 狀態檢查', 'error', `RLS 檢查例外: ${err.message}`)
    }

    // Test 5: Multiple table query performance
    try {
      const start = Date.now()
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name, role')
        .limit(5)
      const duration = Date.now() - start
      
      if (error) {
        addResult('📊 資料庫查詢性能', 'error', `查詢錯誤: ${error.message}`, duration)
      } else {
        const status = duration < 200 ? 'success' : 'error'
        const message = duration < 200 
          ? `查詢成功，找到 ${data?.length || 0} 條記錄 (快速)` 
          : `查詢成功但緩慢，找到 ${data?.length || 0} 條記錄 (需優化)`
        addResult('📊 資料庫查詢性能', status, message, duration)
      }
    } catch (err: any) {
      addResult('📊 資料庫查詢性能', 'error', `查詢例外: ${err.message}`)
    }

    // Test 6: Zeabur specific - Resource usage check
    try {
      const start = Date.now()
      // Test multiple rapid queries to see if there's throttling
      const promises = Array.from({ length: 3 }, () => 
        supabase.from('users').select('count').limit(1)
      )
      const results = await Promise.all(promises)
      const duration = Date.now() - start
      
      const allSuccessful = results.every(result => !result.error)
      if (allSuccessful) {
        addResult('⚡ Zeabur 資源測試', 'success', `並發查詢成功 (${duration}ms for 3 queries)`, duration)
      } else {
        addResult('⚡ Zeabur 資源測試', 'error', `並發查詢部分失敗`, duration)
      }
    } catch (err: any) {
      addResult('⚡ Zeabur 資源測試', 'error', `資源測試失敗: ${err.message}`)
    }

    setTesting(false)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Zeabur Supabase 連接診斷</h1>
        <div className="space-x-2">
          <Button onClick={quickZeaburTest} variant="outline">
            🚀 快速測試
          </Button>
          <Button onClick={runTests} disabled={testing}>
            {testing ? <LoadingSpinner size="sm" className="mr-2" /> : null}
            {testing ? '測試中...' : '完整診斷'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>連接配置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div><strong>🌐 Zeabur URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL}</div>
          <div><strong>🔑 Anon Key:</strong> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20)}...</div>
          <div><strong>🧪 Mock Auth:</strong> {process.env.NEXT_PUBLIC_USE_MOCK_AUTH || 'false'}</div>
          <div><strong>🚀 Platform:</strong> Zeabur 託管 Supabase</div>
          <div className="text-sm text-muted-foreground mt-2">
            注意：Zeabur 託管可能有網路延遲或資源限制
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>測試結果</CardTitle>
        </CardHeader>
        <CardContent>
          {results.length === 0 ? (
            <p className="text-muted-foreground">點擊「開始測試」來診斷 Supabase 連接</p>
          ) : (
            <div className="space-y-3">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 rounded border ${
                    result.status === 'success' 
                      ? 'border-green-200 bg-green-50 text-green-800' 
                      : 'border-red-200 bg-red-50 text-red-800'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="font-medium">{result.test}</div>
                    <div className="text-sm">
                      {result.duration && `${result.duration}ms`}
                    </div>
                  </div>
                  <div className="text-sm mt-1">{result.message}</div>
                  <div className="text-xs opacity-60">{new Date(result.timestamp).toLocaleString()}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
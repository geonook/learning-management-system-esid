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

  const runTests = async () => {
    setTesting(true)
    setResults([])

    // Test 1: Basic connection
    try {
      const start = Date.now()
      const { data, error } = await supabase.from('users').select('count').limit(1)
      const duration = Date.now() - start
      
      if (error) {
        addResult('基本連接', 'error', `連接失敗: ${error.message}`, duration)
      } else {
        addResult('基本連接', 'success', `連接成功`, duration)
      }
    } catch (err: any) {
      addResult('基本連接', 'error', `例外錯誤: ${err.message}`)
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

    // Test 4: Database query performance
    try {
      const start = Date.now()
      const { data, error } = await supabase
        .from('users')
        .select('id, email, full_name, role')
        .limit(5)
      const duration = Date.now() - start
      
      if (error) {
        addResult('資料庫查詢', 'error', `查詢錯誤: ${error.message}`, duration)
      } else {
        addResult('資料庫查詢', 'success', `查詢成功，找到 ${data?.length || 0} 條記錄`, duration)
      }
    } catch (err: any) {
      addResult('資料庫查詢', 'error', `查詢例外: ${err.message}`)
    }

    setTesting(false)
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Supabase 連接診斷</h1>
        <Button onClick={runTests} disabled={testing}>
          {testing ? <LoadingSpinner size="sm" className="mr-2" /> : null}
          {testing ? '測試中...' : '開始測試'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>連接配置</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div><strong>URL:</strong> {process.env.NEXT_PUBLIC_SUPABASE_URL}</div>
          <div><strong>Anon Key:</strong> {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20)}...</div>
          <div><strong>Mock Auth:</strong> {process.env.NEXT_PUBLIC_USE_MOCK_AUTH || 'false'}</div>
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
"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { supabase } from '@/lib/supabase/client'
import { LoadingSpinner } from '@/components/ui/loading-spinner'
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react'

export default function SuperDiagnosticPage() {
  const [testing, setTesting] = useState(false)
  const [currentTest, setCurrentTest] = useState('')
  const [results, setResults] = useState<any[]>([])

  const addResult = (test: string, status: 'success' | 'error' | 'timeout', message: string, duration?: number) => {
    setResults(prev => [...prev, { test, status, message, duration, timestamp: new Date().toISOString() }])
  }

  const testWithTimeout = async (testName: string, testFunction: () => Promise<any>, timeoutMs = 10000) => {
    setCurrentTest(testName)
    const start = Date.now()
    
    try {
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('測試超時')), timeoutMs)
      )
      
      const result = await Promise.race([testFunction(), timeoutPromise])
      const duration = Date.now() - start
      
      if (result.error) {
        addResult(testName, 'error', `錯誤: ${result.error.message}`, duration)
      } else {
        addResult(testName, 'success', `成功 (${result.count || 'OK'})`, duration)
      }
    } catch (error: any) {
      const duration = Date.now() - start
      if (error.message === '測試超時') {
        addResult(testName, 'timeout', `超時 (>${timeoutMs}ms)`, duration)
      } else {
        addResult(testName, 'error', `例外: ${error.message}`, duration)
      }
    }
  }

  const runSuperBasicTests = async () => {
    setTesting(true)
    setCurrentTest('')
    setResults([])

    // 測試 1: 最基本的系統查詢（不涉及業務表）
    await testWithTimeout(
      '🔧 系統狀態查詢',
      async () => await supabase.from('users').select('*', { count: 'exact', head: true }),
      5000
    )

    // 測試 2: 檢查表格存在性（業務表測試）
    await testWithTimeout(
      '📋 檢查表格存在性',
      async () => await supabase.from('classes').select('*', { count: 'exact', head: true }),
      5000
    )

    // 測試 3: 檢查課程表狀態
    await testWithTimeout(
      '🔒 檢查課程表狀態',
      async () => await supabase.from('courses').select('*', { count: 'exact', head: true }),
      5000
    )

    // 測試 4: 檢查學生表狀態
    await testWithTimeout(
      '📜 檢查學生表狀態',
      async () => await supabase.from('students').select('*', { count: 'exact', head: true }),
      5000
    )

    // 測試 5: 用戶表基本查詢
    await testWithTimeout(
      '👤 用戶表 count 查詢',
      async () => await supabase.from('users').select('*', { count: 'exact', head: true }),
      8000
    )

    // 測試 6: 班級表基本查詢
    await testWithTimeout(
      '🏫 班級表 count 查詢',
      async () => await supabase.from('classes').select('*', { count: 'exact', head: true }),
      8000
    )

    // 測試 7: 課程表基本查詢
    await testWithTimeout(
      '📚 課程表 count 查詢',
      async () => await supabase.from('courses').select('*', { count: 'exact', head: true }),
      8000
    )

    // 測試 8: 學生表基本查詢
    await testWithTimeout(
      '🎓 學生表 count 查詢',
      async () => await supabase.from('students').select('*', { count: 'exact', head: true }),
      8000
    )

    // 測試 9: 考試表基本查詢
    await testWithTimeout(
      '📝 考試表 count 查詢',
      async () => await supabase.from('exams').select('*', { count: 'exact', head: true }),
      8000
    )

    // 測試 10: 分數表基本查詢
    await testWithTimeout(
      '📊 分數表 count 查詢',
      async () => await supabase.from('scores').select('*', { count: 'exact', head: true }),
      8000
    )

    setCurrentTest('')
    setTesting(false)
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-600" />
      case 'timeout':
        return <AlertTriangle className="h-4 w-4 text-orange-600" />
      default:
        return null
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'border-green-200 bg-green-50 text-green-800'
      case 'error':
        return 'border-red-200 bg-red-50 text-red-800'
      case 'timeout':
        return 'border-orange-200 bg-orange-50 text-orange-800'
      default:
        return 'border-gray-200 bg-gray-50 text-gray-800'
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">超級基礎診斷</h1>
        <div className="space-x-2">
          <Button onClick={runSuperBasicTests} disabled={testing}>
            {testing ? <LoadingSpinner size="sm" className="mr-2" /> : null}
            {testing ? '診斷中...' : '開始超級診斷'}
          </Button>
          <Button asChild variant="outline">
            <a href="/test-supabase">返回標準診斷</a>
          </Button>
        </div>
      </div>

      <Card className="border-blue-200 bg-blue-50">
        <CardHeader>
          <CardTitle>🎯 診斷目標</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-blue-800">
            這個超級基礎診斷會逐步測試每個表格和系統組件，幫助我們精確找出哪個部分導致 RLS 遞迴問題。
            每個測試都有 10 秒超時保護，避免無限等待。
          </p>
        </CardContent>
      </Card>

      {testing && currentTest && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <LoadingSpinner size="sm" />
              <span className="text-sm font-medium">正在測試: {currentTest}</span>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>測試結果</CardTitle>
        </CardHeader>
        <CardContent>
          {results.length === 0 ? (
            <p className="text-muted-foreground">點擊「開始超級診斷」來進行逐步測試</p>
          ) : (
            <div className="space-y-3">
              {results.map((result, index) => (
                <div
                  key={index}
                  className={`p-3 rounded border ${getStatusColor(result.status)}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(result.status)}
                      <div className="font-medium">{result.test}</div>
                    </div>
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

      <Card>
        <CardHeader>
          <CardTitle>📊 診斷說明</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div><strong>🔧 系統狀態查詢</strong> - 測試 Users 表基本連接</div>
            <div><strong>📋 檢查表格存在性</strong> - 確認 Classes 表正常</div>
            <div><strong>🔒 檢查課程表狀態</strong> - 驗證 Courses 表功能</div>
            <div><strong>📜 檢查學生表狀態</strong> - 確認 Students 表正常</div>
            <div><strong>👤-📊 各業務表測試</strong> - 完整測試所有核心表格</div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
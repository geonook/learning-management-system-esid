"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { supabase } from "@/lib/supabase/client"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"

export default function TestConnectionPage() {
  const [isConnecting, setIsConnecting] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMessage, setErrorMessage] = useState('')
  const [dbInfo, setDbInfo] = useState<any>(null)

  const testConnection = async () => {
    setIsConnecting(true)
    setConnectionStatus('idle')
    setErrorMessage('')
    setDbInfo(null)

    try {
      // Test basic connection
      const { data, error } = await supabase
        .from('assessment_codes')
        .select('code, category')
        .limit(5)

      if (error) {
        throw error
      }

      setDbInfo(data)
      setConnectionStatus('success')
    } catch (error: any) {
      console.error('Supabase connection error:', error)
      setErrorMessage(error.message || 'Unknown connection error')
      setConnectionStatus('error')
    } finally {
      setIsConnecting(false)
    }
  }

  useEffect(() => {
    // Auto-test connection on load
    testConnection()
  }, [])

  return (
    <div className="container max-w-2xl mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Zeabur Supabase 連接測試
            {connectionStatus === 'success' && <CheckCircle className="h-5 w-5 text-green-500" />}
            {connectionStatus === 'error' && <XCircle className="h-5 w-5 text-red-500" />}
            {isConnecting && <Loader2 className="h-5 w-5 animate-spin" />}
          </CardTitle>
          <CardDescription>
            測試與 Zeabur 上的 Supabase 實例的連接狀態
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>Supabase URL:</span>
              <Badge variant="outline">{process.env.NEXT_PUBLIC_SUPABASE_URL}</Badge>
            </div>
            <div className="flex justify-between">
              <span>Anon Key:</span>
              <Badge variant="outline">
                {process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.substring(0, 20)}...
              </Badge>
            </div>
          </div>

          <Button 
            onClick={testConnection} 
            disabled={isConnecting}
            className="w-full"
          >
            {isConnecting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                連接中...
              </>
            ) : (
              '重新測試連接'
            )}
          </Button>

          {connectionStatus === 'success' && (
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h3 className="font-medium text-green-800 mb-2">✅ 連接成功！</h3>
              <p className="text-sm text-green-600">
                成功從 assessment_codes 表讀取數據
              </p>
              {dbInfo && (
                <div className="mt-2">
                  <p className="text-xs text-green-500">
                    查詢結果：{JSON.stringify(dbInfo, null, 2)}
                  </p>
                </div>
              )}
            </div>
          )}

          {connectionStatus === 'error' && (
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <h3 className="font-medium text-red-800 mb-2">❌ 連接失敗</h3>
              <p className="text-sm text-red-600 mb-2">
                無法連接到 Zeabur Supabase 實例
              </p>
              <code className="text-xs text-red-500 bg-red-100 p-2 rounded block">
                {errorMessage}
              </code>
            </div>
          )}

          <div className="text-sm text-muted-foreground space-y-1">
            <p><strong>檢查項目：</strong></p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>環境變數配置</li>
              <li>Supabase 服務狀態</li>
              <li>資料庫表結構</li>
              <li>網路連接性</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

export default function ZeaburAlternativesPage() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Zeabur Supabase 替代方案</h1>
        <Button asChild variant="outline">
          <Link href="/test-supabase">
            返回診斷
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>🐌 Zeabur Supabase 性能問題</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <strong>已知問題：</strong>
            <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
              <li>查詢響應時間超過 1000ms（預期應 &lt; 200ms）</li>
              <li>間歇性的網路延遲</li>
              <li>可能的資源限制（CPU/記憶體）</li>
              <li>共享實例的性能瓶頸</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>🏠 方案一：本地 Supabase</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm space-y-2">
              <p><strong>優點：</strong></p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>極快的響應時間（&lt; 50ms）</li>
                <li>完全控制資源</li>
                <li>開發階段免費</li>
                <li>離線開發能力</li>
              </ul>
              
              <p><strong>設置步驟：</strong></p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>安裝 Docker</li>
                <li>運行 <code className="bg-gray-100 px-1 rounded">npx supabase start</code></li>
                <li>更新 .env.local 指向本地實例</li>
                <li>執行資料庫遷移</li>
              </ol>
            </div>
            
            <div className="pt-2">
              <Button className="w-full" variant="outline">
                設置本地 Supabase
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>☁️ 方案二：官方 Supabase 雲端</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-sm space-y-2">
              <p><strong>優點：</strong></p>
              <ul className="list-disc list-inside space-y-1 text-xs">
                <li>官方支援和優化</li>
                <li>自動備份和擴展</li>
                <li>全球 CDN 網路</li>
                <li>專業級監控</li>
              </ul>
              
              <p><strong>設置步驟：</strong></p>
              <ol className="list-decimal list-inside space-y-1 text-xs">
                <li>前往 supabase.com 創建專案</li>
                <li>匯出 Zeabur 資料</li>
                <li>匯入到新的官方實例</li>
                <li>更新環境變數</li>
              </ol>
            </div>
            
            <div className="pt-2">
              <Button className="w-full" variant="outline" asChild>
                <a href="https://supabase.com" target="_blank" rel="noopener noreferrer">
                  前往官方 Supabase
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>🔧 當前 Zeabur 優化嘗試</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm">
            <p><strong>可以嘗試的 Zeabur 優化：</strong></p>
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li><strong>重啟服務：</strong> 在 Zeabur Dashboard 重啟 Supabase 服務</li>
              <li><strong>檢查資源：</strong> 確認是否達到 CPU/記憶體限制</li>
              <li><strong>升級方案：</strong> 考慮升級到更高性能的 Zeabur 方案</li>
              <li><strong>區域設置：</strong> 確認 Zeabur 區域是否離您最近</li>
            </ol>
          </div>
          
          <div className="flex space-x-2 pt-2">
            <Button variant="outline" asChild>
              <a href="https://zeabur.com" target="_blank" rel="noopener noreferrer">
                Zeabur Dashboard
              </a>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/test-supabase">
                重新測試性能
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>🎯 建議的解決順序</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li><strong>先嘗試 Zeabur 優化：</strong> 重啟服務，檢查資源設置</li>
            <li><strong>如果仍然緩慢：</strong> 設置本地 Supabase 進行開發</li>
            <li><strong>正式部署時：</strong> 考慮遷移到官方 Supabase 雲端</li>
            <li><strong>長期考慮：</strong> 評估最適合的託管方案</li>
          </ol>
        </CardContent>
      </Card>
    </div>
  )
}
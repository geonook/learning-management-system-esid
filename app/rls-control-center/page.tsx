"use client"

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, Zap, Search, Settings, Copy } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

export default function RLSControlCenterPage() {
  const [copiedNuclear, setCopiedNuclear] = useState(false)

  const nuclearSQL = `-- NUCLEAR RLS RESET (最激進方案)
DO $$
DECLARE
    policy_record RECORD;
    table_record RECORD;
BEGIN
    -- 清除所有政策
    FOR policy_record IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;', 
            policy_record.policyname, 
            policy_record.schemaname, 
            policy_record.tablename);
    END LOOP;
    
    -- 停用所有 RLS
    FOR table_record IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY;', table_record.tablename);
    END LOOP;
END $$;

-- 授予基本權限
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;

SELECT '🚀 NUCLEAR RESET COMPLETE' as status;`

  const copyNuclearSQL = async () => {
    try {
      await navigator.clipboard.writeText(nuclearSQL)
      setCopiedNuclear(true)
      setTimeout(() => setCopiedNuclear(false), 2000)
    } catch (err) {
      console.error('複製失敗:', err)
    }
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">RLS 控制中心</h1>
        <p className="text-muted-foreground">
          Zeabur Supabase RLS 問題的完整診斷與修復解決方案
        </p>
      </div>

      {/* 問題狀態卡 */}
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-600" />
            當前問題狀態
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>網路延遲：</span>
              <span className="font-mono">269ms (可接受)</span>
            </div>
            <div className="flex justify-between">
              <span>資料庫查詢：</span>
              <span className="font-mono text-red-600">仍然卡住 ❌</span>
            </div>
            <div className="flex justify-between">
              <span>RLS 遞迴問題：</span>
              <span className="font-mono text-red-600">未完全解決 ❌</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 診斷工具 */}
      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              精密診斷工具
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              逐步測試每個表格和系統組件，精確找出問題所在
            </p>
            <div className="space-y-2">
              <Button asChild className="w-full" variant="outline">
                <Link href="/super-diagnostic">
                  🔍 超級基礎診斷
                </Link>
              </Button>
              <Button asChild className="w-full" variant="outline">
                <Link href="/test-supabase">
                  📊 標準診斷工具
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              修復工具
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              從溫和到激進的不同修復方案
            </p>
            <div className="space-y-2">
              <Button asChild className="w-full" variant="outline">
                <Link href="/fix-rls-complete">
                  🛠️ 完整 RLS 重置
                </Link>
              </Button>
              <Button asChild className="w-full" variant="outline">
                <Link href="/zeabur-alternatives">
                  🔄 替代方案指南
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 核子級修復方案 */}
      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-orange-600" />
            核子級修復方案（最後手段）
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-orange-800">
            <p className="font-medium mb-2">⚠️ 警告：這是最激進的修復方案</p>
            <p>如果所有其他方法都失敗，使用此方案將：</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>動態清除所有 RLS 政策（包括系統生成的）</li>
              <li>強制停用所有表格的 RLS</li>
              <li>重建基本權限結構</li>
              <li>清除所有相關函數和視圖</li>
            </ul>
          </div>
          
          <div className="flex gap-2">
            <Button onClick={copyNuclearSQL} size="sm" variant="outline">
              <Copy className="h-4 w-4 mr-1" />
              {copiedNuclear ? "已複製" : "複製核子級 SQL"}
            </Button>
            <Button asChild size="sm" variant="outline">
              <a 
                href="https://zeabur.com" 
                target="_blank" 
                rel="noopener noreferrer"
              >
                開啟 Zeabur Dashboard
              </a>
            </Button>
          </div>

          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-medium">
              點擊查看核子級 SQL 預覽
            </summary>
            <pre className="bg-gray-900 text-gray-100 p-3 rounded text-xs overflow-x-auto mt-2 whitespace-pre-wrap">
              {nuclearSQL}
            </pre>
          </details>
        </CardContent>
      </Card>

      {/* 使用建議 */}
      <Card>
        <CardHeader>
          <CardTitle>🎯 建議的解決順序</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal list-inside space-y-2 text-sm">
            <li>
              <strong>先執行超級基礎診斷：</strong>
              <Link href="/super-diagnostic" className="text-blue-600 hover:underline ml-1">
                精確找出問題表格
              </Link>
            </li>
            <li>
              <strong>如果診斷顯示特定表格有問題：</strong>
              手動針對該表格執行 DROP POLICY 和 DISABLE RLS
            </li>
            <li>
              <strong>如果問題持續存在：</strong>
              使用上方的核子級修復方案
            </li>
            <li>
              <strong>如果核子級方案仍無效：</strong>
              考慮切換到本地 Supabase 或官方雲端版本
            </li>
          </ol>
        </CardContent>
      </Card>

      {/* 快速操作 */}
      <div className="flex flex-wrap gap-2 justify-center">
        <Button asChild size="sm">
          <Link href="/super-diagnostic">
            🚀 開始超級診斷
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href="/test-supabase">
            🔄 重新測試
          </Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link href="/dashboard">
            🏠 返回主頁
          </Link>
        </Button>
      </div>
    </div>
  )
}
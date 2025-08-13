"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertTriangle, CheckCircle, Copy, ExternalLink } from 'lucide-react'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

export default function FixRLSCompletePage() {
  const [step, setStep] = useState(1)
  const [copied, setCopied] = useState(false)

  const sqlContent = `-- COMPLETE RLS RESET FOR ZEABUR SUPABASE
-- 清除所有 RLS 政策和停用所有表格的 RLS

-- 第一步：清除所有用戶表政策
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Head teachers can view users in their grade/track" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Admins can manage all users" ON users;
DROP POLICY IF EXISTS "users_own_profile" ON users;
DROP POLICY IF EXISTS "authenticated_read_users" ON users;
DROP POLICY IF EXISTS "admin_full_access" ON users;
DROP POLICY IF EXISTS "service_role_bypass" ON users;

-- 第二步：清除所有班級表政策
DROP POLICY IF EXISTS "Teachers can view their own classes" ON classes;
DROP POLICY IF EXISTS "Admins can view all classes" ON classes;
DROP POLICY IF EXISTS "Head teachers can view classes in their grade/track" ON classes;
DROP POLICY IF EXISTS "Admins can manage all classes" ON classes;
DROP POLICY IF EXISTS "Head teachers can manage classes in their grade/track" ON classes;
DROP POLICY IF EXISTS "authenticated_read_classes" ON classes;
DROP POLICY IF EXISTS "admin_full_access" ON classes;
DROP POLICY IF EXISTS "service_role_bypass" ON classes;
DROP POLICY IF EXISTS "head_grade_track_access" ON classes;

-- 第三步：清除所有課程表政策
DROP POLICY IF EXISTS "Teachers can view their own courses" ON courses;
DROP POLICY IF EXISTS "Admins can view all courses" ON courses;
DROP POLICY IF EXISTS "authenticated_read_courses" ON courses;
DROP POLICY IF EXISTS "admin_full_access" ON courses;
DROP POLICY IF EXISTS "service_role_bypass" ON courses;
DROP POLICY IF EXISTS "teachers_manage_own_courses" ON courses;
DROP POLICY IF EXISTS "teacher_own_courses" ON courses;

-- 第四步：清除所有學生表政策
DROP POLICY IF EXISTS "Teachers can view students in their classes" ON students;
DROP POLICY IF EXISTS "Admins can view all students" ON students;
DROP POLICY IF EXISTS "Head teachers can view students in their grade/track" ON students;
DROP POLICY IF EXISTS "Admins can manage all students" ON students;
DROP POLICY IF EXISTS "Head teachers can manage students in their grade/track" ON students;
DROP POLICY IF EXISTS "authenticated_read_students" ON students;
DROP POLICY IF EXISTS "admin_full_access" ON students;
DROP POLICY IF EXISTS "service_role_bypass" ON students;
DROP POLICY IF EXISTS "head_grade_track_access" ON students;
DROP POLICY IF EXISTS "teacher_course_students" ON students;

-- 第五步：清除所有考試表政策
DROP POLICY IF EXISTS "Teachers can view exams for their classes" ON exams;
DROP POLICY IF EXISTS "Teachers can manage exams for their classes" ON exams;
DROP POLICY IF EXISTS "Admins can view all exams" ON exams;
DROP POLICY IF EXISTS "Admins can manage all exams" ON exams;
DROP POLICY IF EXISTS "Head teachers can view exams in their grade/track" ON exams;
DROP POLICY IF EXISTS "authenticated_read_exams" ON exams;
DROP POLICY IF EXISTS "admin_full_access" ON exams;
DROP POLICY IF EXISTS "service_role_bypass" ON exams;
DROP POLICY IF EXISTS "teachers_manage_class_exams" ON exams;

-- 第六步：清除所有分數表政策
DROP POLICY IF EXISTS "Teachers can view scores for their classes" ON scores;
DROP POLICY IF EXISTS "Teachers can manage scores for their classes" ON scores;
DROP POLICY IF EXISTS "Admins can view all scores" ON scores;
DROP POLICY IF EXISTS "Admins can manage all scores" ON scores;
DROP POLICY IF EXISTS "Head teachers can view scores in their grade/track" ON scores;
DROP POLICY IF EXISTS "authenticated_read_scores" ON scores;
DROP POLICY IF EXISTS "admin_full_access" ON scores;
DROP POLICY IF EXISTS "service_role_bypass" ON scores;
DROP POLICY IF EXISTS "teachers_manage_student_scores" ON scores;

-- 第七步：清除評量表政策
DROP POLICY IF EXISTS "Teachers can view assessment titles for their classes" ON assessment_titles;
DROP POLICY IF EXISTS "Admins can manage all assessment titles" ON assessment_titles;
DROP POLICY IF EXISTS "Head teachers can manage assessment titles in their grade/track" ON assessment_titles;
DROP POLICY IF EXISTS "authenticated_read_assessment_titles" ON assessment_titles;
DROP POLICY IF EXISTS "admin_full_access" ON assessment_titles;
DROP POLICY IF EXISTS "service_role_bypass" ON assessment_titles;

-- 第八步：移除輔助函數
DROP FUNCTION IF EXISTS get_current_user_details();
DROP FUNCTION IF EXISTS is_admin();
DROP FUNCTION IF EXISTS is_head_teacher();
DROP FUNCTION IF EXISTS can_access_grade_track(INTEGER, track_type);
DROP FUNCTION IF EXISTS teaches_class(UUID);
DROP FUNCTION IF EXISTS get_current_user_id();
DROP FUNCTION IF EXISTS get_current_user_role_simple();
DROP FUNCTION IF EXISTS get_current_user_grade_track_simple();
DROP FUNCTION IF EXISTS get_user_role_from_jwt();
DROP FUNCTION IF EXISTS get_user_claims();

-- 第九步：移除問題視圖
DROP VIEW IF EXISTS student_scores_with_grades;
DROP VIEW IF EXISTS teacher_classes_view;

-- 第十步：完全停用所有表格的 RLS
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE exams DISABLE ROW LEVEL SECURITY;
ALTER TABLE scores DISABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_titles DISABLE ROW LEVEL SECURITY;

-- 處理評量代碼表（如果存在）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'assessment_codes') THEN
        ALTER TABLE assessment_codes DISABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- 驗證清理結果
SELECT 'RLS 完全重置完成 - 所有政策已清除，所有表格 RLS 已停用' AS status;`

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(sqlContent)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('複製失敗:', err)
    }
  }

  const steps = [
    {
      title: "準備階段",
      description: "確認您有 Zeabur Supabase Dashboard 的訪問權限",
      action: "開啟 Zeabur Dashboard 並找到您的 Supabase 實例"
    },
    {
      title: "開啟 SQL Editor", 
      description: "在 Supabase Dashboard 中開啟 SQL Editor",
      action: "點擊左側選單的 'SQL Editor'"
    },
    {
      title: "執行 SQL 重置",
      description: "複製並執行完整的 RLS 重置 SQL",
      action: "將下方 SQL 貼到編輯器中並執行"
    },
    {
      title: "驗證執行結果",
      description: "確認 SQL 執行成功無錯誤",
      action: "檢查執行結果顯示成功訊息"
    },
    {
      title: "測試修復效果",
      description: "返回診斷頁面測試資料庫查詢",
      action: "前往 /test-supabase 頁面重新測試"
    }
  ]

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">完整 RLS 重置指南</h1>
        <Button asChild variant="outline">
          <a href="/test-supabase">
            返回診斷頁面
          </a>
        </Button>
      </div>

      <Card className="border-orange-200 bg-orange-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            重要說明
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-orange-800">
            您之前的 SQL 修復沒有完全生效，導致測試仍然卡住。這個完整重置將徹底清除所有 RLS 政策和停用 RLS，
            解決遞迴問題。
          </p>
        </CardContent>
      </Card>

      {/* 步驟指引 */}
      <div className="space-y-4">
        {steps.map((stepInfo, index) => (
          <Card key={index} className={step === index + 1 ? "border-blue-500 bg-blue-50" : ""}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                  step > index + 1 ? "bg-green-500 text-white" : 
                  step === index + 1 ? "bg-blue-500 text-white" : "bg-gray-300 text-gray-600"
                }`}>
                  {step > index + 1 ? <CheckCircle className="h-4 w-4" /> : index + 1}
                </div>
                步驟 {index + 1}: {stepInfo.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-2">{stepInfo.description}</p>
              <p className="text-sm font-medium">{stepInfo.action}</p>
              {index + 1 === step && (
                <div className="mt-3">
                  <Button 
                    onClick={() => setStep(step + 1)} 
                    size="sm"
                    disabled={index === 2} // SQL 執行步驟需要手動確認
                  >
                    {index === 2 ? "執行完 SQL 後手動點擊下一步" : "下一步"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* SQL 內容 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            完整 RLS 重置 SQL
            <div className="space-x-2">
              <Button onClick={copyToClipboard} size="sm" variant="outline">
                <Copy className="h-4 w-4 mr-1" />
                {copied ? "已複製" : "複製 SQL"}
              </Button>
              <Button asChild size="sm" variant="outline">
                <a 
                  href="https://zeabur.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                >
                  <ExternalLink className="h-4 w-4 mr-1" />
                  Zeabur Dashboard
                </a>
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded text-xs overflow-x-auto whitespace-pre-wrap">
            {sqlContent}
          </pre>
        </CardContent>
      </Card>

      {/* 執行後驗證 */}
      <Card>
        <CardHeader>
          <CardTitle>執行後驗證步驟</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold mt-0.5">1</div>
            <div>
              <p className="font-medium">確認 SQL 執行成功</p>
              <p className="text-sm text-gray-600">應該看到「RLS 完全重置完成」的訊息</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold mt-0.5">2</div>
            <div>
              <p className="font-medium">重新測試診斷</p>
              <p className="text-sm text-gray-600">前往 /test-supabase 執行「快速測試」</p>
            </div>
          </div>
          <div className="flex items-start gap-2">
            <div className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs font-bold mt-0.5">3</div>
            <div>
              <p className="font-medium">驗證性能改善</p>
              <p className="text-sm text-gray-600">查詢時間應該大幅降低，不再卡住</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
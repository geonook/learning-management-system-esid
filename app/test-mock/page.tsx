"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CheckCircle, XCircle, Loader2 } from "lucide-react"

// Import the mock API functions instead of the problematic Supabase ones
import {
  getClasses, 
  getStudents, 
  getUsers, 
  getExams,
  getAssessmentCodes,
  getAcademicYears,
  Class, 
  Student, 
  User, 
  Exam 
} from "@/lib/api/mock-api"

export default function TestMockAPIPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<{
    classes?: Class[]
    students?: Student[]
    users?: User[]
    exams?: Exam[]
    assessmentCodes?: any[]
    academicYears?: string[]
    errors: string[]
  }>({ errors: [] })

  const testAllAPIs = async () => {
    setIsLoading(true)
    setResults({ errors: [] })

    const newResults: typeof results = { errors: [] }

    try {
      console.log('Testing Mock Classes API...')
      const classes = await getClasses('2024')
      newResults.classes = classes
      console.log('✅ Mock Classes API working:', classes.length, 'classes found')
    } catch (error: any) {
      console.error('❌ Mock Classes API error:', error)
      newResults.errors.push(`Classes API: ${error.message}`)
    }

    try {
      console.log('Testing Mock Students API...')
      const students = await getStudents()
      newResults.students = students
      console.log('✅ Mock Students API working:', students.length, 'students found')
    } catch (error: any) {
      console.error('❌ Mock Students API error:', error)
      newResults.errors.push(`Students API: ${error.message}`)
    }

    try {
      console.log('Testing Mock Users API...')
      const users = await getUsers()
      newResults.users = users
      console.log('✅ Mock Users API working:', users.length, 'users found')
    } catch (error: any) {
      console.error('❌ Mock Users API error:', error)
      newResults.errors.push(`Users API: ${error.message}`)
    }

    try {
      console.log('Testing Mock Exams API...')
      const exams = await getExams()
      newResults.exams = exams
      console.log('✅ Mock Exams API working:', exams.length, 'exams found')
    } catch (error: any) {
      console.error('❌ Mock Exams API error:', error)
      newResults.errors.push(`Exams API: ${error.message}`)
    }

    try {
      console.log('Testing Mock Assessment Codes API...')
      const codes = await getAssessmentCodes()
      newResults.assessmentCodes = codes
      console.log('✅ Mock Assessment Codes API working:', codes.length, 'codes found')
    } catch (error: any) {
      console.error('❌ Mock Assessment Codes API error:', error)
      newResults.errors.push(`Assessment Codes API: ${error.message}`)
    }

    try {
      console.log('Testing Mock Academic Years API...')
      const years = await getAcademicYears()
      newResults.academicYears = years
      console.log('✅ Mock Academic Years API working:', years.length, 'years found')
    } catch (error: any) {
      console.error('❌ Mock Academic Years API error:', error)
      newResults.errors.push(`Academic Years API: ${error.message}`)
    }

    setResults(newResults)
    setIsLoading(false)
  }

  useEffect(() => {
    testAllAPIs()
  }, [])

  const hasErrors = results.errors.length > 0
  const hasData = results.classes || results.students || results.users || results.exams

  return (
    <div className="container max-w-6xl mx-auto py-10">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🎯 Mock API 功能測試 (Bypass Database)
            {hasErrors && <XCircle className="h-5 w-5 text-red-500" />}
            {!hasErrors && hasData && <CheckCircle className="h-5 w-5 text-green-500" />}
            {isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
          </CardTitle>
          <CardDescription>
            測試所有 Mock API 端點 - 完全繞過 Supabase 資料庫連接問題
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={testAllAPIs} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                測試中...
              </>
            ) : (
              '🔄 重新測試所有 Mock API'
            )}
          </Button>

          {results.errors.length > 0 && (
            <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
              <h3 className="font-medium text-red-800 mb-2">❌ 發現錯誤：</h3>
              {results.errors.map((error, index) => (
                <div key={index} className="text-sm text-red-600 mb-1">
                  • {error}
                </div>
              ))}
            </div>
          )}

          {!hasErrors && hasData && (
            <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-200">
              <h3 className="font-medium text-green-800 mb-2">✅ 所有 Mock API 運行正常！</h3>
              <p className="text-sm text-green-600">
                成功繞過資料庫問題，使用模擬資料進行測試。
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {hasData && (
        <Tabs defaultValue="classes" className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="classes">班級 ({results.classes?.length || 0})</TabsTrigger>
            <TabsTrigger value="students">學生 ({results.students?.length || 0})</TabsTrigger>
            <TabsTrigger value="users">使用者 ({results.users?.length || 0})</TabsTrigger>
            <TabsTrigger value="exams">考試 ({results.exams?.length || 0})</TabsTrigger>
            <TabsTrigger value="codes">評估代碼 ({results.assessmentCodes?.length || 0})</TabsTrigger>
            <TabsTrigger value="years">學年 ({results.academicYears?.length || 0})</TabsTrigger>
          </TabsList>

          <TabsContent value="classes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>班級資料 (Mock Data)</CardTitle>
                <CardDescription>來自 /api/mock/classes 端點</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-80">
                  {results.classes?.map(cls => (
                    <div key={cls.id} className="flex items-center justify-between py-2 border-b">
                      <div>
                        <div className="font-medium">{cls.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Grade {cls.grade} • {cls.track} • {cls.academic_year}
                        </div>
                      </div>
                      <div className="flex flex-col items-end">
                        <Badge variant="secondary">Teacher: {cls.teacher_id ? 'Assigned' : 'No Teacher'}</Badge>
                        {cls.is_active ? (
                          <Badge variant="default" className="mt-1">Active</Badge>
                        ) : (
                          <Badge variant="secondary" className="mt-1">Inactive</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="students" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>學生資料 (Mock Data)</CardTitle>
                <CardDescription>來自 /api/mock/students 端點</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-80">
                  {results.students?.map(student => (
                    <div key={student.id} className="flex items-center justify-between py-2 border-b">
                      <div>
                        <div className="font-medium">{student.full_name}</div>
                        <div className="text-sm text-muted-foreground">
                          {student.student_id} • Grade {student.grade} • {student.track}
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary">
                          {student.class_id ? 'Has Class' : 'No Class'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="users" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>使用者資料 (Mock Data)</CardTitle>
                <CardDescription>來自 /api/mock/users 端點</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-80">
                  {results.users?.map(user => (
                    <div key={user.id} className="flex items-center justify-between py-2 border-b">
                      <div>
                        <div className="font-medium">{user.full_name}</div>
                        <div className="text-sm text-muted-foreground">{user.email}</div>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant="default">{user.role}</Badge>
                        {user.teacher_type && (
                          <Badge variant="secondary">{user.teacher_type}</Badge>
                        )}
                        {user.grade && user.track && (
                          <Badge variant="secondary">G{user.grade}-{user.track}</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="exams" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>考試資料 (Mock Data)</CardTitle>
                <CardDescription>來自 /api/mock/exams 端點</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-80">
                  {results.exams?.map(exam => (
                    <div key={exam.id} className="flex items-center justify-between py-2 border-b">
                      <div>
                        <div className="font-medium">{exam.name}</div>
                        <div className="text-sm text-muted-foreground">
                          Class: {exam.class_id} • {exam.exam_date}
                        </div>
                      </div>
                      {exam.is_published ? (
                        <Badge variant="default">Published</Badge>
                      ) : (
                        <Badge variant="secondary">Draft</Badge>
                      )}
                    </div>
                  ))}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="codes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>評估代碼 (Mock Data)</CardTitle>
                <CardDescription>來自 /api/mock/assessment-codes 端點</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4">
                  {results.assessmentCodes?.map(code => (
                    <div key={code.code} className="flex items-center justify-between p-3 border rounded">
                      <div>
                        <div className="font-medium">{code.code}</div>
                        <div className="text-xs text-muted-foreground">
                          Order: {code.sequence_order}
                        </div>
                      </div>
                      {code.category === 'formative' ? (
                        <Badge variant="default">{code.category}</Badge>
                      ) : code.category === 'summative' ? (
                        <Badge variant="secondary">{code.category}</Badge>
                      ) : (
                        <Badge variant="destructive">{code.category}</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="years" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>學年資料 (Mock Data)</CardTitle>
                <CardDescription>來自 /api/mock/academic-years 端點</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {results.academicYears?.map(year => (
                    <Badge key={year} variant="secondary" className="px-4 py-2">
                      {year}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
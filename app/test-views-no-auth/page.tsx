"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckCircle, XCircle, Loader2, Users, GraduationCap, BarChart, Database } from "lucide-react"
import { 
  getAccessibleClassesTest,
  getAccessibleStudentsTest, 
  getAccessibleStudentPerformanceTest,
  getAccessibleClassScoresTest,
  testAllViews,
  getTestUserPermissions,
  type TeacherClassView,
  type TeacherStudentView, 
  type StudentPerformanceView,
  type ClassScoreView
} from "@/lib/api/teacher-data-test"

type UserType = 'admin' | 'teacher' | 'head'

export default function TestViewsNoAuthPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedUserType, setSelectedUserType] = useState<UserType>('admin')
  const [viewTests, setViewTests] = useState<{
    teacher_classes_view: boolean
    teacher_students_view: boolean  
    class_scores_view: boolean
    student_performance_view: boolean
    errors: string[]
  } | null>(null)
  const [results, setResults] = useState<{
    classes?: TeacherClassView[]
    students?: TeacherStudentView[]
    performance?: StudentPerformanceView[]
    scores?: ClassScoreView[]
    errors: string[]
  }>({ errors: [] })

  const testViewAPIs = async () => {
    setIsLoading(true)
    setResults({ errors: [] })

    const newResults: typeof results = { errors: [] }

    try {
      // 先測試所有 VIEW 是否存在
      console.log('🧪 Testing all views existence...')
      const viewTestResults = await testAllViews()
      setViewTests(viewTestResults)
      
      if (viewTestResults.errors.length > 0) {
        newResults.errors.push(...viewTestResults.errors)
      }
    } catch (error: any) {
      console.error('❌ View tests failed:', error)
      newResults.errors.push(`View tests: ${error.message}`)
    }

    try {
      // 測試可存取班級
      console.log(`🧪 Testing accessible classes as ${selectedUserType}...`)
      const classes = await getAccessibleClassesTest(selectedUserType)
      newResults.classes = classes
      console.log('✅ Accessible classes test completed')
    } catch (error: any) {
      console.error('❌ Accessible classes error:', error)
      newResults.errors.push(`Accessible classes (${selectedUserType}): ${error.message}`)
    }

    try {
      // 測試可存取學生
      console.log(`🧪 Testing accessible students as ${selectedUserType}...`)
      const students = await getAccessibleStudentsTest(selectedUserType)
      newResults.students = students
      console.log('✅ Accessible students test completed')
    } catch (error: any) {
      console.error('❌ Accessible students error:', error)
      newResults.errors.push(`Accessible students (${selectedUserType}): ${error.message}`)
    }

    try {
      // 測試學生成績表現
      console.log(`🧪 Testing student performance as ${selectedUserType}...`)
      const performance = await getAccessibleStudentPerformanceTest(selectedUserType)
      newResults.performance = performance
      console.log('✅ Student performance test completed')
    } catch (error: any) {
      console.error('❌ Student performance error:', error)
      newResults.errors.push(`Student performance (${selectedUserType}): ${error.message}`)
    }

    try {
      // 測試班級成績
      console.log(`🧪 Testing class scores as ${selectedUserType}...`)
      const scores = await getAccessibleClassScoresTest(selectedUserType)
      newResults.scores = scores
      console.log('✅ Class scores test completed')
    } catch (error: any) {
      console.error('❌ Class scores error:', error)
      newResults.errors.push(`Class scores (${selectedUserType}): ${error.message}`)
    }

    setResults(newResults)
    setIsLoading(false)
  }

  useEffect(() => {
    testViewAPIs()
  }, [selectedUserType])

  const hasErrors = results.errors.length > 0
  const hasData = results.classes || results.students || results.performance || results.scores
  const currentPermissions = getTestUserPermissions(selectedUserType)

  return (
    <div className="container max-w-6xl mx-auto py-10">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🧪 VIEW 功能測試 (無認證版本)
            {hasErrors && <XCircle className="h-5 w-5 text-red-500" />}
            {!hasErrors && hasData && <CheckCircle className="h-5 w-5 text-green-500" />}
            {isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
          </CardTitle>
          <CardDescription>
            測試資料庫 VIEW 和權限邏輯，跳過認證檢查
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 用戶類型選擇器 */}
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">測試用戶類型：</label>
            <Select value={selectedUserType} onValueChange={(value: UserType) => setSelectedUserType(value)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin (全域權限)</SelectItem>
                <SelectItem value="teacher">Teacher (班級權限)</SelectItem>
                <SelectItem value="head">Head (年級軌別權限)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 目前權限顯示 */}
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-lg">模擬用戶權限</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-2">
                <Badge variant="default">{currentPermissions.role}</Badge>
                {currentPermissions.teacher_type && (
                  <Badge variant="secondary">{currentPermissions.teacher_type}</Badge>
                )}
                {currentPermissions.grade && currentPermissions.track && (
                  <Badge variant="outline">
                    Grade {currentPermissions.grade} - {currentPermissions.track}
                  </Badge>
                )}
                <Badge variant="outline" className="text-xs">
                  ID: {currentPermissions.userId.substring(0, 8)}...
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* VIEW 存在性測試結果 */}
          {viewTests && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  資料庫 VIEW 狀態
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    {viewTests.teacher_classes_view ? 
                      <CheckCircle className="h-4 w-4 text-green-500" /> : 
                      <XCircle className="h-4 w-4 text-red-500" />
                    }
                    <span className="text-sm">teacher_classes_view</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {viewTests.teacher_students_view ? 
                      <CheckCircle className="h-4 w-4 text-green-500" /> : 
                      <XCircle className="h-4 w-4 text-red-500" />
                    }
                    <span className="text-sm">teacher_students_view</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {viewTests.class_scores_view ? 
                      <CheckCircle className="h-4 w-4 text-green-500" /> : 
                      <XCircle className="h-4 w-4 text-red-500" />
                    }
                    <span className="text-sm">class_scores_view</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {viewTests.student_performance_view ? 
                      <CheckCircle className="h-4 w-4 text-green-500" /> : 
                      <XCircle className="h-4 w-4 text-red-500" />
                    }
                    <span className="text-sm">student_performance_view</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Button 
            onClick={testViewAPIs} 
            disabled={isLoading}
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                測試中...
              </>
            ) : (
              `🔄 重新測試 (${selectedUserType.toUpperCase()})`
            )}
          </Button>

          {/* 錯誤顯示 */}
          {results.errors.length > 0 && (
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <h3 className="font-medium text-red-800 mb-2">❌ 發現錯誤：</h3>
              {results.errors.map((error, index) => (
                <div key={index} className="text-sm text-red-600 mb-1">
                  • {error}
                </div>
              ))}
            </div>
          )}

          {/* 成功顯示 */}
          {!hasErrors && hasData && (
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h3 className="font-medium text-green-800 mb-2">✅ VIEW API 測試成功！</h3>
              <p className="text-sm text-green-600">
                所有資料庫 VIEW 和權限邏輯正常運作，無 RLS 遞迴問題。
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {hasData && (
        <Tabs defaultValue="classes" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="classes" className="flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              班級 ({results.classes?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="students" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              學生 ({results.students?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center gap-2">
              <BarChart className="h-4 w-4" />
              表現 ({results.performance?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="scores" className="flex items-center gap-2">
              <Database className="h-4 w-4" />
              成績 ({results.scores?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="classes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>可存取的班級 ({selectedUserType})</CardTitle>
                <CardDescription>來自 teacher_classes_view，應用權限過濾</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-80">
                  {results.classes?.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      此權限等級無可存取的班級
                    </div>
                  ) : (
                    results.classes?.map(cls => (
                      <div key={cls.class_id} className="flex items-center justify-between py-3 border-b">
                        <div>
                          <div className="font-medium">{cls.class_name}</div>
                          <div className="text-sm text-muted-foreground">
                            Grade {cls.grade} • {cls.track} • {cls.academic_year}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            老師: {cls.teacher_name || 'Unassigned'}
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="default" className="mb-1">
                            {cls.student_count} 學生
                          </Badge>
                          <div className="text-xs text-muted-foreground">
                            {cls.teacher_type || 'No Type'}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="students" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>可存取的學生 ({selectedUserType})</CardTitle>
                <CardDescription>來自 teacher_students_view，應用權限過濾</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-80">
                  {results.students?.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      此權限等級無可存取的學生
                    </div>
                  ) : (
                    results.students?.map(student => (
                      <div key={student.student_id} className="flex items-center justify-between py-3 border-b">
                        <div>
                          <div className="font-medium">{student.student_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {student.student_number} • Grade {student.student_grade} • {student.student_track}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            班級: {student.class_name || 'Unassigned'}
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant={student.class_id ? "default" : "secondary"}>
                            {student.class_id ? 'Assigned' : 'No Class'}
                          </Badge>
                          <div className="text-xs text-muted-foreground">
                            老師: {student.teacher_name || 'None'}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>學生成績表現 ({selectedUserType})</CardTitle>
                <CardDescription>來自 student_performance_view（預計算成績）</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-80">
                  {results.performance?.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      此權限等級無可存取的成績資料
                    </div>
                  ) : (
                    results.performance?.map(perf => (
                      <div key={perf.student_id} className="flex items-center justify-between py-3 border-b">
                        <div>
                          <div className="font-medium">{perf.student_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {perf.student_number} • {perf.class_name || 'No Class'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Grade {perf.grade} • {perf.track}
                          </div>
                        </div>
                        <div className="text-right space-y-1">
                          {perf.formative_avg && (
                            <div className="text-xs">
                              <Badge variant="outline">FA: {perf.formative_avg}</Badge>
                            </div>
                          )}
                          {perf.summative_avg && (
                            <div className="text-xs">
                              <Badge variant="outline">SA: {perf.summative_avg}</Badge>
                            </div>
                          )}
                          {perf.semester_grade && (
                            <div className="text-xs">
                              <Badge variant="default">Sem: {perf.semester_grade}</Badge>
                            </div>
                          )}
                          {!perf.formative_avg && !perf.summative_avg && !perf.semester_grade && (
                            <Badge variant="secondary">No Scores</Badge>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="scores" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>班級成績詳情 ({selectedUserType})</CardTitle>
                <CardDescription>來自 class_scores_view，個別成績紀錄</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-80">
                  {results.scores?.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      此權限等級無可存取的成績紀錄
                    </div>
                  ) : (
                    results.scores?.map((score, index) => (
                      <div key={index} className="flex items-center justify-between py-3 border-b">
                        <div>
                          <div className="font-medium">{score.student_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {score.class_name || 'No Class'} • {score.exam_name || 'No Exam'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {score.exam_date} • {score.assessment_code}
                          </div>
                        </div>
                        <div className="text-right">
                          {score.score !== null ? (
                            <Badge variant="default" className="text-lg">
                              {score.score}
                            </Badge>
                          ) : (
                            <Badge variant="secondary">No Score</Badge>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
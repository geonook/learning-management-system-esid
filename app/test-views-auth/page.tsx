"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CheckCircle, XCircle, Loader2, Users, GraduationCap, BarChart, LogOut, User } from "lucide-react"
import { useAuth } from "@/lib/supabase/auth-context"
import { 
  getAccessibleClasses,
  getAccessibleStudents, 
  getAccessibleStudentPerformance,
  getAccessibleClassScores,
  type TeacherClassView,
  type TeacherStudentView, 
  type StudentPerformanceView,
  type ClassScoreView
} from "@/lib/api/teacher-data"

export default function TestViewsAuthPage() {
  const { user, userPermissions, loading: authLoading, signOut } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [results, setResults] = useState<{
    classes?: TeacherClassView[]
    students?: TeacherStudentView[]
    performance?: StudentPerformanceView[]
    scores?: ClassScoreView[]
    errors: string[]
  }>({ errors: [] })

  const testViewAPIs = async () => {
    if (!user || !userPermissions) {
      return
    }

    setIsLoading(true)
    setResults({ errors: [] })

    const newResults: typeof results = { errors: [] }

    try {
      console.log(`🧪 Testing with authenticated user: ${userPermissions.role}`)
      const classes = await getAccessibleClasses()
      newResults.classes = classes
      console.log('✅ Accessible classes:', classes.length)
    } catch (error: any) {
      console.error('❌ Accessible classes error:', error)
      newResults.errors.push(`Accessible classes: ${error.message}`)
    }

    try {
      const students = await getAccessibleStudents()
      newResults.students = students
      console.log('✅ Accessible students:', students.length)
    } catch (error: any) {
      console.error('❌ Accessible students error:', error)
      newResults.errors.push(`Accessible students: ${error.message}`)
    }

    try {
      const performance = await getAccessibleStudentPerformance()
      newResults.performance = performance
      console.log('✅ Student performance:', performance.length)
    } catch (error: any) {
      console.error('❌ Student performance error:', error)
      newResults.errors.push(`Student performance: ${error.message}`)
    }

    try {
      const scores = await getAccessibleClassScores()
      newResults.scores = scores
      console.log('✅ Class scores:', scores.length)
    } catch (error: any) {
      console.error('❌ Class scores error:', error)
      newResults.errors.push(`Class scores: ${error.message}`)
    }

    setResults(newResults)
    setIsLoading(false)
  }

  // Show loading during auth initialization
  if (authLoading) {
    return (
      <div className="container max-w-2xl mx-auto py-20 text-center">
        <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
        <p className="text-muted-foreground">Loading authentication...</p>
      </div>
    )
  }

  // Show login prompt if not authenticated
  if (!user || !userPermissions) {
    return (
      <div className="container max-w-2xl mx-auto py-20 text-center">
        <Card>
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              Please log in to test the VIEW API with real authentication
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <a href="/auth/login">Go to Login</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const hasErrors = results.errors.length > 0
  const hasData = results.classes || results.students || results.performance || results.scores

  return (
    <div className="container max-w-6xl mx-auto py-10">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🔐 VIEW API 真實認證測試
            {hasErrors && <XCircle className="h-5 w-5 text-red-500" />}
            {!hasErrors && hasData && <CheckCircle className="h-5 w-5 text-green-500" />}
            {isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
          </CardTitle>
          <CardDescription>
            使用真實 Supabase 認證測試 VIEW API 和權限控制
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 用戶資訊顯示 */}
          <Card className="bg-muted/50">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5" />
                目前登入用戶
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="font-medium">{userPermissions.full_name || 'Unknown User'}</div>
                  <div className="text-sm text-muted-foreground">{user.email}</div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="default">{userPermissions.role}</Badge>
                    {userPermissions.teacher_type && (
                      <Badge variant="secondary">{userPermissions.teacher_type}</Badge>
                    )}
                    {userPermissions.grade && userPermissions.track && (
                      <Badge variant="outline">
                        Grade {userPermissions.grade} - {userPermissions.track}
                      </Badge>
                    )}
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={signOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  登出
                </Button>
              </div>
            </CardContent>
          </Card>

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
              `🔄 測試 VIEW API (${userPermissions.role.toUpperCase()})`
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
              <h3 className="font-medium text-green-800 mb-2">✅ 真實認證 VIEW API 測試成功！</h3>
              <p className="text-sm text-green-600">
                所有 VIEW 查詢和權限控制正常運作，使用真實 Supabase 認證。
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
              <BarChart className="h-4 w-4" />
              成績 ({results.scores?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="classes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>可存取的班級 (真實權限)</CardTitle>
                <CardDescription>來自 teacher_classes_view，基於登入用戶權限</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-80">
                  {results.classes?.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      目前權限無可存取的班級
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
                <CardTitle>可存取的學生 (真實權限)</CardTitle>
                <CardDescription>來自 teacher_students_view，基於登入用戶權限</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-80">
                  {results.students?.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      目前權限無可存取的學生
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
                <CardTitle>學生成績表現 (真實權限)</CardTitle>
                <CardDescription>來自 student_performance_view（預計算成績）</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-80">
                  {results.performance?.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      目前權限無可存取的成績資料
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
                <CardTitle>班級成績詳情 (真實權限)</CardTitle>
                <CardDescription>來自 class_scores_view，個別成績紀錄</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-80">
                  {results.scores?.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      目前權限無可存取的成績紀錄
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
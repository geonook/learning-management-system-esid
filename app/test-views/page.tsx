"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { CheckCircle, XCircle, Loader2, Users, GraduationCap, BookOpen, BarChart } from "lucide-react"
import { 
  getAccessibleClasses, 
  getAccessibleStudents, 
  getAccessibleStudentPerformance,
  getCurrentUserPermissions,
  type TeacherClassView,
  type TeacherStudentView, 
  type StudentPerformanceView,
  type UserPermissions
} from "@/lib/api/teacher-data"

export default function TestViewsPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [permissions, setPermissions] = useState<UserPermissions | null>(null)
  const [results, setResults] = useState<{
    classes?: TeacherClassView[]
    students?: TeacherStudentView[]
    performance?: StudentPerformanceView[]
    errors: string[]
  }>({ errors: [] })

  const testViewAPIs = async () => {
    setIsLoading(true)
    setResults({ errors: [] })

    const newResults: typeof results = { errors: [] }

    try {
      // Test 1: Get user permissions
      console.log('Testing user permissions...')
      const userPermissions = await getCurrentUserPermissions()
      setPermissions(userPermissions)
      console.log('✅ User permissions:', userPermissions)
    } catch (error: any) {
      console.error('❌ User permissions error:', error)
      newResults.errors.push(`User permissions: ${error.message}`)
    }

    try {
      // Test 2: Get accessible classes
      console.log('Testing accessible classes...')
      const classes = await getAccessibleClasses()
      newResults.classes = classes
      console.log('✅ Accessible classes:', classes.length, 'found')
    } catch (error: any) {
      console.error('❌ Accessible classes error:', error)
      newResults.errors.push(`Accessible classes: ${error.message}`)
    }

    try {
      // Test 3: Get accessible students
      console.log('Testing accessible students...')
      const students = await getAccessibleStudents()
      newResults.students = students
      console.log('✅ Accessible students:', students.length, 'found')
    } catch (error: any) {
      console.error('❌ Accessible students error:', error)
      newResults.errors.push(`Accessible students: ${error.message}`)
    }

    try {
      // Test 4: Get student performance
      console.log('Testing student performance...')
      const performance = await getAccessibleStudentPerformance()
      newResults.performance = performance
      console.log('✅ Student performance:', performance.length, 'found')
    } catch (error: any) {
      console.error('❌ Student performance error:', error)
      newResults.errors.push(`Student performance: ${error.message}`)
    }

    setResults(newResults)
    setIsLoading(false)
  }

  useEffect(() => {
    testViewAPIs()
  }, [])

  const hasErrors = results.errors.length > 0
  const hasData = results.classes || results.students || results.performance

  return (
    <div className="container max-w-6xl mx-auto py-10">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🔍 Database Views & Teacher API 測試
            {hasErrors && <XCircle className="h-5 w-5 text-red-500" />}
            {!hasErrors && hasData && <CheckCircle className="h-5 w-5 text-green-500" />}
            {isLoading && <Loader2 className="h-5 w-5 animate-spin" />}
          </CardTitle>
          <CardDescription>
            測試新建立的資料庫 VIEW 和基於權限的 API 函數
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={testViewAPIs} 
            disabled={isLoading}
            className="w-full mb-4"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                測試中...
              </>
            ) : (
              '🔄 重新測試所有 View API'
            )}
          </Button>

          {/* User Permissions Display */}
          {permissions && (
            <Card className="mb-4">
              <CardHeader>
                <CardTitle className="text-lg">目前使用者權限</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="default">{permissions.role}</Badge>
                  {permissions.teacher_type && (
                    <Badge variant="secondary">{permissions.teacher_type}</Badge>
                  )}
                  {permissions.grade && permissions.track && (
                    <Badge variant="outline">
                      Grade {permissions.grade} - {permissions.track}
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Error Display */}
          {results.errors.length > 0 && (
            <div className="mb-4 p-4 bg-red-50 rounded-lg border border-red-200">
              <h3 className="font-medium text-red-800 mb-2">❌ 發現錯誤：</h3>
              {results.errors.map((error, index) => (
                <div key={index} className="text-sm text-red-600 mb-1">
                  • {error}
                </div>
              ))}
            </div>
          )}

          {/* Success Display */}
          {!hasErrors && hasData && (
            <div className="mb-4 p-4 bg-green-50 rounded-lg border border-green-200">
              <h3 className="font-medium text-green-800 mb-2">✅ View API 測試成功！</h3>
              <p className="text-sm text-green-600">
                所有資料庫 VIEW 和權限 API 正常運作。
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {hasData && (
        <Tabs defaultValue="classes" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
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
              成績表現 ({results.performance?.length || 0})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="classes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>可存取的班級資料</CardTitle>
                <CardDescription>來自 teacher_classes_view</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-80">
                  {results.classes?.map(cls => (
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
                  ))}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="students" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>可存取的學生資料</CardTitle>
                <CardDescription>來自 teacher_students_view</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-80">
                  {results.students?.map(student => (
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
                  ))}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>學生成績表現</CardTitle>
                <CardDescription>來自 student_performance_view（預先計算的成績）</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-80">
                  {results.performance?.map(perf => (
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
                            <Badge variant="default">Semester: {perf.semester_grade}</Badge>
                          </div>
                        )}
                        {!perf.formative_avg && !perf.summative_avg && !perf.semester_grade && (
                          <Badge variant="secondary">No Scores</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
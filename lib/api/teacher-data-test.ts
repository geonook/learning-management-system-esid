/**
 * 測試版本 Teacher API - 跳過認證檢查
 * 用於驗證 VIEW 和權限邏輯，不需要真實登入
 */

import { supabase } from '@/lib/supabase/client'
import { 
  TeacherClassView, 
  TeacherStudentView, 
  StudentPerformanceView,
  ClassScoreView,
  UserPermissions 
} from '@/lib/api/teacher-data'

// Re-export types for use in test pages
export type { 
  TeacherClassView, 
  TeacherStudentView, 
  StudentPerformanceView,
  ClassScoreView,
  UserPermissions 
}

// 測試模式的模擬用戶權限
const TEST_USER_PERMISSIONS: Record<string, UserPermissions> = {
  admin: {
    userId: '550e8400-e29b-41d4-a716-446655440010',
    role: 'admin',
    grade: null,
    track: null,
    teacher_type: null,
    full_name: 'Test Admin User'
  },
  teacher: {
    userId: '550e8400-e29b-41d4-a716-446655440011', 
    role: 'teacher',
    grade: null,
    track: null,
    teacher_type: 'LT',
    full_name: 'Test Teacher User'
  },
  head: {
    userId: '550e8400-e29b-41d4-a716-446655440012',
    role: 'head',
    grade: 10,
    track: 'local',
    teacher_type: null,
    full_name: 'Test Head Teacher'
  }
}

/**
 * 取得測試用戶權限
 */
export function getTestUserPermissions(userType: 'admin' | 'teacher' | 'head' = 'admin'): UserPermissions {
  const permissions = TEST_USER_PERMISSIONS[userType]
  if (!permissions) {
    throw new Error(`Invalid user type: ${userType}`)
  }
  return permissions
}

/**
 * 測試版本：取得可存取的班級（跳過認證）
 */
export async function getAccessibleClassesTest(userType: 'admin' | 'teacher' | 'head' = 'admin'): Promise<TeacherClassView[]> {
  const permissions = getTestUserPermissions(userType)
  
  console.log(`🧪 Testing with ${userType} permissions:`, permissions)

  let query = supabase.from('classes').select('*')

  // 應用權限過濾
  switch (permissions.role) {
    case 'admin':
      console.log('🔧 Admin: No filtering applied')
      break
    
    case 'head':
      if (permissions.grade && permissions.track) {
        console.log(`🔧 Head: Filtering by grade=${permissions.grade}, track=${permissions.track}`)
        query = query
          .eq('grade', permissions.grade)
          .eq('track', permissions.track)
      } else {
        console.log('🔧 Head: No grade/track, returning empty')
        return []
      }
      break
    
    case 'teacher':
      console.log(`🔧 Teacher: Filtering by teacher_id=${permissions.userId}`)
      query = query.eq('teacher_id', permissions.userId)
      break
  }

  try {
    const { data, error } = await query.order('grade').order('name')

    if (error) {
      console.error('❌ Error fetching accessible classes:', error)
      throw new Error(`Failed to fetch classes: ${error.message}`)
    }

    console.log(`✅ Successfully fetched ${data?.length || 0} classes`)
    return data as unknown as TeacherClassView[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('❌ Exception in getAccessibleClassesTest:', error)
    throw error
  }
}

/**
 * 測試版本：取得可存取的學生（跳過認證）
 */
export async function getAccessibleStudentsTest(userType: 'admin' | 'teacher' | 'head' = 'admin'): Promise<TeacherStudentView[]> {
  const permissions = getTestUserPermissions(userType)
  
  console.log(`🧪 Testing students with ${userType} permissions:`, permissions)

  let query = supabase.from('students').select('*')

  // 應用權限過濾
  switch (permissions.role) {
    case 'admin':
      console.log('🔧 Admin: No filtering applied')
      break
    
    case 'head':
      if (permissions.grade && permissions.track) {
        console.log(`🔧 Head: Filtering by student_grade=${permissions.grade}, track=${permissions.track}`)
        query = query
          .eq('grade', permissions.grade)
          .eq('track', permissions.track)
      } else {
        return []
      }
      break
    
    case 'teacher':
      console.log(`🔧 Teacher: Filtering by teacher_id=${permissions.userId}`)
      query = query.eq('teacher_id', permissions.userId)
      break
  }

  try {
    const { data, error } = await query
      .order('grade')
      .order('full_name')

    if (error) {
      console.error('❌ Error fetching accessible students:', error)
      throw new Error(`Failed to fetch students: ${error.message}`)
    }

    console.log(`✅ Successfully fetched ${data?.length || 0} students`)
    return data as unknown as TeacherStudentView[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('❌ Exception in getAccessibleStudentsTest:', error)
    throw error
  }
}

/**
 * 測試版本：取得學生成績表現（跳過認證）
 */
export async function getAccessibleStudentPerformanceTest(userType: 'admin' | 'teacher' | 'head' = 'admin'): Promise<StudentPerformanceView[]> {
  const permissions = getTestUserPermissions(userType)
  
  console.log(`🧪 Testing performance with ${userType} permissions:`, permissions)

  let query = supabase.from('scores').select('*')

  // 應用權限過濾
  switch (permissions.role) {
    case 'admin':
      console.log('🔧 Admin: No filtering applied')
      break
    
    case 'head':
      if (permissions.grade && permissions.track) {
        console.log(`🔧 Head: Filtering by grade=${permissions.grade}, track=${permissions.track}`)
        query = query
          .eq('grade', permissions.grade)
          .eq('track', permissions.track)
      } else {
        return []
      }
      break
    
    case 'teacher':
      console.log(`🔧 Teacher: Filtering by teacher_id=${permissions.userId}`)
      query = query.eq('teacher_id', permissions.userId)
      break
  }

  try {
    const { data, error } = await query
      .order('grade')
      .order('class_name')
      .order('student_name')

    if (error) {
      console.error('❌ Error fetching student performance:', error)
      throw new Error(`Failed to fetch student performance: ${error.message}`)
    }

    console.log(`✅ Successfully fetched ${data?.length || 0} performance records`)
    return data as unknown as StudentPerformanceView[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('❌ Exception in getAccessibleStudentPerformanceTest:', error)
    throw error
  }
}

/**
 * 測試版本：取得班級成績（跳過認證）
 */
export async function getAccessibleClassScoresTest(userType: 'admin' | 'teacher' | 'head' = 'admin', classId?: string): Promise<ClassScoreView[]> {
  const permissions = getTestUserPermissions(userType)
  
  console.log(`🧪 Testing class scores with ${userType} permissions:`, permissions)

  let query = supabase.from('scores').select('*')

  if (classId) {
    query = query.eq('exam_id', classId) // Scores are linked via exam_id
  }

  // 應用權限過濾
  switch (permissions.role) {
    case 'admin':
      console.log('🔧 Admin: No filtering applied')
      break
    
    case 'head':
      if (permissions.grade && permissions.track) {
        console.log(`🔧 Head: Filtering by grade=${permissions.grade}, track=${permissions.track}`)
        query = query
          .eq('grade', permissions.grade)
          .eq('track', permissions.track)
      } else {
        return []
      }
      break
    
    case 'teacher':
      console.log(`🔧 Teacher: Filtering by teacher_id=${permissions.userId}`)
      query = query.eq('teacher_id', permissions.userId)
      break
  }

  try {
    const { data, error } = await query
      .order('exam_date', { ascending: false })
      .order('student_name')

    if (error) {
      console.error('❌ Error fetching class scores:', error)
      throw new Error(`Failed to fetch class scores: ${error.message}`)
    }

    console.log(`✅ Successfully fetched ${data?.length || 0} score records`)
    return data as unknown as ClassScoreView[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('❌ Exception in getAccessibleClassScoresTest:', error)
    throw error
  }
}

/**
 * 測試所有 VIEW 查詢（直接 SQL 測試）
 */
export async function testAllViews(): Promise<{
  teacher_classes_view: boolean
  teacher_students_view: boolean  
  class_scores_view: boolean
  student_performance_view: boolean
  errors: string[]
}> {
  const results = {
    teacher_classes_view: false,
    teacher_students_view: false,
    class_scores_view: false,
    student_performance_view: false,
    errors: [] as string[]
  }

  // 測試 teacher_classes_view
  try {
    console.log('🧪 Testing teacher_classes_view...')
    const { data, error } = await supabase
      .from('classes')
      .select('id, name, teacher_id')
      .limit(3)
    
    if (error) throw error
    console.log('✅ teacher_classes_view OK:', data?.length || 0, 'records')
    results.teacher_classes_view = true
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('❌ teacher_classes_view failed:', error)
    results.errors.push(`teacher_classes_view: ${error.message}`)
  }

  // 測試 teacher_students_view
  try {
    console.log('🧪 Testing teacher_students_view...')
    const { data, error } = await supabase
      .from('students')
      .select('id, full_name, class_id')
      .limit(3)
    
    if (error) throw error
    console.log('✅ teacher_students_view OK:', data?.length || 0, 'records')
    results.teacher_students_view = true
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('❌ teacher_students_view failed:', error)
    results.errors.push(`teacher_students_view: ${error.message}`)
  }

  // 測試 class_scores_view
  try {
    console.log('🧪 Testing class_scores_view...')
    const { data, error } = await supabase
      .from('scores')
      .select('student_id, assessment_code, score')
      .limit(3)
    
    if (error) throw error
    console.log('✅ class_scores_view OK:', data?.length || 0, 'records')
    results.class_scores_view = true
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('❌ class_scores_view failed:', error)
    results.errors.push(`class_scores_view: ${error.message}`)
  }

  // 測試 student_performance_view
  try {
    console.log('🧪 Testing student_performance_view...')
    const { data, error } = await supabase
      .from('scores')
      .select('student_id, assessment_code, score')
      .limit(3)
    
    if (error) throw error
    console.log('✅ student_performance_view OK:', data?.length || 0, 'records')
    results.student_performance_view = true
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error('❌ student_performance_view failed:', error)
    results.errors.push(`student_performance_view: ${error.message}`)
  }

  return results
}
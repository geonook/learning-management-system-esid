-- COMPLETE RLS RESET FOR ZEABUR SUPABASE
-- Date: 2025-08-13
-- Purpose: 徹底解決 RLS 遞迴問題，確保所有政策都被清除

-- ====================================
-- 第一步：清除所有現存的 RLS 政策
-- ====================================

-- 清除用戶表的所有政策
DROP POLICY IF EXISTS "Users can view their own profile" ON users;
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Head teachers can view users in their grade/track" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Admins can manage all users" ON users;
DROP POLICY IF EXISTS "users_own_profile" ON users;
DROP POLICY IF EXISTS "authenticated_read_users" ON users;
DROP POLICY IF EXISTS "admin_full_access" ON users;
DROP POLICY IF EXISTS "service_role_bypass" ON users;

-- 清除班級表的所有政策
DROP POLICY IF EXISTS "Teachers can view their own classes" ON classes;
DROP POLICY IF EXISTS "Admins can view all classes" ON classes;
DROP POLICY IF EXISTS "Head teachers can view classes in their grade/track" ON classes;
DROP POLICY IF EXISTS "Admins can manage all classes" ON classes;
DROP POLICY IF EXISTS "Head teachers can manage classes in their grade/track" ON classes;
DROP POLICY IF EXISTS "authenticated_read_classes" ON classes;
DROP POLICY IF EXISTS "admin_full_access" ON classes;
DROP POLICY IF EXISTS "service_role_bypass" ON classes;
DROP POLICY IF EXISTS "head_grade_track_access" ON classes;

-- 清除課程表的所有政策
DROP POLICY IF EXISTS "Teachers can view their own courses" ON courses;
DROP POLICY IF EXISTS "Admins can view all courses" ON courses;
DROP POLICY IF EXISTS "authenticated_read_courses" ON courses;
DROP POLICY IF EXISTS "admin_full_access" ON courses;
DROP POLICY IF EXISTS "service_role_bypass" ON courses;
DROP POLICY IF EXISTS "teachers_manage_own_courses" ON courses;
DROP POLICY IF EXISTS "teacher_own_courses" ON courses;

-- 清除學生表的所有政策
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

-- 清除考試表的所有政策
DROP POLICY IF EXISTS "Teachers can view exams for their classes" ON exams;
DROP POLICY IF EXISTS "Teachers can manage exams for their classes" ON exams;
DROP POLICY IF EXISTS "Admins can view all exams" ON exams;
DROP POLICY IF EXISTS "Admins can manage all exams" ON exams;
DROP POLICY IF EXISTS "Head teachers can view exams in their grade/track" ON exams;
DROP POLICY IF EXISTS "authenticated_read_exams" ON exams;
DROP POLICY IF EXISTS "admin_full_access" ON exams;
DROP POLICY IF EXISTS "service_role_bypass" ON exams;
DROP POLICY IF EXISTS "teachers_manage_class_exams" ON exams;

-- 清除分數表的所有政策
DROP POLICY IF EXISTS "Teachers can view scores for their classes" ON scores;
DROP POLICY IF EXISTS "Teachers can manage scores for their classes" ON scores;
DROP POLICY IF EXISTS "Admins can view all scores" ON scores;
DROP POLICY IF EXISTS "Admins can manage all scores" ON scores;
DROP POLICY IF EXISTS "Head teachers can view scores in their grade/track" ON scores;
DROP POLICY IF EXISTS "authenticated_read_scores" ON scores;
DROP POLICY IF EXISTS "admin_full_access" ON scores;
DROP POLICY IF EXISTS "service_role_bypass" ON scores;
DROP POLICY IF EXISTS "teachers_manage_student_scores" ON scores;

-- 清除評量標題表的所有政策
DROP POLICY IF EXISTS "Teachers can view assessment titles for their classes" ON assessment_titles;
DROP POLICY IF EXISTS "Admins can manage all assessment titles" ON assessment_titles;
DROP POLICY IF EXISTS "Head teachers can manage assessment titles in their grade/track" ON assessment_titles;
DROP POLICY IF EXISTS "authenticated_read_assessment_titles" ON assessment_titles;
DROP POLICY IF EXISTS "admin_full_access" ON assessment_titles;
DROP POLICY IF EXISTS "service_role_bypass" ON assessment_titles;

-- 清除評量代碼表的所有政策（如果存在）
DROP POLICY IF EXISTS "All authenticated users can view assessment codes" ON assessment_codes;
DROP POLICY IF EXISTS "Anonymous can view assessment codes" ON assessment_codes;

-- ====================================
-- 第二步：移除所有可能的輔助函數
-- ====================================

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

-- ====================================
-- 第三步：移除問題視圖
-- ====================================

DROP VIEW IF EXISTS student_scores_with_grades;
DROP VIEW IF EXISTS teacher_classes_view;

-- ====================================
-- 第四步：完全停用所有表格的 RLS
-- ====================================

ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE classes DISABLE ROW LEVEL SECURITY;
ALTER TABLE courses DISABLE ROW LEVEL SECURITY;
ALTER TABLE students DISABLE ROW LEVEL SECURITY;
ALTER TABLE exams DISABLE ROW LEVEL SECURITY;
ALTER TABLE scores DISABLE ROW LEVEL SECURITY;
ALTER TABLE assessment_titles DISABLE ROW LEVEL SECURITY;

-- 也處理評量代碼表（如果存在）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'assessment_codes') THEN
        ALTER TABLE assessment_codes DISABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- ====================================
-- 第五步：驗證清理結果
-- ====================================

-- 檢查剩餘的政策（應該返回空結果）
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'classes', 'courses', 'students', 'exams', 'scores', 'assessment_titles');

-- 檢查 RLS 狀態（所有表格的 relrowsecurity 應該是 false）
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname IN ('users', 'classes', 'courses', 'students', 'exams', 'scores', 'assessment_titles')
AND relkind = 'r';

-- ====================================
-- 完成訊息
-- ====================================

SELECT 'RLS 完全重置完成 - 所有政策已清除，所有表格 RLS 已停用' AS status;
SELECT '現在可以測試基本查詢：SELECT count(*) FROM users LIMIT 1' AS next_step;
-- =====================================================
-- Migration 簡化驗證腳本
-- 用途：驗證 Migration 007 + 008 + RLS 003 是否成功執行
-- 特點：所有結果都以 SELECT 表格形式返回，不使用 RAISE NOTICE
-- 使用：在 Supabase Dashboard SQL Editor 執行，查看 Results 標籤
-- =====================================================

-- =====================================================
-- 1. Courses 表結構檢查
-- =====================================================

SELECT
  '1. Courses Table Structure' AS check_name,
  column_name,
  data_type,
  udt_name AS enum_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'courses'
ORDER BY ordinal_position;

-- 預期：8 個欄位
-- id, class_id, course_type (course_type), teacher_id, academic_year, is_active, created_at, updated_at

-- =====================================================
-- 2. Courses 表約束檢查
-- =====================================================

SELECT
  '2. Courses Table Constraints' AS check_name,
  conname AS constraint_name,
  CASE contype
    WHEN 'p' THEN 'PRIMARY KEY'
    WHEN 'u' THEN 'UNIQUE'
    WHEN 'c' THEN 'CHECK'
    WHEN 'f' THEN 'FOREIGN KEY'
    ELSE contype::text
  END AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.courses'::regclass
ORDER BY conname;

-- 預期：5 個約束
-- PRIMARY KEY, UNIQUE, CHECK, 2x FOREIGN KEY

-- =====================================================
-- 3. Courses 表索引檢查
-- =====================================================

SELECT
  '3. Courses Table Indexes' AS check_name,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'courses'
ORDER BY indexname;

-- 預期：5 個索引
-- courses_pkey, idx_courses_class, idx_courses_teacher, idx_courses_type, idx_courses_academic_year

-- =====================================================
-- 4. Courses RLS Policies 檢查
-- =====================================================

SELECT
  '4. Courses RLS Policies' AS check_name,
  policyname,
  cmd AS command,
  roles,
  permissive
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'courses'
ORDER BY policyname;

-- 預期：4 個 policies
-- admin_full_access_courses, head_teacher_access_courses, teacher_view_own_courses, teacher_view_class_courses

-- =====================================================
-- 5. 課程記錄統計
-- =====================================================

-- 5.1 總課程數
SELECT
  '5.1 Total Courses Count' AS check_name,
  COUNT(*) AS total_courses
FROM courses;

-- 5.2 課程類型分佈
SELECT
  '5.2 Course Type Distribution' AS check_name,
  course_type,
  COUNT(*) AS total_courses,
  COUNT(teacher_id) AS assigned_courses,
  COUNT(*) - COUNT(teacher_id) AS unassigned_courses
FROM courses
GROUP BY course_type
ORDER BY course_type;

-- 預期：LT, IT, KCFS 數量相同

-- 5.3 每個班級的課程數（只顯示不符合的）
SELECT
  '5.3 Classes with != 3 Courses (Should be Empty)' AS check_name,
  c.name AS class_name,
  c.grade,
  c.track,
  COUNT(co.id) AS course_count,
  ARRAY_AGG(co.course_type ORDER BY co.course_type) AS course_types
FROM classes c
LEFT JOIN courses co ON co.class_id = c.id
WHERE c.is_active = TRUE
GROUP BY c.id, c.name, c.grade, c.track
HAVING COUNT(co.id) != 3
ORDER BY c.grade, c.name;

-- 預期：0 筆（空表格）

-- =====================================================
-- 6. User Self-Registration Policy 檢查
-- =====================================================

SELECT
  '6. User Self-Registration Policy' AS check_name,
  policyname,
  cmd AS command,
  roles,
  permissive
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'users'
  AND policyname = 'allow_authenticated_user_self_insert';

-- 預期：1 筆

-- =====================================================
-- 7. update_updated_at_column() 函數檢查
-- =====================================================

SELECT
  '7. Trigger Function' AS check_name,
  proname AS function_name,
  pg_get_function_result(oid) AS return_type,
  CASE
    WHEN pg_get_function_arguments(oid) = '' THEN '(no arguments)'
    ELSE pg_get_function_arguments(oid)
  END AS arguments
FROM pg_proc
WHERE proname = 'update_updated_at_column'
  AND pronamespace = 'public'::regnamespace;

-- 預期：1 筆，return_type = 'trigger'

-- =====================================================
-- 8. Courses 表 Trigger 檢查
-- =====================================================

SELECT
  '8. Courses Table Trigger' AS check_name,
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'courses'
  AND trigger_schema = 'public'
ORDER BY trigger_name;

-- 預期：1 筆，trigger_name = 'update_courses_updated_at'

-- =====================================================
-- 9. course_type ENUM 值檢查
-- =====================================================

SELECT
  '9. course_type ENUM Values' AS check_name,
  enumlabel AS enum_value,
  enumsortorder AS sort_order
FROM pg_enum
WHERE enumtypid = 'course_type'::regtype
ORDER BY enumsortorder;

-- 預期：3 筆（IT, KCFS, LT）

-- =====================================================
-- 10. FINAL VERIFICATION SUMMARY（最重要！）
-- =====================================================

WITH verification_data AS (
  SELECT
    (SELECT COUNT(*) FROM courses) AS total_courses,
    (SELECT COUNT(*) FROM classes WHERE is_active = TRUE) AS active_classes,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'courses') AS policies_count,
    (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'courses') AS indexes_count,
    (SELECT COUNT(*) FROM pg_proc WHERE proname = 'update_updated_at_column') AS function_count,
    (SELECT COUNT(*) FROM information_schema.triggers WHERE event_object_table = 'courses') AS trigger_count,
    (SELECT COUNT(*) FROM pg_enum WHERE enumtypid = 'course_type'::regtype) AS enum_values_count,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'users' AND policyname = 'allow_authenticated_user_self_insert') AS user_policy_count
)
SELECT
  '=== FINAL VERIFICATION SUMMARY ===' AS section,

  -- 課程統計
  total_courses,
  active_classes,
  CASE
    WHEN active_classes > 0 THEN ROUND((total_courses::NUMERIC / active_classes), 2)
    ELSE 0
  END AS courses_per_class,

  -- 預期值檢查
  CASE
    WHEN active_classes > 0 AND (total_courses::NUMERIC / active_classes) = 3
    THEN '✅ PASS'
    ELSE '❌ FAIL'
  END AS courses_per_class_status,

  -- RLS Policies
  policies_count AS rls_policies_count,
  CASE WHEN policies_count >= 4 THEN '✅ PASS (Expected 4+)' ELSE '❌ FAIL' END AS rls_policies_status,

  -- Indexes
  indexes_count,
  CASE WHEN indexes_count >= 5 THEN '✅ PASS (Expected 5+)' ELSE '❌ FAIL' END AS indexes_status,

  -- Function & Trigger
  function_count,
  trigger_count,
  CASE WHEN function_count >= 1 AND trigger_count >= 1 THEN '✅ PASS (Expected 1+)' ELSE '❌ FAIL' END AS function_trigger_status,

  -- ENUM
  enum_values_count,
  CASE WHEN enum_values_count = 3 THEN '✅ PASS' ELSE '❌ FAIL' END AS enum_status,

  -- User Policy
  user_policy_count,
  CASE WHEN user_policy_count >= 1 THEN '✅ PASS (Expected 1+)' ELSE '❌ FAIL' END AS user_policy_status,

  -- 整體狀態
  CASE
    WHEN active_classes > 0
      AND (total_courses::NUMERIC / active_classes) = 3
      AND policies_count >= 4
      AND indexes_count >= 5
      AND function_count >= 1
      AND trigger_count >= 1
      AND enum_values_count = 3
      AND user_policy_count >= 1
    THEN '🎉 ALL CHECKS PASSED ✅'
    ELSE '⚠️ SOME CHECKS FAILED ❌'
  END AS overall_status
FROM verification_data;

-- =====================================================
-- 使用說明
-- =====================================================

-- 執行此腳本後：
-- 1. 在 Results 標籤中往下滾動到最後一個表格
-- 2. 查看 "FINAL VERIFICATION SUMMARY" 表格
-- 3. 檢查 overall_status 欄位：
--    - "🎉 ALL CHECKS PASSED ✅" = Migration 100% 成功
--    - "⚠️ SOME CHECKS FAILED ❌" = 有問題，檢查各個 status 欄位找出問題

-- 關鍵指標（預期值）：
-- - courses_per_class: 3.00 (exactly 3)
-- - rls_policies_count: 4+ (at least 4, extras from previous migrations are OK)
-- - indexes_count: 5+ (at least 5, UNIQUE constraints create additional indexes)
-- - function_count: 1+ (at least 1 update_updated_at_column function)
-- - trigger_count: 1+ (at least 1 trigger)
-- - enum_values_count: 3 (exactly 3: LT, IT, KCFS)
-- - user_policy_count: 1+ (at least 1 user self-registration policy)

-- 說明：
-- - 額外的 policies/indexes/functions 是正常的，來自其他 migrations
-- - 只要核心功能存在（≥ 預期值）就是成功的
-- - UNIQUE 約束會自動建立額外的索引（這是 PostgreSQL 的正常行為）

-- 如果全部通過，恭喜！Migration 成功部署 🎊

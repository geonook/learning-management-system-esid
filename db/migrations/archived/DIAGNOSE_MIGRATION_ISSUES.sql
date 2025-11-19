-- =====================================================
-- Migration 問題診斷腳本
-- 用途：診斷為什麼 VERIFY_MIGRATIONS_SIMPLE 顯示失敗
-- 執行：在 Supabase Dashboard SQL Editor 執行
-- =====================================================

-- =====================================================
-- 問題 1: 為什麼沒有課程記錄？(total_courses = 0)
-- =====================================================

-- 1.1 檢查 classes 表是否有資料
SELECT
  '1.1 Classes Table Status' AS check_name,
  COUNT(*) AS total_classes,
  COUNT(*) FILTER (WHERE is_active = TRUE) AS active_classes,
  COUNT(*) FILTER (WHERE is_active = FALSE) AS inactive_classes
FROM classes;

-- 1.2 列出所有 classes（如果有的話）
SELECT
  '1.2 All Classes List' AS check_name,
  id,
  name,
  grade,
  track,
  academic_year,
  is_active,
  teacher_id,
  created_at
FROM classes
ORDER BY grade, name
LIMIT 20;

-- 1.3 檢查 courses 表是否真的是空的
SELECT
  '1.3 Courses Table Status' AS check_name,
  COUNT(*) AS total_courses,
  COUNT(*) FILTER (WHERE teacher_id IS NOT NULL) AS assigned_courses,
  COUNT(*) FILTER (WHERE teacher_id IS NULL) AS unassigned_courses
FROM courses;

-- 1.4 列出所有 courses（如果有的話）
SELECT
  '1.4 All Courses List' AS check_name,
  co.id,
  c.name AS class_name,
  co.course_type,
  co.academic_year,
  co.teacher_id,
  co.is_active
FROM courses co
LEFT JOIN classes c ON co.class_id = c.id
ORDER BY c.name, co.course_type
LIMIT 20;

-- =====================================================
-- 問題 2: 為什麼 RLS policies 有 7 個？(預期 4 個)
-- =====================================================

-- 2.1 列出所有 courses 表的 policies
SELECT
  '2.1 All Courses RLS Policies' AS check_name,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'courses'
ORDER BY policyname;

-- 2.2 統計 policies 數量
SELECT
  '2.2 Policies Count by Command' AS check_name,
  cmd,
  COUNT(*) AS policy_count
FROM pg_policies
WHERE tablename = 'courses'
GROUP BY cmd
ORDER BY cmd;

-- =====================================================
-- 問題 3: 為什麼索引有 8 個？(預期 5 個)
-- =====================================================

-- 3.1 列出所有 courses 表的索引
SELECT
  '3.1 All Courses Indexes' AS check_name,
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'courses'
ORDER BY indexname;

-- 3.2 檢查 UNIQUE constraint 是否建立了額外索引
SELECT
  '3.2 Unique Constraints and Their Indexes' AS check_name,
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.courses'::regclass
  AND contype = 'u'
ORDER BY conname;

-- =====================================================
-- 問題 4: 為什麼有 2 個 update 函數？(預期 1 個)
-- =====================================================

-- 4.1 列出所有 update_* 函數
SELECT
  '4.1 All Update Functions' AS check_name,
  proname AS function_name,
  pronamespace::regnamespace AS schema_name,
  pg_get_function_result(oid) AS return_type,
  pg_get_function_arguments(oid) AS arguments,
  prosrc AS source_code
FROM pg_proc
WHERE proname LIKE 'update%'
  AND pronamespace = 'public'::regnamespace
ORDER BY proname;

-- =====================================================
-- 問題 5: Courses 表的約束條件檢查
-- =====================================================

-- 5.1 列出所有約束
SELECT
  '5.1 All Courses Constraints' AS check_name,
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
ORDER BY contype, conname;

-- =====================================================
-- 問題 6: 嘗試手動插入測試資料（診斷用）
-- =====================================================

-- 6.1 檢查是否有可用的 class 來測試插入
SELECT
  '6.1 Sample Active Class for Testing' AS check_name,
  id AS class_id,
  name,
  grade,
  track,
  academic_year
FROM classes
WHERE is_active = TRUE
LIMIT 1;

-- 注意：下面的 INSERT 語句被註解掉，因為這是診斷腳本
-- 如果需要測試插入，請手動執行以下語句：

-- DO $$
-- DECLARE
--   test_class_id UUID;
--   test_academic_year TEXT;
-- BEGIN
--   -- 獲取第一個 active class
--   SELECT id, academic_year INTO test_class_id, test_academic_year
--   FROM classes
--   WHERE is_active = TRUE
--   LIMIT 1;
--
--   IF test_class_id IS NOT NULL THEN
--     -- 嘗試插入一筆 LT 課程
--     INSERT INTO courses (class_id, course_type, teacher_id, academic_year, is_active)
--     VALUES (test_class_id, 'LT'::course_type, NULL, test_academic_year, TRUE)
--     ON CONFLICT (class_id, course_type, academic_year) DO NOTHING;
--
--     RAISE NOTICE 'Test insert successful for class_id: %', test_class_id;
--   ELSE
--     RAISE NOTICE 'No active classes found for testing';
--   END IF;
-- END $$;

-- =====================================================
-- 問題 7: 檢查 Migration 008 的 INSERT 語句條件
-- =====================================================

-- 7.1 模擬 Migration 008 的 INSERT 查詢（不實際插入）
SELECT
  '7.1 Migration 008 INSERT Query Preview' AS check_name,
  c.id AS class_id,
  c.name AS class_name,
  c.grade,
  c.track,
  ct.course_type,
  c.academic_year,
  c.is_active
FROM classes c
CROSS JOIN (
  VALUES ('LT'::course_type), ('IT'::course_type), ('KCFS'::course_type)
) AS ct(course_type)
WHERE c.is_active = TRUE
ORDER BY c.grade, c.name, ct.course_type
LIMIT 20;

-- 如果這個查詢返回 0 筆，代表沒有 active classes
-- 如果這個查詢有返回資料，但 courses 表仍是空的，代表 INSERT 語句失敗了

-- =====================================================
-- 診斷總結查詢
-- =====================================================

WITH diagnostic_summary AS (
  SELECT
    (SELECT COUNT(*) FROM classes) AS total_classes,
    (SELECT COUNT(*) FROM classes WHERE is_active = TRUE) AS active_classes,
    (SELECT COUNT(*) FROM courses) AS total_courses,
    (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'courses') AS policies_count,
    (SELECT COUNT(*) FROM pg_indexes WHERE tablename = 'courses') AS indexes_count,
    (SELECT COUNT(*) FROM pg_proc WHERE proname LIKE 'update%' AND pronamespace = 'public'::regnamespace) AS update_functions_count,
    -- 檢查是否有可插入的資料
    (SELECT COUNT(*) FROM classes c CROSS JOIN (VALUES ('LT'::course_type)) AS ct(course_type) WHERE c.is_active = TRUE) AS insertable_rows
)
SELECT
  '=== DIAGNOSTIC SUMMARY ===' AS section,
  total_classes,
  active_classes,
  total_courses,
  insertable_rows,
  CASE
    WHEN total_classes = 0 THEN '❌ NO CLASSES EXIST - Need to create classes first'
    WHEN active_classes = 0 THEN '❌ NO ACTIVE CLASSES - Need to set is_active = TRUE'
    WHEN insertable_rows = 0 THEN '❌ NO INSERTABLE ROWS - Check Migration 008 query'
    WHEN total_courses = 0 AND insertable_rows > 0 THEN '❌ INSERT FAILED - Check constraints/permissions'
    WHEN total_courses > 0 THEN '✅ COURSES EXIST - Check why count was 0 in verification'
    ELSE '⚠️ UNKNOWN ISSUE'
  END AS diagnosis,
  policies_count,
  CASE
    WHEN policies_count = 4 THEN '✅ CORRECT'
    WHEN policies_count > 4 THEN '⚠️ TOO MANY - May have duplicates'
    WHEN policies_count < 4 THEN '❌ TOO FEW - Missing policies'
  END AS policies_status,
  indexes_count,
  CASE
    WHEN indexes_count = 5 THEN '✅ CORRECT'
    WHEN indexes_count > 5 THEN '⚠️ TOO MANY - May include constraint indexes'
    WHEN indexes_count < 5 THEN '❌ TOO FEW - Missing indexes'
  END AS indexes_status,
  update_functions_count,
  CASE
    WHEN update_functions_count = 1 THEN '✅ CORRECT'
    WHEN update_functions_count > 1 THEN '⚠️ TOO MANY - May have duplicates'
    WHEN update_functions_count < 1 THEN '❌ MISSING'
  END AS functions_status
FROM diagnostic_summary;

-- =====================================================
-- 使用說明
-- =====================================================

-- 執行此腳本後：
-- 1. 在 Results 標籤中查看所有查詢結果
-- 2. 最重要的是最後一個 "DIAGNOSTIC SUMMARY" 表格
-- 3. 根據 diagnosis 欄位的提示判斷問題原因
-- 4. 查看前面的詳細查詢結果找出具體細節

-- 常見診斷結果：
-- - "NO CLASSES EXIST" → 需要先建立 classes 資料
-- - "NO ACTIVE CLASSES" → 執行：UPDATE classes SET is_active = TRUE WHERE ...
-- - "INSERT FAILED" → 檢查約束條件或權限問題
-- - "TOO MANY POLICIES" → 可能需要清理重複的 policies

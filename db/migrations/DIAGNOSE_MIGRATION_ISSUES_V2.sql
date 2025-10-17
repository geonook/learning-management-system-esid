-- =====================================================
-- Migration 問題診斷腳本 V2（修正版）
-- 用途：診斷為什麼 VERIFY_MIGRATIONS_SIMPLE 顯示失敗
-- 特點：不假設任何欄位存在，動態查詢
-- 執行：在 Supabase Dashboard SQL Editor 執行
-- =====================================================

-- =====================================================
-- 問題 1: 為什麼沒有課程記錄？(total_courses = 0)
-- =====================================================

-- 1.1 檢查 classes 表是否有資料（安全查詢，只用保證存在的欄位）
SELECT
  '1.1 Classes Table Status' AS check_name,
  COUNT(*) AS total_classes,
  COUNT(*) FILTER (WHERE is_active = TRUE) AS active_classes,
  COUNT(*) FILTER (WHERE is_active = FALSE) AS inactive_classes
FROM classes;

-- 1.2 列出所有 classes（使用 SELECT *避免欄位不存在錯誤）
SELECT
  '1.2 All Classes List' AS check_name,
  *
FROM (
  SELECT * FROM classes ORDER BY created_at DESC LIMIT 20
) AS classes_sample;

-- 1.3 檢查 courses 表是否真的是空的
SELECT
  '1.3 Courses Table Status' AS check_name,
  COUNT(*) AS total_courses,
  COUNT(*) FILTER (WHERE teacher_id IS NOT NULL) AS assigned_courses,
  COUNT(*) FILTER (WHERE teacher_id IS NULL) AS unassigned_courses,
  COUNT(*) FILTER (WHERE is_active = TRUE) AS active_courses
FROM courses;

-- 1.4 列出所有 courses（如果有的話）
SELECT
  '1.4 All Courses List' AS check_name,
  *
FROM (
  SELECT * FROM courses ORDER BY created_at DESC LIMIT 20
) AS courses_sample;

-- 1.5 嘗試 JOIN classes 和 courses（動態，避免欄位錯誤）
SELECT
  '1.5 Classes-Courses JOIN' AS check_name,
  c.id AS class_id,
  c.name AS class_name,
  c.grade,
  c.track,
  c.is_active AS class_is_active,
  co.id AS course_id,
  co.course_type,
  co.is_active AS course_is_active
FROM classes c
LEFT JOIN courses co ON co.class_id = c.id
ORDER BY c.name, co.course_type
LIMIT 20;

-- =====================================================
-- 問題 2: 為什麼 RLS policies 有 7 個？(預期 4 個)
-- =====================================================

-- 2.1 列出所有 courses 表的 policies（完整資訊）
SELECT
  '2.1 All Courses RLS Policies' AS check_name,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  SUBSTRING(qual::text, 1, 100) AS qual_preview,
  SUBSTRING(with_check::text, 1, 100) AS with_check_preview
FROM pg_policies
WHERE tablename = 'courses'
ORDER BY policyname;

-- 2.2 統計 policies 數量
SELECT
  '2.2 Policies Count by Command' AS check_name,
  cmd,
  COUNT(*) AS policy_count,
  string_agg(policyname, ', ' ORDER BY policyname) AS policy_names
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
  SUBSTRING(prosrc, 1, 200) AS source_code_preview
FROM pg_proc
WHERE proname LIKE 'update%'
  AND pronamespace = 'public'::regnamespace
ORDER BY proname;

-- =====================================================
-- 問題 5: Migration 008 INSERT 查詢預覽
-- =====================================================

-- 5.1 模擬 Migration 008 的 INSERT 查詢（不實際插入）
SELECT
  '5.1 Migration 008 INSERT Query Preview' AS check_name,
  c.id AS class_id,
  c.name AS class_name,
  c.grade,
  c.track,
  ct.course_type,
  c.academic_year,
  c.is_active
FROM classes c
CROSS JOIN (
  VALUES ('IT'::course_type), ('KCFS'::course_type), ('LT'::course_type)
) AS ct(course_type)
WHERE c.is_active = TRUE
ORDER BY c.grade, c.name, ct.course_type
LIMIT 30;

-- 如果這個查詢返回資料，但 courses 表是空的，代表 INSERT 失敗了

-- =====================================================
-- 問題 6: 檢查是否有約束阻止插入
-- =====================================================

-- 6.1 列出所有 courses 表的約束
SELECT
  '6.1 All Courses Constraints' AS check_name,
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
    (SELECT COUNT(*) FROM classes c CROSS JOIN (VALUES ('LT'::course_type)) AS ct(course_type) WHERE c.is_active = TRUE) AS insertable_rows,
    -- 檢查 classes 表結構
    (SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'classes' AND column_name = 'teacher_id')) AS classes_has_teacher_id,
    (SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'classes' AND column_name = 'track')) AS classes_has_track,
    (SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'classes' AND column_name = 'academic_year')) AS classes_has_academic_year
)
SELECT
  '=== DIAGNOSTIC SUMMARY V2 ===' AS section,
  total_classes,
  active_classes,
  total_courses,
  insertable_rows,
  CASE
    WHEN total_classes = 0 THEN '❌ NO CLASSES EXIST - Need to create classes first'
    WHEN active_classes = 0 THEN '❌ NO ACTIVE CLASSES - Need to set is_active = TRUE'
    WHEN NOT classes_has_track THEN '⚠️ CLASSES MISSING track COLUMN - Schema mismatch'
    WHEN NOT classes_has_academic_year THEN '⚠️ CLASSES MISSING academic_year COLUMN - Schema mismatch'
    WHEN insertable_rows = 0 THEN '❌ NO INSERTABLE ROWS - Check Migration 008 query'
    WHEN total_courses = 0 AND insertable_rows > 0 THEN '❌ INSERT FAILED - Check constraints/permissions'
    WHEN total_courses > 0 THEN '✅ COURSES EXIST'
    ELSE '⚠️ UNKNOWN ISSUE'
  END AS diagnosis,

  -- Schema 檢查
  classes_has_teacher_id,
  classes_has_track,
  classes_has_academic_year,
  CASE
    WHEN NOT classes_has_teacher_id OR NOT classes_has_track OR NOT classes_has_academic_year
    THEN '⚠️ SCHEMA MISMATCH - classes table structure different from expected'
    ELSE '✅ SCHEMA OK'
  END AS schema_status,

  -- Policies
  policies_count,
  CASE
    WHEN policies_count = 4 THEN '✅ CORRECT'
    WHEN policies_count > 4 THEN '⚠️ TOO MANY - May have duplicates'
    WHEN policies_count < 4 THEN '❌ TOO FEW - Missing policies'
  END AS policies_status,

  -- Indexes
  indexes_count,
  CASE
    WHEN indexes_count = 5 THEN '✅ CORRECT'
    WHEN indexes_count > 5 THEN '⚠️ TOO MANY - May include constraint indexes (usually OK)'
    WHEN indexes_count < 5 THEN '❌ TOO FEW - Missing indexes'
  END AS indexes_status,

  -- Functions
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
-- 2. 最重要的是最後一個 "DIAGNOSTIC SUMMARY V2" 表格
-- 3. 根據 diagnosis 和 schema_status 欄位的提示判斷問題原因
-- 4. 查看前面的詳細查詢結果找出具體細節

-- V2 版本改進：
-- - 不假設 classes 表有 teacher_id 欄位
-- - 檢查 classes 表的 schema 是否符合預期
-- - 使用 SELECT * 避免欄位不存在錯誤
-- - 增加 schema_status 診斷

-- 常見診斷結果：
-- - "NO CLASSES EXIST" → 需要先建立 classes 資料
-- - "NO ACTIVE CLASSES" → 執行：UPDATE classes SET is_active = TRUE WHERE ...
-- - "SCHEMA MISMATCH" → classes 表結構與預期不同，需要調整 Migration 策略
-- - "INSERT FAILED" → 檢查約束條件或權限問題

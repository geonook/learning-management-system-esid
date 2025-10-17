-- =====================================================
-- Database Schema 發現腳本
-- 用途：了解 Supabase Cloud 資料庫的實際結構
-- 執行：在 Supabase Dashboard SQL Editor 執行
-- =====================================================

-- =====================================================
-- 1. 列出所有 public schema 的表
-- =====================================================

SELECT
  '1. All Tables in Public Schema' AS check_name,
  tablename AS table_name,
  tableowner AS owner,
  hasindexes AS has_indexes,
  hasrules AS has_rules,
  hastriggers AS has_triggers
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- =====================================================
-- 2. Classes 表的完整結構（關鍵！）
-- =====================================================

SELECT
  '2. Classes Table Structure' AS check_name,
  column_name,
  data_type,
  udt_name AS type_name,
  is_nullable,
  column_default,
  character_maximum_length,
  numeric_precision,
  numeric_scale
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'classes'
ORDER BY ordinal_position;

-- =====================================================
-- 3. Courses 表的完整結構
-- =====================================================

SELECT
  '3. Courses Table Structure' AS check_name,
  column_name,
  data_type,
  udt_name AS type_name,
  is_nullable,
  column_default,
  character_maximum_length,
  numeric_precision,
  numeric_scale
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'courses'
ORDER BY ordinal_position;

-- =====================================================
-- 4. Users 表的完整結構
-- =====================================================

SELECT
  '4. Users Table Structure' AS check_name,
  column_name,
  data_type,
  udt_name AS type_name,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
ORDER BY ordinal_position;

-- =====================================================
-- 5. Students 表的完整結構
-- =====================================================

SELECT
  '5. Students Table Structure' AS check_name,
  column_name,
  data_type,
  udt_name AS type_name,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'students'
ORDER BY ordinal_position;

-- =====================================================
-- 6. 所有 ENUM 類型
-- =====================================================

SELECT
  '6. All ENUM Types' AS check_name,
  t.typname AS enum_name,
  e.enumlabel AS enum_value,
  e.enumsortorder AS sort_order
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
ORDER BY t.typname, e.enumsortorder;

-- =====================================================
-- 7. Classes 表的約束
-- =====================================================

SELECT
  '7. Classes Table Constraints' AS check_name,
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
WHERE conrelid = 'public.classes'::regclass
ORDER BY contype, conname;

-- =====================================================
-- 8. Courses 表的約束
-- =====================================================

SELECT
  '8. Courses Table Constraints' AS check_name,
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
-- 9. 所有 Foreign Key 關係
-- =====================================================

SELECT
  '9. All Foreign Key Relationships' AS check_name,
  tc.table_name AS from_table,
  kcu.column_name AS from_column,
  ccu.table_name AS to_table,
  ccu.column_name AS to_column,
  tc.constraint_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name;

-- =====================================================
-- 10. 資料表記錄數統計
-- =====================================================

SELECT
  '10. Table Row Counts' AS check_name,
  'users' AS table_name,
  COUNT(*) AS row_count,
  COUNT(*) FILTER (WHERE is_active = TRUE) AS active_count
FROM users
UNION ALL
SELECT
  '10. Table Row Counts',
  'classes',
  COUNT(*),
  COUNT(*) FILTER (WHERE is_active = TRUE)
FROM classes
UNION ALL
SELECT
  '10. Table Row Counts',
  'students',
  COUNT(*),
  COUNT(*) FILTER (WHERE is_active = TRUE)
FROM students
UNION ALL
SELECT
  '10. Table Row Counts',
  'courses',
  COUNT(*),
  COUNT(*) FILTER (WHERE is_active = TRUE)
FROM courses
ORDER BY table_name;

-- =====================================================
-- 11. Sample Classes Data (前 5 筆)
-- =====================================================

-- 使用動態查詢避免欄位不存在錯誤
DO $$
DECLARE
  classes_columns TEXT;
BEGIN
  SELECT string_agg(column_name, ', ' ORDER BY ordinal_position)
  INTO classes_columns
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'classes';

  RAISE NOTICE '11. Classes table columns: %', classes_columns;
END $$;

-- 安全的 sample 查詢（只查詢保證存在的欄位）
SELECT
  '11. Sample Classes Data' AS check_name,
  *
FROM (
  SELECT * FROM classes LIMIT 5
) AS sample;

-- =====================================================
-- 12. Sample Courses Data (前 5 筆)
-- =====================================================

SELECT
  '12. Sample Courses Data' AS check_name,
  *
FROM (
  SELECT * FROM courses LIMIT 5
) AS sample;

-- =====================================================
-- SCHEMA DISCOVERY SUMMARY
-- =====================================================

WITH schema_summary AS (
  SELECT
    (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public') AS total_tables,
    (SELECT COUNT(*) FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace WHERE n.nspname = 'public' AND t.typtype = 'e') AS total_enums,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'classes') AS classes_columns_count,
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'courses') AS courses_columns_count,
    (SELECT COUNT(*) FROM classes) AS classes_row_count,
    (SELECT COUNT(*) FROM classes WHERE is_active = TRUE) AS active_classes_count,
    (SELECT COUNT(*) FROM courses) AS courses_row_count,
    (SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'classes' AND column_name = 'teacher_id')) AS classes_has_teacher_id,
    (SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_name = 'classes' AND column_name = 'track')) AS classes_has_track
)
SELECT
  '=== SCHEMA DISCOVERY SUMMARY ===' AS section,
  total_tables,
  total_enums,
  classes_columns_count,
  courses_columns_count,
  classes_row_count,
  active_classes_count,
  courses_row_count,
  classes_has_teacher_id,
  classes_has_track,
  CASE
    WHEN courses_row_count = 0 AND active_classes_count = 0 THEN '❌ NO ACTIVE CLASSES - Cannot create courses'
    WHEN courses_row_count = 0 AND active_classes_count > 0 THEN '⚠️ NO COURSES BUT HAS CLASSES - Migration 008 failed to insert'
    WHEN courses_row_count > 0 THEN '✅ COURSES EXIST'
    ELSE '⚠️ UNKNOWN STATE'
  END AS courses_status,
  CASE
    WHEN NOT classes_has_teacher_id THEN '⚠️ classes.teacher_id MISSING - Schema different from expected'
    WHEN NOT classes_has_track THEN '⚠️ classes.track MISSING - Schema different from expected'
    ELSE '✅ Classes table has expected columns'
  END AS classes_schema_status
FROM schema_summary;

-- =====================================================
-- 使用說明
-- =====================================================

-- 執行此腳本後：
-- 1. 查看所有查詢結果
-- 2. 重點關注：
--    - 第 2 個表格：Classes 表結構（確認有哪些欄位）
--    - 第 3 個表格：Courses 表結構（確認 Migration 008 是否成功）
--    - 第 6 個表格：所有 ENUM 類型（確認 course_type 是否存在）
--    - 最後一個表格：SCHEMA DISCOVERY SUMMARY（總結）
--
-- 3. 根據結果判斷：
--    - 如果 classes_has_teacher_id = false，代表 schema 與預期不同
--    - 如果 courses_row_count = 0，需要調查為什麼沒有插入資料
--    - 如果 active_classes_count = 0，需要先建立或啟用 classes

-- ========================================
-- LMS-ESID 資料庫架構診斷腳本
-- 執行日期: 2025-10-27
-- 目的: 驗證資料庫實際狀態與預期架構
-- ========================================

-- ========================================
-- 1. 檢查關鍵表格是否存在
-- ========================================
SELECT
  '表格存在性檢查' as check_type,
  table_name,
  CASE
    WHEN table_name IN (
      SELECT tablename
      FROM pg_tables
      WHERE schemaname = 'public'
    ) THEN '✅ 存在'
    ELSE '❌ 不存在'
  END as status
FROM (
  VALUES
    ('users'),
    ('classes'),
    ('students'),
    ('courses'),
    ('student_courses'),  -- 關鍵：可能不存在
    ('exams'),
    ('scores'),
    ('assessment_codes'),
    ('assessment_titles')
) AS expected_tables(table_name)
ORDER BY
  CASE
    WHEN table_name IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public')
    THEN 0 ELSE 1
  END,
  table_name;

-- ========================================
-- 2. 檢查 scores 表欄位（特別是 course_id）
-- ========================================
SELECT
  '成績表欄位檢查' as check_type,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'scores'
ORDER BY ordinal_position;

-- ========================================
-- 3. 檢查 classes 表約束（track 是否允許 NULL）
-- ========================================
SELECT
  'Classes 表約束檢查' as check_type,
  column_name,
  data_type,
  is_nullable,
  CASE
    WHEN is_nullable = 'YES' THEN '✅ 允許 NULL (正確)'
    ELSE '❌ NOT NULL (應該允許 NULL)'
  END as track_constraint_status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'classes'
  AND column_name = 'track';

-- ========================================
-- 4. 檢查 students 表 level 欄位型別
-- ========================================
SELECT
  'Students Level 欄位檢查' as check_type,
  column_name,
  data_type,
  udt_name,
  CASE
    WHEN data_type = 'text' THEN '✅ TEXT 型別 (正確)'
    WHEN data_type = 'USER-DEFINED' THEN '⚠️ ENUM 型別 (應改為 TEXT)'
    ELSE '❓ 未知型別'
  END as type_status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'students'
  AND column_name = 'level';

-- ========================================
-- 5. 檢查 RLS 政策
-- ========================================
SELECT
  'RLS 政策檢查' as check_type,
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- ========================================
-- 6. 檢查關鍵索引
-- ========================================
SELECT
  '索引檢查' as check_type,
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('students', 'scores', 'exams', 'courses')
ORDER BY tablename, indexname;

-- ========================================
-- 7. 檢查 Analytics 視圖
-- ========================================
SELECT
  '分析視圖檢查' as check_type,
  table_name as view_name,
  CASE
    WHEN table_type = 'VIEW' THEN '✅ 一般視圖'
    WHEN table_type = 'MATERIALIZED VIEW' THEN '🚀 物化視圖'
    ELSE table_type
  END as view_type
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'student_grade_aggregates',
    'class_statistics',
    'teacher_performance',
    'exam_completion_stats'
  )
ORDER BY table_name;

-- ========================================
-- 8. 資料統計（確認資料存在）
-- ========================================
SELECT '資料統計' as check_type,
       '班級數量' as metric,
       COUNT(*)::text as value
FROM classes WHERE is_active = true
UNION ALL
SELECT '資料統計', '課程數量', COUNT(*)::text
FROM courses WHERE is_active = true
UNION ALL
SELECT '資料統計', '學生數量', COUNT(*)::text
FROM students WHERE is_active = true
UNION ALL
SELECT '資料統計', '成績記錄數', COUNT(*)::text
FROM scores
UNION ALL
SELECT '資料統計', '考試數量', COUNT(*)::text
FROM exams WHERE is_active = true;

-- ========================================
-- 9. 檢查 course_type 分佈（驗證「一班三師」架構）
-- ========================================
SELECT
  '一班三師架構驗證' as check_type,
  class_id,
  COUNT(*) as course_count,
  STRING_AGG(course_type::text, ', ' ORDER BY course_type) as course_types,
  CASE
    WHEN COUNT(*) = 3
      AND COUNT(DISTINCT course_type) = 3
      AND bool_and(course_type IN ('LT', 'IT', 'KCFS'))
    THEN '✅ 完整（LT+IT+KCFS）'
    WHEN COUNT(*) < 3 THEN '⚠️ 課程數量不足'
    ELSE '❌ 課程類型異常'
  END as architecture_status
FROM courses
WHERE is_active = true
GROUP BY class_id
ORDER BY course_count DESC, class_id
LIMIT 10;

-- ========================================
-- 10. 檢查危險的 RLS 政策（Anonymous access）
-- ========================================
SELECT
  '🚨 安全風險檢查' as check_type,
  tablename,
  policyname,
  qual,
  '❌ 允許匿名存取 - 嚴重安全風險' as risk_level
FROM pg_policies
WHERE schemaname = 'public'
  AND (
    policyname ILIKE '%anonymous%'
    OR qual = 'true'
    OR qual IS NULL
  )
  AND cmd = 'SELECT'
ORDER BY tablename;

-- ========================================
-- 總結報告
-- ========================================
SELECT
  '========================================' as summary,
  '診斷報告總結' as details
UNION ALL
SELECT
  '檢查項目',
  '狀態'
UNION ALL
SELECT
  '1. 關鍵表格',
  CASE
    WHEN EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'student_courses')
    THEN '✅ student_courses 存在'
    ELSE '❌ student_courses 不存在 (需建立)'
  END
UNION ALL
SELECT
  '2. Scores.course_id',
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'scores'
        AND column_name = 'course_id'
    )
    THEN '✅ 欄位存在'
    ELSE '❌ 欄位不存在 (需新增)'
  END
UNION ALL
SELECT
  '3. Classes.track NULL',
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'classes'
        AND column_name = 'track'
        AND is_nullable = 'YES'
    )
    THEN '✅ 允許 NULL (正確)'
    ELSE '❌ NOT NULL 約束 (需修改)'
  END
UNION ALL
SELECT
  '4. RLS 安全性',
  CASE
    WHEN EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public'
        AND (policyname ILIKE '%anonymous%' OR qual = 'true')
    )
    THEN '🚨 存在危險政策 (需立即修復)'
    ELSE '✅ 未發現明顯風險'
  END
UNION ALL
SELECT
  '5. Analytics 視圖',
  (
    SELECT COUNT(*)::text || ' 個視圖存在'
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name IN ('student_grade_aggregates', 'class_statistics', 'teacher_performance')
  );


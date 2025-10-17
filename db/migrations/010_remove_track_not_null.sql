-- =====================================================
-- Migration 010: 移除 track 欄位的 NOT NULL 約束
-- Date: 2025-10-17
-- Purpose: 支援「一班三師」架構，班級不屬於單一 track
-- =====================================================

-- 說明：
-- 在「一班三師」架構下，每個班級都有 LT/IT/KCFS 三種課程
-- 因此班級本身不屬於任何單一 track
-- Track 的概念只存在於 courses 表的 course_type 欄位
-- classes.track 和 students.track 應該允許 NULL 值

-- 根本問題：
-- - 舊 schema 假設每個班級屬於一個 track（local/international）
-- - 新架構中，班級有三種課程，不屬於單一 track
-- - users.track 儲存 Head Teacher 負責的課程類型（LT/IT/KCFS）
-- - courses.course_type 儲存實際課程類型

-- =====================================================
-- Step 1: 移除 classes.track 的 NOT NULL 約束
-- =====================================================

ALTER TABLE classes
  ALTER COLUMN track DROP NOT NULL;

-- =====================================================
-- Step 2: 移除 students.track 的 NOT NULL 約束
-- =====================================================

ALTER TABLE students
  ALTER COLUMN track DROP NOT NULL;

-- =====================================================
-- 驗證修改結果
-- =====================================================

-- 檢查 track 欄位的 nullable 狀態
SELECT
  '=== TRACK COLUMN NULLABLE STATUS ===' AS section,
  table_name,
  column_name,
  data_type,
  is_nullable,
  CASE
    WHEN is_nullable = 'YES' THEN '✅ NULLABLE'
    ELSE '❌ NOT NULL'
  END AS status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('classes', 'students')
  AND column_name = 'track'
ORDER BY table_name;

-- 測試插入 NULL 值（驗證功能）
DO $$
BEGIN
  -- 測試插入 track = NULL 的班級
  INSERT INTO classes (name, grade, level, track, academic_year, is_active)
  VALUES ('Test_NULL_Track', 1, 'G1E1', NULL, '2024-2025', TRUE);

  -- 刪除測試資料
  DELETE FROM classes WHERE name = 'Test_NULL_Track';

  RAISE NOTICE '✅ Track NULL constraint test PASSED - NULL values accepted';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Track NULL constraint test FAILED: %', SQLERRM;
END $$;

-- =====================================================
-- Migration 完成
-- =====================================================

SELECT
  '=== MIGRATION 010 COMPLETED ===' AS section,
  'Track columns now allow NULL values' AS status,
  'Classes and students can have NULL track' AS description,
  'Ready to insert real class data with track = NULL' AS next_step;

-- =====================================================
-- 使用說明
-- =====================================================

-- Migration 010 執行後：
-- 1. classes.track 允許 NULL 值
-- 2. students.track 允許 NULL 值
-- 3. 現有的 track 值（如果有）保持不變
-- 4. 新資料可以插入 track = NULL
--
-- 下一步：
-- 執行 CREATE_REAL_CLASSES_2025.sql
-- 插入 84 個班級（track = NULL）

-- =====================================================
-- 注意事項
-- =====================================================

-- 1. 此 migration 是安全的（只移除約束，不修改資料）
-- 2. 現有資料不受影響
-- 3. 向後相容（允許 NULL 不影響非 NULL 值）
-- 4. 可以安全地重複執行（ALTER COLUMN DROP NOT NULL 是 idempotent）
-- 5. 符合「一班三師」架構設計

-- =====================================================
-- Track 欄位的新語意
-- =====================================================

-- classes.track:
--   - 允許 NULL（班級不屬於任何單一 track）
--   - 舊資料可能有值（歷史遺留）
--   - 新資料應該為 NULL（2025-2026 學年度起）
--
-- students.track:
--   - 允許 NULL（學生的 track 由其所屬班級的課程決定）
--   - 可選欄位
--
-- users.track:
--   - Head Teacher 必須有值（代表負責的課程類型：LT/IT/KCFS）
--   - Teacher 和 Admin 可為 NULL
--   - 用於 RLS 權限控制
--
-- courses.course_type:
--   - 必須有值（LT/IT/KCFS）
--   - 這才是真正的「track」概念所在

-- =====================================================
-- Migration 009: 修改 level 欄位類型為 TEXT
-- Date: 2025-10-17
-- Purpose: 支援 G1E1 ~ G6E3 格式（不同年級的 E1 能力標準不同）
-- =====================================================

-- 說明：
-- 原本 level_type ENUM ('E1', 'E2', 'E3') 無法支援完整的 level 格式
-- 改為 TEXT 類型以支援 G1E1, G2E2, G3E3 ... G6E3 等格式
-- 這樣可以明確區分不同年級的能力標準

-- =====================================================
-- Step 1: 修改 classes 表的 level 欄位
-- =====================================================

ALTER TABLE classes
  ALTER COLUMN level TYPE TEXT;

-- =====================================================
-- Step 2: 修改 students 表的 level 欄位
-- =====================================================

ALTER TABLE students
  ALTER COLUMN level TYPE TEXT;

-- =====================================================
-- Step 3: 加入格式驗證約束
-- =====================================================

-- Classes 表的 level 格式驗證
ALTER TABLE classes
  DROP CONSTRAINT IF EXISTS level_format_check;

ALTER TABLE classes
  ADD CONSTRAINT level_format_check
  CHECK (level IS NULL OR level ~ '^G[1-6]E[1-3]$');

-- Students 表的 level 格式驗證
ALTER TABLE students
  DROP CONSTRAINT IF EXISTS level_format_check;

ALTER TABLE students
  ADD CONSTRAINT level_format_check
  CHECK (level IS NULL OR level ~ '^G[1-6]E[1-3]$');

-- =====================================================
-- 驗證修改結果
-- =====================================================

-- 檢查 classes 表的 level 欄位
SELECT
  '=== CLASSES.LEVEL COLUMN INFO ===' AS section,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'classes'
  AND column_name = 'level';

-- 檢查 students 表的 level 欄位
SELECT
  '=== STUDENTS.LEVEL COLUMN INFO ===' AS section,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'students'
  AND column_name = 'level';

-- 檢查約束條件
SELECT
  '=== LEVEL CONSTRAINTS ===' AS section,
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname LIKE '%level%'
  AND conrelid::regclass::text IN ('classes', 'students')
ORDER BY table_name;

-- =====================================================
-- 測試插入（驗證格式驗證功能）
-- =====================================================

-- 測試：應該成功（正確格式）
DO $$
BEGIN
  -- 測試插入 G1E1 格式
  INSERT INTO classes (name, grade, level, track, academic_year, is_active)
  VALUES ('Test_Format_Check', 1, 'G1E1', NULL, '2024-2025', TRUE);

  -- 刪除測試資料
  DELETE FROM classes WHERE name = 'Test_Format_Check';

  RAISE NOTICE '✅ Level format validation test PASSED - G1E1 accepted';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Level format validation test FAILED: %', SQLERRM;
END $$;

-- 測試：應該失敗（錯誤格式）
DO $$
BEGIN
  -- 測試插入錯誤格式
  INSERT INTO classes (name, grade, level, track, academic_year, is_active)
  VALUES ('Test_Invalid_Format', 1, 'E1', NULL, '2024-2025', TRUE);

  RAISE NOTICE '❌ Level format validation FAILED - E1 should be rejected';
EXCEPTION
  WHEN check_violation THEN
    RAISE NOTICE '✅ Level format validation test PASSED - E1 correctly rejected';
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Unexpected error: %', SQLERRM;
END $$;

-- =====================================================
-- Migration 完成
-- =====================================================

SELECT
  '=== MIGRATION 009 COMPLETED ===' AS section,
  'Level columns changed to TEXT with format validation' AS status,
  'Supported formats: G1E1 ~ G6E3' AS valid_formats,
  'Ready to insert real class data' AS next_step;

-- =====================================================
-- 使用說明
-- =====================================================

-- Migration 009 執行後：
-- 1. classes.level 和 students.level 改為 TEXT 類型
-- 2. 加入格式驗證：只接受 G[1-6]E[1-3] 或 NULL
-- 3. 例如：G1E1, G2E2, G3E3, G4E1, G5E2, G6E3 等都是合法值
-- 4. 錯誤格式會被拒絕：E1, G7E1, G1E4, ABC 等
--
-- 下一步：
-- 執行 CREATE_REAL_CLASSES_2025.sql 插入 84 個真實班級資料

-- =====================================================
-- 注意事項
-- =====================================================

-- 1. 此 migration 是安全的（ALTER TYPE 而非 DROP/CREATE）
-- 2. 如果已有資料，會自動轉換（NULL 保持為 NULL）
-- 3. 格式驗證確保資料完整性
-- 4. 可以安全地重複執行（DROP CONSTRAINT IF EXISTS）

-- =====================================================
-- Migration 011: 移除 courses.teacher_id 的 NOT NULL 約束
-- Date: 2025-10-17
-- Purpose: 允許課程建立時 teacher_id 為 NULL（待管理員指派）
-- =====================================================

-- 說明：
-- 課程建立和教師指派是兩個獨立的步驟
-- 1. 建立課程結構（class + course_type）
-- 2. 管理員稍後指派教師到課程
-- 因此 teacher_id 應該允許 NULL 值

-- 業務邏輯：
-- - 課程建立時：teacher_id = NULL（尚未指派）
-- - 教師指派後：teacher_id = <actual_teacher_uuid>
-- - RLS 政策：只有 admin 和 head teacher 可以指派教師

-- =====================================================
-- Step 1: 移除 courses.teacher_id 的 NOT NULL 約束
-- =====================================================

ALTER TABLE courses
  ALTER COLUMN teacher_id DROP NOT NULL;

-- =====================================================
-- 驗證修改結果
-- =====================================================

-- 檢查 teacher_id 欄位的 nullable 狀態
SELECT
  '=== TEACHER_ID COLUMN NULLABLE STATUS ===' AS section,
  column_name,
  data_type,
  is_nullable,
  CASE
    WHEN is_nullable = 'YES' THEN '✅ NULLABLE'
    ELSE '❌ NOT NULL'
  END AS status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'courses'
  AND column_name = 'teacher_id';

-- 測試插入 NULL 值（驗證功能）
DO $$
DECLARE
  test_class_id UUID;
  test_course_id UUID;
BEGIN
  -- 使用現有的第一個班級進行測試
  SELECT id INTO test_class_id FROM classes WHERE academic_year = '2025-2026' LIMIT 1;

  IF test_class_id IS NOT NULL THEN
    -- 測試插入 teacher_id = NULL 的課程
    INSERT INTO courses (class_id, course_type, teacher_id, academic_year, is_active)
    VALUES (test_class_id, 'LT', NULL, '2024-2025', TRUE)
    RETURNING id INTO test_course_id;

    -- 刪除測試資料
    DELETE FROM courses WHERE id = test_course_id;

    RAISE NOTICE '✅ Teacher_id NULL constraint test PASSED - NULL values accepted';
  ELSE
    RAISE NOTICE '⚠️ No classes found for testing - skipping test';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ Teacher_id NULL constraint test FAILED: %', SQLERRM;
END $$;

-- =====================================================
-- Migration 完成
-- =====================================================

SELECT
  '=== MIGRATION 011 COMPLETED ===' AS section,
  'Teacher_id column now allows NULL values' AS status,
  'Courses can be created without teacher assignment' AS description,
  'Ready to insert courses with teacher_id = NULL' AS next_step;

-- =====================================================
-- 使用說明
-- =====================================================

-- Migration 011 執行後：
-- 1. courses.teacher_id 允許 NULL 值
-- 2. 課程建立時可以不指派教師
-- 3. 現有的 teacher 指派（如果有）保持不變
-- 4. 新課程可以插入 teacher_id = NULL
--
-- 下一步：
-- 執行 INSERT_COURSES_FOR_EXISTING_CLASSES.sql
-- 為 84 個班級建立 252 筆課程（teacher_id = NULL）

-- =====================================================
-- 注意事項
-- =====================================================

-- 1. 此 migration 是安全的（只移除約束，不修改資料）
-- 2. 現有的教師指派不受影響
-- 3. 向後相容（允許 NULL 不影響非 NULL 值）
-- 4. 可以安全地重複執行（ALTER COLUMN DROP NOT NULL 是 idempotent）
-- 5. 符合業務邏輯：課程建立 → 教師指派（兩個獨立步驟）

-- =====================================================
-- Teacher_id 欄位的語意
-- =====================================================

-- courses.teacher_id:
--   - NULL: 課程已建立，但尚未指派教師（初始狀態）
--   - UUID: 課程已指派給特定教師
--   - 只有 admin 和 head teacher 可以修改（RLS 政策控制）
--   - Teacher 只能查看自己被指派的課程（teacher_id = auth.uid()）

-- 工作流程：
--   1. Admin/HT 建立班級 (classes)
--   2. 系統自動建立課程 (courses with teacher_id = NULL)
--   3. Admin/HT 指派教師到課程 (UPDATE courses SET teacher_id = ...)
--   4. Teacher 登入後看到自己被指派的課程

-- RLS 政策：
--   - Admin: 可以指派任何教師到任何課程
--   - Head Teacher: 可以指派教師到自己年段+課程類型的課程
--   - Teacher: 只能查看，不能修改指派

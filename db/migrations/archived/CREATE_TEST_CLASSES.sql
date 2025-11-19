-- =====================================================
-- 建立測試 Classes 資料
-- 用途：為測試和驗證 Migration 008 建立樣本資料
-- 執行：在 Supabase Dashboard SQL Editor 執行
-- =====================================================

-- 說明：
-- 診斷結果顯示 classes 表是空的（total_classes = 0）
-- 這導致 Migration 008 無法插入課程記錄
-- 此腳本建立 5 個測試 classes，涵蓋不同年段和 track

-- =====================================================
-- 建立測試 Classes
-- =====================================================

-- 清理可能存在的測試資料（安全起見）
DELETE FROM classes WHERE name LIKE 'Test_%';

-- 插入 5 個測試 classes
INSERT INTO classes (name, grade, track, academic_year, is_active, created_at, updated_at)
VALUES
  -- Grade 1 - Local Track
  ('Test_G1_Luna', 1, 'local', '2024', TRUE, NOW(), NOW()),

  -- Grade 4 - Local Track
  ('Test_G4_Mars', 4, 'local', '2024', TRUE, NOW(), NOW()),

  -- Grade 4 - International Track
  ('Test_G4_Venus', 4, 'international', '2024', TRUE, NOW(), NOW()),

  -- Grade 6 - Local Track
  ('Test_G6_Jupiter', 6, 'local', '2024', TRUE, NOW(), NOW()),

  -- Grade 6 - International Track
  ('Test_G6_Saturn', 6, 'international', '2024', TRUE, NOW(), NOW())

ON CONFLICT (name, academic_year) DO UPDATE
SET
  grade = EXCLUDED.grade,
  track = EXCLUDED.track,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- =====================================================
-- 驗證建立結果
-- =====================================================

SELECT
  '=== TEST CLASSES CREATED ===' AS section,
  COUNT(*) AS total_test_classes,
  COUNT(*) FILTER (WHERE is_active = TRUE) AS active_test_classes,
  COUNT(*) FILTER (WHERE track = 'local') AS local_track_count,
  COUNT(*) FILTER (WHERE track = 'international') AS international_track_count
FROM classes
WHERE name LIKE 'Test_%';

-- 列出所有測試 classes
SELECT
  '=== TEST CLASSES LIST ===' AS section,
  id,
  name,
  grade,
  track,
  academic_year,
  is_active,
  created_at
FROM classes
WHERE name LIKE 'Test_%'
ORDER BY grade, track, name;

-- =====================================================
-- 使用說明
-- =====================================================

-- 執行此腳本後：
-- 1. 檢查第一個表格確認建立了 5 個測試 classes
-- 2. 檢查第二個表格查看詳細資料
--
-- 預期結果：
-- - total_test_classes: 5
-- - active_test_classes: 5
-- - local_track_count: 3
-- - international_track_count: 2
--
-- 下一步：
-- 執行 INSERT_COURSES_FOR_EXISTING_CLASSES.sql
-- 為這些測試 classes 建立課程記錄

-- =====================================================
-- 注意事項
-- =====================================================

-- 1. 這些是測試資料，名稱以 "Test_" 開頭方便識別
-- 2. 可以安全地刪除：DELETE FROM classes WHERE name LIKE 'Test_%';
-- 3. academic_year 設定為 '2024'，可依需求調整
-- 4. 沒有設定 teacher_id（因為 schema 中沒有此欄位）
-- 5. 所有 classes 都是 is_active = TRUE（符合 Migration 008 條件）

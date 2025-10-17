-- =====================================================
-- 建立 2025-2026 學年度真實班級資料
-- Date: 2025-10-17
-- Purpose: 林口校區 84 個班級 (G1-G6, 每年級 14 班)
-- =====================================================

-- 說明：
-- 1. 所有班級都是一樣的，每個班級都有 LT/IT/KCFS 三種課程
-- 2. Track 欄位設為 NULL（班級不屬於任何單一 track）
-- 3. Level 格式：G1E1 ~ G6E3（不同年級的 E1 能力標準不同）
-- 4. Academic Year: 2025-2026

-- =====================================================
-- 清理舊資料（安全起見）
-- =====================================================

DELETE FROM classes WHERE academic_year = '2025-2026';

-- =====================================================
-- 插入 84 個班級
-- =====================================================

INSERT INTO classes (name, grade, level, track, academic_year, is_active, created_at, updated_at)
VALUES
  -- =====================================================
  -- G1 (14 classes: 5×E1, 5×E2, 4×E3)
  -- =====================================================
  ('G1 Achievers', 1, 'G1E1', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G1 Discoverers', 1, 'G1E1', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G1 Voyagers', 1, 'G1E1', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G1 Explorers', 1, 'G1E1', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G1 Navigators', 1, 'G1E1', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G1 Adventurers', 1, 'G1E2', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G1 Guardians', 1, 'G1E2', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G1 Pioneers', 1, 'G1E2', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G1 Innovators', 1, 'G1E2', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G1 Visionaries', 1, 'G1E2', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G1 Pathfinders', 1, 'G1E3', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G1 Seekers', 1, 'G1E3', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G1 Trailblazers', 1, 'G1E3', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G1 Inventors', 1, 'G1E3', NULL, '2025-2026', TRUE, NOW(), NOW()),

  -- =====================================================
  -- G2 (14 classes: 5×E1, 5×E2, 4×E3)
  -- =====================================================
  ('G2 Pioneers', 2, 'G2E1', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G2 Explorers', 2, 'G2E1', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G2 Inventors', 2, 'G2E1', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G2 Achievers', 2, 'G2E1', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G2 Voyagers', 2, 'G2E1', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G2 Adventurers', 2, 'G2E2', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G2 Innovators', 2, 'G2E2', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G2 Guardians', 2, 'G2E2', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G2 Pathfinders', 2, 'G2E2', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G2 Visionaries', 2, 'G2E2', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G2 Navigators', 2, 'G2E3', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G2 Discoverers', 2, 'G2E3', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G2 Seekers', 2, 'G2E3', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G2 Trailblazers', 2, 'G2E3', NULL, '2025-2026', TRUE, NOW(), NOW()),

  -- =====================================================
  -- G3 (14 classes: 4×E1, 7×E2, 3×E3)
  -- =====================================================
  ('G3 Inventors', 3, 'G3E1', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G3 Innovators', 3, 'G3E1', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G3 Guardians', 3, 'G3E1', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G3 Achievers', 3, 'G3E1', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G3 Voyagers', 3, 'G3E2', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G3 Visionaries', 3, 'G3E2', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G3 Trailblazers', 3, 'G3E2', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G3 Discoverers', 3, 'G3E2', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G3 Explorers', 3, 'G3E2', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G3 Navigators', 3, 'G3E2', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G3 Adventurers', 3, 'G3E2', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G3 Seekers', 3, 'G3E3', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G3 Pathfinders', 3, 'G3E3', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G3 Pioneers', 3, 'G3E3', NULL, '2025-2026', TRUE, NOW(), NOW()),

  -- =====================================================
  -- G4 (14 classes: 4×E1, 7×E2, 3×E3)
  -- =====================================================
  ('G4 Seekers', 4, 'G4E1', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G4 Voyagers', 4, 'G4E1', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G4 Visionaries', 4, 'G4E1', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G4 Achievers', 4, 'G4E1', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G4 Navigators', 4, 'G4E2', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G4 Trailblazers', 4, 'G4E2', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G4 Pathfinders', 4, 'G4E2', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G4 Explorers', 4, 'G4E2', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G4 Adventurers', 4, 'G4E2', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G4 Innovators', 4, 'G4E2', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G4 Discoverers', 4, 'G4E2', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G4 Guardians', 4, 'G4E3', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G4 Inventors', 4, 'G4E3', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G4 Pioneers', 4, 'G4E3', NULL, '2025-2026', TRUE, NOW(), NOW()),

  -- =====================================================
  -- G5 (14 classes: 3×E1, 7×E2, 4×E3)
  -- =====================================================
  ('G5 Adventurers', 5, 'G5E1', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G5 Navigators', 5, 'G5E1', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G5 Pioneers', 5, 'G5E1', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G5 Inventors', 5, 'G5E2', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G5 Seekers', 5, 'G5E2', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G5 Discoverers', 5, 'G5E2', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G5 Guardians', 5, 'G5E2', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G5 Pathfinders', 5, 'G5E2', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G5 Explorers', 5, 'G5E2', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G5 Achievers', 5, 'G5E2', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G5 Voyagers', 5, 'G5E3', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G5 Trailblazers', 5, 'G5E3', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G5 Innovators', 5, 'G5E3', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G5 Visionaries', 5, 'G5E3', NULL, '2025-2026', TRUE, NOW(), NOW()),

  -- =====================================================
  -- G6 (14 classes: 4×E1, 7×E2, 3×E3)
  -- =====================================================
  ('G6 Explorers', 6, 'G6E1', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G6 Inventors', 6, 'G6E1', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G6 Adventurers', 6, 'G6E1', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G6 Achievers', 6, 'G6E1', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G6 Voyagers', 6, 'G6E2', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G6 Discoverers', 6, 'G6E2', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G6 Innovators', 6, 'G6E2', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G6 Guardians', 6, 'G6E2', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G6 Pathfinders', 6, 'G6E2', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G6 Seekers', 6, 'G6E2', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G6 Visionaries', 6, 'G6E2', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G6 Pioneers', 6, 'G6E3', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G6 Trailblazers', 6, 'G6E3', NULL, '2025-2026', TRUE, NOW(), NOW()),
  ('G6 Navigators', 6, 'G6E3', NULL, '2025-2026', TRUE, NOW(), NOW())

ON CONFLICT (name, academic_year) DO UPDATE SET
  grade = EXCLUDED.grade,
  level = EXCLUDED.level,
  track = EXCLUDED.track,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- =====================================================
-- 驗證建立結果
-- =====================================================

-- 1. 統計各年級的 Level 分佈
SELECT
  '=== CLASSES BY GRADE AND LEVEL ===' AS section,
  grade,
  COUNT(*) FILTER (WHERE level LIKE '%E1') AS e1_count,
  COUNT(*) FILTER (WHERE level LIKE '%E2') AS e2_count,
  COUNT(*) FILTER (WHERE level LIKE '%E3') AS e3_count,
  COUNT(*) AS total
FROM classes
WHERE academic_year = '2025-2026'
GROUP BY grade
ORDER BY grade;

-- 2. 列出所有班級（前 20 筆）
SELECT
  '=== CLASSES SAMPLE (FIRST 20) ===' AS section,
  name,
  grade,
  level,
  track,
  academic_year,
  is_active
FROM classes
WHERE academic_year = '2025-2026'
ORDER BY grade, level, name
LIMIT 20;

-- 3. 總計統計
SELECT
  '=== TOTAL SUMMARY ===' AS section,
  COUNT(*) AS total_classes,
  COUNT(*) FILTER (WHERE is_active = TRUE) AS active_classes,
  COUNT(DISTINCT grade) AS grade_count,
  COUNT(DISTINCT level) AS level_count,
  COUNT(*) FILTER (WHERE level LIKE '%E1') AS total_e1,
  COUNT(*) FILTER (WHERE level LIKE '%E2') AS total_e2,
  COUNT(*) FILTER (WHERE level LIKE '%E3') AS total_e3,
  CASE
    WHEN COUNT(*) = 84 THEN '✅ PASS'
    ELSE '❌ FAIL'
  END AS total_classes_status
FROM classes
WHERE academic_year = '2025-2026';

-- 4. Track 欄位檢查
SELECT
  '=== TRACK FIELD CHECK ===' AS section,
  COUNT(*) FILTER (WHERE track IS NULL) AS null_track_count,
  COUNT(*) FILTER (WHERE track IS NOT NULL) AS non_null_track_count,
  CASE
    WHEN COUNT(*) FILTER (WHERE track IS NULL) = 84 THEN '✅ PASS - All tracks are NULL'
    ELSE '❌ FAIL - Some tracks are not NULL'
  END AS track_status
FROM classes
WHERE academic_year = '2025-2026';

-- =====================================================
-- 使用說明
-- =====================================================

-- 執行此腳本後：
-- 1. 檢查第一個表格：確認各年級的 Level 分佈正確
--    - G1: 5×E1, 5×E2, 4×E3
--    - G2: 5×E1, 5×E2, 4×E3
--    - G3: 4×E1, 7×E2, 3×E3
--    - G4: 4×E1, 7×E2, 3×E3
--    - G5: 3×E1, 7×E2, 4×E3
--    - G6: 4×E1, 7×E2, 3×E3
--
-- 2. 檢查第二個表格：查看前 20 個班級的詳細資料
--
-- 3. 檢查第三個表格：確認總計為 84 個班級
--
-- 4. 檢查第四個表格：確認所有 track 欄位都是 NULL
--
-- 預期結果：
-- - total_classes: 84
-- - active_classes: 84
-- - grade_count: 6 (G1-G6)
-- - level_count: 18 (G1E1~G6E3)
-- - total_e1: 25
-- - total_e2: 38
-- - total_e3: 21
-- - total_classes_status: ✅ PASS
-- - track_status: ✅ PASS - All tracks are NULL
--
-- 下一步：
-- 執行 INSERT_COURSES_FOR_EXISTING_CLASSES.sql
-- 為這 84 個班級建立 252 筆課程記錄（84 × 3）

-- =====================================================
-- 注意事項
-- =====================================================

-- 1. 這些是 2025-2026 學年度的真實班級資料
-- 2. 所有 track 欄位都是 NULL（班級不屬於任何單一 track）
-- 3. Level 格式：G1E1 ~ G6E3（已通過 Migration 009 的格式驗證）
-- 4. 可以安全地重複執行（ON CONFLICT DO UPDATE）
-- 5. 每個班級稍後會有 3 筆課程記錄：LT/IT/KCFS

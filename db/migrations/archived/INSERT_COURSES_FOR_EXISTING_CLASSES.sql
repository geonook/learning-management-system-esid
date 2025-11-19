-- =====================================================
-- 為現有 Classes 建立課程記錄
-- 用途：為測試 classes 建立三種課程類型 (LT/IT/KCFS)
-- 執行：在 Supabase Dashboard SQL Editor 執行
-- 前置條件：必須先執行 CREATE_TEST_CLASSES.sql
-- =====================================================

-- 說明：
-- 此腳本重新執行 Migration 008 的課程插入邏輯
-- 為每個 active class 建立 3 筆課程記錄（LT, IT, KCFS）
-- teacher_id 初始設為 NULL，稍後由管理員指派

-- =====================================================
-- 插入課程記錄
-- =====================================================

INSERT INTO courses (class_id, course_type, teacher_id, academic_year, is_active)
SELECT
  c.id AS class_id,
  ct.course_type,
  NULL AS teacher_id,  -- 稍後由管理員指派
  c.academic_year,
  TRUE AS is_active
FROM classes c
CROSS JOIN (
  VALUES
    ('LT'::course_type),
    ('IT'::course_type),
    ('KCFS'::course_type)
) AS ct(course_type)
WHERE c.is_active = TRUE
ON CONFLICT (class_id, course_type, academic_year) DO NOTHING;

-- =====================================================
-- 驗證插入結果
-- =====================================================

-- 1. 課程總數統計
SELECT
  '=== COURSES CREATION SUMMARY ===' AS section,
  COUNT(*) AS total_courses_created,
  COUNT(*) FILTER (WHERE course_type = 'LT') AS lt_courses,
  COUNT(*) FILTER (WHERE course_type = 'IT') AS it_courses,
  COUNT(*) FILTER (WHERE course_type = 'KCFS') AS kcfs_courses,
  COUNT(DISTINCT class_id) AS classes_with_courses
FROM courses;

-- 2. 每個班級的課程分佈
SELECT
  '=== COURSES BY CLASS ===' AS section,
  c.name AS class_name,
  c.grade,
  c.track,
  COUNT(co.id) AS course_count,
  ARRAY_AGG(co.course_type ORDER BY co.course_type) AS course_types,
  CASE
    WHEN COUNT(co.id) = 3 THEN '✅ Complete'
    ELSE '❌ Missing courses'
  END AS status
FROM classes c
LEFT JOIN courses co ON co.class_id = c.id
WHERE c.is_active = TRUE
GROUP BY c.id, c.name, c.grade, c.track
ORDER BY c.grade, c.name;

-- 3. 課程類型分佈
SELECT
  '=== COURSES BY TYPE ===' AS section,
  course_type,
  COUNT(*) AS total,
  COUNT(teacher_id) AS assigned,
  COUNT(*) - COUNT(teacher_id) AS unassigned
FROM courses
GROUP BY course_type
ORDER BY course_type;

-- =====================================================
-- 使用說明
-- =====================================================

-- 執行此腳本後：
-- 1. 檢查第一個表格確認課程總數（預期：15 = 5 classes × 3 types）
-- 2. 檢查第二個表格確認每個 class 都有 3 筆課程
-- 3. 檢查第三個表格確認每種 course_type 數量相同
--
-- 預期結果：
-- - total_courses_created: 15
-- - lt_courses: 5
-- - it_courses: 5
-- - kcfs_courses: 5
-- - classes_with_courses: 5
-- - 每個 class 的 status: ✅ Complete
--
-- 下一步：
-- 執行 VERIFY_MIGRATIONS_SIMPLE.sql
-- 驗證整個 Migration 008 完整性

-- =====================================================
-- 注意事項
-- =====================================================

-- 1. 此腳本可以安全地重複執行（ON CONFLICT DO NOTHING）
-- 2. 所有 teacher_id 初始為 NULL
-- 3. 管理員需要在系統中手動指派教師到課程
-- 4. 課程指派時會自動驗證 teacher_type 是否匹配 course_type
-- 5. 若 classes 表為空，此腳本不會插入任何記錄（需先執行 CREATE_TEST_CLASSES.sql）

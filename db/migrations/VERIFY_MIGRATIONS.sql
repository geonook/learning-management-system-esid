-- =====================================================
-- Migration 驗證腳本
-- 用途：驗證 Migration 007 + 008 + RLS 003 是否成功執行
-- 執行時間：執行 EXECUTE_ALL_MIGRATIONS.sql 之後
-- =====================================================

-- =====================================================
-- 1. 檢查 courses 表結構
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=== 1. Checking courses table structure ===';
END $$;

SELECT
  column_name,
  data_type,
  udt_name AS enum_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'courses'
ORDER BY ordinal_position;

-- 預期結果：8 個欄位
-- id (uuid), class_id (uuid), course_type (course_type),
-- teacher_id (uuid), academic_year (text), is_active (boolean),
-- created_at (timestamp), updated_at (timestamp)

-- =====================================================
-- 2. 檢查 courses 表的約束
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=== 2. Checking courses table constraints ===';
END $$;

SELECT
  conname AS constraint_name,
  contype AS constraint_type,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'public.courses'::regclass
ORDER BY conname;

-- 預期結果：
-- - PRIMARY KEY (courses_pkey)
-- - UNIQUE (courses_class_id_course_type_academic_year_key)
-- - CHECK (teacher_matches_course_type)
-- - FOREIGN KEY (courses_class_id_fkey → classes)
-- - FOREIGN KEY (courses_teacher_id_fkey → users)

-- =====================================================
-- 3. 檢查 courses 表的索引
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=== 3. Checking courses table indexes ===';
END $$;

SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'courses'
ORDER BY indexname;

-- 預期結果：5 個索引
-- - courses_pkey (PRIMARY KEY)
-- - idx_courses_class
-- - idx_courses_teacher
-- - idx_courses_type
-- - idx_courses_academic_year

-- =====================================================
-- 4. 檢查 courses 表的 RLS policies
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=== 4. Checking courses RLS policies ===';
END $$;

SELECT
  policyname,
  cmd AS command,
  roles,
  permissive
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'courses'
ORDER BY policyname;

-- 預期結果：4 個 policies
-- - admin_full_access_courses (ALL)
-- - head_teacher_access_courses (ALL)
-- - teacher_view_own_courses (SELECT)
-- - teacher_view_class_courses (SELECT)

-- =====================================================
-- 5. 檢查課程記錄統計
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=== 5. Checking course records statistics ===';
END $$;

-- 5.1 總課程數
SELECT
  'Total courses' AS metric,
  COUNT(*) AS count
FROM courses;

-- 5.2 課程類型分佈
SELECT
  course_type,
  COUNT(*) AS total_courses,
  COUNT(teacher_id) AS assigned_courses,
  COUNT(*) - COUNT(teacher_id) AS unassigned_courses
FROM courses
GROUP BY course_type
ORDER BY course_type;

-- 預期：每種類型的數量應該相同（每個 class 都有 LT/IT/KCFS 三種課程）

-- 5.3 每個班級的課程數
SELECT
  c.name AS class_name,
  c.grade,
  c.track,
  COUNT(co.id) AS course_count,
  ARRAY_AGG(co.course_type ORDER BY co.course_type) AS course_types
FROM classes c
LEFT JOIN courses co ON co.class_id = c.id
WHERE c.is_active = TRUE
GROUP BY c.id, c.name, c.grade, c.track
HAVING COUNT(co.id) != 3
ORDER BY c.grade, c.name;

-- 預期：應該返回 0 筆（每個 active class 都應該有 3 筆課程）

-- =====================================================
-- 6. 檢查 user self-registration policy
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=== 6. Checking user self-registration policy ===';
END $$;

SELECT
  policyname,
  cmd AS command,
  roles,
  permissive
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'users'
  AND policyname = 'allow_authenticated_user_self_insert';

-- 預期結果：1 筆記錄
-- - policyname: allow_authenticated_user_self_insert
-- - cmd: INSERT
-- - roles: {authenticated}

-- =====================================================
-- 7. 檢查 update_updated_at_column() 函數
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=== 7. Checking update_updated_at_column() function ===';
END $$;

SELECT
  proname AS function_name,
  pg_get_function_result(oid) AS return_type,
  pg_get_function_arguments(oid) AS arguments,
  prosrc AS source_code
FROM pg_proc
WHERE proname = 'update_updated_at_column'
  AND pronamespace = 'public'::regnamespace;

-- 預期結果：1 筆記錄
-- - function_name: update_updated_at_column
-- - return_type: trigger
-- - arguments: (empty)

-- =====================================================
-- 8. 檢查 courses 表的 trigger
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=== 8. Checking courses table triggers ===';
END $$;

SELECT
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'courses'
  AND trigger_schema = 'public'
ORDER BY trigger_name;

-- 預期結果：1 筆記錄
-- - trigger_name: update_courses_updated_at
-- - event_manipulation: UPDATE
-- - action_timing: BEFORE
-- - action_statement: EXECUTE FUNCTION update_updated_at_column()

-- =====================================================
-- 9. 檢查 course_type ENUM 值
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '=== 9. Checking course_type ENUM values ===';
END $$;

SELECT
  enumlabel AS enum_value,
  enumsortorder AS sort_order
FROM pg_enum
WHERE enumtypid = 'course_type'::regtype
ORDER BY enumsortorder;

-- 預期結果：3 筆記錄
-- - IT
-- - KCFS
-- - LT

-- =====================================================
-- FINAL SUMMARY
-- =====================================================

DO $$
DECLARE
  courses_count INTEGER;
  policies_count INTEGER;
  indexes_count INTEGER;
  active_classes_count INTEGER;
  courses_per_class NUMERIC;
BEGIN
  RAISE NOTICE '=== FINAL VERIFICATION SUMMARY ===';

  -- Count courses
  SELECT COUNT(*) INTO courses_count FROM courses;
  RAISE NOTICE 'Total courses: %', courses_count;

  -- Count active classes
  SELECT COUNT(*) INTO active_classes_count FROM classes WHERE is_active = TRUE;
  RAISE NOTICE 'Active classes: %', active_classes_count;

  -- Calculate courses per class
  IF active_classes_count > 0 THEN
    courses_per_class := courses_count::NUMERIC / active_classes_count;
    RAISE NOTICE 'Courses per class: % (expected: 3.00)', ROUND(courses_per_class, 2);

    IF courses_per_class = 3 THEN
      RAISE NOTICE '✅ Each active class has exactly 3 courses';
    ELSE
      RAISE WARNING '⚠️ Some classes may be missing courses';
    END IF;
  END IF;

  -- Count RLS policies
  SELECT COUNT(*) INTO policies_count
  FROM pg_policies
  WHERE tablename = 'courses';
  RAISE NOTICE 'RLS policies on courses: % (expected: 4)', policies_count;

  -- Count indexes
  SELECT COUNT(*) INTO indexes_count
  FROM pg_indexes
  WHERE tablename = 'courses';
  RAISE NOTICE 'Indexes on courses: % (expected: 5)', indexes_count;

  -- Final status
  IF courses_count > 0 AND policies_count = 4 AND indexes_count = 5 THEN
    RAISE NOTICE '=== ✅ ALL MIGRATIONS VERIFIED SUCCESSFULLY ===';
  ELSE
    RAISE WARNING '=== ⚠️ SOME VERIFICATIONS FAILED - CHECK ABOVE ===';
  END IF;
END $$;

-- =====================================================
-- OPTIONAL: Sample courses data
-- =====================================================

-- Uncomment to see sample course records
-- SELECT
--   c.name AS class_name,
--   c.grade,
--   c.track,
--   co.course_type,
--   u.full_name AS teacher_name,
--   co.academic_year,
--   co.is_active
-- FROM courses co
-- JOIN classes c ON co.class_id = c.id
-- LEFT JOIN users u ON co.teacher_id = u.id
-- ORDER BY c.grade, c.name, co.course_type
-- LIMIT 20;

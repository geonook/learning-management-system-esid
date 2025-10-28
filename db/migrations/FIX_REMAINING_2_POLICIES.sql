-- ========================================
-- 修復剩餘的 2 個未優化 policies
-- ========================================

-- Policy 1: teachers_manage_own_courses
DROP POLICY IF EXISTS "teachers_manage_own_courses" ON courses;

CREATE POLICY "teachers_manage_own_courses" ON courses
    FOR ALL TO authenticated
    USING (teacher_id = (SELECT auth.uid()))  -- ✅ 優化：使用 subquery
    WITH CHECK (teacher_id = (SELECT auth.uid()));  -- ✅ 優化：使用 subquery

-- Policy 2: Students can see their own enrollments
DROP POLICY IF EXISTS "Students can see their own enrollments" ON student_courses;

CREATE POLICY "Students can see their own enrollments" ON student_courses
    FOR SELECT TO authenticated
    USING (student_id = (SELECT auth.uid()));  -- ✅ 優化：使用 subquery

-- ========================================
-- 驗證：檢查這 2 個 policies 是否優化成功
-- ========================================
SELECT
    '🔍 剩餘 2 個 policies 檢查' as "檢查項目",
    COUNT(*) as "未優化數量",
    CASE
        WHEN COUNT(*) = 0 THEN '🎉 全部完成！'
        ELSE '⚠️  還有 ' || COUNT(*) || ' 個未優化'
    END as "狀態"
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname IN ('teachers_manage_own_courses', 'Students can see their own enrollments')
  AND (
      (qual::text LIKE '%auth.uid()%' AND qual::text NOT LIKE '%SELECT%auth.uid()%')
      OR
      (with_check::text LIKE '%auth.uid()%' AND with_check::text NOT LIKE '%SELECT%auth.uid()%')
  );

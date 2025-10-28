-- ========================================
-- Debug: 檢查 users 表的 policy 實際內容
-- ========================================

SELECT
    policyname as "Policy 名稱",
    cmd as "操作",
    CASE
        WHEN qual IS NOT NULL THEN substring(qual::text, 1, 100)
        ELSE 'NULL'
    END as "USING 子句 (前100字元)",
    CASE
        WHEN with_check IS NOT NULL THEN substring(with_check::text, 1, 100)
        ELSE 'NULL'
    END as "WITH CHECK 子句 (前100字元)",
    CASE
        WHEN qual::text LIKE '%auth.uid()%' THEN '包含 auth.uid()'
        ELSE '不包含 auth.uid()'
    END as "USING 狀態",
    CASE
        WHEN qual::text LIKE '%(SELECT auth.uid())%' THEN '✅ 已優化'
        WHEN qual::text LIKE '%auth.uid()%' THEN '❌ 未優化'
        ELSE '➖ N/A'
    END as "USING 優化狀態"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'users'
ORDER BY policyname;

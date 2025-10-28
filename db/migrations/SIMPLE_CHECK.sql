-- ========================================
-- 超簡單的 Policy 狀態檢查
-- 只用一個查詢就能看到所有資訊
-- ========================================

SELECT
    '📊 POLICY 總覽' as "類型",
    COUNT(*) as "數量",
    '' as "詳細資訊"
FROM pg_policies
WHERE schemaname = 'public'

UNION ALL

SELECT
    '🔴 service_role_bypass',
    COUNT(*),
    string_agg(tablename, ', ' ORDER BY tablename)
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname = 'service_role_bypass'

UNION ALL

SELECT
    '🟡 authenticated_read',
    COUNT(*),
    string_agg(tablename, ', ' ORDER BY tablename)
FROM pg_policies
WHERE schemaname = 'public'
  AND (policyname LIKE '%authenticated%read%' OR policyname = 'users_own_profile')

UNION ALL

SELECT
    '❌ 未優化 (直接呼叫 auth.uid)',
    COUNT(*),
    string_agg(tablename || '.' || policyname, ', ')
FROM pg_policies
WHERE schemaname = 'public'
  AND (
      (qual::text LIKE '%auth.uid()%' AND qual::text NOT LIKE '%(SELECT auth.uid())%')
      OR
      (with_check::text LIKE '%auth.uid()%' AND with_check::text NOT LIKE '%(SELECT auth.uid())%')
  )

UNION ALL

SELECT
    '✅ 已優化 (使用 SELECT auth.uid)',
    COUNT(*),
    ''
FROM pg_policies
WHERE schemaname = 'public'
  AND (
      qual::text ~ '\(SELECT auth\.uid\(\)\)'
      OR
      with_check::text ~ '\(SELECT auth\.uid\(\)\)'
  )

ORDER BY "類型";

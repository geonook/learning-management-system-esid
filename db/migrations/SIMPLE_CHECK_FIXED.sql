-- ========================================
-- 超簡單的 Policy 狀態檢查 (修復版)
-- 修復：PostgreSQL 會自動加上 "AS uid" 別名
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
      -- 修復：PostgreSQL 會將 (SELECT auth.uid()) 儲存為 ( SELECT auth.uid() AS uid)
      -- 所以我們要找的是「有 auth.uid() 但沒有 SELECT」的情況
      (qual::text LIKE '%auth.uid()%' AND qual::text NOT LIKE '%SELECT%auth.uid()%')
      OR
      (with_check::text LIKE '%auth.uid()%' AND with_check::text NOT LIKE '%SELECT%auth.uid()%')
  )

UNION ALL

SELECT
    '✅ 已優化 (使用 SELECT auth.uid)',
    COUNT(*),
    string_agg(DISTINCT tablename, ', ' ORDER BY tablename)
FROM pg_policies
WHERE schemaname = 'public'
  AND (
      -- 修復：只要包含 "SELECT" 和 "auth.uid()" 就算優化成功
      (qual::text LIKE '%SELECT%auth.uid()%')
      OR
      (with_check::text LIKE '%SELECT%auth.uid()%')
  )

ORDER BY "類型";

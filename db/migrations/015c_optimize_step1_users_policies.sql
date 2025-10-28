-- ========================================
-- Migration 015c - Step 1: Optimize Users Table Policies
-- Purpose: 優化 users 資料表的 RLS policies（測試版本）
-- Date: 2025-10-28
-- ========================================

-- 優化策略：逐一 DROP 舊 policy，CREATE 新的優化版本

-- ========================================
-- 1. Admin full access to users
-- ========================================
DROP POLICY IF EXISTS "Admin full access to users" ON users;

CREATE POLICY "Admin full access to users" ON users
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = (SELECT auth.uid())  -- ✅ 優化：使用 subquery
            AND u.role = 'admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM users u
            WHERE u.id = (SELECT auth.uid())  -- ✅ 優化：使用 subquery
            AND u.role = 'admin'
        )
    );

-- ========================================
-- 2. Users can view own profile
-- ========================================
DROP POLICY IF EXISTS "Users can view own profile" ON users;

CREATE POLICY "Users can view own profile" ON users
    FOR SELECT TO authenticated
    USING (id = (SELECT auth.uid()));  -- ✅ 優化：使用 subquery

-- ========================================
-- 3. Users can update own profile
-- ========================================
DROP POLICY IF EXISTS "Users can update own profile" ON users;

CREATE POLICY "Users can update own profile" ON users
    FOR UPDATE TO authenticated
    USING (id = (SELECT auth.uid()))  -- ✅ 優化：使用 subquery
    WITH CHECK (
        id = (SELECT auth.uid())  -- ✅ 優化：使用 subquery
        AND role = (SELECT role FROM users WHERE id = (SELECT auth.uid()))  -- ✅ 優化：防止 role escalation
    );

-- ========================================
-- 4. Heads can view users in jurisdiction
-- ========================================
DROP POLICY IF EXISTS "Heads can view users in jurisdiction" ON users;

CREATE POLICY "Heads can view users in jurisdiction" ON users
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM users head
            WHERE head.id = (SELECT auth.uid())  -- ✅ 優化：使用 subquery
            AND head.role = 'head'
            AND (
                -- Same grade teachers
                (users.role = 'teacher' AND users.grade = head.grade)
                OR
                -- Students in their grade (through classes)
                (users.role = 'student' AND EXISTS (
                    SELECT 1 FROM students s
                    JOIN classes c ON s.class_id = c.id
                    WHERE s.id = users.id
                    AND c.grade = head.grade
                ))
            )
        )
    );

-- ========================================
-- 5. allow_authenticated_user_self_insert
-- ========================================
DROP POLICY IF EXISTS "allow_authenticated_user_self_insert" ON users;

CREATE POLICY "allow_authenticated_user_self_insert" ON users
    FOR INSERT TO authenticated
    WITH CHECK (id = (SELECT auth.uid()));  -- ✅ 優化：使用 subquery

-- ========================================
-- 6. users_own_profile (authenticated_read)
-- ========================================
DROP POLICY IF EXISTS "users_own_profile" ON users;

CREATE POLICY "users_own_profile" ON users
    FOR SELECT TO authenticated
    USING (id = (SELECT auth.uid()));  -- ✅ 優化：使用 subquery

-- ========================================
-- 7. users_authenticated_read
-- ========================================
DROP POLICY IF EXISTS "users_authenticated_read" ON users;

CREATE POLICY "users_authenticated_read" ON users
    FOR SELECT TO authenticated
    USING ((SELECT auth.uid()) IS NOT NULL);  -- ✅ 優化：使用 subquery

-- ========================================
-- 驗證：檢查 users 表的優化狀態
-- ========================================
SELECT
    'users 表優化結果' as "檢查項目",
    COUNT(*) as "總 policy 數",
    SUM(
        CASE
            WHEN qual::text ~ '\(SELECT auth\.uid\(\)\)'
                 OR with_check::text ~ '\(SELECT auth\.uid\(\)\)'
            THEN 1
            ELSE 0
        END
    ) as "已優化數",
    SUM(
        CASE
            WHEN (qual::text LIKE '%auth.uid()%' AND qual::text NOT LIKE '%(SELECT auth.uid())%')
                 OR (with_check::text LIKE '%auth.uid()%' AND with_check::text NOT LIKE '%(SELECT auth.uid())%')
            THEN 1
            ELSE 0
        END
    ) as "未優化數",
    CASE
        WHEN SUM(
            CASE
                WHEN (qual::text LIKE '%auth.uid()%' AND qual::text NOT LIKE '%(SELECT auth.uid())%')
                     OR (with_check::text LIKE '%auth.uid()%' AND with_check::text NOT LIKE '%(SELECT auth.uid())%')
                THEN 1
                ELSE 0
            END
        ) = 0 THEN '✅ 全部優化完成'
        ELSE '❌ 還有未優化的 policy'
    END as "狀態"
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'users';

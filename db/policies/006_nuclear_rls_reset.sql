-- NUCLEAR RLS RESET FOR ZEABUR SUPABASE
-- Date: 2025-08-13
-- Purpose: 最激進的 RLS 清理方案，完全重建表格權限結構

-- ====================================
-- 警告：這是最激進的清理方案
-- ====================================

-- 此腳本將：
-- 1. 清除所有可能的政策（包括系統生成的）
-- 2. 停用所有表格的 RLS
-- 3. 重建基本的表格權限
-- 4. 清除所有相關的函數和視圖

-- ====================================
-- 第一階段：核子級政策清除
-- ====================================

-- 使用動態 SQL 清除所有可能的政策
DO $$
DECLARE
    policy_record RECORD;
    table_record RECORD;
BEGIN
    -- 清除所有公共模式下的政策
    FOR policy_record IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
    LOOP
        BEGIN
            EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;', 
                policy_record.policyname, 
                policy_record.schemaname, 
                policy_record.tablename);
            RAISE NOTICE '清除政策: %.% -> %', 
                policy_record.tablename, 
                policy_record.policyname, 
                'SUCCESS';
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '清除政策失敗: %.% -> %', 
                policy_record.tablename, 
                policy_record.policyname, 
                SQLERRM;
        END;
    END LOOP;
    
    -- 停用所有表格的 RLS
    FOR table_record IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public'
        AND tablename IN ('users', 'classes', 'courses', 'students', 'exams', 'scores', 'assessment_titles', 'assessment_codes')
    LOOP
        BEGIN
            EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY;', table_record.tablename);
            RAISE NOTICE 'RLS 停用: % -> SUCCESS', table_record.tablename;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'RLS 停用失敗: % -> %', table_record.tablename, SQLERRM;
        END;
    END LOOP;
END $$;

-- ====================================
-- 第二階段：清除所有輔助函數
-- ====================================

-- 清除所有可能的輔助函數（包括多種簽名變體）
DROP FUNCTION IF EXISTS get_current_user_details() CASCADE;
DROP FUNCTION IF EXISTS get_current_user_details(text) CASCADE;
DROP FUNCTION IF EXISTS is_admin() CASCADE;
DROP FUNCTION IF EXISTS is_admin(uuid) CASCADE;
DROP FUNCTION IF EXISTS is_head_teacher() CASCADE;
DROP FUNCTION IF EXISTS is_head_teacher(uuid) CASCADE;
DROP FUNCTION IF EXISTS can_access_grade_track(integer, track_type) CASCADE;
DROP FUNCTION IF EXISTS can_access_grade_track(uuid, integer, track_type) CASCADE;
DROP FUNCTION IF EXISTS teaches_class(uuid) CASCADE;
DROP FUNCTION IF EXISTS teaches_class(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS get_current_user_id() CASCADE;
DROP FUNCTION IF EXISTS get_current_user_role_simple() CASCADE;
DROP FUNCTION IF EXISTS get_current_user_grade_track_simple() CASCADE;
DROP FUNCTION IF EXISTS get_user_role_from_jwt() CASCADE;
DROP FUNCTION IF EXISTS get_user_claims() CASCADE;

-- 清除任何自定義的權限檢查函數
DO $$
DECLARE
    func_record RECORD;
BEGIN
    FOR func_record IN 
        SELECT n.nspname as schema_name, p.proname as function_name
        FROM pg_proc p
        LEFT JOIN pg_namespace n ON p.pronamespace = n.oid
        WHERE n.nspname = 'public'
        AND (p.proname LIKE '%admin%' 
             OR p.proname LIKE '%teacher%' 
             OR p.proname LIKE '%access%'
             OR p.proname LIKE '%permission%'
             OR p.proname LIKE '%role%'
             OR p.proname LIKE '%auth%')
    LOOP
        BEGIN
            EXECUTE format('DROP FUNCTION IF EXISTS %I.%I CASCADE;', 
                func_record.schema_name, 
                func_record.function_name);
            RAISE NOTICE '清除函數: % -> SUCCESS', func_record.function_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '清除函數失敗: % -> %', func_record.function_name, SQLERRM;
        END;
    END LOOP;
END $$;

-- ====================================
-- 第三階段：清除問題視圖
-- ====================================

-- 清除所有可能的問題視圖
DROP VIEW IF EXISTS student_scores_with_grades CASCADE;
DROP VIEW IF EXISTS teacher_classes_view CASCADE;
DROP VIEW IF EXISTS user_permissions_view CASCADE;
DROP VIEW IF EXISTS class_access_view CASCADE;

-- 動態清除包含特定關鍵字的視圖
DO $$
DECLARE
    view_record RECORD;
BEGIN
    FOR view_record IN 
        SELECT table_name 
        FROM information_schema.views 
        WHERE table_schema = 'public'
        AND (table_name LIKE '%user%' 
             OR table_name LIKE '%class%' 
             OR table_name LIKE '%permission%'
             OR table_name LIKE '%access%')
    LOOP
        BEGIN
            EXECUTE format('DROP VIEW IF EXISTS %I CASCADE;', view_record.table_name);
            RAISE NOTICE '清除視圖: % -> SUCCESS', view_record.table_name;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE '清除視圖失敗: % -> %', view_record.table_name, SQLERRM;
        END;
    END LOOP;
END $$;

-- ====================================
-- 第四階段：重建基本權限（無 RLS）
-- ====================================

-- 授予基本的表格訪問權限給 authenticated 角色
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- 授予完全權限給 service_role
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;

-- ====================================
-- 第五階段：驗證清理結果
-- ====================================

-- 檢查剩餘的政策（應該為空）
SELECT 
    'POLICIES CHECK: ' || 
    CASE 
        WHEN COUNT(*) = 0 THEN 'ALL POLICIES CLEARED ✅'
        ELSE 'REMAINING POLICIES: ' || COUNT(*)::text || ' ❌'
    END as policy_status
FROM pg_policies 
WHERE schemaname = 'public';

-- 檢查 RLS 狀態（應該全部為 false）
SELECT 
    relname as table_name,
    CASE 
        WHEN relrowsecurity = false THEN 'RLS DISABLED ✅'
        ELSE 'RLS STILL ENABLED ❌'
    END as rls_status
FROM pg_class 
WHERE relname IN ('users', 'classes', 'courses', 'students', 'exams', 'scores', 'assessment_titles')
AND relkind = 'r'
ORDER BY relname;

-- 檢查剩餘的自定義函數
SELECT 
    'FUNCTIONS CHECK: ' ||
    CASE 
        WHEN COUNT(*) = 0 THEN 'ALL CUSTOM FUNCTIONS CLEARED ✅'
        ELSE 'REMAINING FUNCTIONS: ' || COUNT(*)::text || ' (可能需要手動檢查)'
    END as function_status
FROM pg_proc p
LEFT JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND (p.proname LIKE '%admin%' 
     OR p.proname LIKE '%teacher%' 
     OR p.proname LIKE '%access%'
     OR p.proname LIKE '%permission%'
     OR p.proname LIKE '%role%'
     OR p.proname LIKE '%auth%');

-- ====================================
-- 完成訊息
-- ====================================

SELECT '🚀 NUCLEAR RLS RESET COMPLETE 🚀' as status;
SELECT '所有 RLS 政策已清除，所有表格 RLS 已停用，基本權限已重建' as message;
SELECT '現在可以測試: SELECT count(*) FROM users;' as test_command;
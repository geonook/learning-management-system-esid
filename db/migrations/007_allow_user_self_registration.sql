-- =====================================================
-- 新用戶自主註冊 RLS 政策
-- 目的：允許 Google OAuth 登入的用戶為自己創建帳號記錄
-- 日期：2025-10-17
-- 作者：Claude Code
-- =====================================================

-- 問題：
-- 新用戶通過 Google OAuth 登入後，嘗試在 role-select 頁面創建 user 記錄時
-- 遭遇 RLS 政策阻擋：
-- "new row violates row-level security policy for table 'users'"

-- 解決方案：
-- 新增 RLS 政策，允許已驗證的用戶為自己插入記錄

-- =====================================================
-- 建立政策
-- =====================================================

CREATE POLICY "allow_authenticated_user_self_insert"
ON public.users
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() = id  -- 安全限制：用戶只能插入自己的 UUID
);

-- =====================================================
-- 驗證政策已建立
-- =====================================================

SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'users'
  AND policyname = 'allow_authenticated_user_self_insert';

-- =====================================================
-- 技術說明
-- =====================================================

-- 此政策的安全性保證：
-- 1. FOR INSERT: 只影響插入操作，不影響 SELECT/UPDATE/DELETE
-- 2. TO authenticated: 僅適用於已通過 OAuth 驗證的用戶
-- 3. WITH CHECK (auth.uid() = id):
--    - auth.uid() 是 Supabase 提供的當前登入用戶 UUID
--    - id 是要插入的 user 記錄的 id 欄位
--    - 這確保用戶只能創建自己的記錄，無法為他人創建帳號

-- 此政策與現有 RLS 政策共存：
-- - Admin 仍可全域存取所有 users
-- - Head Teacher 仍限定於自己的年段+校區
-- - Teacher 仍限定於自己的班級
-- - 新增：已驗證用戶可為自己創建首次記錄

-- 註冊流程：
-- 1. 用戶通過 Google OAuth 登入 → Supabase 創建 auth.users 記錄
-- 2. 系統檢測 public.users 不存在該用戶 → 導向 role-select 頁面
-- 3. 用戶選擇 Teacher Type → 前端呼叫 POST /api/users/create
-- 4. API 使用當前 session.user.id 創建 public.users 記錄
-- 5. 此 RLS 政策驗證 session.user.id === 插入的 user.id → 允許插入
-- 6. 新用戶記錄建立，is_active = false，等待 admin 審核

-- =====================================================
-- 執行結果範例
-- =====================================================

-- 預期輸出：
-- schemaname | tablename | policyname                            | permissive  | roles            | cmd
-- -----------+-----------+---------------------------------------+-------------+------------------+--------
-- public     | users     | allow_authenticated_user_self_insert  | PERMISSIVE  | {authenticated}  | INSERT

-- ✅ 如果看到以上結果，表示政策已成功建立

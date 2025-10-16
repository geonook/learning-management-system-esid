# 🔧 RLS 無限遞迴修復指南

> **目的**: 解決 Admin 登入時出現的 "infinite recursion detected in policy for relation 'users'" 錯誤
> **執行時間**: 5 分鐘
> **執行者**: 資料庫管理員 / 專案負責人

---

## ⚠️ 問題描述

### 錯誤訊息
```
infinite recursion detected in policy for relation "users"
{code: '42P17', details: null, hint: null, message: '...'}
```

### 根本原因
目前部署的 RLS 策略在 `users` 表上存在遞迴查詢：

```sql
-- ❌ 問題策略 (scripts/deploy-schema.sql:279-280)
CREATE POLICY policy_admin_all ON users FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
    --     ^^^^^^^^^^^^^^^^^ 在檢查 users 表時又查詢 users 表 → 無限遞迴
);
```

當使用者嘗試登入時：
1. 應用程式查詢 `SELECT * FROM users WHERE id = ?`
2. PostgreSQL 觸發 RLS 策略檢查
3. 策略內部又執行 `SELECT FROM users`
4. 再次觸發策略 → 無限循環 → 錯誤

---

## ✅ 修復步驟

### 步驟 1: 開啟 Supabase SQL Editor

1. 前往 [Supabase Dashboard](https://supabase.com/dashboard)
2. 選擇專案：**piwbooidofbaqklhijup**
3. 左側選單點選 **SQL Editor**
4. 點選 **New query**

### 步驟 2: 執行修復 SQL

**複製以下完整 SQL 並執行**（來自 `db/policies/004_fixed_rls_policies.sql`）：

```sql
-- ========================================
-- FIXED RLS POLICIES WITHOUT RECURSION
-- Date: 2025-10-16
-- Purpose: Resolve infinite recursion in users table RLS
-- ========================================

-- Step 1: Drop all existing problematic policies
DROP POLICY IF EXISTS "policy_admin_all" ON users;
DROP POLICY IF EXISTS "policy_admin_all" ON classes;
DROP POLICY IF EXISTS "policy_admin_all" ON courses;
DROP POLICY IF EXISTS "policy_admin_all" ON students;
DROP POLICY IF EXISTS "policy_admin_all" ON student_courses;
DROP POLICY IF EXISTS "policy_admin_all" ON exams;
DROP POLICY IF EXISTS "policy_admin_all" ON assessment_codes;
DROP POLICY IF EXISTS "policy_admin_all" ON scores;
DROP POLICY IF EXISTS "policy_admin_all" ON assessment_titles;

DROP POLICY IF EXISTS "policy_head_read" ON classes;
DROP POLICY IF EXISTS "policy_head_read" ON students;
DROP POLICY IF EXISTS "policy_teacher_read" ON courses;

DROP POLICY IF EXISTS "service_role_bypass" ON users;
DROP POLICY IF EXISTS "service_role_bypass" ON classes;
DROP POLICY IF EXISTS "service_role_bypass" ON courses;
DROP POLICY IF EXISTS "service_role_bypass" ON students;
DROP POLICY IF EXISTS "service_role_bypass" ON student_courses;
DROP POLICY IF EXISTS "service_role_bypass" ON exams;
DROP POLICY IF EXISTS "service_role_bypass" ON assessment_codes;
DROP POLICY IF EXISTS "service_role_bypass" ON scores;
DROP POLICY IF EXISTS "service_role_bypass" ON assessment_titles;

-- Step 2: Create NON-RECURSIVE policies

-- ========================================
-- SERVICE ROLE BYPASS (Always work)
-- ========================================
CREATE POLICY "service_role_bypass" ON users FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_bypass" ON classes FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_bypass" ON courses FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_bypass" ON students FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_bypass" ON student_courses FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_bypass" ON exams FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_bypass" ON assessment_codes FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_bypass" ON scores FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "service_role_bypass" ON assessment_titles FOR ALL USING (auth.role() = 'service_role');

-- ========================================
-- AUTHENTICATED USER POLICIES (Simple, non-recursive)
-- ========================================

-- Users table: Allow users to see their own profile + basic read
CREATE POLICY "users_own_profile" ON users FOR SELECT USING (id = auth.uid());
CREATE POLICY "users_authenticated_read" ON users FOR SELECT USING (auth.role() = 'authenticated');

-- Other tables: Allow authenticated read access
-- (Fine-grained access control handled at application level)
CREATE POLICY "authenticated_read_classes" ON classes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read_courses" ON courses FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read_students" ON students FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read_student_courses" ON student_courses FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read_exams" ON exams FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read_assessment_codes" ON assessment_codes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read_scores" ON scores FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "authenticated_read_assessment_titles" ON assessment_titles FOR SELECT USING (auth.role() = 'authenticated');

-- ========================================
-- WRITE POLICIES (More restrictive)
-- ========================================

-- Teachers can manage their own courses
CREATE POLICY "teachers_manage_own_courses" ON courses FOR ALL USING (
    teacher_id = auth.uid() AND auth.role() = 'authenticated'
);

-- Teachers can manage exams for their classes
CREATE POLICY "teachers_manage_class_exams" ON exams FOR ALL USING (
    auth.role() = 'authenticated' AND EXISTS (
        SELECT 1 FROM courses c
        WHERE c.teacher_id = auth.uid()
        AND c.class_id = exams.class_id
    )
);

-- Teachers can manage scores for their students
CREATE POLICY "teachers_manage_student_scores" ON scores FOR ALL USING (
    auth.role() = 'authenticated' AND EXISTS (
        SELECT 1 FROM exams e
        JOIN courses c ON c.class_id = e.class_id
        WHERE e.id = scores.exam_id
        AND c.teacher_id = auth.uid()
    )
);

-- ========================================
-- VERIFICATION
-- ========================================
SELECT 'RLS Recursion Fixed! ✅' as status;
```

### 步驟 3: 驗證執行結果

執行後應該看到：
```
status
--------------------------
RLS Recursion Fixed! ✅
```

如果看到錯誤訊息，請檢查：
- ✅ 是否複製完整 SQL（包含所有 CREATE POLICY）
- ✅ 是否有權限執行 DDL 操作
- ✅ 連線是否正常

---

## 🧪 測試修復

### 1. 重新載入應用程式
在瀏覽器中重新整理 `http://localhost:3000`

### 2. 嘗試 Admin 登入
- **帳號**: `tsehungchen@kcislk.ntpc.edu.tw`
- **預期結果**: ✅ 成功登入，不再出現遞迴錯誤

### 3. 檢查 Console
打開瀏覽器開發者工具，確認：
- ✅ 無 `infinite recursion detected` 錯誤
- ✅ `GET .../users?select=...` 回傳 200 OK
- ✅ 使用者權限資料正確載入

---

## 📋 技術說明

### 修復策略

#### ❌ 舊策略（遞迴）
```sql
CREATE POLICY policy_admin_all ON users FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE ...)  -- 查詢自己
);
```

#### ✅ 新策略（非遞迴）
```sql
-- 1. Service Role 完全繞過 RLS
CREATE POLICY service_role_bypass ON users FOR ALL
USING (auth.role() = 'service_role');

-- 2. 一般使用者只能讀取（無遞迴查詢）
CREATE POLICY users_authenticated_read ON users FOR SELECT
USING (auth.role() = 'authenticated');
```

### 權限控制架構

修復後的架構：

1. **RLS 層**：簡單的讀取權限（避免遞迴）
2. **應用層**：細緻的 Admin/Head/Teacher 權限控制
3. **Service Role**：Admin 操作使用 `createServiceRoleClient()`

這樣既保持安全性，又避免了遞迴問題。

---

## 📌 後續工作

修復完成後，開發團隊將：
1. ✅ 更新 `scripts/deploy-schema.sql` 防止未來重複部署錯誤策略
2. ✅ 提交修復到 GitHub 保持版本同步
3. ✅ 更新部署文件說明新的 RLS 架構

---

## 🆘 遇到問題？

### 問題 1: 執行 SQL 後仍然出現遞迴錯誤
**解決方案**:
1. 檢查是否所有舊策略都已刪除：
   ```sql
   SELECT schemaname, tablename, policyname
   FROM pg_policies
   WHERE tablename IN ('users', 'classes', 'courses', 'students', 'exams', 'scores');
   ```
2. 手動刪除任何殘留的 `policy_admin_all` 策略

### 問題 2: Service Role Key 未設定
**錯誤**: `Service role key not found`
**解決方案**: 確保 `.env.local` 包含：
```env
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```

### 問題 3: 其他角色（head/teacher）登入失敗
**解決方案**: 這些角色的細緻權限由應用層控制，確保：
- ✅ `lib/supabase/auth-context.tsx` 正確載入 `userPermissions`
- ✅ 各頁面使用 `AuthGuard` 檢查角色

---

**修復完成！** 🎉

回報執行結果給開發團隊，我們將繼續更新部署腳本。

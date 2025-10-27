# Migration 執行檢查清單
> **用途**: 逐步執行 Phase 1 Migrations 並驗證結果
> **預估時間**: 20-30 分鐘
> **風險等級**: 🔴 HIGH（會改變 RLS 政策）

---

## 📋 執行前檢查

### ✅ 必要準備

- [ ] 已閱讀 `PHASE1_TEST_REPORT.md`
- [ ] 了解 Migration 013 會移除匿名存取權限
- [ ] 已確認有 admin 帳號可以登入
- [ ] 已備份重要資料（如果有的話）
- [ ] 已取得 Supabase Dashboard 存取權限

### 🔑 必要資訊

- **Supabase Project URL**: https://supabase.com/dashboard/project/piwbooidofbaqklhijup
- **Project ID**: `piwbooidofbaqklhijup`
- **Migration 檔案位置**:
  - `db/migrations/012_add_missing_architecture.sql`
  - `db/migrations/013_fix_rls_policies_security.sql`

---

## 🚀 執行步驟

### Step 1: 執行 Migration 012（資料庫架構補齊）

#### 1.1 開啟 Supabase Dashboard

1. 前往：https://supabase.com/dashboard/project/piwbooidofbaqklhijup
2. 登入您的 Supabase 帳號
3. 點擊左側選單的 **SQL Editor**

#### 1.2 複製 Migration SQL

1. 在本地專案中，開啟檔案：
   ```
   db/migrations/012_add_missing_architecture.sql
   ```

2. 複製**全部內容**（約 391 行）

#### 1.3 執行 SQL

1. 在 SQL Editor 中，貼上複製的 SQL
2. 點擊右上角的 **Run** 按鈕（或按 Cmd/Ctrl + Enter）
3. 等待執行完成

#### 1.4 檢查執行結果

執行以下驗證 SQL：

```sql
-- ✅ 驗證 1: student_courses 表存在
SELECT COUNT(*) as table_exists
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name = 'student_courses';
-- 預期：1

-- ✅ 驗證 2: scores.course_id 欄位存在
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'scores'
  AND column_name = 'course_id';
-- 預期：course_id | uuid | YES

-- ✅ 驗證 3: 索引已建立
SELECT indexname
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename = 'student_courses';
-- 預期：至少 3 個索引

-- ✅ 驗證 4: RLS 政策已建立
SELECT policyname
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'student_courses';
-- 預期：4 個 policies
```

#### 1.5 記錄結果

- [ ] ✅ Migration 012 執行成功
- [ ] ✅ 所有驗證查詢通過
- [ ] ❌ 遇到錯誤（記錄錯誤訊息）：___________________________

---

### Step 2: 執行 Migration 013（RLS 安全修復）

⚠️ **重要警告**：
- 此步驟會**移除所有匿名存取權限**
- 執行後，未登入使用者將無法存取任何資料
- 確保您有 admin 帳號可以登入

#### 2.1 （可選）備份當前 RLS 政策

如果您想要能夠回滾，先執行：

```sql
-- 匯出當前 RLS 政策
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

複製結果並保存到安全的地方。

#### 2.2 複製 Migration SQL

1. 開啟檔案：
   ```
   db/migrations/013_fix_rls_policies_security.sql
   ```

2. 複製**全部內容**（約 391 行）

#### 2.3 執行 SQL

1. 在 SQL Editor 中新建一個查詢視窗
2. 貼上複製的 SQL
3. **深呼吸，確認您了解這會改變存取權限**
4. 點擊 **Run** 按鈕

#### 2.4 檢查執行結果

```sql
-- ✅ 驗證 1: 危險的匿名政策已移除
SELECT COUNT(*) as anonymous_policies_count
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname LIKE '%Anonymous%';
-- 預期：0

-- ✅ 驗證 2: 新的角色政策已建立
SELECT
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND (policyname LIKE '%Admin%'
    OR policyname LIKE '%Teacher%'
    OR policyname LIKE '%Student%')
ORDER BY tablename, policyname;
-- 預期：多個新政策

-- ✅ 驗證 3: 每個表都有適當的政策
SELECT
  tablename,
  COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
-- 預期：每個表至少有 1-4 個政策
```

#### 2.5 記錄結果

- [ ] ✅ Migration 013 執行成功
- [ ] ✅ 匿名政策已移除（count = 0）
- [ ] ✅ 角色政策已建立
- [ ] ❌ 遇到錯誤（記錄錯誤訊息）：___________________________

---

### Step 3: 測試匿名存取阻擋

#### 3.1 測試匿名 API 呼叫

在終端機執行：

```bash
# 測試學生資料存取
curl -s "https://piwbooidofbaqklhijup.supabase.co/rest/v1/students?select=*&limit=5" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpd2Jvb2lkb2ZiYXFrbGhpanVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MDgxMTIsImV4cCI6MjA3NjA4NDExMn0.Pu1MDlfbJkzXLbfBVMp9Gnz5oF0zWhVEgUq-l6BYVvQ"

# 預期結果：[] （空陣列）或 403 錯誤
```

```bash
# 測試成績資料存取
curl -s "https://piwbooidofbaqklhijup.supabase.co/rest/v1/scores?select=*&limit=5" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpd2Jvb2lkb2ZiYXFrbGhpanVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MDgxMTIsImV4cCI6MjA3NjA4NDExMn0.Pu1MDlfbJkzXLbfBVMp9Gnz5oF0zWhVEgUq-l6BYVvQ"

# 預期結果：[] （空陣列）或 403 錯誤
```

#### 3.2 記錄結果

- [ ] ✅ 匿名存取被正確阻擋（返回 [] 或 403）
- [ ] ❌ 仍然可以存取資料（安全問題！）

---

### Step 4: 重新生成 TypeScript 型別

#### 4.1 登入 Supabase CLI

```bash
supabase login
```

#### 4.2 生成型別

```bash
npm run gen:types
```

#### 4.3 檢查型別檔案

```bash
# 檢查 student_courses 型別存在
grep -A 5 "student_courses" types/database.ts

# 檢查 scores.course_id 欄位
grep -A 20 "scores:" types/database.ts | grep course_id
```

#### 4.4 記錄結果

- [ ] ✅ 型別檔案成功生成
- [ ] ✅ `student_courses` 型別存在
- [ ] ✅ `scores.course_id` 欄位在型別中
- [ ] ❌ 型別生成失敗（記錄錯誤）：___________________________

---

### Step 5: 啟動應用程式測試

#### 5.1 啟動開發伺服器

```bash
npm run dev
```

#### 5.2 檢查啟動訊息

預期看到：
```
✓ Ready in 3.2s
○ Local:        http://localhost:3000
```

#### 5.3 測試安全標頭（optional）

```bash
curl -I http://localhost:3000 | grep -E "X-Frame|Content-Security"
```

預期看到安全標頭。

#### 5.4 記錄結果

- [ ] ✅ 應用程式成功啟動
- [ ] ✅ 無 TypeScript 編譯錯誤
- [ ] ✅ 安全標頭正確設定
- [ ] ❌ 啟動失敗（記錄錯誤）：___________________________

---

## 🎯 完成檢查

### 必須通過的項目

- [ ] ✅ Migration 012 成功執行
- [ ] ✅ Migration 013 成功執行
- [ ] ✅ 匿名存取被阻擋
- [ ] ✅ TypeScript 型別已更新
- [ ] ✅ 應用程式可以啟動

### 可選項目

- [ ] 建立測試 admin 帳號
- [ ] 建立測試班級資料
- [ ] 測試不同角色的權限
- [ ] 執行完整的 E2E 測試

---

## ⚠️ 如果遇到問題

### Migration 執行失敗

1. **檢查錯誤訊息**
   - 記錄完整的 SQL 錯誤
   - 檢查是否有語法錯誤
   - 確認資料庫版本兼容性

2. **常見問題**
   - `relation already exists` → 表格已存在，migration 可能部分執行過
   - `column already exists` → 欄位已存在，可以忽略或修改 SQL
   - `permission denied` → 檢查資料庫權限

3. **回滾選項**
   - Migration 012 有 ROLLBACK 區塊可以還原
   - Migration 013 可以重新建立匿名政策（參考 `002_simple_rls_policies.sql`）

### 型別生成失敗

```bash
# 檢查 Supabase CLI 版本
supabase --version

# 更新 CLI
npm install -g supabase

# 重新登入
supabase login

# 再次嘗試生成
npm run gen:types
```

### 應用程式無法啟動

1. **檢查環境變數**
   ```bash
   cat .env.local
   ```

2. **清除快取**
   ```bash
   rm -rf .next node_modules/.cache
   npm install
   npm run dev
   ```

3. **檢查 TypeScript 錯誤**
   ```bash
   npm run type-check
   ```

---

## 📞 完成後的操作

### 1. Commit 測試結果

如果所有測試通過：

```bash
git add docs/testing/PHASE1_TEST_REPORT.md
git add docs/testing/MIGRATION_EXECUTION_CHECKLIST.md
git commit -m "docs: add Phase 1 testing documentation and results"
git push origin main
```

### 2. 更新 CLAUDE.md

在 CLAUDE.md 中記錄 migrations 執行狀態：

```markdown
## 🗄️ Database Migrations 執行記錄

- ✅ Migration 012: 已執行 (2025-10-27)
- ✅ Migration 013: 已執行 (2025-10-27)
```

### 3. 準備進入 Phase 2

如果 Phase 1 測試全部通過，可以考慮開始 Phase 2（效能最佳化）。

---

**檢查清單版本**: 1.0
**最後更新**: 2025-10-27

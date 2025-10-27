# Migration 014 執行指南
> **重要**：此 Migration 必須**先於** Migration 012 執行
> **用途**：修正 track 欄位型別，使 Head Teacher 能儲存課程類型職責（LT/IT/KCFS）
> **預估時間**：10-15 分鐘
> **風險等級**：🟢 LOW（資料庫是空的）

---

## 🎯 執行順序（重要！）

```
Migration 014 → Migration 012 → Migration 013 → 型別重新生成 → 程式碼修正
    ↓              ↓              ↓               ↓               ↓
 Schema 修正    架構補齊      RLS 安全      TypeScript      硬編碼值
```

**為什麼順序重要？**
- Migration 014 將 `users.track` 改為 `course_type` ENUM
- Migration 012 依賴此型別變更（RLS 政策中的型別比較）
- 如果順序錯誤，Migration 012 會報錯：`operator does not exist: track_type = course_type`

---

## 📋 執行步驟

### Step 1: 執行 Migration 014（Schema 修正）

#### 1.1 開啟 Supabase Dashboard

1. 前往：https://supabase.com/dashboard/project/piwbooidofbaqklhijup
2. 登入您的 Supabase 帳號
3. 點擊左側選單的 **SQL Editor**

#### 1.2 複製 Migration SQL

1. 在本地專案中，開啟檔案：
   ```
   db/migrations/014_fix_track_column_type.sql
   ```

2. 複製**全部內容**（約 190 行）

#### 1.3 執行 SQL

1. 在 SQL Editor 中，貼上複製的 SQL
2. 點擊右上角的 **Run** 按鈕（或按 Cmd/Ctrl + Enter）
3. 等待執行完成

#### 1.4 檢查執行結果

**預期輸出**：
```
NOTICE:  ========================================
NOTICE:  Migration 014: Fix Track Column Type
NOTICE:  ========================================
NOTICE:  Step 1: Modifying users.track column type...
NOTICE:  ✅ users.track changed from track_type to course_type
NOTICE:  Step 2: Modifying students.track column type...
NOTICE:  ✅ students.track changed to course_type and set to NULL
NOTICE:  Step 3: Verifying classes.track status...
NOTICE:  ✅ classes.track already allows NULL (Migration 010)
NOTICE:  ========================================
NOTICE:  Verification Results
NOTICE:  ========================================
NOTICE:  users.track type: course_type
NOTICE:  students.track type: course_type
NOTICE:  Students with non-NULL track: 0
NOTICE:  ✅ Migration 014 completed successfully!
```

#### 1.5 驗證 SQL（可選）

執行以下查詢確認變更成功：

```sql
-- 確認 users.track 型別
SELECT column_name, udt_name, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'users'
  AND column_name = 'track';
-- 預期：track | course_type | YES

-- 確認 students.track 型別
SELECT column_name, udt_name, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'students'
  AND column_name = 'track';
-- 預期：track | course_type | YES
```

#### 1.6 記錄結果

- [ ] ✅ Migration 014 執行成功
- [ ] ✅ `users.track` 型別為 `course_type`
- [ ] ✅ `students.track` 型別為 `course_type`
- [ ] ✅ 所有驗證查詢通過
- [ ] ❌ 遇到錯誤（記錄錯誤訊息）：___________________________

---

### Step 2: 執行 Migration 012（資料庫架構補齊）

⚠️ **重要**：此步驟**必須在 Migration 014 之後**執行

#### 2.1 複製 Migration SQL

1. 開啟檔案：
   ```
   db/migrations/012_add_missing_architecture.sql
   ```

2. 複製**全部內容**（約 258 行）

#### 2.2 執行 SQL

1. 在 SQL Editor 中新建一個查詢視窗
2. 貼上複製的 SQL
3. 點擊 **Run** 按鈕

#### 2.3 檢查執行結果

**預期輸出**：
```
NOTICE:  Added course_id column to scores table
NOTICE:  Added course_name generated column to courses table
NOTICE:  Created Admin RLS policy for student_courses
NOTICE:  Created Teacher RLS policy for student_courses
NOTICE:  Created Head Teacher RLS policy for student_courses  <-- 應該成功！
NOTICE:  Created Student RLS policy for student_courses
NOTICE:  ========================================
NOTICE:  Migration 012 Completed Successfully
NOTICE:  ========================================
NOTICE:  Student Course Enrollments: 0
NOTICE:  Scores with course_id: 0
NOTICE:  Scores without course_id: 0 (may need manual review)
```

**關鍵檢查點**：
- ✅ **沒有型別錯誤**（如果 Migration 014 未執行，這裡會報錯）
- ✅ Head Teacher RLS 政策成功建立

#### 2.4 記錄結果

- [ ] ✅ Migration 012 執行成功
- [ ] ✅ 無型別錯誤（`users.track = c.course_type` 正常運作）
- [ ] ✅ 所有 RLS 政策建立成功
- [ ] ❌ 遇到錯誤（記錄錯誤訊息）：___________________________

---

### Step 3: 執行 Migration 013（RLS 安全修復）

⚠️ **警告**：此步驟會移除所有匿名存取權限

#### 3.1 複製 Migration SQL

1. 開啟檔案：
   ```
   db/migrations/013_fix_rls_policies_security.sql
   ```

2. 複製**全部內容**（約 391 行）

#### 3.2 執行 SQL

1. 在 SQL Editor 中新建一個查詢視窗
2. 貼上複製的 SQL
3. 點擊 **Run** 按鈕

#### 3.3 檢查執行結果

驗證 SQL：
```sql
-- 確認危險的匿名政策已移除
SELECT COUNT(*) as anonymous_policies_count
FROM pg_policies
WHERE schemaname = 'public'
  AND policyname LIKE '%Anonymous%';
-- 預期：0
```

#### 3.4 記錄結果

- [ ] ✅ Migration 013 執行成功
- [ ] ✅ 匿名政策已移除（count = 0）
- [ ] ❌ 遇到錯誤（記錄錯誤訊息）：___________________________

---

### Step 4: 測試匿名存取阻擋

在終端機執行：

```bash
# 測試學生資料存取
curl -s "https://piwbooidofbaqklhijup.supabase.co/rest/v1/students?select=*&limit=5" \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpd2Jvb2lkb2ZiYXFrbGhpanVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MDgxMTIsImV4cCI6MjA3NjA4NDExMn0.Pu1MDlfbJkzXLbfBVMp9Gnz5oF0zWhVEgUq-l6BYVvQ"

# 預期結果：[] （空陣列）
```

**記錄結果**：
- [ ] ✅ 匿名存取被阻擋（返回 []）
- [ ] ❌ 仍然可以存取資料（安全問題！）

---

## 🔧 後續步驟

### Step 5: 重新生成 TypeScript 型別

```bash
# 登入 Supabase CLI
supabase login

# 重新生成型別
npm run gen:types
```

**驗證**：
```bash
# 檢查 users.track 型別
grep -A 10 "users:" types/database.ts | grep -A 2 "track"
# 預期看到：track: 'LT' | 'IT' | 'KCFS' | null
```

### Step 6: 修正程式碼中的硬編碼值

需要修正的檔案：

1. **lib/api/students.ts** (Line 21, 32)
2. **lib/import/types.ts**
3. **測試檔案**

詳見主要執行計畫文件。

---

## ⚠️ 疑難排解

### 問題 1：Migration 014 執行後，Migration 012 仍報型別錯誤

**原因**：可能是 Migration 012 快取了舊的 schema

**解決方案**：
1. 重新整理 Supabase Dashboard
2. 重新開啟 SQL Editor
3. 再次執行 Migration 012

### 問題 2：Migration 012 報錯 "column already exists"

**原因**：`student_courses` 表或 `scores.course_id` 已存在

**解決方案**：
- Migration 012 是冪等的（idempotent）
- 使用 `IF NOT EXISTS` 檢查，可以安全地重複執行
- 忽略此警告，檢查最終驗證結果

### 問題 3：想要回滾 Migration 014

**回滾 SQL**：
```sql
BEGIN;

-- 恢復 users.track 為 track_type
ALTER TABLE users
    ALTER COLUMN track TYPE track_type USING NULL;

-- 恢復 students.track 為 track_type NOT NULL
ALTER TABLE students
    ALTER COLUMN track TYPE track_type USING 'local'::track_type,
    ALTER COLUMN track SET NOT NULL;

COMMIT;
```

---

## ✅ 完成檢查清單

- [ ] ✅ Migration 014 執行成功
- [ ] ✅ Migration 012 執行成功（無型別錯誤）
- [ ] ✅ Migration 013 執行成功
- [ ] ✅ 匿名存取被阻擋
- [ ] ✅ TypeScript 型別已重新生成
- [ ] ✅ 程式碼硬編碼值已修正
- [ ] ✅ 無 TypeScript 編譯錯誤
- [ ] ✅ 應用程式可以啟動

---

## 📞 需要協助？

如果遇到問題：
1. 檢查完整的錯誤訊息
2. 確認執行順序正確（014 → 012 → 013）
3. 查看 `docs/testing/PHASE1_TEST_REPORT.md`
4. 參考 Migration 檔案中的 ROLLBACK 區塊

---

**文件版本**: 1.0
**建立日期**: 2025-10-27
**適用於**: Migration 014, 012, 013 的正確執行順序

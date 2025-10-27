# Migration 014 錯誤修復說明
> **更新日期**: 2025-10-27
> **問題**: RLS 政策依賴導致 ALTER TYPE 失敗
> **狀態**: ✅ 已修復

---

## 🐛 遇到的錯誤

### 錯誤訊息
```
ERROR:  0A000: cannot alter type of a column used in a policy definition
DETAIL:  policy head_teacher_access_courses on table courses depends on column "track"
```

### 錯誤原因
1. **RLS 政策依賴**：`courses` 表上的 `head_teacher_access_courses` 政策使用了 `users.track` 欄位
2. **PostgreSQL 限制**：不允許修改被 RLS 政策引用的欄位型別
3. **政策來源**：`db/policies/003_courses_rls.sql` (Line 31-45)

### 問題的政策
```sql
CREATE POLICY "head_teacher_access_courses" ON courses
FOR ALL TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    JOIN classes c ON courses.class_id = c.id
    WHERE u.id = auth.uid()
    AND u.role = 'head'
    AND u.is_active = TRUE
    AND u.grade = c.grade
    AND u.track::text = courses.course_type::text  -- ❌ 依賴 users.track
  )
);
```

---

## ✅ 修復方案

### 修復策略
**先刪除政策 → 修改型別 → 重新建立政策**

### Migration 014 新結構

#### Part 0: Drop Dependent RLS Policies（新增）
```sql
-- Drop the head_teacher_access_courses policy (depends on users.track)
DROP POLICY IF EXISTS "head_teacher_access_courses" ON courses;

-- Drop the Head Teacher policy on student_courses if it exists
DROP POLICY IF EXISTS "Heads can see enrollments in their jurisdiction" ON student_courses;
```

#### Part 1-4: Type Changes（保持不變）
- Part 1: Change users.track type
- Part 2: Change students.track type
- Part 3: Verify classes.track
- Part 4: Verification queries

#### Part 5: Recreate RLS Policies（新增）
```sql
-- Recreate head_teacher_access_courses policy
-- Now u.track and courses.course_type are both course_type ENUM
CREATE POLICY "head_teacher_access_courses"
ON courses
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users u
    JOIN classes c ON courses.class_id = c.id
    WHERE u.id = auth.uid()
    AND u.role = 'head'
    AND u.is_active = TRUE
    AND u.grade = c.grade
    AND u.track = courses.course_type  -- ✅ 不再需要型別轉換！
  )
);
```

#### Part 6: Update Comments（重新編號）
- 更新 ENUM 型別註解

---

## 📊 修復前後對比

### 修復前
```
❌ Migration 014 執行
   ↓
❌ ERROR: cannot alter type (RLS policy 依賴)
   ↓
🛑 執行失敗
```

### 修復後
```
✅ Migration 014 執行
   ↓
✅ Part 0: Drop RLS policies
   ↓
✅ Part 1-4: Change types
   ↓
✅ Part 5: Recreate RLS policies (with correct types)
   ↓
🎉 執行成功！
```

---

## 🎯 修復的好處

### 1. 解決了 ALTER TYPE 錯誤
- ✅ Migration 014 現在可以成功執行
- ✅ 不再受 RLS 政策依賴限制

### 2. 改善了 RLS 政策
**修復前（需要型別轉換）**：
```sql
AND u.track::text = courses.course_type::text
```

**修復後（直接比較）**：
```sql
AND u.track = courses.course_type  -- 兩者都是 course_type ENUM
```

### 3. 保持冪等性
- ✅ 使用 `DROP POLICY IF EXISTS`
- ✅ 可以安全地重複執行
- ✅ 不會因為政策已存在而失敗

### 4. 完整的回滾支援
```sql
-- Rollback 也包含政策處理
BEGIN;
DROP POLICY IF EXISTS "head_teacher_access_courses" ON courses;
ALTER TABLE users ALTER COLUMN track TYPE track_type USING NULL;
ALTER TABLE students ALTER COLUMN track TYPE track_type USING 'local'::track_type;
CREATE POLICY "head_teacher_access_courses" ... -- 重新建立舊政策
COMMIT;
```

---

## 📋 重新執行步驟

### Step 1: 確認修復版本
```bash
git pull origin main
# 確認最新的 commit: 27b6d22
```

### Step 2: 執行修正後的 Migration 014

1. 開啟 Supabase Dashboard SQL Editor
2. 複製 `db/migrations/014_fix_track_column_type.sql` 的**完整內容**
3. 執行 SQL

### Step 3: 檢查執行結果

**預期輸出**：
```
NOTICE: ========================================
NOTICE: Migration 014: Fix Track Column Type
NOTICE: ========================================
NOTICE: Step 0: Dropping RLS policies that depend on users.track...
NOTICE: ✅ Dependent RLS policies dropped
NOTICE: Step 1: Modifying users.track column type...
NOTICE: ✅ users.track changed from track_type to course_type
NOTICE: Step 2: Modifying students.track column type...
NOTICE: ✅ students.track changed to course_type and set to NULL
NOTICE: Step 3: Verifying classes.track status...
NOTICE: ✅ classes.track already allows NULL (Migration 010)
NOTICE: ========================================
NOTICE: Verification Results
NOTICE: ========================================
NOTICE: users.track type: course_type
NOTICE: students.track type: course_type
NOTICE: Students with non-NULL track: 0
NOTICE: ✅ Migration 014 completed successfully!
NOTICE: Step 5: Recreating RLS policies with corrected types...
NOTICE: ✅ RLS policies recreated with correct types
```

### Step 4: 驗證 RLS 政策

```sql
-- 檢查政策是否存在
SELECT policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
AND tablename = 'courses'
AND policyname = 'head_teacher_access_courses';

-- 預期：返回 1 筆記錄
-- policyname: head_teacher_access_courses
-- cmd: ALL
```

### Step 5: 繼續執行後續 Migrations

現在可以繼續執行：
1. Migration 012 (with fixed RLS policy)
2. Migration 013 (RLS security)

---

## 🔍 技術細節

### 為什麼 PostgreSQL 不允許修改被 RLS 政策引用的欄位？

**安全考量**：
- RLS 政策定義了資料存取權限
- 如果允許修改欄位型別，可能破壞權限邏輯
- 強制開發者先刪除政策，確保有意識地處理權限變更

### Migration 012 的政策呢？

Migration 012 也會建立 `student_courses` 的 Head Teacher 政策：
```sql
CREATE POLICY "Heads can see enrollments in their jurisdiction" ON student_courses
...
AND u.track = c.course_type
```

**處理方式**：
- Migration 014 Part 0 已經包含 `DROP POLICY IF EXISTS`
- 如果 `student_courses` 表還不存在，DROP 會被忽略（IF EXISTS）
- Migration 012 執行時會重新建立這個政策（使用正確的型別）

---

## ✅ 檢查清單

執行 Migration 014 修正版後：

- [ ] ✅ Migration 014 執行成功（無錯誤）
- [ ] ✅ `users.track` 型別為 `course_type`
- [ ] ✅ `students.track` 型別為 `course_type`
- [ ] ✅ RLS 政策 `head_teacher_access_courses` 存在
- [ ] ✅ 政策使用正確的型別比較（無 `::text` 轉換）
- [ ] ⏭️ 準備執行 Migration 012

---

## 📞 如果還有問題

### 問題 1：政策刪除失敗
**錯誤**：`policy does not exist`

**解決**：這是正常的！`IF EXISTS` 確保即使政策不存在也不會報錯。

### 問題 2：型別修改仍然失敗
**可能原因**：還有其他政策依賴 `users.track`

**檢查方式**：
```sql
-- 查看所有使用 users.track 的政策
SELECT schemaname, tablename, policyname, pg_get_expr(qual, tablename::regclass)
FROM pg_policies
WHERE pg_get_expr(qual, tablename::regclass) LIKE '%users.track%';
```

**解決方式**：在 Migration 014 Part 0 中新增 DROP 這些政策

### 問題 3：重新建立政策失敗
**可能原因**：政策定義有語法錯誤

**檢查**：查看完整錯誤訊息，確認 SQL 語法正確

---

**文件版本**: 1.0
**更新日期**: 2025-10-27
**Git Commit**: `27b6d22` - fix(migration-014): drop and recreate RLS policies

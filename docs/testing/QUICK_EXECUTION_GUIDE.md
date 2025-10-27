# 📋 快速執行指南 - Migration 014, 012, 013

> **更新日期**: 2025-10-27
> **狀態**: ✅ 程式碼修正完成，等待執行
> **Git Commit**: `dc06dd1` - Migration 014 錯誤修復文件

---

## 🎯 當前狀態

### ✅ 已完成
- [x] Migration 014 修正（處理 RLS 政策依賴）
- [x] Migration 012 修正（Line 171 型別比較）
- [x] 完整的回滾指令
- [x] 詳細的執行文件
- [x] Git 提交並推送到 GitHub

### ⏸️ 等待執行
- [ ] Migration 014 執行（Supabase Dashboard）
- [ ] Migration 012 執行（Supabase Dashboard）
- [ ] Migration 013 執行（Supabase Dashboard）
- [ ] TypeScript 型別重新生成

---

## 🚀 執行步驟（依序執行）

### Step 1: 執行 Migration 014 ⭐

**檔案**: `db/migrations/014_fix_track_column_type.sql`

**執行方式**:
1. 開啟 [Supabase Dashboard](https://supabase.com/dashboard)
2. 選擇你的專案
3. 點選 **SQL Editor**
4. 建立新查詢
5. 複製 `db/migrations/014_fix_track_column_type.sql` 的**完整內容**
6. 點選 **Run** 執行

**預期結果**:
```
✅ Part 0: Dependent RLS policies dropped
✅ Part 1: users.track changed from track_type to course_type
✅ Part 2: students.track changed to course_type and set to NULL
✅ Part 3: classes.track already allows NULL
✅ Part 5: RLS policies recreated with correct types
✅ Migration 014 completed successfully!
```

**如果遇到錯誤**: 請複製完整錯誤訊息並回報

---

### Step 2: 執行 Migration 012

**檔案**: `db/migrations/012_add_missing_architecture.sql`

**重要**: 必須在 Migration 014 **成功執行後**才能執行

**執行方式**:
1. 在 Supabase Dashboard SQL Editor
2. 複製 `db/migrations/012_add_missing_architecture.sql` 的完整內容
3. 執行 SQL

**預期結果**:
```
✅ student_courses table created with 252 enrollments
✅ scores.course_id column added
✅ RLS policies created (no type mismatch errors)
✅ Performance indexes created
```

---

### Step 3: 執行 Migration 013

**檔案**: `db/migrations/013_fix_rls_policies_security.sql`

**執行方式**:
1. 在 Supabase Dashboard SQL Editor
2. 複製 `db/migrations/013_fix_rls_policies_security.sql` 的完整內容
3. 執行 SQL

**預期結果**:
```
✅ Anonymous policies removed
✅ Role-based policies created (admin/head/teacher/student)
✅ Security vulnerabilities fixed
```

---

### Step 4: 重新生成 TypeScript 型別

**在本地終端機執行**:

```bash
cd /Users/chenzehong/Desktop/LMS

# 登入 Supabase（如果還沒登入）
npx supabase login

# 重新生成型別定義
npm run gen:types
```

**預期結果**:
- `types/database.ts` 檔案更新
- 包含新的 schema 變更
- 無 TypeScript 編譯錯誤

---

## 🔍 驗證與測試

### 驗證 Migration 成功

在 Supabase Dashboard SQL Editor 執行：

```sql
-- 1. 檢查型別變更
SELECT
  table_name,
  column_name,
  udt_name as type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('users', 'students', 'classes')
  AND column_name = 'track'
ORDER BY table_name;

-- 預期結果:
-- users.track: course_type
-- students.track: course_type
-- classes.track: track_type

-- 2. 檢查 RLS 政策
SELECT
  tablename,
  policyname,
  cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'courses'
  AND policyname = 'head_teacher_access_courses';

-- 預期結果: 1 筆記錄（政策存在）

-- 3. 檢查 student_courses 表
SELECT COUNT(*) as total_enrollments FROM student_courses;

-- 預期結果: 252 筆（84 classes × 3 course types）

-- 4. 檢查 scores.course_id 欄位
SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'scores'
  AND column_name = 'course_id';

-- 預期結果: course_id 欄位存在
```

---

## 📊 Migration 順序說明

```
Migration 014: Fix Track Column Type
   ↓
   ├─ Drop RLS policies (Part 0)
   ├─ Change users.track type (Part 1)
   ├─ Change students.track type (Part 2)
   ├─ Verify classes.track (Part 3)
   ├─ Recreate RLS policies (Part 5)
   └─ ✅ Complete

Migration 012: Add Missing Architecture
   ↓
   ├─ Create student_courses table
   ├─ Populate student_courses data
   ├─ Add scores.course_id column
   ├─ Create RLS policies (依賴 Migration 014 的型別)
   └─ ✅ Complete

Migration 013: Fix RLS Security
   ↓
   ├─ Remove anonymous policies
   ├─ Add role-based policies
   └─ ✅ Complete
```

---

## 🆘 故障排除

### 問題 1: Migration 014 仍然報錯

**錯誤**: `policy does not exist`

**解決**: 這是正常的！`IF EXISTS` 確保即使政策不存在也不會報錯，繼續執行即可。

---

### 問題 2: Migration 012 型別錯誤

**錯誤**: `operator does not exist: track_type = text`

**可能原因**: Migration 014 未成功執行

**解決**:
1. 檢查 `users.track` 型別：
   ```sql
   SELECT udt_name FROM information_schema.columns
   WHERE table_name = 'users' AND column_name = 'track';
   ```
2. 如果顯示 `track_type`，表示 Migration 014 未成功
3. 重新執行 Migration 014

---

### 問題 3: 找不到某個表或欄位

**可能原因**: 之前的 migration 未執行

**解決**: 確認執行順序正確，按照 014 → 012 → 013 的順序執行

---

## 📞 需要協助

如果遇到任何問題，請提供：

1. **完整錯誤訊息**（包含 ERROR 代碼和 CONTEXT）
2. **執行的 Migration 檔案名稱**
3. **Supabase Dashboard 的完整輸出**

---

## 📚 詳細文件參考

- 完整執行指南: [`MIGRATION_014_EXECUTION_GUIDE.md`](./MIGRATION_014_EXECUTION_GUIDE.md)
- 錯誤修復說明: [`MIGRATION_014_ERROR_FIX.md`](./MIGRATION_014_ERROR_FIX.md)
- Phase 1 測試報告: [`PHASE1_TEST_REPORT.md`](./PHASE1_TEST_REPORT.md)
- Migration 執行檢查表: [`MIGRATION_EXECUTION_CHECKLIST.md`](./MIGRATION_EXECUTION_CHECKLIST.md)

---

**文件版本**: 1.0
**最後更新**: 2025-10-27
**Git Commit**: `dc06dd1`

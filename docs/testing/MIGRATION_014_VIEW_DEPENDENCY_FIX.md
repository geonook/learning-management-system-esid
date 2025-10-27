# Migration 014 視圖依賴問題修復說明

> **日期**: 2025-10-27
> **問題**: Analytics 視圖依賴 track 欄位，阻止型別變更
> **解決方案**: Drop-Recreate Pattern
> **狀態**: ✅ 已修復

---

## 🔴 問題描述

### 原始錯誤

執行 Migration 014 時遇到錯誤：

```
ERROR:  0A000: cannot alter type of a column used by a view or rule
DETAIL:  rule _RETURN on view student_grade_aggregates depends on column "track"
```

### 根本原因

PostgreSQL 不允許修改被**資料庫視圖 (Views)** 引用的欄位型別，因為視圖依賴於特定的資料型別定義。

**受影響的視圖**：

1. **`student_grade_aggregates`**
   - 依賴 `students.track` 欄位
   - Line 15, 90, 114: 在 SELECT 和 GROUP BY 中引用

2. **`class_statistics`**
   - 依賴 `classes.track` 欄位
   - Line 103, 127, 158, 195: 在 SELECT 和 GROUP BY 中引用

3. **`teacher_performance`**
   - 依賴 `users.track` 欄位
   - Line 173, 210, 224, 286: 在 SELECT 和 GROUP BY 中引用

**視圖定義位置**：
- `db/views/002_analytics_views.sql` (詳細版本，356 lines)
- `db/views/003_manual_analytics_views.sql` (簡化版本，292 lines)

---

## 💡 解決方案：Drop-Recreate Pattern

### 策略

採用與 RLS 政策相同的處理模式：

1. **Part 0A**: 刪除所有依賴的視圖
2. **Part 0B**: 刪除依賴的 RLS 政策（原有）
3. **Part 1-4**: 修改欄位型別（原有）
4. **Part 5**: 重新建立 RLS 政策（原有）
5. **Part 6**: 重新建立 Analytics 視圖（新增）
6. **Part 7**: 更新 ENUM 型別註解（原有）

### 實施細節

#### Part 0A: 刪除視圖（新增）

```sql
-- Drop Analytics Views that depend on track columns
DROP VIEW IF EXISTS student_grade_aggregates CASCADE;
DROP VIEW IF EXISTS class_statistics CASCADE;
DROP VIEW IF EXISTS teacher_performance CASCADE;
```

**為什麼使用 CASCADE**：
- CASCADE 會自動刪除所有依賴這些視圖的物件
- 確保不會因為連鎖依賴而導致刪除失敗

#### Part 6: 重新建立視圖（新增）

重新建立所有 3 個 Analytics 視圖，使用更新後的欄位型別：

- **`student_grade_aggregates`**
  - `s.track` 現在是 `course_type` ENUM (nullable)
  - 其他定義保持不變

- **`class_statistics`**
  - `c.track` 仍然是 `track_type` ENUM (nullable)
  - Migration 014 不改變 `classes.track` 型別

- **`teacher_performance`**
  - `u.track` 現在是 `course_type` ENUM (nullable)
  - 反映 Head Teacher 的課程類型職責

**視圖來源**：從 `db/views/003_manual_analytics_views.sql` 複製定義

---

## 🔍 Migration 014 最終結構

### 完整執行順序

```
Part 0A: 刪除 Analytics 視圖（新增）
   ↓
Part 0B: 刪除 RLS 政策（原有）
   ↓
Part 1: 修改 users.track 型別
   ↓
Part 2: 修改 students.track 型別
   ↓
Part 3: 驗證 classes.track 狀態
   ↓
Part 4: 驗證查詢
   ↓
Part 5: 重新建立 RLS 政策
   ↓
Part 6: 重新建立 Analytics 視圖（新增）
   ↓
Part 7: 更新 ENUM 型別註解
   ↓
成功訊息
```

### 檔案大小變化

- **修改前**: ~276 lines
- **修改後**: ~550 lines（新增 ~274 lines 視圖定義）

---

## ✅ 預期執行結果

### 成功訊息

```
========================================
Migration 014: Fix Track Column Type
========================================
Step 0A: Dropping Analytics Views that depend on track columns...
✅ Analytics views dropped (will be recreated in Part 6)
Step 0B: Dropping RLS policies that depend on users.track...
✅ Dependent RLS policies dropped
Step 1: Modifying users.track column type...
✅ users.track changed from track_type to course_type
Step 2: Modifying students.track column type...
✅ students.track changed to course_type and set to NULL
Step 3: Verifying classes.track status...
✅ classes.track already allows NULL (Migration 010)
========================================
Verification Results
========================================
users.track type: course_type
students.track type: course_type
Students with non-NULL track: 0
✅ Migration 014 completed successfully!
========================================
Step 5: Recreating RLS policies with corrected types...
✅ RLS policies recreated with correct types
Step 6: Recreating Analytics Views with updated track column types...
✅ Analytics views recreated with updated track column types

🎉 Migration 014 Complete!

What was done:
  ✅ Dropped 3 Analytics Views (student_grade_aggregates, class_statistics, teacher_performance)
  ✅ Dropped dependent RLS policies
  ✅ Changed users.track: track_type → course_type
  ✅ Changed students.track: track_type → course_type (NULL)
  ✅ Recreated RLS policies with correct types
  ✅ Recreated Analytics Views with updated track column types

Next Steps:
1. Execute Migration 012 (with fixed RLS policy)
2. Execute Migration 013 (RLS security)
3. Run: npm run gen:types
4. Test and verify
```

---

## 🧪 驗證步驟

### 1. 檢查視圖是否成功重建

```sql
SELECT
  table_name,
  view_definition IS NOT NULL as is_view
FROM information_schema.views
WHERE table_schema = 'public'
  AND table_name IN ('student_grade_aggregates', 'class_statistics', 'teacher_performance');
```

**預期結果**: 3 筆記錄，所有 `is_view = true`

### 2. 檢查 track 欄位型別

```sql
SELECT
  table_name,
  column_name,
  udt_name as type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'track'
  AND table_name IN ('users', 'students', 'classes')
ORDER BY table_name;
```

**預期結果**:
```
users     | track | course_type | YES
students  | track | course_type | YES
classes   | track | track_type  | YES
```

### 3. 測試視圖查詢

```sql
-- 測試 student_grade_aggregates
SELECT COUNT(*) as total_rows FROM student_grade_aggregates;

-- 測試 class_statistics
SELECT COUNT(*) as total_rows FROM class_statistics;

-- 測試 teacher_performance
SELECT COUNT(*) as total_rows FROM teacher_performance;
```

**預期結果**: 所有查詢成功執行（目前資料為 0，因為資料庫是空的）

### 4. 檢查視圖欄位定義

```sql
SELECT
  table_name,
  column_name,
  udt_name
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('student_grade_aggregates', 'class_statistics', 'teacher_performance')
  AND column_name LIKE '%track%'
ORDER BY table_name, column_name;
```

**預期結果**:
```
student_grade_aggregates | track | course_type
class_statistics         | track | track_type
teacher_performance      | assigned_track | course_type
```

---

## 🔄 Rollback 說明

### Rollback 順序

如果需要回滾 Migration 014：

```sql
BEGIN;

-- 0. 刪除 Analytics 視圖（允許欄位型別變更）
DROP VIEW IF EXISTS student_grade_aggregates CASCADE;
DROP VIEW IF EXISTS class_statistics CASCADE;
DROP VIEW IF EXISTS teacher_performance CASCADE;

-- 1. 刪除 RLS 政策
DROP POLICY IF EXISTS "head_teacher_access_courses" ON courses;
DROP POLICY IF EXISTS "Heads can see enrollments in their jurisdiction" ON student_courses;

-- 2. 還原 users.track 型別
ALTER TABLE users
    ALTER COLUMN track TYPE track_type USING NULL;

-- 3. 還原 students.track 型別（含 NOT NULL）
ALTER TABLE students
    ALTER COLUMN track TYPE track_type USING 'local'::track_type,
    ALTER COLUMN track SET NOT NULL;

-- 4. 重新建立 RLS 政策（使用舊的型別轉換）
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
    AND u.track::text = courses.course_type::text  -- 使用型別轉換
  )
);

-- 5. 重新建立 Analytics 視圖（需要手動執行）
-- 執行檔案: db/views/003_manual_analytics_views.sql

COMMIT;
```

**注意**: Rollback 後需要手動執行 `db/views/003_manual_analytics_views.sql` 來還原視圖。

---

## 📚 技術學習

### PostgreSQL 視圖與型別依賴

**關鍵概念**:
1. 視圖 (Views) 儲存的是查詢定義，不是資料
2. 視圖依賴於基礎表的欄位型別
3. ALTER TYPE 操作會被視圖依賴阻止

**錯誤類型**:
- **SQLSTATE**: `0A000` (Feature Not Supported)
- **原因**: PostgreSQL 不支援修改被視圖引用的欄位型別

**解決模式**:
- **Drop-Modify-Recreate**: 刪除視圖 → 修改欄位 → 重建視圖
- **CASCADE**: 自動處理連鎖依賴

### 與 RLS 政策的相似性

| 依賴類型 | 錯誤訊息 | 解決方案 |
|---------|---------|---------|
| RLS Policy | "cannot alter type used in policy" | Drop → Alter → Recreate |
| Database View | "cannot alter type used by view" | Drop → Alter → Recreate |
| Foreign Key | "cannot alter type used by FK" | Drop → Alter → Recreate |

**共同模式**: 所有阻止 ALTER TYPE 的依賴都需要先移除，修改後再重建。

---

## 🎯 後續影響

### 對 TypeScript 型別的影響

執行 `npm run gen:types` 後，`types/database.ts` 會更新：

```typescript
// 視圖型別定義會自動更新
export interface StudentGradeAggregates {
  student_id: string
  student_name: string
  grade: number
  track: Database['public']['Enums']['course_type'] | null  // ✅ 更新為 course_type
  level: string
  // ... 其他欄位
}

export interface TeacherPerformance {
  teacher_id: string
  assigned_track: Database['public']['Enums']['course_type'] | null  // ✅ 更新為 course_type
  // ... 其他欄位
}
```

### 對 Analytics 功能的影響

- ✅ Analytics 視圖繼續正常運作
- ✅ 查詢邏輯保持不變
- ✅ `track` 欄位現在反映正確的語意：
  - `students.track`: 已棄用（NULL）
  - `users.track`: Head Teacher 課程類型職責 (LT/IT/KCFS)
  - `classes.track`: 保持不變（NULL）

---

## 📖 相關文件

- **Migration 檔案**: `db/migrations/014_fix_track_column_type.sql`
- **視圖定義**: `db/views/003_manual_analytics_views.sql`
- **快速執行指南**: `docs/testing/QUICK_EXECUTION_GUIDE.md`
- **錯誤修復文件**: 本文件

---

**文件版本**: 1.0
**最後更新**: 2025-10-27
**作者**: Claude Code

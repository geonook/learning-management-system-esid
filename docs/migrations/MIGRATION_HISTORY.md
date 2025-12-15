# Database Migration History

> 完整的 Migration 007-032 記錄

## Migration 索引

| Migration | 名稱 | 日期 | 狀態 |
|-----------|------|------|------|
| 007 | 用戶自主註冊 RLS | 2025-10-17 | ✅ |
| 008 | Courses 表建立 | 2025-10-17 | ✅ |
| 009 | Level 欄位格式升級 | 2025-10-17 | ✅ |
| 010 | 移除 Track NOT NULL | 2025-10-17 | ✅ |
| 011 | 移除 Teacher_id NOT NULL | 2025-10-17 | ✅ |
| 012 | Student Courses 表 | 2025-10-17 | ✅ |
| 013 | RLS Security 修復 | 2025-10-17 | ✅ |
| 014 | Track 欄位型別修正 | 2025-10-27 | ✅ |
| 015 | RLS 效能優化 | 2025-10-28 | ✅ |
| 018-019e | RLS Recursion Fix | 2025-11-18 | ✅ |
| 020 | Disable Auto User Sync | 2025-11-21 | ✅ |
| 021 | Courses RLS Recursion Fix | 2025-11-21 | ✅ |
| 022 | Assessment Codes Schema | 2025-11-28 | ✅ |
| 028 | Users RLS Recursion Fix | 2025-12-09 | ✅ |
| 029 | Course Tasks Kanban | 2025-12-12 | ✅ |
| 030 | Four-Term System | 2025-12-12 | ✅ |
| 031 | 2026-2027 Academic Year | 2025-12-12 | ✅ |
| 032 | Gradebook Expectations | 2025-12-14 | ✅ |

---

## Migration 007: 用戶自主註冊 RLS

**目的**：允許用戶自行註冊帳號

**變更**：建立用戶註冊相關 RLS 政策

---

## Migration 008: Courses 表建立

**目的**：實現「一班三師」系統

**變更**：
```sql
CREATE TABLE courses (
  id UUID PRIMARY KEY,
  class_id UUID REFERENCES classes(id),
  course_type course_type NOT NULL,  -- 'LT' | 'IT' | 'KCFS'
  teacher_id UUID REFERENCES users(id),
  academic_year TEXT,
  is_active BOOLEAN DEFAULT true
);
```

---

## Migration 009: Level 欄位格式升級

**目的**：支援 G1E1 ~ G6E3 格式

**變更**：
- `level` 欄位從 ENUM 改為 TEXT
- 新增 CHECK 約束驗證格式

---

## Migration 010: 移除 Track NOT NULL

**目的**：在「一班三師」架構中，班級不屬於任何單一 track

**變更**：
- `classes.track` 允許 NULL
- `students.track` 允許 NULL

---

## Migration 011: 移除 Teacher_id NOT NULL

**目的**：支援課程建立後再指派教師

**變更**：`courses.teacher_id` 允許 NULL

---

## Migration 012-013: Student Courses + RLS

**目的**：建立學生選課關聯

**變更**：
- 建立 `student_courses` 表
- 修復 RLS 安全漏洞

---

## Migration 014: Track 欄位型別修正

**目的**：修正 Head Teacher 課程類型職責

**變更**：
- `users.track`: `track_type` → `course_type`
- `students.track`: `track_type` → `course_type` (nullable)
- 重建 3 個 Analytics 視圖

**技術挑戰**：
- PostgreSQL 不允許修改被視圖引用的欄位型別
- 解決方案：Drop-Modify-Recreate Pattern

---

## Migration 015: RLS 效能優化

**目的**：解決 44+ 個 `auth_rls_initplan` 效能警告

**變更**：
- 優化 49 個 policies
- `auth.uid()` → `(SELECT auth.uid())`

**效果**：
- 查詢複雜度：O(n) → O(1)
- auth.uid() 呼叫次數：每行重複 → 一次快取

---

## Migration 018-019e: RLS Recursion Fix

**問題**：heads_view_jurisdiction policy 造成無限遞迴

**解決**：Migration 019e 移除 heads_view_jurisdiction policy

---

## Migration 020: Disable Auto User Sync

**目的**：解決 OAuth 回調與觸發器衝突

**變更**：禁用 `auto_sync_user_on_login` 觸發器

---

## Migration 021: Courses RLS Recursion Fix

**目的**：修復 courses 表 RLS 遞迴

**變更**：
```sql
CREATE FUNCTION public.get_user_role_safe()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$;
```

---

## Migration 022: Assessment Codes Schema

**目的**：插入 13 個 assessment codes

**變更**：
- FA1-FA8: 權重 0.0188
- SA1-SA4: 權重 0.05
- FINAL: 權重 0.10

---

## Migration 028: Users RLS Recursion Fix

**問題**：`is_admin()` 和 `is_office_member()` 函數造成遞迴

**解決**：
- 刪除 24 個有遞迴問題的 policies
- 建立簡單的 `authenticated_read_users` 政策

---

## Migration 029: Course Tasks Kanban

**目的**：建立課程任務看板

**變更**：
```sql
CREATE TABLE course_tasks (
  id UUID PRIMARY KEY,
  course_id UUID REFERENCES courses(id),
  teacher_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  status TEXT DEFAULT 'todo',
  position INTEGER DEFAULT 0
);
```

---

## Migration 030: Four-Term System

**目的**：新增四學期制支援

**變更**：
- `exams.term`: INTEGER (1-4)
- `exams.semester`: INTEGER (1-2)
- Trigger 自動計算 semester

**Term 定義**：
- Term 1: Fall Midterm
- Term 2: Fall Final
- Term 3: Spring Midterm
- Term 4: Spring Final

---

## Migration 031: 2026-2027 Academic Year

**目的**：建立新學年資料

**變更**：
- 複製 84 個班級
- 建立 252 個課程（teacher_id = NULL）

---

## Migration 032: Gradebook Expectations

**目的**：Head Teacher 成績進度預期設定

**變更**：
```sql
CREATE TABLE gradebook_expectations (
  id UUID PRIMARY KEY,
  academic_year TEXT NOT NULL,
  term INTEGER NOT NULL,
  grade INTEGER NOT NULL,
  course_type course_type NOT NULL,
  assessment_code TEXT NOT NULL,
  expected_completion DECIMAL(5,2) DEFAULT 80.00,
  due_date DATE,
  created_by UUID REFERENCES users(id)
);
```

---

## 驗證腳本

```sql
-- 檢查 Migration 狀態
SELECT COUNT(*) FROM courses;  -- 預期：504
SELECT COUNT(*) FROM classes WHERE academic_year = '2025-2026';  -- 預期：84
SELECT COUNT(*) FROM gradebook_expectations;  -- 看有多少設定
```

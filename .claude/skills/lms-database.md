# LMS Database Skill

> Supabase 資料庫查詢模式、RLS 政策、Migration 關鍵記錄

## Supabase Nested Join 查詢模式（重要！）

### 核心規則

Supabase 的 `table!inner` 語法是透過 **外鍵（FK）** 連接，不是透過查詢中選取的欄位。

### 資料庫關聯鏈

```
scores → exam_id (FK) → exams → course_id (FK) → courses → class_id (FK) → classes
```

### ✅ 正確模式

```typescript
const { data } = await supabase
  .from('scores')
  .select(`
    student_id,
    assessment_code,
    score,
    exam:exams!inner(
      course_id,                    // ← 取得 FK 欄位
      course:courses!inner(
        id,
        class_id,                   // ← 從 course 取得 class_id
        course_type
      )
    )
  `)
  .in('student_id', studentIds)   // ← 限制查詢範圍
  .not('score', 'is', null);

// 過濾時使用 course.class_id，不是 exam.class_id
const filtered = data.filter(s => {
  const examData = s.exam as { course_id: string; course: { class_id: string; ... } };
  return classIdSet.has(examData.course.class_id);  // ✅ 正確
});
```

### ❌ 錯誤模式

```typescript
exam:exams!inner(
  class_id,                       // ← 這個欄位與 courses!inner 無關
  course:courses!inner(...)       // ← join 是用 course_id FK
)
// 然後過濾 exam.class_id → 永遠不匹配！
```

### 為什麼這很重要

- `exams` 表同時有 `class_id` 和 `course_id` 欄位
- Supabase 的 `courses!inner` 只看 FK 關係（`course_id`）
- 選取 `exam.class_id` 不會影響 join 行為
- 如果需要 class_id，應該從 `course.class_id` 取得

### 效能最佳實踐

```typescript
// ✅ 永遠加上限制條件避免全表掃描
.in('student_id', studentIds)
.in('exam_id', examIds)
.eq('class_id', classId)
```

---

## RLS (Row Level Security) 核心規則

### 角色權限矩陣

| 角色 | users | classes | courses | exams | scores |
|------|-------|---------|---------|-------|--------|
| admin | ✅ 全部 | ✅ 全部 | ✅ 全部 | ✅ 全部 | ✅ 全部 |
| head | 自己 | 年級內 | 年級+類型 | 年級+類型 | 年級+類型 |
| teacher | 自己 | 任課班 | 任課 | 任課 | 任課 |
| office_member | 自己 | 唯讀 | 唯讀 | 唯讀 | 任課才能寫 |

### RLS 效能優化

所有 RLS policies 使用 `(SELECT auth.uid())` 而非直接 `auth.uid()`：

```sql
-- ❌ 效能差：每行都呼叫 auth.uid()
CREATE POLICY "..." ON users
USING (id = auth.uid());

-- ✅ 效能好：只呼叫一次，快取結果
CREATE POLICY "..." ON users
USING (id = (SELECT auth.uid()));
```

### Service Role Bypass

所有表都有 `service_role_bypass` 政策：
- Service Role Key 可繞過所有 RLS
- 用於 CSV 匯入、Migration 等管理操作

---

## 關鍵 Migration 記錄

### Migration 014: Track 欄位型別修正
- `users.track`: `track_type` → `course_type`
- `students.track`: `track_type` → `course_type` (nullable)
- 重建 3 個 Analytics 視圖

### Migration 015: RLS 效能優化
- 優化 49 個 policies
- `auth.uid()` → `(SELECT auth.uid())`
- Database Linter 警告從 44+ 降至 0

### Migration 028: Users 表 RLS 遞迴修復
- 刪除 24 個有遞迴問題的 policies
- 建立簡單的 `authenticated_read_users` 政策

### Migration 029: Course Tasks Kanban
- 建立 `course_tasks` 表
- 支援任務看板功能

### Migration 030: Four-Term 學期系統
- 新增 `exams.term` (1-4) 和 `exams.semester` (1-2) 欄位
- 自動計算 trigger

### Migration 031: 2026-2027 學年
- 複製 84 班級 + 252 課程

### Migration 032: Gradebook Expectations
- 建立 `gradebook_expectations` 表
- Head Teacher 成績進度預期設定

---

## 常用查詢模式

### 取得班級課程與教師

```typescript
const { data } = await supabase
  .from('courses')
  .select(`
    id,
    course_type,
    teacher:users!teacher_id(
      id,
      full_name
    ),
    class:classes!inner(
      id,
      class_name,
      grade
    )
  `)
  .eq('class_id', classId);
```

### 取得學生成績（含課程篩選）

```typescript
const { data } = await supabase
  .from('scores')
  .select(`
    student_id,
    assessment_code,
    score,
    exam:exams!inner(
      course:courses!inner(
        course_type
      )
    )
  `)
  .eq('exam.course.course_type', courseType)
  .in('student_id', studentIds);
```

### 取得 Head Teacher 管轄班級

```typescript
// HT 的 grade 和 track（course_type）定義管轄範圍
const { data } = await supabase
  .from('classes')
  .select('*')
  .eq('grade', headTeacherGrade)
  .eq('academic_year', academicYear);

// 課程需額外過濾 course_type
const courses = allCourses.filter(c => c.course_type === headTeacherTrack);
```

---

## 資料表索引

### 效能關鍵索引

```sql
-- scores 表
CREATE INDEX idx_scores_student_id ON scores(student_id);
CREATE INDEX idx_scores_exam_id ON scores(exam_id);

-- exams 表
CREATE INDEX idx_exams_course_id ON exams(course_id);
CREATE INDEX idx_exams_term ON exams(term);
CREATE INDEX idx_exams_course_term ON exams(course_id, term);

-- courses 表
CREATE INDEX idx_courses_class_id ON courses(class_id);
CREATE INDEX idx_courses_teacher_id ON courses(teacher_id);
```

---

## 常見錯誤與解決

### 錯誤：406 Not Acceptable

**原因**：RLS 政策阻擋查詢
**解決**：檢查用戶角色權限，或使用 service role

### 錯誤：25P02 transaction aborted

**原因**：RLS 無限遞迴
**解決**：檢查政策是否查詢同一張表，使用 SECURITY DEFINER 函數

### 錯誤：Nested join 結果為空

**原因**：FK 欄位與過濾邏輯不匹配
**解決**：從正確的巢狀物件取得 class_id（見上方正確模式）

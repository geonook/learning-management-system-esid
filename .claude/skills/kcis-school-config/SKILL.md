---
name: kcis-school-config
description: KCIS Linkou Campus elementary school configuration and terminology. Use this skill when implementing school-specific features, understanding course types (LT/IT/KCFS), role permissions, English levels (E1/E2/E3), grading systems, attendance status, or academic calendar settings.
---

# KCIS School Configuration

> 康橋國際學校林口校區 - 小學部專屬設定與術語

## 學校資訊

| 項目 | 值 |
|------|-----|
| 學校名稱 | Kang Chiao International School (KCIS) |
| 校區 | Linkou Campus (林口校區) |
| 學部 | Elementary Division (小學部) |
| 年級範圍 | G1 - G6 |
| 班級數量 | 84 班 (每年級 14 班) |

---

## 課程類型 (Course Types)

### 標準術語

| 代碼 | 英文全名 | 中文 | 說明 |
|------|----------|------|------|
| **LT** | Local Teacher | 本地教師 | 教授 English Language Arts (ELA) |
| **IT** | International Teacher | 國際教師 | 教授 English Language Arts (ELA) |
| **KCFS** | Kang Chiao Future Skill | 康橋未來技能 | 獨立課程，使用 0-5 分制 |
| **EV** | Extended Vocabulary | 延伸字彙 | 部分年級選修，不需點名 |

### UI 顯示規則

1. **課程類型標籤**：直接顯示代碼 (LT, IT, KCFS)，不顯示完整名稱
2. **課表顏色**：
   - English (LT/IT): 藍色 `bg-blue-500`
   - KCFS: 翡翠綠 `bg-emerald-500`
   - EV: 紫色 `bg-purple-500`

### 一班三師 (One Class, Three Teachers)

每個班級固定包含三種課程：
```
班級 (class)
  ├── LT 課程 (ELA)
  ├── IT 課程 (ELA)
  └── KCFS 課程
```

---

## 角色定義 (Roles)

| 代碼 | 英文 | 中文 | 權限範圍 |
|------|------|------|----------|
| **admin** | Administrator | 系統管理員 | 全域存取 |
| **head** | Head Teacher | 年段主任 | 管轄年級 + 課程類型 |
| **teacher** | Teacher | 教師 | 自己任課班級 |
| **office_member** | Office Member | 行政人員 | 唯讀全部 + 任課編輯 |

### Head Teacher 職責範圍

Head Teacher 依據 `users.track` 欄位管理特定課程類型：
- **LT Head**: 管理該年級所有 LT 課程
- **IT Head**: 管理該年級所有 IT 課程
- **KCFS Head**: 管理該年級所有 KCFS 課程

---

## 學生分級 (English Levels)

### Level 格式

`G[年級]E[等級]`

| Level |
|-------|
| E1 |
| E2 |
| E3 |

### 範例

- `G1E1` = 一年級 E1
- `G4E2` = 四年級 E2
- `G6E3` = 六年級 E3

### 重要規則

**不同年級的 E1 能力標準不同**
- G1E1 (一年級頂尖) ≠ G4E1 (四年級頂尖)
- 只在同年級內比較 Level

---

## 成績系統

### LT/IT 評量代碼

| 類別 | 代碼 | 數量 | 權重 |
|------|------|------|------|
| Formative Assessment | FA1-FA8 | 8 個 | 各 15% (平均) |
| Summative Assessment | SA1-SA4 | 4 個 | 各 20% (平均) |
| Final/Mid Exam | FINAL, MID | 1 個 | 10% |

### KCFS 評量類別 (依年級)

| 年級 | 類別 |
|------|------|
| G1-G2 | COMM, COLLAB, SD |
| G3-G4 | COMM, COLLAB, SD, CT |
| G5-G6 | COMM, COLLAB, SD, CT, BW, PORT, PRES |

### 計算公式

```
LT/IT 學期成績 = (FA平均 × 0.15 + SA平均 × 0.20 + 期末考 × 0.10) ÷ 0.45
KCFS 學期成績 = 50 + Σ(類別分數 × 權重)
```

---

## 時間設定

### 學年 (Academic Year)

- 格式: `YYYY-YYYY` (例: `2025-2026`)
- 當前學年: `2025-2026`

### 學期 (Semester)

| Semester | 中文 | 月份 |
|----------|------|------|
| Fall (1) | 秋季學期 | 9月 - 1月 |
| Spring (2) | 春季學期 | 2月 - 6月 |

### 學期階段 (Term)

每個 Semester 包含 2 個 Term（期中、期末）：

| Term | Semester | 中文 | 說明 |
|------|----------|------|------|
| Term 1 | Fall | 秋季期中 | Fall Midterm |
| Term 2 | Fall | 秋季期末 | Fall Final |
| Term 3 | Spring | 春季期中 | Spring Midterm |
| Term 4 | Spring | 春季期末 | Spring Final |

### 課表節次

| 節次 | 開始 | 結束 |
|------|------|------|
| 1 | 08:25 | 09:05 |
| 2 | 09:10 | 09:50 |
| 3 | 10:20 | 11:00 |
| 4 | 11:05 | 11:45 |
| 5 | 12:55 | 13:35 |
| 6 | 13:40 | 14:20 |
| 7 | 14:40 | 15:20 |
| 8 | 15:25 | 16:05 |

---

## 點名狀態 (Attendance Status)

| 代碼 | 英文 | 中文 | 顏色 |
|------|------|------|------|
| **P** | Present | 出席 | 綠色 |
| **L** | Late | 遲到 | 黃色 |
| **A** | Absent | 缺席 | 紅色 |
| **S** | Sick | 病假 | 藍色 |

---

## 家長聯繫時段 (Contact Period)

LT 課程的必要通話時段：

| 代碼 | UI 顯示 | 中文 | 說明 |
|------|---------|------|------|
| `semester_start` | Semester Start | 學期初 | 必要通話 |
| `midterm` | Midterm | 期中 | 必要通話 |
| `final` | Final | 期末 | 必要通話 |
| `ad_hoc` | Other | 其他 | 非必要通話 |

---

## 資料匹配規則

### 唯一識別碼

| 實體 | 唯一識別欄位 | 說明 |
|------|--------------|------|
| 教師 | `email` | 所有教師匹配使用 email |
| 學生 | `student_id` | 學號 (student_number) |
| 班級 | `id` (UUID) | 資料庫主鍵 |
| 課程 | `id` (UUID) | 資料庫主鍵 |

### 教師匹配優先順序

**只使用 email 匹配**，不使用 teacher_id 或 teacher_name：
```typescript
// 正確
const matches = entries.filter(e => e.teacher_email === user.email);

// 錯誤 - 不要使用
const matches = entries.filter(e => e.teacher_id === user.id);
```

---

## 資料模型核心概念 (Data Model Core Concepts)

### 學生資料穩定性

| 欄位 | 穩定性 | 說明 |
|------|--------|------|
| `students.id` (UUID) | ✅ 穩定 | 所有資料關聯點，永不改變 |
| `students.student_id` (學號) | ✅ 穩定 | 外部識別碼 (如 LE10028)，永不改變 |
| `students.grade` | ❌ 會變 | 每年晉級更新 (G4→G5→G6) |
| `students.class_id` | ❌ 會變 | 指向當前班級，每年更新 |

### 班級-老師關係動態性

| 概念 | 說明 |
|------|------|
| 班級名稱重複 | 相同班名（如 "G4 Voyagers"）每年有不同的 class UUID |
| 老師每年會換 | 同一班名不同學年可能由不同老師授課 |
| 老師年段調動 | 老師可能從 G3-4 調到 G5-6，甚至跨 grade band |
| 課程綁定學年 | `courses` 表中每筆記錄綁定特定 `academic_year` 和 `teacher_id` |

**查詢老師的班級時，必須過濾 `academic_year`**：
```typescript
// ✅ 正確 - 只取當前學年老師的班級
const { data } = await supabase
  .from('courses')
  .select('*, class:classes(*)')
  .eq('teacher_id', teacherId)
  .eq('academic_year', currentAcademicYear)  // 必須！

// ❌ 錯誤 - 會顯示老師過去/未來學年的班級
const { data } = await supabase
  .from('courses')
  .select('*, class:classes(*)')
  .eq('teacher_id', teacherId)
```

### 成績追蹤機制

成績透過穩定的 `students.id` 關聯，不會因晉級而遺失：
```
scores.student_id → students.id (穩定的 UUID)
                  ↓
      成績跟著學生走，跨學年仍可追溯
```

### 歷史班級查詢

查詢學生「過去」所屬班級時，使用 `student_class_history` 表：
```typescript
// 查詢學生在 2024-2025 學年的班級
const { data } = await supabase
  .from('student_class_history')
  .select('english_class, grade')
  .eq('student_number', 'LE10028')
  .eq('academic_year', '2024-2025')
  .single()
// → { english_class: 'G4 Voyagers', grade: 4 }
```

---

## 資料隔離規則 (Data Isolation Rules)

### 學年度隔離 (Academic Year Isolation)

**所有涉及 courses/classes/exams/scores 的查詢必須包含 academic_year 過濾**

| 表格 | 過濾欄位 | 說明 |
|------|----------|------|
| courses | academic_year | 課程屬於特定學年 |
| classes | academic_year | 班級屬於特定學年 |
| exams | 透過 course_id | 間接繼承學年 |
| scores | 透過 exam_id | 間接繼承學年 |

#### 正確查詢模式
```typescript
// ✅ 正確 - 查詢 courses 時過濾 academic_year
const { data } = await supabase
  .from('courses')
  .select('*')
  .eq('class_id', classId)
  .eq('academic_year', academicYear)  // 必須！
  .eq('is_active', true)

// ✅ 正確 - 從 class 取得 academic_year 後再查詢
const { data: classData } = await supabase
  .from('classes')
  .select('academic_year')
  .eq('id', classId)
  .single()

const { data: courses } = await supabase
  .from('courses')
  .eq('class_id', classId)
  .eq('academic_year', classData.academic_year)
```

#### 錯誤查詢模式
```typescript
// ❌ 錯誤 - 缺少 academic_year
const { data } = await supabase
  .from('courses')
  .select('*')
  .eq('class_id', classId)
  .eq('is_active', true)
  // 可能返回多個學年的課程！
```

### Term 隔離 (Term Isolation)

**成績/考試查詢必須包含 term 過濾**

```typescript
// ✅ 正確 - 查詢特定 term 的成績
const { data } = await supabase
  .from('scores')
  .select('*, exam:exams!inner(*)')
  .eq('exam.course_id', courseId)
  .eq('exam.term', term)  // 必須！

// ❌ 錯誤 - 可能混合多個 term 的成績
const { data } = await supabase
  .from('scores')
  .select('*, exam:exams!inner(*)')
  .eq('exam.course_id', courseId)
```

---

## MAP Assessment (NWEA)

### 適用範圍

- **年級**: G3 - G6 (一二年級不測 MAP)
- **科目**: Reading, Language Usage

### 分數類型

| 分數 | 說明 |
|------|------|
| RIT Score | 能力分數 (Rasch Unit) |
| Lexile Score | 閱讀程度 (僅 Reading) |
| Goal Area Scores | 各目標領域分數 |

### 同儕比較規則

**使用 English Level 分組** (不用班級)：
- 避免暴露班級平均給家長
- 比較範圍: 同年級同 Level (如 G4E2)

---

## 命名規範

### 班級命名

格式: `G[年級] [名稱]`

範例:
- G1 Explorers
- G4 Seekers
- G6 Navigators

### 課程命名

格式: `[班級名稱] - [課程類型]`

範例:
- G4 Seekers - LT
- G4 Seekers - IT
- G4 Seekers - KCFS

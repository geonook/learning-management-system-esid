# LMS Gradebook Skill

> 成績計算公式、Gradebook 元件架構、Expectations 系統
> Last Updated: 2025-12-22

## LT/IT Grade Calculation（英語課成績）

### Assessment Codes（評量代碼）

| 代碼 | 類型 | 權重 |
|------|------|------|
| FA1-FA8 | Formative Assessment | 0.0188 each (15% total) |
| SA1-SA4 | Summative Assessment | 0.05 each (20% total) |
| FINAL | Final Exam | 0.10 |
| MID | Midterm | 0.10 |

**注意**：FINAL 和 MID 兩個代碼都存在於資料庫中（共 14 個代碼）。

### 兩個計算引擎

系統有兩個獨立的計算引擎：

| 引擎 | 檔案位置 | 使用的期末代碼 |
|------|----------|----------------|
| Core Grade | `lib/grade/calculations.ts` | **FINAL** |
| Formula Engine | `lib/gradebook/FormulaEngine.ts` | **MID** |

### 計算規則

1. **僅計入 >0 的分數**
2. **全 0 → 平均 null**
3. **四捨五入到小數 2 位**（lib/grade）或 1 位（FormulaEngine）

### 計算公式

```typescript
// Formative 平均（FA1-FA8 中 >0 的平均）
FormativeAvg = avg(FA where FA > 0)

// Summative 平均（SA1-SA4 中 >0 的平均）
SummativeAvg = avg(SA where SA > 0)

// 學期總分（使用 FINAL 或 MID，取決於計算引擎）
Semester = (FormativeAvg × 0.15 + SummativeAvg × 0.20 + FINAL/MID × 0.10) ÷ 0.45
```

### 程式碼位置

```
/lib/grade/calculations.ts      - 核心計算函式（使用 FINAL）
/lib/grade/kcfs-calculations.ts - KCFS 計算函式
/lib/gradebook/FormulaEngine.ts - 公式引擎（使用 MID）
```

### 使用範例

```typescript
import { FormulaEngine } from '@/lib/gradebook/FormulaEngine';

// 計算學期總分（使用 MID）
const termGrade = FormulaEngine.calculateTermGrade(scores);

// 取得 Formative 平均
const faAvg = FormulaEngine.getFormativeAverage(scores);

// 取得 Summative 平均
const saAvg = FormulaEngine.getSummativeAverage(scores);
```

---

## KCFS Grade Calculation（康橋未來技能課程）

### 分數範圍

- **輸入範圍**：0-5（0.5 增量）
- **輸出範圍**：50-100

### 年級別類別與權重

| 年級 | 類別代碼 | 類別數 | 每類權重 |
|------|----------|--------|----------|
| G1-2 | COMM, COLLAB, SD, CT | 4 | 2.5 |
| G3-4 | COMM, COLLAB, SD, CT, BW | 5 | 2.0 |
| G5-6 | COMM, COLLAB, SD, CT, PORT, PRES | 6 | 5/3 (1.667) |

### 類別說明

| 代碼 | 全名 | 年級 |
|------|------|------|
| COMM | Communication | 全年級 |
| COLLAB | Collaboration | 全年級 |
| SD | Self-Direction | 全年級 |
| CT | Critical Thinking | 全年級 |
| BW | Book Work | G3-4 only |
| PORT | Portfolio | G5-6 only |
| PRES | Presentation | G5-6 only |

### KCFS 計算公式

```typescript
// KCFS Term Grade = 50 + Σ(category_score × weight)
//
// 範例（G3-4，5 類，權重 2.0）：
// scores = { COMM: 4.5, COLLAB: 4.0, SD: 3.5, CT: 4.0, BW: 3.5 }
// termGrade = 50 + (4.5 + 4.0 + 3.5 + 4.0 + 3.5) × 2.0 = 50 + 39 = 89

import { FormulaEngine } from '@/lib/gradebook/FormulaEngine';

// KCFS 計算（需要年級參數）
const kcfsGrade = FormulaEngine.calculateKCFSTermGrade(scores, absentFlags, grade);
```

### KCFS 計算規則

1. **所有數值分數（0-5）都計入**（不像 LT/IT 排除 0）
2. **null 分數排除**（未輸入）
3. **Absent 分數排除**（標記缺席）
4. **至少需要 1 個有效分數**
5. **四捨五入到小數 1 位**

---

## Assessment Title 覆寫系統

### 優先級層級

```
Class Level > Grade×Track Level > Default
```

### 使用情境

- Head Teacher 可為特定班級或年級自定義評量顯示名稱
- 計算永遠使用代碼（FA1, SA2 等），顯示名稱僅影響 UI

### 資料表結構

```sql
CREATE TABLE assessment_titles (
  id UUID PRIMARY KEY,
  context TEXT NOT NULL,           -- 'class:{id}' 或 'grade:{n}:track:{type}'
  assessment_code TEXT NOT NULL,   -- 'FA1', 'SA2', 'MID' 等
  display_name TEXT NOT NULL,      -- 自定義顯示名稱
  UNIQUE(context, assessment_code)
);
```

---

## Gradebook 元件架構

### 檔案結構

```
app/(lms)/class/[classId]/gradebook/
├── page.tsx              # Server Component - 資料載入
├── GradebookHeader.tsx   # 頁面標題、麵包屑
└── GradebookClient.tsx   # Client Component - 互動邏輯

components/gradebook/
├── Spreadsheet.tsx           # 成績表格（核心資料輸入）
├── CourseTypeSelector.tsx    # LT/IT/KCFS 選擇器
└── FocusGradeInput.tsx       # Focus Mode 批量輸入
```

### 工具欄設計

```
┌──────────────────────────────────────────────────────────────┐
│ [LT] [IT] [KCFS]   👤 陳老師 John Chen   👥 20 Students ✓ Saved │
│ ← 課程選擇器      ← 教師資訊           ← 學生數 + 儲存狀態    │
└──────────────────────────────────────────────────────────────┘
```

### API 架構

**Server Actions** (`lib/actions/gradebook.ts`)：

```typescript
type CourseType = "LT" | "IT" | "KCFS";
type TeacherInfo = { teacherName: string | null; teacherId: string | null };
type GradebookData = {
  students: { id, student_id, full_name, scores }[];
  assessmentCodes: string[];           // FA1-8, SA1-4, MID
  availableCourseTypes: CourseType[];  // 該班級可用的課程類型
  currentCourseType: CourseType | null;
  teacherInfo: TeacherInfo | null;     // 當前課程教師
};

// 主要函數
getGradebookData(classId, courseType?)  // 取得成績資料 + 教師資訊
updateScore(classId, studentId, code, score)  // 更新單一成績
```

---

## Gradebook Expectations 系統 (v1.52.0)

### 功能概述

Head Teacher 可為管轄範圍內的課程設定成績輸入預期：
- 設定完成率門檻（預設 80%）
- 設定到期日
- 追蹤教師完成進度

### 資料表結構

```sql
CREATE TABLE gradebook_expectations (
  id UUID PRIMARY KEY,
  academic_year TEXT NOT NULL,
  term INTEGER NOT NULL,           -- 1-4
  grade INTEGER NOT NULL,          -- 1-6
  course_type course_type NOT NULL, -- 'LT' | 'IT' | 'KCFS'
  assessment_code TEXT NOT NULL,   -- 'FA1', 'SA2', 'MID' 等
  expected_completion DECIMAL(5,2) DEFAULT 80.00,
  due_date DATE,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(academic_year, term, grade, course_type, assessment_code)
);
```

### 進度計算

```typescript
// 完成率 = 已輸入成績數 / (學生數 × 應輸入成績數)
const completionRate = (enteredScores / (studentCount * assessmentCount)) * 100;

// 狀態判定
if (completionRate >= expectedCompletion) return 'on_track';    // 綠色
if (completionRate > 0) return 'behind';                        // 黃色
return 'not_started';                                           // 灰色
```

### UI 元件

```
components/gradebook/
├── ExpectationsManager.tsx    # HT 設定預期
├── ExpectationsProgress.tsx   # 進度顯示
└── ExpectationsBadge.tsx      # 狀態徽章
```

### 權限控制

| 角色 | 查看 | 設定 |
|------|------|------|
| Admin | ✅ 全部 | ✅ 全部 |
| Head Teacher | ✅ 管轄範圍 | ✅ 管轄範圍 |
| Teacher | ✅ 自己課程 | ❌ |
| Office Member | ✅ 全部（唯讀） | ❌ |

---

## Spreadsheet 成績輸入

### 功能特性

- **即時儲存**：每次輸入自動儲存
- **Tab 導航**：Tab 鍵移動到下一格
- **Enter 確認**：Enter 鍵確認並移動
- **Focus Mode**：批量輸入模式（同一評量多學生）

### 輸入驗證

```typescript
// 分數範圍：0-100
if (score < 0 || score > 100) return 'invalid';

// 空白允許
if (score === null || score === '') return 'valid';
```

### 儲存狀態

| 狀態 | 顯示 | 說明 |
|------|------|------|
| saved | ✓ Saved | 所有變更已儲存 |
| saving | Saving... | 正在儲存中 |
| error | ⚠ Error | 儲存失敗 |
| unsaved | • Unsaved | 有未儲存變更 |

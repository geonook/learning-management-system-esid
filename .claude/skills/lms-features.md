# LMS Features Skill

> Browse Gradebook、Course Kanban、Communications、Statistics Module

## Browse Gradebook 架構

### 功能概述

監控全校班級的成績輸入進度：
- **Class-Based 視圖**：每班一行（84 班），取代舊版 exam-based（1000 筆）
- **LT/IT/KCFS 進度欄**：顯示三種課程的成績輸入完成率
- **狀態篩選**：On Track / Behind / Not Started
- **年級篩選**：G1-G6

### 資料結構

```typescript
interface ClassProgress {
  class_id: string;
  class_name: string;
  grade: number;
  student_count: number;
  lt_progress: number;      // 0-100%
  it_progress: number;      // 0-100%
  kcfs_progress: number;    // 0-100%
  lt_teacher: string | null;
  it_teacher: string | null;
  kcfs_teacher: string | null;
  overall_status: 'on_track' | 'behind' | 'not_started';
}
```

### 進度計算

```typescript
// 每個課程的進度 = 已輸入成績數 / (學生數 × 13)
// 13 = FA1-FA8 (8) + SA1-SA4 (4) + MID (1)
const progress = (scores_entered / (student_count * 13)) * 100;

// 狀態判定
if (lt >= 80 && it >= 80 && kcfs >= 80) return 'on_track';
if (lt > 0 || it > 0 || kcfs > 0) return 'behind';
return 'not_started';
```

### 相關檔案

| 檔案 | 說明 |
|------|------|
| `types/browse-gradebook.ts` | TypeScript 型別定義 |
| `lib/api/browse-gradebook.ts` | API：`getClassesProgress()` |
| `app/(lms)/browse/gradebook/page.tsx` | UI 元件 |

---

## Course Kanban 架構

### 功能概述

課程層級的任務看板：
- **Kanban 三欄**：To Do / In Progress / Done
- **拖曳排序**：使用 @dnd-kit/core
- **課程隔離**：綁定 `course_id`，教師只看自己的任務

### 資料表

```sql
CREATE TABLE course_tasks (
  id UUID PRIMARY KEY,
  course_id UUID REFERENCES courses(id),
  teacher_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo',  -- 'todo' | 'in_progress' | 'done'
  due_date DATE,
  position INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 相關檔案

| 檔案 | 說明 |
|------|------|
| `types/course-tasks.ts` | TypeScript 型別定義 |
| `lib/api/course-tasks.ts` | CRUD API |
| `components/class/CourseKanban.tsx` | Kanban 元件 |

---

## Communications 架構

### 功能概述

課程層級的家長通訊追蹤：
- **LT 課程**：電話通訊追蹤（semester_start / midterm / final）
- **IT/KCFS 課程**：學生備忘功能

### 權限控制

| 角色 | 可見課程 | 可編輯 |
|------|----------|--------|
| Teacher | 自己任課的課程 | ✅ |
| Head Teacher | 自己 track 類型的課程 | ❌ 唯讀 |
| Admin | 所有課程 | ✅ |
| Office Member | 所有課程 | ❌ 唯讀 |

### 相關檔案

| 檔案 | 說明 |
|------|------|
| `db/migrations/024_create_communications.sql` | 資料表 + RLS |
| `app/(lms)/class/[classId]/communications/page.tsx` | UI 元件 |
| `components/os/ClassContextTabs.tsx` | Tab 導航 |

---

## Statistics Module

### 頁面結構

```
/browse/stats/
├── page.tsx           # 總覽 Dashboard
├── classes/page.tsx   # 班級統計
├── students/page.tsx  # 學生統計
├── grades/page.tsx    # 年級統計
├── teachers/page.tsx  # 教師統計
├── courses/page.tsx   # 課程統計
├── exams/page.tsx     # 考試統計
└── trends/page.tsx    # 趨勢分析
```

### GlobalFilterBar

全域篩選系統，支援：
- **學年選擇**：2025-2026 / 2026-2027
- **Term 選擇**：Term 1-4

```typescript
interface GlobalFilters {
  academicYear: string;   // '2025-2026'
  term: number | null;    // 1-4 或 null（全部）
}
```

### Four-Term 學期系統

| Term | 名稱 | Semester |
|------|------|----------|
| 1 | Fall Midterm（秋季期中） | 1 (Fall) |
| 2 | Fall Final（秋季期末） | 1 (Fall) |
| 3 | Spring Midterm（春季期中） | 2 (Spring) |
| 4 | Spring Final（春季期末） | 2 (Spring) |

### XLSX 匯出

所有統計頁面支援 XLSX 匯出：
```typescript
import * as XLSX from 'xlsx';

function exportToXLSX(data: any[], filename: string) {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Data');
  XLSX.writeFile(wb, `${filename}.xlsx`);
}
```

### 圖表類型

使用 Recharts：
- **BarChart**：班級/年級比較
- **LineChart**：趨勢分析
- **PieChart**：分佈統計
- **AreaChart**：累積進度
- **RadarChart**：多維度比較
- **ScatterChart**：相關性分析

---

## Class Context Tabs

### 導航結構

```
/class/[classId]/
├── overview     # 班級總覽（含 Kanban）
├── gradebook    # 成績簿
├── students     # 學生名冊
└── communications  # 通訊記錄
```

### Tab 元件

```typescript
// components/os/ClassContextTabs.tsx
const tabs = [
  { id: 'overview', label: 'Overview', path: `/class/${classId}` },
  { id: 'gradebook', label: 'Gradebook', path: `/class/${classId}/gradebook` },
  { id: 'students', label: 'Students', path: `/class/${classId}/students` },
  { id: 'communications', label: 'Communications', path: `/class/${classId}/communications` },
];
```

---

## 共用元件

### PageHeader

```typescript
interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: { label: string; href?: string }[];
  actions?: React.ReactNode;
}
```

### DataTable

```typescript
interface DataTableProps<T> {
  data: T[];
  columns: ColumnDef<T>[];
  searchable?: boolean;
  filterable?: boolean;
  exportable?: boolean;
}
```

### StatusBadge

```typescript
type Status = 'on_track' | 'behind' | 'not_started' | 'completed';

const statusColors = {
  on_track: 'bg-green-500',
  behind: 'bg-yellow-500',
  not_started: 'bg-gray-500',
  completed: 'bg-blue-500',
};
```

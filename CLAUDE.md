# CLAUDE.md - learning-management-system-esid

> **Documentation Version**: 3.6
> **Last Updated**: 2025-12-13
> **Project**: learning-management-system-esid
> **Description**: Full-stack Primary School Learning Management System with Next.js + TypeScript + Supabase Cloud + Advanced Analytics + **SSO Integration (Both Systems Complete)**
> **Features**: ELA Course Architecture, Assessment Title Management, Real-time Notifications, Student Course Management, **CSV Import System (✅)**, RLS Security, Grade Calculations, **Analytics Engine (Phase 3A-1 ✅)**, **Database Analytics Views (✅)**, **Testing Framework (✅)**, **Supabase Cloud Migration (✅)**, **RLS Performance Optimization (✅)**, **Info Hub SSO Integration (✅ 100% Complete)**, **ESLint Configuration (✅)**, **Build Optimization (✅)**, **One OS Interface (Phase 4.1 ✅)**, **Dockerfile Optimization (✅)**, **TeacherOS UI Refinements (v1.41.0 ✅)**, **Teacher Course Assignment (v1.42.0 ✅)**, **Data Pages Sprint 1-2 (v1.43.0 ✅)**, **Browse Pages Loading Fix (v1.44.0 ✅)**, **Auth State Change Fix (v1.45.0 ✅)**, **Class Student Roster (v1.46.0 ✅)**, **Course Assignment UI (v1.47.0 ✅)**, **Gradebook Course Filter (v1.48.0 ✅)**, **Gradebook UI/UX Refactor (v1.49.0 ✅)**, **Production RLS Fix (v1.49.1 ✅)**, **Browse Gradebook Refactor (v1.50.0 ✅)**, **Course Kanban & Communications (v1.50.0 ✅)**, **Statistics Module Phase 2 (v1.51.0 ✅)**, **Academic Year + Term System (v1.51.0 ✅)**, **2026-2027 Academic Year (v1.51.0 ✅)**

> **Current Status**:
>
> - ✅ **v1.51.0 Statistics & Analytics + Academic Year System** - Sprint 6 完整功能 (2025-12-13)
>   - **Statistics Module Phase 2**：8 個統計頁面 + 圖表 + XLSX 匯出
>   - **GlobalFilterBar**：學年 + Term 全域篩選系統
>   - **Four-Term System**：Term 1-4 (Fall Midterm/Final, Spring Midterm/Final)
>   - **2026-2027 Academic Year**：84 班級、252 課程（Migration 031）
>   - **Migration 029**：課程任務 Kanban 表 + RLS
>   - **Migration 030**：exams.term/semester 欄位 + 自動計算 trigger
>   - **Gradebook 406 修復**：移除 RLS 衝突查詢
> - ✅ **v1.50.0 Browse Gradebook Refactor & Sprint 4 Features** - 完整重構 Browse Gradebook + 新增課程功能 (2025-12-09)
>   - **Browse Gradebook 重構**：從 exam-based（1000 筆）改為 class-based（84 班）視圖
>   - 新增 LT/IT/KCFS 三欄進度顯示，進度計算：`scores / (students × 13)`
>   - 狀態判定：on_track (≥80%), behind (>0%), not_started (0%)
>   - **Course Kanban**：課程層級任務看板，支援拖曳排序
>   - **Communications**：LT 電話通訊追蹤 + IT/KCFS 備忘功能
>   - 新增檔案：`types/browse-gradebook.ts`, `lib/api/browse-gradebook.ts`
> - ✅ **v1.49.1 Production RLS & Server Component Fix** - 修復 Production 環境問題 (2025-12-09)
>   - 修復 users 表 RLS 無限遞迴（Migration 028）
>   - 刪除 24 個有遞迴問題的 RLS policies
>   - 修復 class layout Server Component 使用錯誤的 Supabase client
> - ✅ **v1.49.0 Gradebook UI/UX Refactor** - 統一工具欄、移除冗餘元素 (2025-12-09)
>   - 簡化 PageHeader subtitle（移除課程類型和教師）
>   - 重設計工具欄：課程選擇器 + 教師 + 學生數 + 儲存狀態
>   - 移除底部狀態欄（資訊整合到工具欄）
>   - 儲存狀態從 Spreadsheet 移至 GradebookClient
> - ✅ **v1.48.0 Gradebook Course Filter** - 課程類型篩選與教師顯示 (2025-12-09)
>   - 新增 LT/IT/KCFS 課程切換功能
>   - 顯示當前課程的任課教師姓名
>   - 動態更新教師資訊切換時
> - ✅ **v1.47.0 Sprint 3.2 Course Assignment UI** - 課程指派管理介面 (2025-12-08)
> - ✅ **v1.46.0 Sprint 3.1 Class Student Roster** - 班級學生名冊功能實作 (2025-12-08)
> - ✅ **v1.45.0 Auth State Change Fix** - 修復 React 閉包與重複 fetch 問題 (2025-12-08)
> - ✅ **v1.44.1 Browse Pages Loading Fix (Improved)** - 簡化 useEffect 模式 (2025-12-08)
> - ✅ **v1.43.0 Data Pages Complete** - Sprint 1 & 2 功能完善計畫完成 (2025-12-04)
> - ✅ **v1.42.0 Teacher Course Assignment** - 252 courses assigned to 80 teachers (2025-12-03)
> - ✅ **Production Teacher Import** - 81 users imported (admin:1, head:8, teacher:54, office_member:17)
> - ✅ **Phase 4.1 Complete** - One OS Interface Unification with Info Hub
> - ✅ **SSO Implementation** - Both LMS & Info Hub complete, alignment verified
> - 🎯 **Next Steps**:
>   1. Sprint 7: 學生歷年成績報表（跨年成績總覽）
>   2. Phase D2: 淺色模式配色統一、Notion 風格設計系統
>   3. Sprint 3.3: 我的課表（教師查看自己的課表）
>   4. CSV Import: 成績資料批次匯入功能（Term 2 資料）

This file provides essential guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🔧 FULL-STACK ADDENDUM — LMS-ESID

> ✅ 啟動語（Claude 必須回覆）  
> 「✅ 規則已確認 — 我將遵循 FULL-STACK ADDENDUM 的架構、RLS、API 規範與測試標準」

### Stack

- Frontend: Next.js (App Router) + TypeScript + Tailwind + shadcn/ui + Radix + Framer Motion
- Backend: **Supabase Cloud 官方雲端**（PostgreSQL, Auth, Storage, Edge Functions）
- Charts: ECharts or Recharts
- 部署：Zeabur（前端）+ Supabase Cloud（後端資料庫）

### 必守目錄

/app/**（路由與頁殼）  
/components/**（重用元件）  
/lib/supabase/**（client、服務端 helper、edge 呼叫）  
/lib/grade/**（🧮 成績計算純函式，禁止等第換算）  
/lib/api/**（前端資料層：呼叫 Edge/REST/RPC）  
/db/**（SQL schema，RLS policy，種子資料）  
/tests/**（單元/端對端/合約測試）  
/scripts/**（資料匯入、migration 便利腳本）

### 🧮 Grade Calculation（唯一真相）

- Codes：FA1..FA8, SA1..SA4, FINAL（計算永遠用代碼，不用顯示名稱）
- 規則：僅計入 >0；全 0 → 平均 null；Semester 四捨五入到小數 2 位
- 公式：FormativeAvg = avg(FA>0), SummativeAvg = avg(SA>0), Semester = (F×0.15 + S×0.2 + Final×0.1) ÷ 0.45
- 前後端皆使用 `/lib/grade` 同一套函式（或 SQL/視圖同邏輯）驗證一致性

### Assessment 顯示名稱覆寫（HT）

- 顯示名與代碼分離：Class > Grade×Track > Default；缺值回退
- 僅影響 UI 與報表標題；計算仍用代碼
- 資料表：`assessment_titles`（見下方 schema）

### 教師類型與課程定義

- **LT = Local Teacher（本地教師）** - 教授 English Language Arts (ELA)
- **IT = International Teacher（國際教師）** - 教授 English Language Arts (ELA)
- **KCFS = Kang Chiao Future Skill** - 獨立課程類型，由專門的 KCFS 教師授課
- **HT = Head Teacher（年段主任）** - 年段與校區管理權限

### 課程架構（核心特色 - 一班三師）

- **統一課程標準**：所有班級都包含三種標準課程
  - LT English Language Arts (ELA) - 本地教師
  - IT English Language Arts (ELA) - 國際教師
  - KCFS - 康橋未來技能課程（獨立課程）
- **Track 欄位語意**（✅ Migration 014 已實施）：
  - `classes.track`: **永遠為 NULL**（班級不屬於任何單一 track，型別為 `track_type` ENUM）
  - `users.track`: 儲存 Head Teacher 的課程類型職責（**LT/IT/KCFS**，型別為 `course_type` ENUM）
  - `students.track`: **已棄用**（設為 NULL，改用 `students.level` 欄位，型別為 `course_type` ENUM）
  - `courses.course_type`: 儲存實際課程類型（LT/IT/KCFS，型別為 `course_type` ENUM）
- **課程-教師關聯**：透過 `courses` 表實現，支援一個班級有三位不同類型的教師

### 小學年段系統（G1-G6）

- **年級範圍**：Grade 1 至 Grade 6
- **Level 分級格式**：G[1-6]E[1-3]（例如：G1E1, G4E2, G6E3）
  - 包含年級資訊，因為不同年級的 E1 能力標準不同
  - G1E1（一年級頂尖）≠ G4E1（四年級頂尖）
  - 資料庫欄位類型：TEXT（非 ENUM），帶格式驗證
- **班級命名**：G[1-6] [StandardName] 格式（例如：G4 Seekers, G6 Navigators）

### 🔍 Supabase Nested Join 查詢模式（重要）

**核心規則**：Supabase 的 `table!inner` 語法是透過 **外鍵（FK）** 連接，不是透過查詢中選取的欄位。

**資料庫關聯**：
```
scores → exam_id (FK) → exams → course_id (FK) → courses → class_id (FK) → classes
```

**正確模式**（參考 `lib/actions/gradebook.ts`）：
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

**錯誤模式**（會導致所有資料被過濾掉）：
```typescript
exam:exams!inner(
  class_id,                       // ← 這個欄位與 courses!inner 無關
  course:courses!inner(...)       // ← join 是用 course_id FK
)
// 然後過濾 exam.class_id → 永遠不匹配！
```

**為什麼這很重要**：
- `exams` 表同時有 `class_id` 和 `course_id` 欄位
- Supabase 的 `courses!inner` 只看 FK 關係（`course_id`）
- 選取 `exam.class_id` 不會影響 join 行為
- 如果需要 class_id，應該從 `course.class_id` 取得

**效能最佳實踐**：
- 永遠加上 `.in('student_id', studentIds)` 限制查詢範圍
- 避免全表掃描導致超時

### 安全與權限（RLS 核心）

- **角色定義**：admin、head（HT）、teacher（LT/IT/KCFS）、office_member
- **Teacher（教師）**：僅能存取自己任課班級的考試與成績
- **Head Teacher（年段主任）**：
  - 權限範圍：Grade（年級）+ Course Type（課程類型）
  - 範例：G4 LT Head Teacher 可管理所有 G4 年級的 LT 課程（14 個班級的 LT 課程）
  - 檢視權限：可查看該年級所有班級
  - 管理權限：僅能管理自己 course_type 的課程
- **Office Member（行政人員）**：
  - 查看權限：可查看所有班級、學生、成績（唯讀）
  - 編輯權限：若同時為授課教師，僅能編輯自己任課班級的成績
  - 使用情境：同時是行政人員 + 授課教師的雙重身份
- **Admin（系統管理員）**：全域存取權限

### 🔐 Auth 標準模式（MANDATORY）

**永遠使用 `useAuthReady` hook，不要直接使用 `useAuth`**

```typescript
// ✅ 正確模式
import { useAuthReady } from "@/hooks/useAuthReady";

const { userId, isReady, role } = useAuthReady();

useEffect(() => {
  if (!isReady) return;
  fetchData();
}, [userId]);  // primitive 依賴，穩定

// ❌ 錯誤模式（會導致無限迴圈或載入問題）
const { user, loading } = useAuth();

useEffect(() => {
  if (loading || !user) return;
  fetchData();
}, [user]);  // 物件依賴，每次都是新參照
```

**為什麼這很重要？**
1. `user` 是物件，React 比較參照而非值，每次 auth 事件都會觸發 useEffect
2. Supabase 會觸發多個 auth 事件（INITIAL_SESSION, SIGNED_IN, TOKEN_REFRESHED）
3. `useAuthReady` 提取 `userId` 作為穩定的 primitive 值

**Hook 提供的欄位：**
- `userId`: string | null（穩定，用於 useEffect 依賴）
- `role`: string | null（admin/head/teacher/office_member）
- `isReady`: boolean（用戶已登入且權限已載入）
- `isLoading`: boolean（載入中狀態）
- `permissions`: UserPermissions | null（完整權限物件）
- `grade`, `track`, `teacherType`, `fullName`：常用權限欄位

### 🔧 AuthContext useRef 修復（v1.45.0）

**問題**：切換 macOS 桌面再切回來時，`onAuthStateChange` 會觸發 `SIGNED_IN` 事件，但 skip 邏輯無法正確判斷是否為同一用戶。

**根本原因**：React 閉包捕獲舊值

```typescript
// ❌ 錯誤：userPermissions 是閉包捕獲的初始值（null）
useEffect(() => {
  supabase.auth.onAuthStateChange((event, session) => {
    if (userPermissions?.userId === session?.user?.id) {
      return  // 這個條件永遠不成立！
    }
  })
}, [])  // 空依賴，閉包永遠捕獲初始值
```

**解決方案**：使用 `useRef` 追蹤最新值

```typescript
// ✅ 正確：使用 ref 追蹤最新的 userPermissions
const userPermissionsRef = useRef<UserPermissions | null>(null);

// 同步 ref 與 state
useEffect(() => {
  userPermissionsRef.current = userPermissions;
}, [userPermissions]);

// 在回調中使用 ref
supabase.auth.onAuthStateChange((event, session) => {
  if (['TOKEN_REFRESHED', 'SIGNED_IN', 'INITIAL_SESSION'].includes(event)
      && userPermissionsRef.current?.userId === session?.user?.id) {
    console.log('[AuthContext] Same user auth event, skipping permission refetch:', event)
    return
  }
})
```

**效果**：切換桌面回來時，console 會顯示 `[AuthContext] Same user auth event, skipping permission refetch: SIGNED_IN`，不會重新 fetch 所有頁面資料。

### 測試要求

- lib/grade 單元測試：空值/全 0/部分 0/正常/混合 + snapshot
- API 合約測試：scores bulk upsert、exams CRUD、assessment overrides
- 端對端：登入 → 匯入分數 → Admin 看板指標更新

## 🔧 ESLint 配置與建置優化 (2025-11-25) ✅

### ESLint 配置

**配置檔案**: `.eslintrc.json`

```json
{
  "extends": ["next/core-web-vitals", "next/typescript"]
}
```

**目前狀態**:

- ✅ ESLint 配置完成
- ✅ 0 個 ESLint 錯誤（2025-11-30 已全部修復）
- ✅ Build 通過，無警告
- ✅ TypeScript 錯誤已修復（lib/analytics/ 中的 4 個錯誤）

**建置配置**:

`next.config.js` 中的 `eslint.ignoreDuringBuilds: true` 設定可選擇性移除（ESLint 已無錯誤）：

```javascript
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true, // 可選擇性移除，ESLint 已無錯誤
  },
  // ...
};
```

**Technical Debt Cleanup (2025-11-30)**:
- ✅ 所有 ESLint 錯誤已修復（274 → 0）
- ✅ 刪除 11 個過時頁面（~2,866 行代碼移除）
- ✅ 移除過時種子文件（001_sample_data.sql 等）
- ✅ Build 通過，代碼品質顯著提升

### 建置配置優化

**next.config.js 主要設定**:

```javascript
const nextConfig = {
  output: "standalone", // Serverless 部署優化
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Security headers (OWASP 最佳實務)
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          // ... CORS/CSP 配置
        ],
      },
    ];
  },
};
```

**Dynamic Rendering**:

`app/layout.tsx` 中設定強制動態渲染：

```typescript
export const dynamic = "force-dynamic";
```

**原因**:

- AuthProvider 需要伺服器端 session 檢查
- 防止靜態生成時 authentication 狀態問題
- 確保每次請求都取得最新的用戶狀態

**部署目標**:

- 前端：Zeabur（使用 standalone output）
- 後端：Supabase Cloud

## 📦 Import System 重構 (2025-11-21) ✅

### 新增檔案

**批次處理器**: `lib/import/clean-batch-processor.ts`

- 標準化的批次匯入處理邏輯
- 支援 CSV 資料驗證
- 錯誤處理與回報機制
- 進度追蹤功能

**執行協調器**: `lib/import/import-executor.ts`

- 統一的匯入執行流程
- 依賴順序處理（Classes → Teachers → Courses → Students）
- 交易式操作確保資料一致性

### 新增腳本

- `scripts/migrate-production.ts` - 正式環境 migration 執行腳本
- `scripts/migrate-staging.ts` - 預備環境 migration 執行腳本
- `scripts/debug-db.ts` - 資料庫除錯工具
- `scripts/manual-drop.ts` - 手動清理工具（謹慎使用）

### 使用方式

```bash
# 正式環境 migration
npm run db:migrate:prod

# 批次匯入資料
npm run import:batch

# CLI 匯入工具
npm run import:cli
```

## 🆕 Phase 2C 已完成功能 (2025-08-14)

### ✅ 完成狀態

- **Assessment Title 管理系統**: 100% 完成
- **Student Course 管理功能**: 100% 完成
- **Real-time 通知系統**: 100% 完成
- **系統整合測試**: 100% 完成

## 🗄️ Database Migrations 完成記錄 (2025-10-17) ✅ **完全部署**

### ✅ 已完成的 Migrations

#### Migration 007-008 + RLS 003: 課程關聯表架構 (2025-10-17)

- **Migration 007**: 用戶自主註冊 RLS 政策
- **Migration 008**: `courses` 表建立（實現「一班三師」系統）
- **RLS 003**: Courses 表權限政策（4 個 policies）

#### Migration 009: Level 欄位格式升級 (2025-10-17) ✅

- **變更內容**: 將 `level` 欄位從 ENUM 改為 TEXT
- **新格式**: 支援 G1E1 ~ G6E3（包含年級資訊）
- **驗證機制**: CHECK 約束確保格式正確（`G[1-6]E[1-3]`）
- **影響範圍**: `classes` 和 `students` 表

#### Migration 010: 移除 Track NOT NULL 約束 (2025-10-17) ✅

- **變更內容**: `classes.track` 和 `students.track` 允許 NULL 值
- **設計理由**: 在「一班三師」架構中，班級不屬於任何單一 track
- **實際狀態**: 所有班級的 track = NULL
- **影響範圍**: 84 個真實班級資料

#### Migration 011: 移除 Teacher_id NOT NULL 約束 (2025-10-17) ✅

- **變更內容**: `courses.teacher_id` 允許 NULL 值
- **工作流程支援**: 課程建立（teacher_id = NULL）→ 教師指派（更新 teacher_id）
- **影響範圍**: 252 筆課程記錄（84 × 3）

#### Migration 012-013: Student Courses + RLS Security (2025-10-17) ✅

- **Migration 012**: 建立 `student_courses` 表和相關 RLS policies
- **Migration 013**: 修復 RLS policies 安全漏洞，移除匿名存取

#### Migration 014: Track 欄位型別修正 + Analytics 視圖重建 (2025-10-27) ✅

- **變更內容**:
  - 將 `users.track` 和 `students.track` 從 `track_type` ENUM 改為 `course_type` ENUM
  - 重建 3 個 Analytics 資料庫視圖（因視圖依賴問題）
- **原因**:
  - Head Teacher 需要儲存課程類型職責（LT/IT/KCFS），而非 track（local/international）
  - PostgreSQL 不允許修改被視圖引用的欄位型別
- **影響範圍**:
  - `users.track`: `track_type` → `course_type` (nullable)
  - `students.track`: `track_type` → `course_type` (nullable, 設為 NULL)
  - `classes.track`: 保持為 `track_type` (nullable)
  - **Analytics 視圖**: `student_grade_aggregates`, `class_statistics`, `teacher_performance`（刪除並重建）
- **技術挑戰與解決**:
  - **問題 1**: RLS 政策依賴 → 解決：Drop-Recreate Pattern
  - **問題 2**: Analytics 視圖依賴 → 解決：Part 0A 刪除視圖，Part 6 重建視圖
  - 採用完整的 Drop-Modify-Recreate 流程
- **設計理由**:
  - `users.track` 儲存 Head Teacher 的課程類型職責（LT/IT/KCFS）
  - `students.track` 已棄用（改用 `students.level` 欄位）
  - `classes.track` 保持不變（歷史相容性）
- **依賴關係**:
  - Migration 012 的 RLS 政策依賴此型別變更
  - Analytics 視圖依賴 `track` 欄位型別
- **執行順序**: **必須先於** Migration 012 執行
- **檔案大小**: ~550 lines（包含完整視圖定義）
- **相關文件**: `docs/testing/MIGRATION_014_VIEW_DEPENDENCY_FIX.md`

#### Migration 015: RLS Performance Optimization (2025-10-28) ✅ **100% 完成**

- **目的**: 優化所有 RLS policies 中的 `auth.uid()` 呼叫，解決 44+ 個 `auth_rls_initplan` 效能警告
- **優化方法**: 將直接呼叫 `auth.uid()` 改為 `(SELECT auth.uid())`，啟用 PostgreSQL InitPlan 快取機制
- **效能改善**:
  - 查詢複雜度：O(n) → O(1)
  - 預期效能提升：50-200%
  - auth.uid() 呼叫次數：每行重複 → 一次快取
- **執行成果**:
  - ✅ 優化了 49 個 policies（100%）
  - ✅ 涵蓋全部 9 個核心資料表
  - ✅ Database Linter: auth_rls_initplan 警告從 44+ 降至 **0**
- **技術發現**:
  - PostgreSQL 自動將 `(SELECT auth.uid())` 儲存為 `( SELECT auth.uid() AS uid)`
  - Supabase SQL Editor 不顯示 RAISE NOTICE 訊息，需使用 SELECT 版本工具
  - Migration 015b 已部分執行（47/49 policies），需診斷後修復剩餘 2 個
- **執行檔案**:
  - `015b_optimize_rls_performance_idempotent.sql` - 主要 migration（部分執行）
  - `015c_optimize_step1_users_policies.sql` - users 表測試版本
  - `FIX_REMAINING_2_POLICIES.sql` - 最終修復腳本 ✅
- **診斷工具**:
  - `DIAGNOSE_POLICY_CONFLICTS_SELECT.sql` - SELECT 版本診斷工具
  - `SIMPLE_CHECK_FIXED.sql` - 修復版狀態檢查工具
  - `DEBUG_CHECK_USERS_POLICIES.sql` - Debug 工具
- **文件**:
  - `MIGRATION_015_SUCCESS_SUMMARY.md` - 成功完成報告
  - `MIGRATION_015_FINAL_REPORT.md` - 完整執行報告
  - `TROUBLESHOOTING_MIGRATION_015.md` - 疑難排解指南
- **影響範圍**:
  - 全部 9 個資料表：users, classes, courses, students, student_courses, exams, scores, assessment_codes, assessment_titles
  - 49 個 RLS policies 全部優化
  - service_role_bypass: 9 個
  - authenticated_read: 10 個

#### Migration 018-019e: RLS Recursion Fix Series (2025-11-18) ✅

- **Migration 018**: Emergency rollback of office_member policies (recursion issue)
- **Migration 019**: First SECURITY DEFINER attempt (auth schema permission denied)
- **Migration 019b**: Public schema attempt (policy name conflicts)
- **Migration 019c**: Complete cleanup attempt (SQL syntax errors)
- **Migration 019d**: Syntax fix attempt (still had recursion in heads_view_jurisdiction)
- **Migration 019e**: Final fix - removed problematic policy ✅ **DEPLOYED**

**Migration 019e Details**:

- **Problem**: heads_view_jurisdiction policy caused infinite recursion
  - Policy USING clause called is_head() and get_user_grade()
  - Functions query users table → triggers policy → infinite loop
- **Solution**: Remove heads_view_jurisdiction policy
  - Head teacher permissions moved to application layer (Phase 2)
  - System operational, no 500 errors
- **Impact**:
  - ✅ All users can login via SSO
  - ✅ No recursion errors
  - ⚠️ Head teachers temporarily see own profile only (acceptable)
  - 📋 Phase 2 will restore full head teacher functionality
- **Remaining Policies** (5):
  - service_role_bypass
  - admin_full_access
  - users_view_own_profile
  - users_update_own_profile
  - office_member_read_users

#### Migration 020: Disable Auto User Sync Trigger (2025-11-21) ✅

- **目的**: 解決 OAuth 回調與自動用戶同步觸發器的衝突
- **變更內容**: 禁用 `auto_sync_user_on_login` 觸發器
- **原因**:
  - OAuth 回調中已經處理用戶同步
  - 觸發器在 OAuth 流程中造成重複同步
  - 導致 500 錯誤和登入失敗
- **影響範圍**:
  - 用戶同步完全由應用層處理
  - Webhook 接收端負責用戶資料同步
- **相關檔案**: `db/migrations/020_disable_auto_user_sync.sql`

#### Migration 021: Fix Courses Table RLS Recursion (2025-11-21) ✅

- **目的**: 使用 SECURITY DEFINER 函數修復 courses 表的 RLS 遞迴問題
- **變更內容**:
  - 建立 `public.get_user_role_safe()` SECURITY DEFINER 函數
  - 更新 courses 表的 RLS policies 使用安全函數
- **技術實現**:
  ```sql
  CREATE OR REPLACE FUNCTION public.get_user_role_safe()
  RETURNS TEXT
  LANGUAGE sql
  SECURITY DEFINER
  STABLE
  AS $$
    SELECT role FROM public.users WHERE id = auth.uid();
  $$;
  ```
- **效果**:
  - ✅ 消除 RLS 遞迴問題
  - ✅ courses 表查詢正常運作
  - ✅ Dashboard 400 錯誤已解決
- **相關檔案**: `db/migrations/021_fix_courses_rls_recursion.sql`

#### Migration 022: Fix Assessment Codes Schema (2025-11-28) ✅ **已完成**

- **目的**: 修復 `assessment_codes` 表缺少種子資料的問題
- **變更內容**:
  - 插入 13 個 assessment codes（FA1-FA8, SA1-SA4, FINAL）
  - 設定權重: FA=0.0188, SA=0.05, FINAL=0.10 (總計 0.45)
- **部署狀態**:
  - ✅ **Staging** (`kqvpcoolgyhjqleekmee`): 已有資料
  - ✅ **Production** (`piwbooidofbaqklhijup`): 2025-12-08 已執行（13 筆記錄）
- **相關檔案**: `db/migrations/022_fix_assessment_codes_schema.sql`

#### Migration 028: Fix Users Table RLS Recursion (2025-12-09) ✅ **已完成**

- **目的**: 修復 `users` 表 RLS 無限遞迴問題
- **問題根因**:
  - `is_admin()` 和 `is_office_member()` 函數查詢 users 表
  - RLS 政策調用這些函數 → 觸發 RLS → 無限遞迴
  - 錯誤碼: 25P02（transaction aborted）
- **解決方案**:
  - 刪除使用 `is_admin()` / `is_office_member()` 的政策
  - 建立簡單的 `authenticated_read_users` 政策（使用 `auth.role() = 'authenticated'`）
  - 細粒度權限在應用層（AuthContext）處理
- **影響範圍**: 刪除 24 個有遞迴問題的 RLS policies（跨 9 個表）
- **部署狀態**:
  - ✅ **Production** (`piwbooidofbaqklhijup`): 2025-12-09 已執行
- **相關檔案**: `db/migrations/028_fix_users_rls_simple.sql`

#### Migration 029: Course Tasks Kanban (2025-12-12) ✅ **已完成**

- **目的**: 建立課程層級任務看板功能
- **變更內容**:
  - 建立 `course_tasks` 表（Kanban 任務資料）
  - 欄位：id, course_id, teacher_id, title, description, status, due_date, position
  - status: 'todo' | 'in_progress' | 'done'
  - RLS 政策：教師只能看到自己課程的任務
- **部署狀態**:
  - ✅ **Staging** (`kqvpcoolgyhjqleekmee`): 已執行
  - ✅ **Production** (`piwbooidofbaqklhijup`): 已執行
- **相關檔案**: `db/migrations/029_create_course_tasks.sql`

#### Migration 030: Four-Term Academic System (2025-12-12) ✅ **已完成**

- **目的**: 新增四學期制支援（Term 1-4）
- **變更內容**:
  - 新增 `exams.term` 欄位（INTEGER, 1-4）
  - 新增 `exams.semester` 欄位（INTEGER, 1-2，由 term 推導）
  - 建立 trigger `exams_calculate_semester` 自動計算 semester
  - 建立索引：`idx_exams_term`, `idx_exams_semester`, `idx_exams_course_term`
- **Term 定義**:
  - Term 1: Fall Midterm（秋季期中）
  - Term 2: Fall Final（秋季期末）
  - Term 3: Spring Midterm（春季期中）
  - Term 4: Spring Final（春季期末）
- **Semester 推導**: term 1-2 → semester 1 (Fall), term 3-4 → semester 2 (Spring)
- **現有資料更新**: 1481 筆 exams 更新為 term=1（目前都是 Fall Midterm 資料）
- **部署狀態**:
  - ✅ **Staging** (`kqvpcoolgyhjqleekmee`): 已執行
  - ✅ **Production** (`piwbooidofbaqklhijup`): 2025-12-13 已執行
- **相關檔案**: `db/migrations/030_add_term_to_exams.sql`

#### Migration 031: 2026-2027 Academic Year (2025-12-12) ✅ **已完成**

- **目的**: 建立 2026-2027 學年班級和課程
- **變更內容**:
  - 複製 84 個班級從 2025-2026 到 2026-2027
  - 建立 252 個課程（84 班 × 3 課程類型，teacher_id = NULL）
- **部署狀態**:
  - ✅ **Staging** (`kqvpcoolgyhjqleekmee`): 已執行
  - ✅ **Production** (`piwbooidofbaqklhijup`): 已執行
- **驗證結果**:
  - 2025-2026: 84 班級, 252 課程
  - 2026-2027: 84 班級, 252 課程
- **相關檔案**: `db/migrations/031_create_2026_2027_academic_year.sql`

### 📊 真實資料部署狀態

#### 學年資料總覽 ✅ (2025-12-13 更新)

| 學年 | 班級數 | 課程數 | 教師指派 |
|------|--------|--------|----------|
| **2025-2026** | 84 | 252 | ✅ 已指派 |
| **2026-2027** | 84 | 252 | ⏳ 待指派 |

#### 2025-2026 學年班級資料 ✅

- **班級數量**: 84 個班級（林口校區）
- **年級分佈**: G1-G6，每個年級 14 個班級
- **Level 分佈**:
  - G1: 5×E1, 5×E2, 4×E3
  - G2: 5×E1, 5×E2, 4×E3
  - G3: 4×E1, 7×E2, 3×E3
  - G4: 4×E1, 7×E2, 3×E3
  - G5: 3×E1, 7×E2, 4×E3
  - G6: 4×E1, 7×E2, 3×E3

#### 2026-2027 學年班級資料 ✅ (新增)

- **班級數量**: 84 個班級（從 2025-2026 複製）
- **課程數量**: 252 筆（84 班 × 3 課程類型）
- **教師指派狀態**: 全部 teacher_id = NULL（待新學年指派）
- **學生分配**: 待新學年開始後分配

#### 課程資料建立 ✅

- **課程總數**: 504 筆（2 學年 × 84 classes × 3 course types）
- **課程類型**: LT（168）+ IT（168）+ KCFS（168）
- **2025-2026 教師指派**: ✅ 已完成（80 位教師）
- **2026-2027 教師指派**: ⏳ 待新學年開始

### 🎯 驗證結果

**執行驗證**: `VERIFY_MIGRATIONS_SIMPLE.sql` ✅ 全部通過

```
總課程數: 252
活躍班級: 84
每班課程數: 3.00 ✅
RLS Policies: 7+ ✅
Indexes: 8+ ✅
Overall Status: 🎉 ALL CHECKS PASSED
```

## 📋 CSV Import Templates (2025-10-29) ✅ **完全完成**

### ✅ 完成狀態

- **CSV 範本系統**: 100% 完成
- **英文欄位名稱**: 100% 完成
- **完整文件**: 100% 完成
- **驗證規則**: 100% 完成

### 📂 Templates 檔案結構

```
templates/import/
├── 1_classes_template.csv              # 班級資料範本
├── 2_teachers_template.csv             # 教師資料範本 (⭐ 最重要)
├── 3_teacher_course_assignments_template.csv  # 教師配課範本
├── 4_students_template.csv             # 學生資料範本
├── README.md                            # 完整使用指南
├── FIELD_MAPPING.md                     # 欄位對照與驗證規則
├── QUICK_REFERENCE.md                   # 快速參考
└── SUMMARY.md                           # 總覽說明
```

### 🔤 英文欄位定義

#### Teachers CSV (`2_teachers_template.csv`)

```csv
full_name,email,teacher_type,grade,role
```

**欄位說明**:

- `full_name`: 教師英文姓名（例如：John Smith, Ming-Li Chang）
- `email`: 登入用 Email（例如：john.smith@kcis.ntpc.edu.tw）
- `teacher_type`: 教師類型（LT, IT, KCFS）
- `grade`: 年級 1-6（僅 head teacher 必填）
- `role`: 角色（admin, head, teacher）

#### Classes CSV (`1_classes_template.csv`)

```csv
class_name,grade,level,academic_year,campus
```

**欄位說明**:

- `class_name`: 班級名稱（例如：G4 Seekers）
- `grade`: 年級 1-6
- `level`: 能力分級（G1E1 ~ G6E3）
- `academic_year`: 學年度（2025-2026）
- `campus`: 校區（Linkou, Qingshan）

#### Course Assignments CSV (`3_teacher_course_assignments_template.csv`)

```csv
teacher_email,class_name,course_type
```

**欄位說明**:

- `teacher_email`: 教師 Email（必須存在於 teachers CSV）
- `class_name`: 班級名稱（必須存在於 classes CSV）
- `course_type`: 課程類型（LT, IT, KCFS）
- **驗證規則**: `teacher_type` 必須匹配 `course_type`

#### Students CSV (`4_students_template.csv`)

```csv
student_id,full_name,grade,level,class_name
```

**欄位說明**:

- `student_id`: 學號（例如：S2025001）
- `full_name`: 學生英文姓名
- `grade`: 年級 1-6
- `level`: 能力分級（G1E1 ~ G6E3）
- `class_name`: 所屬班級

### 📊 資料匯入流程

```
1. 準備 CSV 資料（使用提供的範本）
   ↓
2. 驗證欄位格式與必填欄位
   ↓
3. 驗證業務規則（teacher_type 匹配、level 格式等）
   ↓
4. 按順序匯入：
   - Step 1: Classes
   - Step 2: Teachers
   - Step 3: Course Assignments
   - Step 4: Students
   ↓
5. 執行驗證查詢確認資料正確性
```

### ✅ 資料驗證規則

**Level 格式**:

```
格式: G[1-6]E[1-3]
範例: G1E1, G4E2, G6E3
說明: 包含年級資訊，不同年級的 E1 能力標準不同
```

**Teacher Type 匹配**:

```
教師的 teacher_type 必須匹配課程的 course_type
✅ LT 教師 → LT 課程
✅ IT 教師 → IT 課程
✅ KCFS 教師 → KCFS 課程
❌ LT 教師 → IT 課程（不允許）
```

**Email 格式**:

```
建議格式: [firstname].[lastname]@kcis.ntpc.edu.tw
範例: john.smith@kcis.ntpc.edu.tw
用途: 教師登入系統的帳號
```

### 📖 文件參考

- **完整指南**: `templates/import/README.md`
- **欄位對照**: `templates/import/FIELD_MAPPING.md`
- **快速參考**: `templates/import/QUICK_REFERENCE.md`
- **總覽說明**: `templates/import/SUMMARY.md`

### 🎯 當前狀態

**完成項目** ✅:

- CSV 範本檔案建立
- 英文欄位名稱調整
- 完整文件撰寫
- 驗證規則定義
- 範例資料提供
- **72 位教師資料已匯入 Info Hub** (2025-12-02)
  - 8 Head Teachers (with grade_band)
  - 46 Teachers (LT/IT/KCFS)
  - 17 Office Members
  - 1 Admin

**待完成項目** ⏳:

- **SSO 同步測試** - 教師透過 SSO 登入 LMS 時自動同步
- **課程指派** - 透過 course_assignments.csv 指派教師到課程
- **學生資料匯入** - 待學生資料提供後匯入

---

## 🔐 Info Hub SSO Integration (2025-11-19) ✅ **Both Systems Complete** | ✅ **E2E Testing Verified (2025-12-02)**

### 🎯 Overview

**Purpose**: Enable Single Sign-On (SSO) between Info Hub (Identity Provider) and LMS (Service Provider) using OAuth 2.0 + PKCE standard.

**Key Objectives**:

- ✅ Unified authentication (login once, access both systems)
- ✅ Zero Service Key sharing (LMS maintains complete control)
- ✅ Industry-standard security (OAuth 2.0 + PKCE)
- ✅ Supabase as single source of truth for user data
- ✅ 30-day session persistence (Info Hub default implementation)
- ✅ RLS recursion issues resolved (Migration 019e)
- ✅ Full alignment achieved (Webhook HMAC-SHA256, field names, roles)

### 🏗️ Architecture Decision

**Selected Approach**: OAuth 2.0 Authorization Code Flow + PKCE

**Rejected Approach** (方案 B): Info Hub generates Supabase tokens

- ❌ Security Risk: Requires sharing LMS's Supabase Service Role Key
- ❌ RLS Bypass: Service Key bypasses all 49 RLS policies
- ❌ Violates Principle of Least Privilege

**Final Design**:

```
User → Info Hub (Google OAuth) → Authorization Code →
LMS (Token Exchange) → Supabase User Sync → Session Creation → Dashboard
```

### 🔑 Technical Specifications

**OAuth Flow**:

1. User clicks "Login with Info Hub SSO" on LMS
2. LMS generates PKCE challenge, redirects to Info Hub
3. Info Hub authenticates user (Google OAuth)
4. Info Hub syncs user to Supabase via Webhook
5. Info Hub returns Authorization Code to LMS
6. LMS exchanges code for user data (server-side)
7. LMS creates Supabase session using Admin API
8. User logged into LMS Dashboard

**Security Measures**:

- PKCE (Proof Key for Code Exchange) - prevents code interception
- CSRF State Token - prevents cross-site request forgery
- Webhook Secret - authenticates user sync requests
- Service Role Key Isolation - LMS never shares credentials
- RLS Policy Enforcement - all queries respect permissions

### 📋 Implementation Status

**LMS Implementation Status**: 100% Complete ✅

- ✅ Phase 1-4: OAuth Client + Webhook + Session Management (COMPLETE)
- ✅ RLS Issues Resolved: Migration 019e (COMPLETE)
- ✅ SSO Login Tested: Working without 500 errors (COMPLETE)
- ✅ Technical Documentation: 5 comprehensive guides for Info Hub (COMPLETE)

**Info Hub Implementation Status**: 100% Complete ✅

- ✅ OAuth Authorization + Token endpoints deployed (Commit 31a5b5c)
- ✅ PKCE verification (SHA256) implemented
- ✅ Webhook sender with HMAC-SHA256 signature
- ✅ Role mapping system complete
- ✅ Database schema with SSO fields
- ✅ All 4 alignment issues resolved (2025-11-19)

**LMS Phase 1-4 Completed** 🎉:

- ✅ OAuth credentials configured (.env.local)
- ✅ TypeScript type system (40+ interfaces, 380 lines)
- ✅ PKCE RFC 7636 implementation (180 lines)
- ✅ SSO state manager with CSRF protection (220 lines)
- ✅ Webhook receiver endpoint (270 lines)
- ✅ OAuth callback handler (280 lines)
- ✅ SSO login button rebranded as "Login with Google" (120 lines)
- ✅ Login page simplified to SSO-only (79% code reduction: 343 → 71 lines)
- ✅ Type safety: 0 TypeScript errors
- ✅ RLS recursion issues fixed (Migration 019e)
- ✅ SSO login flow tested (no 500 errors)

**Files Created**:

- `types/sso.ts` - Complete SSO type definitions
- `lib/config/sso.ts` - Environment configuration helper
- `lib/auth/pkce.ts` - PKCE implementation
- `lib/auth/sso-state.ts` - State management
- `app/api/webhook/user-sync/route.ts` - Webhook receiver
- `app/api/auth/callback/infohub/route.ts` - OAuth callback
- `components/auth/SSOLoginButton.tsx` - SSO login button UI (rebranded)
- `db/migrations/019e_remove_heads_view_jurisdiction.sql` - RLS recursion fix

**Files Modified**:

- `app/auth/login/page.tsx` - Simplified to SSO-only authentication (79% reduction)
- `types/sso.ts` - Added 'head' to InfoHubRole type (Commit 75d155a)

**Alignment Fixes Completed (2025-11-19)**:

1. ✅ **LMS**: Added 'head' role to InfoHubRole type (Commit 75d155a)
2. ✅ **Info Hub**: Implemented HMAC-SHA256 webhook signature (Commit 31a5b5c)
3. ✅ **Info Hub**: Fixed field name grade_level → grade (Commit 31a5b5c)
4. ✅ **Info Hub**: Added office_member role support (Commit 31a5b5c)

**Completed (2025-12-02)**:

- ✅ Both systems aligned and ready
- ✅ E2E integration testing verified
- ✅ Production deployment complete
- ✅ Info Hub grade_band support added (v1.39.2)
- ✅ 72 teachers imported to Info Hub database
- ✅ Multi-grade Head Teacher assignments aligned ("1", "2", "3-4", "5-6", "1-2", "1-6")

### 🔗 Role Mapping (v1.39.2 - Grade Band Support)

| Info Hub Role  | LMS Role  | Teacher Type | Grade Band | Track         |
| -------------- | --------- | ------------ | ---------- | ------------- |
| admin          | admin     | null         | null       | null          |
| office_member  | office_member | null     | grade_band | null          |
| head (LT)      | head      | null         | "1"/"2"/"3-4"/"5-6" | LT    |
| head (IT)      | head      | null         | "1-2"/"3-4"/"5-6" | IT      |
| head (KCFS)    | head      | null         | "1-6"      | KCFS          |
| teacher (IT)   | teacher   | IT           | null       | international |
| teacher (LT)   | teacher   | LT           | null       | local         |
| teacher (KCFS) | teacher   | KCFS         | null       | null          |
| viewer         | ❌ Denied | -            | -          | -             |

**Info Hub Teacher Data (72 users imported)**:
- 8 Head Teachers (with grade_band values)
- 46 Teachers (LT/IT/KCFS)
- 17 Office Members
- 1 Admin

### 📊 Timeline

- **Week 1**: Parallel development (DB + Webhook + OAuth Client)
- **Week 2**: Integration testing (OAuth E2E flow)
- **Week 3**: Security audit + Staging deployment
- **Week 4**: Production deployment (target: 2025-12-09)

### 📚 SSO Technical Documentation (Complete)

完整的 Info Hub SSO 整合技術文件（5 份）：

1. **[Technical Spec Summary](docs/sso/TECHNICAL_SPEC_SUMMARY.md)** ⭐ 開始閱讀

   - OAuth 2.0 + PKCE 完整流程圖
   - 系統架構總覽
   - 資料庫 schema 需求
   - 環境變數清單

2. **[Info Hub Implementation Checklist](docs/sso/INFOHUB_IMPLEMENTATION_CHECKLIST.md)** 📋 實作指南

   - Phase 1-6 詳細步驟
   - 驗證方法與測試
   - 成功標準
   - Rollback 計畫

3. **[API Contract](docs/sso/API_CONTRACT.md)** 🔌 API 規格

   - OAuth endpoints 完整定義
   - Request/Response 格式
   - TypeScript interfaces
   - curl 測試範例

4. **[Security Checklist](docs/sso/SECURITY_CHECKLIST.md)** 🔐 安全指南

   - PKCE 實作
   - CSRF 防護
   - Webhook 簽名驗證
   - 測試案例

5. **[Test Scenarios](docs/sso/TEST_SCENARIOS.md)** 🧪 測試指南
   - E2E 測試流程
   - 單元測試
   - 整合測試腳本
   - 錯誤情境測試

**使用方式**：

- 將上述文件提供給 Info Hub 的 Claude Code
- 按照 Implementation Checklist 逐步實作
- 使用 API Contract 確保規格對齊
- 遵循 Security Checklist 確保安全性
- 執行 Test Scenarios 驗證整合

**Additional Documentation**:

- [SSO Integration Overview](./docs/sso/SSO_INTEGRATION_OVERVIEW.md) - Architecture & decisions
- [SSO Implementation Plan - LMS](./docs/sso/SSO_IMPLEMENTATION_PLAN_LMS.md) - Detailed tasks
- [SSO Security Analysis](./docs/sso/SSO_SECURITY_ANALYSIS.md) - Security review
- [SSO API Reference](./docs/sso/SSO_API_REFERENCE.md) - API specifications
- [SSO Testing Guide](./docs/sso/SSO_INTEGRATION_TEST_GUIDE.md) - Test strategy
- [SSO Deployment Guide](./docs/sso/SSO_DEPLOYMENT_GUIDE.md) - Deployment steps

### 🎯 Success Criteria

**Functional**:

- [ ] Info Hub users can SSO login to LMS
- [ ] First-time login creates Supabase account
- [ ] Roles correctly mapped (admin/head/teacher)
- [ ] Viewer role correctly denied

**Security**:

- [ ] PKCE verification enforced (100% pass rate)
- [ ] CSRF state validation (100% pass rate)
- [ ] Webhook secret verified (100% pass rate)
- [ ] RLS policies apply (100% enforcement)
- [ ] No Service Key exposure

**Performance**:

- [ ] SSO flow < 5 seconds
- [ ] Webhook sync < 2 seconds
- [ ] Session creation < 1 second

---

## 🎨 Phase 4: One OS Interface Unification (2025-11-26~28) ✅ **完成**

### Phase 4.1: TeacherOS Desktop UI

**目標**：與 Info Hub 建立統一的 macOS 風格使用者體驗

**已完成功能**：

- **macOS 風格界面**：
  - Desktop 桌面環境 + 動態壁紙
  - Dock 底部工具列（應用程式啟動器）
  - MenuBar 頂部選單列（系統狀態、時間）
  - Window 視窗系統（Traffic lights 控制按鈕）

- **壁紙一致化**：
  - 與 Info Hub 使用相同的漸層背景設計
  - 支援深色/淺色模式切換

- **Dashboard 性能優化**：
  - Incremental Loading 漸進式載入
  - Skeleton UI 載入骨架畫面
  - 減少首次渲染時間

- **統一體驗**：
  - 兩個系統（LMS + Info Hub）視覺風格完全對齊
  - 無縫切換體驗（Dock 直接啟動）

### Phase 4.2: TeacherOS UI Refinements v1.41.0 (2025-12-02) ✅ **NEW**

**目標**：深色模式優化、日曆重設計、整體視覺一致性提升

**已完成功能**：

- **深色模式優化**：
  - Widget 背景顏色從純黑 (`bg-black`) 恢復為 slate 色系 (`bg-slate-900/80`, `bg-slate-800/80`)
  - 改善視覺柔和度與閱讀舒適性
  - 與 Info Hub 深色模式風格對齊

- **CalendarModal 完全重設計**：
  - 新增月曆網格視圖（Grid View）
  - 事件類型色彩編碼（Holiday: 紅、Assessment: 藍、Activity: 綠等）
  - 選擇日期詳情面板（右側側邊欄）
  - 事件標籤顯示（每日最多 3 個 + 更多計數）
  - 今日標記（紅色圓形背景）

- **Message Board 顯示優化**：
  - iframe 自動滾動問題修復
  - 內容截斷問題解決
  - 深色模式下背景一致性

- **Dock 增強**：
  - macOS 風格圖示改進
  - 應用程式名稱標籤
  - 懸停動畫效果優化

- **PersonalTodoWidget 改進**：
  - 深色模式色彩優化
  - 任務列表顯示改善
  - 完成狀態視覺反饋

- **RemindersWidget 改進**：
  - 提醒卡片樣式統一
  - 優先級視覺區分
  - 深色模式相容性

**修改的檔案**（主要）：
- `app/teachers/components/dashboard/widgets/MessageBoardWidget.tsx` - 深色模式修復
- `app/teachers/components/dashboard/widgets/PersonalTodoWidget.tsx` - 色彩優化
- `app/teachers/components/dashboard/widgets/RemindersWidget.tsx` - 樣式統一
- `app/teachers/components/dashboard/modals/CalendarModal.tsx` - 完全重設計
- `app/teachers/components/dock/Dock.tsx` - macOS 風格圖示
- `app/teachers/page.tsx` - 整體佈局調整

### 部署配置優化 (2025-11-27~28)

**Dockerfile 優化**：

```dockerfile
# 多階段建置
FROM node:18-alpine AS builder
# ... build stage ...

FROM node:18-alpine AS runner
# standalone 模式運行
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
```

**關鍵配置**：
- **output: standalone** - Serverless 部署優化
- **多階段建置** - 減少最終映像大小
- **Static Assets** - 正確的資產複製路徑
- **.dockerignore** - 防止複製本地 artifacts（node_modules, .next）

**相關 Commits**（7 個）：
- `fix: sync Dockerfile with successful Zeabur deployment config`
- `fix: simplify Dockerfile to use standard npm start`
- `fix: switch to multi-stage Dockerfile for robust standalone build`
- `chore: optimize Dockerfile with combined RUN commands`
- `fix: refine Dockerfile static asset copy paths`
- `fix: add Dockerfile with static asset copy for standalone mode`
- `chore: add .dockerignore to prevent copying local artifacts`

---

## 🚀 LMS 功能完善計畫 (2025-12-04) ✅ **Sprint 1-2 完成**

### 📊 數據真實性審計結果

經過全面審計，以下頁面已從 placeholder/mock 數據升級為真實 Supabase 數據：

| 頁面 | 之前狀態 | 現在狀態 | Commit |
|------|----------|----------|--------|
| Dashboard KPIs | 70% 真實（attendance/alerts mock） | 100%（N/A 取代 mock） | `2821cfd` |
| Browse Stats | 0%（純 placeholder） | 100%（真實 Supabase） | `43756d9` |
| Head Overview | 0%（硬編碼數字） | 100%（真實 Supabase） | `8244da7` |
| Admin Classes | 0%（硬編碼 84/252） | 100%（真實 Supabase） | `43b2520` |
| Head Teachers | 0%（mock teachers） | 100%（真實 Supabase） | `43b2520` |
| Browse Gradebook | 0%（純 placeholder） | 100%（真實 Supabase） | `43b2520` |

### ✅ Sprint 1：修復假數據（2025-12-04 完成）

**1.1 Dashboard Mock 數據修復**
- `lib/api/dashboard.ts`: `attendanceRate` 和 `activeAlerts` 改為 `null`
- `app/(lms)/dashboard/page.tsx`: 顯示 "N/A" + "Coming soon"
- 原因：無出席系統和警告系統，不應顯示隨機數字

**1.2 Browse Stats 連接真實數據**
- 使用 `getClassDistribution("admin")` 獲取圖表數據
- 計算真實的 school-wide 平均分和完成率
- 按年級統計學生數和平均分

**1.3 Head Overview 連接真實數據**
- 新增 `getHeadTeacherKpis(gradeBand, courseType)` 函數
- 根據 Head Teacher 的 `grade_band` 過濾班級和學生
- 計算年段內的真實統計數據

### ✅ Sprint 2：功能完善（2025-12-04 完成）

**2.1 Admin Classes 班級管理頁面**
- 檔案：`app/(lms)/admin/classes/page.tsx`
- 使用 `getClassesWithDetails()` API
- 功能：搜尋、年級篩選、LT/IT/KCFS 教師指派狀態
- 統計：真實班級數、課程數、學生數

**2.2 Head Teachers 教師進度頁面**
- 檔案：`app/(lms)/head/teachers/page.tsx`
- 使用 `getTeachersWithCourses()` + grade_band 過濾
- 功能：按課程類型分組（LT/IT/KCFS）
- 顯示：教師列表、課程數、進度（placeholder）

**2.3 Browse Gradebook 跨班成績頁面**
- 檔案：`app/(lms)/browse/gradebook/page.tsx`
- 直接 Supabase 查詢 exams + classes + courses
- 功能：搜尋、年級篩選、課程類型篩選、評量類型篩選
- 統計：考試數、完成率、逾期數

### 📁 修改檔案清單（Sprint 1-2）

| 檔案 | 變更類型 | 變更量 |
|------|----------|--------|
| `lib/api/dashboard.ts` | 修改 | mock → null |
| `app/(lms)/dashboard/page.tsx` | 修改 | 處理 null 顯示 |
| `app/(lms)/browse/stats/page.tsx` | 重寫 | +350 行 |
| `app/(lms)/head/overview/page.tsx` | 重寫 | +388 行 |
| `app/(lms)/admin/classes/page.tsx` | 重寫 | +275 行 |
| `app/(lms)/head/teachers/page.tsx` | 重寫 | +431 行 |
| `app/(lms)/browse/gradebook/page.tsx` | 重寫 | +527 行 |

### 🎯 待辦：Sprint 3（功能擴展）

| 任務 | 路由 | 優先級 | 狀態 |
|------|------|--------|------|
| 班級學生名冊 | `/(lms)/class/[classId]/students` | 🟢 | ✅ v1.46.0 |
| 課程指派系統 | `/admin/courses` | 🟢 | ✅ v1.47.0 |
| 我的課表 | `/(lms)/schedule` | 🟢 | ⏳ 待開發 |
| Gradebook 課程篩選 | `/(lms)/class/[classId]/gradebook` | 🟢 | ✅ v1.48.0 |
| Gradebook UI/UX 優化 | `/(lms)/class/[classId]/gradebook` | 🟢 | ✅ v1.49.0 |

### ✅ 完成：Sprint 4（課程層級功能）v1.50.0

| 任務 | 路由/檔案 | 狀態 |
|------|----------|------|
| Browse Gradebook 重構 | `/(lms)/browse/gradebook` | ✅ class-based 視圖 |
| Course Kanban | `/(lms)/class/[classId]` (Overview) | ✅ 任務看板 |
| Communications Tab | `/(lms)/class/[classId]/communications` | ✅ 電話追蹤+備忘 |
| Head Teacher 課程權限 | Communications 頁面 | ✅ track 過濾 |

### ✅ 完成：Sprint 5（效能優化）v1.50.x

| 任務 | 檔案 | 狀態 |
|------|------|------|
| Gradebook 406 修復 | `GradebookHeader.tsx` | ✅ 移除 RLS 衝突查詢 |
| 統計查詢優化 | `lib/api/statistics.ts` | ✅ Promise.all 並行 |
| Retry 機制增強 | API layer | ✅ 指數退避 |

### ✅ 完成：Sprint 6（Statistics + Academic Year）v1.51.0

| 任務 | 路由/檔案 | 狀態 |
|------|----------|------|
| Statistics Module Phase 2 | `/browse/stats/*` | ✅ 8 個頁面 + 圖表 |
| GlobalFilterBar | `components/filters/` | ✅ 學年 + Term 篩選 |
| Four-Term System | Migration 030 | ✅ term/semester 欄位 |
| 2026-2027 Academic Year | Migration 031 | ✅ 84 班 + 252 課程 |
| Course Tasks Kanban DB | Migration 029 | ✅ course_tasks 表 |
| XLSX Export | Statistics pages | ✅ 匯出功能 |
| Interactive Charts | Recharts | ✅ 6 種圖表類型 |

### 🎯 待辦：Sprint 7（歷年成績與學生管理）

| 任務 | 路由 | 優先級 | 狀態 |
|------|------|--------|------|
| 學生歷年成績報表 | `/(lms)/student/[id]/history` | 🟢 | ⏳ 待開發 |
| 學年切換功能 | 全系統 | 🟢 | ⏳ 待開發 |
| Term 2 資料匯入 | CSV Import | 🟡 | ⏳ 待資料 |
| 我的課表 | `/(lms)/schedule` | 🟢 | ⏳ 待開發 |

---

## 📊 Browse Gradebook 架構 (2025-12-09) ✅ **v1.50.0**

### 功能概述

Browse Gradebook 頁面用於監控全校班級的成績輸入進度：

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

## 📋 Course Kanban 架構 (2025-12-09) ✅ **v1.50.0**

### 功能概述

課程層級的任務看板，每位教師只能看到自己任課課程的任務：

- **Kanban 三欄**：To Do / In Progress / Done
- **拖曳排序**：使用 @dnd-kit/core
- **課程隔離**：綁定 `course_id`，教師只看自己的任務

### 資料表

```sql
CREATE TABLE course_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES courses(id),
  teacher_id UUID NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo' CHECK (status IN ('todo', 'in_progress', 'done')),
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
| `db/migrations/029_create_course_tasks.sql` | Migration |

---

## 📞 Communications 架構 (2025-12-09) ✅ **v1.50.0**

### 功能概述

課程層級的家長通訊追蹤：

- **LT 課程**：電話通訊追蹤（semester_start / midterm / final）
- **IT/KCFS 課程**：學生備忘功能

### 權限控制

| 角色 | 可見課程 | 可編輯 |
|------|----------|--------|
| Teacher | 自己任課的課程 | ✅ |
| Head Teacher | 自己 track 類型的課程 | ❌ 唯讀 |
| Admin/Office | 所有課程 | ✅ (Admin) / ❌ (Office) |

### 相關檔案

| 檔案 | 說明 |
|------|------|
| `db/migrations/024_create_communications.sql` | 資料表 + RLS |
| `app/(lms)/class/[classId]/communications/page.tsx` | UI 元件 |
| `components/os/ClassContextTabs.tsx` | Tab 導航 |

---

## 📊 Gradebook 架構 (2025-12-09) ✅ **v1.48.0 + v1.49.0**

### 功能概述

Gradebook 頁面支援查看和編輯班級成績，具備以下核心功能：

- **課程類型切換**：LT / IT / KCFS 三種課程
- **教師顯示**：顯示當前課程的任課教師
- **成績編輯**：即時儲存、Focus Mode 批量輸入
- **自動計算**：Formative (15%)、Summative (20%)、Term 總分

### 元件架構

```
app/(lms)/class/[classId]/gradebook/
├── page.tsx              # Server Component - 資料載入
├── GradebookHeader.tsx   # 頁面標題、麵包屑
└── GradebookClient.tsx   # Client Component - 互動邏輯

components/gradebook/
├── Spreadsheet.tsx       # 成績表格（核心資料輸入）
├── CourseTypeSelector.tsx # LT/IT/KCFS 選擇器
└── FocusGradeInput.tsx   # Focus Mode 批量輸入
```

### API 架構

**Server Actions** (`lib/actions/gradebook.ts`)：

```typescript
// 型別定義
export type CourseType = "LT" | "IT" | "KCFS";
export type TeacherInfo = { teacherName: string | null; teacherId: string | null };
export type GradebookData = {
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

### UI/UX 設計原則 (v1.49.0)

**統一工具欄**：所有控制項和狀態整合到單一工具欄

```
┌──────────────────────────────────────────────────────────────┐
│ [LT] [IT] [KCFS]   👤 陳老師 John Chen   👥 20 Students ✓ Saved │
│ ← 課程選擇器      ← 教師資訊           ← 學生數 + 儲存狀態    │
└──────────────────────────────────────────────────────────────┘
```

**設計決策**：
- ❌ 移除：重複的課程類型 badge（選擇器已顯示）
- ❌ 移除：底部狀態欄（資訊整合到工具欄）
- ❌ 移除：Spreadsheet 內部狀態欄（上移到父元件）
- ✅ 保留：PageHeader 顯示班級名稱和課程類型
- ✅ 新增：教師和學生數顯示在工具欄

### 成績計算公式

```typescript
// lib/gradebook/FormulaEngine.ts
FormulaEngine.calculateTermGrade(scores);     // 總分
FormulaEngine.getFormativeAverage(scores);    // FA 平均 (15%)
FormulaEngine.getSummativeAverage(scores);    // SA 平均 (20%)
```

**權重配置**：
- Formative (FA1-FA8): 15%
- Summative (SA1-SA4): 20%
- Midterm (MID): 10%
- Final: 10% (未實作)

---

## 🔧 Phase F: Browse 頁面無限載入修復 (2025-12-08) ✅ **v1.44.1 改進版**

### 📋 問題描述

Browse 頁面從其他頁面導航進入時出現無限載入問題，必須重新整理才能正確顯示資料。

### 🔍 根本原因分析

**第一版問題**（`isInitialMount` ref 模式）：
- Next.js client-side navigation 時，React 可能重用組件實例
- `useRef` 值在導航之間保持不變，`isInitialMount.current` 不會重置
- 導致 fetch 邏輯走錯分支

**第二版問題**（`fetchVersion` + debounce effect 模式）：
- Debounce effect 在初始掛載時也會執行
- 300ms 後會增加 `fetchVersion`，觸發第二次 fetch
- 造成**雙重 fetch** 問題

### ✅ 最終解決方案

**簡化模式**：`debouncedSearch` state + 單一 useEffect

```typescript
// 1. 只對搜尋輸入做 debounce（唯一需要 debounce 的輸入）
const [debouncedSearch, setDebouncedSearch] = useState("");

useEffect(() => {
  const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
  return () => clearTimeout(timer);
}, [searchQuery]);

// 2. 單一 effect 處理所有資料抓取
useEffect(() => {
  if (authLoading || !user) return;

  let isCancelled = false;

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const data = await apiCall({
        grade: selectedGrade === "All" ? undefined : selectedGrade,
        search: debouncedSearch || undefined,
      });
      if (!isCancelled) {
        setData(data);
        setLoading(false);
      }
    } catch (err) {
      if (!isCancelled) {
        setError(err.message);
        setLoading(false);
      }
    }
  }

  fetchData();
  return () => { isCancelled = true; };
}, [authLoading, user, selectedGrade, debouncedSearch]);
```

### 📊 模式比較

| 項目 | 舊模式 (fetchVersion) | 新模式 (debouncedSearch) |
|------|----------------------|-------------------------|
| Effect 數量 | 3 個互相干擾 | 2 個獨立 |
| 初始載入 | 可能雙重 fetch | 單次 fetch |
| 複雜度 | 高（useCallback、useRef、fetchVersion） | 低（直接依賴） |
| 可讀性 | 難以理解 | 一目了然 |
| 篩選響應 | 全部 debounce 300ms | 搜尋 debounce，其他立即 |

### 📁 已修復的檔案

| 檔案 | 模式 | Commit |
|------|------|--------|
| `app/(lms)/browse/classes/page.tsx` | debouncedSearch | `45e8188` |
| `app/(lms)/browse/teachers/page.tsx` | debouncedSearch | `45e8188` |
| `app/(lms)/browse/students/page.tsx` | debouncedSearch | `45e8188` |
| `app/(lms)/browse/comms/page.tsx` | 單一 effect（無搜尋 debounce） | `45e8188` |
| `app/(lms)/browse/gradebook/page.tsx` | 已修復 | `3a85bbf` |
| `app/(lms)/browse/stats/page.tsx` | 原本正確 | - |

### 📋 待測試項目

| 測試項目 | 狀態 |
|----------|------|
| 從 Dashboard 導航到 Browse Students | ⏳ 待測試 |
| 從 Browse Students 導航到 Browse Teachers | ⏳ 待測試 |
| 年級篩選（立即響應） | ⏳ 待測試 |
| 搜尋輸入（300ms debounce） | ⏳ 待測試 |
| 分頁切換 | ⏳ 待測試 |
| 離開再返回頁面 | ⏳ 待測試 |

### 💡 學習要點

1. **避免複雜的 ref 模式**：`isInitialMount` ref 在 Next.js navigation 中不可靠
2. **避免多個互相依賴的 effects**：容易造成競爭條件和無限迴圈
3. **只 debounce 需要的輸入**：搜尋框需要 debounce，下拉選單不需要
4. **使用 `isCancelled` flag**：比 `AbortController` 更簡單，足夠應付大多數情況
5. **直接在依賴陣列列出狀態**：比用 `fetchVersion` 更直觀、更可靠

---

## 🔐 v1.45.0 Auth State Change 修復 (2025-12-08) ✅ **完成**

### 📋 問題描述

透過 Console Log 分析發現三個問題：

1. **React Closure Bug**：切換 macOS 桌面後，`onAuthStateChange` 的 skip 邏輯失效
2. **AdminClasses 雙重 fetch**：頁面載入時重複抓取兩次資料
3. **Browse Stats 400 錯誤**：Supabase 查詢語法無效

### 🔍 根本原因

| 問題 | 原因 |
|------|------|
| Skip 邏輯失效 | `onAuthStateChange` 回調捕獲的是 `userPermissions` 初始值（null），不是最新 state |
| 雙重 fetch | AdminClasses 還在用舊的 `useAuth` 模式 |
| 400 錯誤 | `courses:exams(courses!inner(...))` 語法錯誤 — `exams` 表沒有 FK 連接到 `courses` |

### ✅ 修復方案

**1. AuthContext useRef 修復**

```typescript
// 使用 ref 追蹤最新值，解決閉包問題
const userPermissionsRef = useRef<UserPermissions | null>(null);

useEffect(() => {
  userPermissionsRef.current = userPermissions;
}, [userPermissions]);

// 在回調中使用 ref
if (userPermissionsRef.current?.userId === session?.user?.id) {
  console.log('[AuthContext] Same user, skipping...')
  return
}
```

**2. AdminClasses 改用 useAuthReady**

```typescript
const { isReady } = useAuthReady();

useEffect(() => {
  if (!isReady) return;
  fetchClasses();
}, [isReady]);
```

**3. Browse Stats 移除無效 join**

```typescript
// 移除 courses:exams(courses!inner(course_type))
// 改用正確的 scores → exams → classes 關聯
```

### 📁 修改檔案清單

| 檔案 | 修復內容 | Commit |
|------|----------|--------|
| `lib/supabase/auth-context.tsx` | useRef 修復 React 閉包 | `2f4c86d` |
| `app/(lms)/admin/classes/page.tsx` | 改用 useAuthReady | `2f4c86d` |
| `app/(lms)/browse/stats/page.tsx` | 移除無效 Supabase join | `2f4c86d` |
| `hooks/useAuthReady.ts` | 新建標準 auth hook | `6e85c59` |
| `hooks/use-current-user.ts` | 標記 @deprecated | `6e85c59` |

### 🎯 預期效果

1. 切換桌面回來時，console 顯示 `[AuthContext] Same user auth event, skipping permission refetch`
2. AdminClasses 只 fetch 一次
3. Browse Stats 正常載入，無 400 錯誤

---

## 🧠 Phase 3A-1 Analytics 基礎架構 (2025-08-23) ✅ **完全完成**

### ✅ 已完成核心功能

#### 📊 Analytics 引擎核心 (`/lib/analytics/`)

- **完整型別系統**: 40+ TypeScript 介面定義所有分析資料結構
- **統計計算引擎**: 平均值、中位數、標準差、趨勢分析算法
- **成績計算整合**: 與現有 `/lib/grade` 系統無縫整合
- **快取機制**: TTL 自動失效 + 效能最佳化

#### 🔍 資料處理層

- **Query Builder**: 動態查詢建構器支援複雜條件過濾
- **風險評估**: 學習表現預警系統與干預建議
- **角色過濾**: 完全遵循 RLS 政策的權限控制
- **錯誤處理**: 完整例外處理與回退機制

#### 🎯 API 整合

- **前端資料層**: `/lib/api/analytics.ts` 提供統一 API 介面
- **即時更新**: 與現有通知系統整合
- **效能監控**: 查詢效能追蹤與最佳化建議

### 🔧 技術實現

#### 核心模組架構

```typescript
// lib/analytics/core.ts - 核心計算引擎
export class AnalyticsEngine {
  private cache = new Map<string, { data: any; expires: number }>();

  // 統計計算方法
  calculateStatistics(values: number[]): StatisticalSummary;
  calculateGradeAverages(scores: ScoreEntry[]): GradeAverages;
  assessRiskFactors(metrics: StudentMetrics): RiskAssessment;
}

// lib/analytics/types.ts - 40+ 型別定義
export interface StudentLearningMetrics {
  studentId: string;
  overallAverage: number | null;
  improvementRate: number;
  consistency: number;
  atRisk: boolean;
  riskFactors: string[];
}
```

#### 資料流架構

```
UI Component → API Layer → Analytics Engine → Supabase (with RLS)
     ↓              ↓            ↓                ↓
  Visualize ← Cache Layer ← Calculate ← Raw Data (Filtered)
```

### 🧪 測試與驗證

- **16 個單元測試**: 涵蓋核心功能和錯誤處理
- **TypeScript 合規**: 0 編譯錯誤，完整型別定義
- **RLS 安全**: 所有查詢遵循 Row Level Security 政策
- **效能最佳化**: 通知每 2 分鐘自動更新，避免過度請求

### 📈 已解決的技術問題

- **型別安全**: 解決了複雜 Analytics 查詢的 TypeScript 型別問題
- **效能最佳化**: 實現了智能快取機制減少資料庫負載
- **RLS 整合**: 確保 Analytics 查詢完全遵循現有權限架構
- **錯誤處理**: 建立了健全的錯誤處理和資料驗證機制

### Assessment Title 管理系統

- **目的**：允許 Head Teacher 自定義評量顯示名稱
- **層級優先序**：Class > Grade×Track > Default
- **API 端點**：`/lib/api/assessment-titles.ts`
- **UI 介面**：`/app/admin/assessment-titles/page.tsx`
- **權限控制**：僅 admin 和 head 角色可存取
- **資料表**：`assessment_titles` (context, assessment_code, display_name)

### Student Course 管理功能

- **增強功能**：`getStudentsWithCourses` - 學生課程關聯查詢
- **批量操作**：`bulkAssignStudentsToClass`, `bulkRemoveStudentsFromClass`
- **統計數據**：`getStudentStatistics` - 各年段課程分佈統計
- **未分配查詢**：`getUnassignedStudents` - 支持年段和校區篩選
- **學生升級**：`promoteStudents` - 批量年段升級功能

### Real-time 通知系統

- **智能監控**：自動分析系統狀態生成通知
- **分類系統**：8 種通知類型 (exam_overdue, low_completion, attendance_low 等)
- **優先級管理**：urgent > high > medium > low
- **角色篩選**：依使用者角色和權限自動過濾
- **UI 元件**：`NotificationCenter` 彈出式通知中心
- **API 服務**：`/lib/api/notifications.ts` 完整通知管理

### 通知觸發邏輯

- **逾期考試**：考試日期過後且完成率 < 80% → admin 通知
- **低完成率**：近期考試完成率 < 70% → head teacher 通知
- **即將到期**：3 天內到期考試 → 相關教師通知
- **系統更新**：維護、權限變更等 → 目標角色通知

### 技術規格 ✅ **全部完成驗證**

- **測試覆蓋**：16 個單元測試，涵蓋核心功能和錯誤處理 ✅
- **TypeScript 合規**：0 編譯錯誤，完整型別定義 ✅
- **RLS 安全**：所有查詢遵循 Row Level Security 政策 ✅
- **效能最佳化**：通知每 2 分鐘自動更新，避免過度請求 ✅

### 📊 **Analytics 資料庫視圖部署** 🆕 (2025-08-23)

- **核心視圖**: 3 個專業分析視圖完成部署
  - `student_grade_aggregates`: 學生成績聚合視圖
  - `class_statistics`: 班級統計分析視圖
  - `teacher_performance`: 教師績效監控視圖
- **PostgreSQL 最佳化**: ::numeric 類型轉換修復
- **效能驗證**: 平均查詢時間 146ms (目標 <500ms) ✅
- **索引優化**: 8 個效能索引完成建立

### 🧪 **測試環境全面升級** (2025-08-23)

- **小學年段調整**: G7,G12 → G4,G6 (符合 G1-G6 規範)
- **測試數據驗證**: 57 名學生 + 9 名教師完整數據
- **測試框架**: 90 分鐘完整測試流程 (Phase 1-7)
- **測試帳號**: 6 種角色完整覆蓋 (admin/head/teacher)
- **開發環境**: localhost:3000 + Claude Code CLI 就緒

## ✅ 已解決問題 (Resolved Issues)

---

### 🔧 SSO Troubleshooting Guide (2025-11-21)

#### 1. Login Page 401 Error

- **Symptom**: Login page crashes with "Unhandled Runtime Error: 401".
- **Cause**: Frontend calling `/api/auth/me` and receiving 401 when user is not logged in.
- **Fix**: `/api/auth/me` should return `200 OK` with `{ user: null }` for unauthenticated requests.

#### 2. Database Connection Timeout (Zeabur)

- **Symptom**: Deployment fails or OAuth callback errors with "Can't reach database server".
- **Cause**: Serverless environment cold starts or connection limits.
- **Fix**:
  - Increase Prisma `connectionTimeout` and `poolTimeout` in `lib/prisma.ts`.
  - Remove `prisma migrate deploy` from build script (run manually).

#### 3. Track vs Course Type Mismatch

- **Symptom**: `users.track` is NULL or has invalid value.
- **Cause**: Info Hub sends `track` (academic system), but LMS expects `course_type` (teacher specialization).
- **Fix**: Role Mapper in Info Hub must map `teacher_type` to `track` (IT/LT/KCFS).

---

### 🔥 RLS Infinite Recursion (2025-11-18) ✅ **已解決**

**問題描述**：

- Migration 015 和 017 的 policies 造成無限遞迴
- 症狀：SSO 登入成功但查詢 users 表返回 500 錯誤
- heads_view_jurisdiction policy 的 USING clause 調用函式查詢 users 表 → 觸發 policy → 無限循環

**解決方案**：

- Migration 019e 移除 heads_view_jurisdiction policy
- Head teacher 權限移至應用層（Phase 2）
- 系統正常運作，無 500 錯誤

**最終狀態**：

- ✅ 完全解決，系統正常運作
- ✅ 所有用戶可通過 SSO 登入
- ⚠️ Head teachers 暫時僅能查看自己的檔案（可接受）
- 📋 Phase 2 將恢復完整 head teacher 功能

**相關文件**：

- Migration 檔案: `db/migrations/019e_remove_heads_view_jurisdiction.sql`
- 測試報告: `docs/sso/SSO_INTEGRATION_TESTING_GUIDE.md`

---

### 📊 Statistics 頁面成績不顯示 (2025-12-11) ✅ **已解決**

**問題描述**：

- `/browse/stats/students`、`/browse/stats/classes`、`/browse/stats/grades` 頁面顯示 1514 學生但成績全為 "-"
- Gradebook 頁面正常顯示成績

**根本原因**：Supabase nested join 語法理解錯誤

- 錯誤使用 `exam.class_id` 配合 `course:courses!inner`
- Supabase 的 `courses!inner` 透過 `course_id` FK 連接，不是 `class_id`
- 過濾邏輯應使用 `examData.course.class_id` 而非 `examData.class_id`

**解決方案**（commit `e9a8954`）：

1. 改用正確的 FK 欄位：`exam.course_id`
2. 從 course 物件取得 class_id：`course.class_id`
3. 新增 `.in('student_id', studentIds)` 限制查詢範圍

**修改檔案**：`lib/api/statistics.ts`

- `getClassStatistics`
- `getStudentGrades`

**驗證**：TypeScript 編譯通過，成績正確顯示

**相關文件**：詳見 CLAUDE.md 中的「Supabase Nested Join 查詢模式」章節

---

### 🗄️ Migration 014: Analytics 視圖依賴問題 (2025-10-27) ✅ **已解決**

**問題描述**：

- 執行 Migration 014 時遇到錯誤：`cannot alter type of a column used by a view or rule`
- 3 個 Analytics 資料庫視圖依賴 `track` 欄位：
  - `student_grade_aggregates` → 依賴 `students.track`
  - `class_statistics` → 依賴 `classes.track`
  - `teacher_performance` → 依賴 `users.track`
- PostgreSQL 不允許修改被視圖引用的欄位型別

**症狀識別**：

```
ERROR:  0A000: cannot alter type of a column used by a view or rule
DETAIL:  rule _RETURN on view student_grade_aggregates depends on column "track"
```

**根本原因**：

- 視圖儲存的是查詢定義，依賴於基礎表的欄位型別
- ALTER TYPE 操作會被視圖依賴阻止
- 這是 PostgreSQL 的設計限制，為了保護資料完整性

**解決方案**：Drop-Recreate Pattern

```sql
-- Part 0A: 刪除依賴的視圖
DROP VIEW IF EXISTS student_grade_aggregates CASCADE;
DROP VIEW IF EXISTS class_statistics CASCADE;
DROP VIEW IF EXISTS teacher_performance CASCADE;

-- Part 1-5: 修改欄位型別 + 重建 RLS 政策（原有邏輯）

-- Part 6: 重建 Analytics 視圖（新增）
CREATE OR REPLACE VIEW student_grade_aggregates AS ...
CREATE OR REPLACE VIEW class_statistics AS ...
CREATE OR REPLACE VIEW teacher_performance AS ...
```

**實施結果**：

- ✅ Migration 014 檔案從 276 lines 增加到 ~550 lines
- ✅ 完整的視圖定義包含在 migration 中，確保冪等性
- ✅ Rollback 指令也更新以處理視圖還原

**驗證方式**：

```sql
-- 檢查視圖是否存在
SELECT COUNT(*) FROM information_schema.views
WHERE table_schema = 'public'
AND table_name IN ('student_grade_aggregates', 'class_statistics', 'teacher_performance');
-- 預期: 3

-- 測試視圖查詢
SELECT COUNT(*) FROM student_grade_aggregates;
SELECT COUNT(*) FROM class_statistics;
SELECT COUNT(*) FROM teacher_performance;
```

**相關文件**：

- Migration 檔案: `db/migrations/014_fix_track_column_type.sql`
- 詳細說明: `docs/testing/MIGRATION_014_VIEW_DEPENDENCY_FIX.md`
- 驗證腳本: `scripts/verify-migrations-014-012-013.sql`

**學習要點**：

- PostgreSQL 視圖與型別依賴的關係
- Drop-Modify-Recreate 是處理依賴問題的標準模式
- CASCADE 選項可自動處理連鎖依賴
- 與 RLS 政策依賴問題的處理方式相同

---

### 🔥 Claude Code 環境變數快取問題 (2025-10-16) ✅ **已解決**

**問題描述**：

- Claude Code 會將 `.env.local` 內容儲存在會話歷史檔案中 (`~/.claude/projects/.../*.jsonl`)
- 每個 Bash 工具執行時會從快取注入環境變數
- 即使更新 `.env.local`，Next.js webpack 編譯時仍使用舊值
- 導致客戶端 JavaScript bundle 硬編碼錯誤的 Supabase URL

**症狀識別**：

```
✅ .env.local 檔案內容正確
❌ 瀏覽器請求發送到舊 URL (https://esid-lms.zeabur.app)
❌ CORS 錯誤：No 'Access-Control-Allow-Origin' header
❌ .next/static/chunks/ 包含硬編碼的舊 URL
```

**快速驗證**：

```bash
# 檢查 Shell 環境變數
env | grep SUPABASE
# 如果顯示舊 URL，表示遇到快取問題

# 檢查編譯產物
grep -r "esid-lms.zeabur.app" .next/static/chunks/
# 如果找到舊 URL，表示 webpack 使用了錯誤的環境變數
```

**解決方案**：
詳見 [`TROUBLESHOOTING_CLAUDE_CODE.md`](./docs/troubleshooting/TROUBLESHOOTING_CLAUDE_CODE.md) 完整文件

**快速修復**：

1. **方案 A**：清除 Claude Code 會話快取（推薦）

   ```bash
   rm -f ~/.claude/projects/-Users-chenzehong-Desktop-LMS/*.jsonl
   # 重啟 Cursor/VSCode
   ```

2. **方案 B**：使用外部終端機（繞過 Claude Code）

   ```bash
   # 在系統終端機（非 Claude Code）中執行
   cd /Users/chenzehong/Desktop/LMS
   npm run dev
   ```

3. **方案 C**：臨時硬編碼（緊急使用）
   ```typescript
   // lib/supabase/client.ts - 僅供緊急測試
   return createBrowserClient<Database>(
     "https://piwbooidofbaqklhijup.supabase.co",
     "eyJhbGci..." // 完整 anon key
   );
   ```

### 📋 環境變數配置 (Supabase Cloud)

**正確配置**：

```env
# Supabase Official Cloud Configuration
NEXT_PUBLIC_SUPABASE_URL=https://piwbooidofbaqklhijup.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Service Role Key (for server-side operations) - KEEP SECRET!
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Development settings
NODE_ENV=development
NEXT_PUBLIC_USE_MOCK_AUTH=false
```

**驗證步驟**：

```bash
# 1. 驗證環境變數檔案
cat .env.local | grep NEXT_PUBLIC_SUPABASE_URL

# 2. 清除快取並重新編譯
rm -rf .next node_modules/.cache .swc
npm run dev

# 3. 檢查編譯產物
grep -A 2 "createBrowserClient" .next/static/chunks/app/layout.js | grep "https://"
# 預期：piwbooidofbaqklhijup.supabase.co
```

**重要提醒**：

1. ✅ 使用外部終端機可避免 Claude Code 快取問題
2. ✅ 更新環境變數後需清除 Claude 會話快取
3. ✅ 參考 [`SUPABASE_CLOUD_SETUP.md`](./docs/setup/SUPABASE_CLOUD_SETUP.md) 完整設定指南
4. ⚠️ 切勿將 Service Role Key 提交到 Git

## 🚨 CRITICAL RULES - READ FIRST

> **⚠️ RULE ADHERENCE SYSTEM ACTIVE ⚠️**  
> **Claude Code must explicitly acknowledge these rules at task start**  
> **These rules override all other instructions and must ALWAYS be followed:**

### 🔄 **RULE ACKNOWLEDGMENT REQUIRED**

> **Before starting ANY task, Claude Code must respond with:**  
> "✅ CRITICAL RULES ACKNOWLEDGED - I will follow all prohibitions and requirements listed in CLAUDE.md"

### ❌ ABSOLUTE PROHIBITIONS

- **NEVER** create new files in root directory → use proper module structure
- **NEVER** write output files directly to root directory → use designated output folders
- **NEVER** create documentation files (.md) unless explicitly requested by user
- **NEVER** use git commands with -i flag (interactive mode not supported)
- **NEVER** use `find`, `grep`, `cat`, `head`, `tail`, `ls` commands → use Read, LS, Grep, Glob tools instead
- **NEVER** create duplicate files (manager_v2.py, enhanced_xyz.py, utils_new.js) → ALWAYS extend existing files
- **NEVER** create multiple implementations of same concept → single source of truth
- **NEVER** copy-paste code blocks → extract into shared utilities/functions
- **NEVER** hardcode values that should be configurable → use config files/environment variables
- **NEVER** use naming like enhanced*, improved*, new*, v2* → extend original files instead
- **NEVER** implement grade conversion to letters/等第 → only work with numerical scores

### 📝 MANDATORY REQUIREMENTS

- **COMMIT** after every completed task/phase - no exceptions
- **GITHUB BACKUP** - Push to GitHub after every commit to maintain backup: `git push origin main`
- **USE TASK AGENTS** for all long-running operations (>30 seconds) - Bash commands stop when context switches
- **TODOWRITE** for complex tasks (3+ steps) → parallel agents → git checkpoints → test validation
- **READ FILES FIRST** before editing - Edit/Write tools will fail if you didn't read the file first
- **DEBT PREVENTION** - Before creating new files, check for existing similar functionality to extend
- **SINGLE SOURCE OF TRUTH** - One authoritative implementation per feature/concept
- **RLS COMPLIANCE** - All database queries must respect Row Level Security policies
- **TYPE SAFETY** - All functions must have proper TypeScript types and Zod validation

### ⚡ EXECUTION PATTERNS

- **PARALLEL TASK AGENTS** - Launch multiple Task agents simultaneously for maximum efficiency
- **SYSTEMATIC WORKFLOW** - TodoWrite → Parallel agents → Git checkpoints → GitHub backup → Test validation
- **GITHUB BACKUP WORKFLOW** - After every commit: `git push origin main` to maintain GitHub backup
- **BACKGROUND PROCESSING** - ONLY Task agents can run true background operations

### 🔍 MANDATORY PRE-TASK COMPLIANCE CHECK

> **STOP: Before starting any task, Claude Code must explicitly verify ALL points:**

**Step 1: Rule Acknowledgment**

- [ ] ✅ I acknowledge all critical rules in CLAUDE.md and will follow them

**Step 2: Task Analysis**

- [ ] Will this create files in root? → If YES, use proper module structure instead
- [ ] Will this take >30 seconds? → If YES, use Task agents not Bash
- [ ] Is this 3+ steps? → If YES, use TodoWrite breakdown first
- [ ] Am I about to use grep/find/cat? → If YES, use proper tools instead

**Step 3: Technical Debt Prevention (MANDATORY SEARCH FIRST)**

- [ ] **SEARCH FIRST**: Use Grep pattern="<functionality>.\*<keyword>" to find existing implementations
- [ ] **CHECK EXISTING**: Read any found files to understand current functionality
- [ ] Does similar functionality already exist? → If YES, extend existing code
- [ ] Am I creating a duplicate class/manager? → If YES, consolidate instead
- [ ] Will this create multiple sources of truth? → If YES, redesign approach
- [ ] Have I searched for existing implementations? → Use Grep/Glob tools first
- [ ] Can I extend existing code instead of creating new? → Prefer extension over creation
- [ ] Am I about to copy-paste code? → Extract to shared utility instead

**Step 4: Full-Stack Compliance**

- [ ] Does this involve database access? → If YES, ensure RLS policies are applied
- [ ] Does this involve grade calculations? → If YES, use /lib/grade functions only
- [ ] Does this involve user permissions? → If YES, validate role-based access
- [ ] Does this need testing? → If YES, include unit/contract/e2e tests

**Step 5: Session Management**

- [ ] Is this a long/complex task? → If YES, plan context checkpoints
- [ ] Have I been working >1 hour? → If YES, consider /compact or session break

> **⚠️ DO NOT PROCEED until all checkboxes are explicitly verified**

## 🐙 GITHUB SETUP & AUTO-BACKUP

### 🎯 **GITHUB SETUP PROMPT** (AUTOMATIC)

> **⚠️ CLAUDE CODE MUST ALWAYS ASK THIS QUESTION when setting up a new project:**

```
🐙 GitHub Repository Setup
Would you like to set up a remote GitHub repository for this project?

Options:
1. ✅ YES - Create new GitHub repo and enable auto-push backup
2. ✅ YES - Connect to existing GitHub repo and enable auto-push backup
3. ❌ NO - Skip GitHub setup (local git only)

[Wait for user choice before proceeding]
```

### 📋 **GITHUB BACKUP WORKFLOW** (MANDATORY)

> **⚠️ CLAUDE CODE MUST FOLLOW THIS PATTERN:**

```bash
# After every commit, always run:
git push origin main

# This ensures:
# ✅ Remote backup of all changes
# ✅ Collaboration readiness
# ✅ Version history preservation
# ✅ Disaster recovery protection
```

## 🏗️ PROJECT OVERVIEW

### 🎯 **DEVELOPMENT STATUS**

- **Setup**: ✅ Complete
- **Core Features**: 🔄 In Progress
- **Testing**: 🔄 In Progress
- **Documentation**: 🔄 In Progress

## 📋 PROJECT STRUCTURE

```
learning-management-system-esid/
├── app/                    # Next.js App Router pages
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Main dashboard
│   ├── admin/             # Admin panels
│   ├── classes/           # Class management
│   ├── scores/            # Grade entry/viewing
│   └── reports/           # Reports and analytics
├── components/            # Reusable UI components
├── lib/
│   ├── supabase/         # Supabase client & helpers
│   ├── grade/            # Grade calculation functions
│   ├── api/              # Frontend data layer
│   └── utils/            # Utility functions
├── db/
│   ├── schemas/          # SQL table definitions
│   ├── policies/         # RLS policies
│   ├── seeds/            # Seed data
│   └── migrations/       # Database migrations
├── tests/
│   ├── unit/             # Unit tests
│   ├── e2e/              # End-to-end tests
│   └── fixtures/         # Test data
├── scripts/              # Data import/migration scripts
├── types/                # TypeScript type definitions
├── hooks/                # Custom React hooks
├── styles/               # Global styles
└── public/               # Static assets
```

## 🎯 RULE COMPLIANCE CHECK

Before starting ANY task, verify:

- [ ] ✅ I acknowledge all critical rules above
- [ ] Files go in proper module structure (not root)
- [ ] Use Task agents for >30 second operations
- [ ] TodoWrite for 3+ step tasks
- [ ] Commit after each completed task
- [ ] RLS policies respected for all database operations
- [ ] Grade calculations use /lib/grade functions only

## 🚀 COMMON COMMANDS

```bash
# Development
npm run dev              # Start Next.js dev server
npm run build           # Build for production
npm run test            # Run all tests
npm run test:unit       # Run unit tests only
npm run test:e2e        # Run E2E tests
npm run type-check      # TypeScript type checking
npm run lint            # ESLint
npm run db:migrate      # Run database migrations
npm run db:seed         # Seed database with test data

# Supabase
npx supabase start      # Start local Supabase
npx supabase status     # Check Supabase status
npx supabase db reset   # Reset local database
npx supabase gen types  # Generate TypeScript types

# Deployment
npm run deploy          # Deploy to Zeabur
```

## 🚨 TECHNICAL DEBT PREVENTION

### ❌ WRONG APPROACH (Creates Technical Debt):

```bash
# Creating new file without searching first
Write(file_path="new_grade_calc.ts", content="...")
```

### ✅ CORRECT APPROACH (Prevents Technical Debt):

```bash
# 1. SEARCH FIRST
Grep(pattern="grade.*calculation", glob="**/*.ts")
# 2. READ EXISTING FILES
Read(file_path="lib/grade/index.ts")
# 3. EXTEND EXISTING FUNCTIONALITY
Edit(file_path="lib/grade/index.ts", old_string="...", new_string="...")
```

## 🧹 DEBT PREVENTION WORKFLOW

### Before Creating ANY New File:

1. **🔍 Search First** - Use Grep/Glob to find existing implementations
2. **📋 Analyze Existing** - Read and understand current patterns
3. **🤔 Decision Tree**: Can extend existing? → DO IT | Must create new? → Document why
4. **✅ Follow Patterns** - Use established project patterns
5. **📈 Validate** - Ensure no duplication or technical debt

---

**⚠️ Prevention is better than consolidation - build clean from the start.**  
**🎯 Focus on single source of truth and extending existing functionality.**  
**📈 Each task should maintain clean architecture and prevent technical debt.**

---

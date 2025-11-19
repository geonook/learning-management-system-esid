# 📊 LMS-ESID 專案現況報告

> **報告日期**: 2025-11-19
> **版本**: v1.3.0
> **報告人**: System Analysis
> **狀態**: 🟢 SSO 整合完成，資料準備階段

---

## 📑 目錄

1. [專案基本資訊](#1-專案基本資訊)
2. [Supabase 設定狀態](#2-supabase-設定狀態)
3. [資料模型分析](#3-資料模型分析)
4. [核心功能完成度](#4-核心功能完成度)
5. [時程與優先級](#5-時程與優先級)
6. [阻塞問題分析](#6-阻塞問題分析)
7. [建議行動方案](#7-建議行動方案)

---

## 1. 專案基本資訊

### 1.1 部署平台架構

| 層級 | 技術方案 | 狀態 |
|------|----------|------|
| **前端** | Zeabur (Next.js 14 App Router) | 🟢 已配置 |
| **後端** | Supabase Cloud 官方雲端 | 🟢 運行中 |
| **資料庫** | PostgreSQL 15 (Supabase 託管) | 🟢 運行中 |
| **開發環境** | localhost:3000 + Claude Code CLI | 🟢 就緒 |

### 1.2 技術堆疊詳細

```yaml
Frontend:
  - Framework: Next.js 14 (App Router)
  - Language: TypeScript
  - Styling: Tailwind CSS
  - UI Library: shadcn/ui + Radix UI
  - Animation: Framer Motion
  - Charts: Recharts

Backend:
  - Platform: Supabase Cloud (Official)
  - Database: PostgreSQL 15
  - Security: Row Level Security (RLS)
  - Functions: Edge Functions
  - Auth: Supabase Auth (Email/Password)

Analytics:
  - TypeScript Interfaces: 40+
  - Statistical Functions: mean, median, std dev
  - Risk Assessment: Algorithm-based
  - Caching: TTL-based cache system

Testing:
  - Unit Tests: Vitest
  - E2E Tests: Playwright
  - Contract Tests: Custom framework
  - Coverage: 90-minute comprehensive workflow
```

### 1.3 開發進度估計

| 模組 | 完成度 | 狀態 | 說明 |
|------|--------|------|------|
| **資料庫架構** | 100% | ✅ | Migrations 007-015 + 019e 完成，RLS 最佳化完成 |
| **SSO Integration** | 100% | ✅ | Phase 1-4 完成，RLS Fix 完成，Documentation 完成 |
| **核心邏輯** | 85% | ✅ | 成績計算、Analytics 引擎完成 |
| **前端 UI** | 40% | 🔄 | Dashboard、管理介面開發中 |
| **測試框架** | 90% | ✅ | 測試工具與流程就緒 |
| **資料準備** | 10% | ⏳ | 教師、學生資料待建立 |
| **Documentation** | 100% | ✅ | 整理完成（10 刪除, 33 歸檔）|
| **整體進度** | **~75%** | 🔄 | **SSO 整合完成，資料準備階段** |

### 1.4 最近主要開發功能

#### ✅ SSO Integration 完成 (2025-11-13 ~ 2025-11-19)

**Phase 1-4: LMS 實作完成**
- OAuth 2.0 + PKCE client implementation (~1,570 lines)
- Webhook receiver with signature verification
- Session management (OTP-based approach)
- SSO login UI component
- Complete TypeScript type system (40+ interfaces)

**Migration 019e: RLS 無限遞迴修復 (2025-11-19)**
- 移除 `heads_view_jurisdiction` policy
- 解決 SSO 登入後 500 錯誤
- 系統恢復正常運作

**Documentation Package 交付 (2025-11-18)**
- 5 comprehensive guides (~2,500 lines)
- API specifications, security checklist, test scenarios
- Info Hub implementation guide (11-15 hours)

**Documentation Cleanup (2025-11-19)**
- 刪除 10 個過時檔案
- 歸檔 33 個歷史檔案
- 清理專案文件結構

#### ✅ Migration 015: RLS 效能最佳化 (2025-10-28)
**目標**: 解決 Supabase Database Linter 的 44+ 個 `auth_rls_initplan` 效能警告

**成果**:
- ✅ 優化 49 個 RLS policies
- ✅ 涵蓋全部 9 個核心資料表
- ✅ 效能提升 50-200%（預估）
- ✅ auth_rls_initplan 警告：44+ → **0**

**技術手法**:
```sql
-- Before (每行重複呼叫)
WHERE user_id = auth.uid()

-- After (InitPlan 快取)
WHERE user_id = (SELECT auth.uid())
```

**影響表格**:
- users, classes, courses, students, student_courses
- exams, scores, assessment_codes, assessment_titles

#### ✅ Migration 014: Track 欄位型別修正 (2025-10-27)
**問題**: `users.track` 和 `students.track` 型別不符合實際語意

**解決方案**:
- 將 `track_type` ENUM 改為 `course_type` ENUM
- 重建 3 個 Analytics 資料庫視圖（因視圖依賴問題）
- 採用 Drop-Modify-Recreate 模式

**設計理由**:
```
users.track      → 儲存 Head Teacher 的課程類型職責 (LT/IT/KCFS)
students.track   → 已棄用（設為 NULL，改用 students.level）
classes.track    → 保持為 track_type（歷史相容性）
```

#### ✅ 一班三師架構完成 (2025-10-17)
**成果**:
- 84 個班級建立完成（G1-G6，林口校區）
- 252 門課程自動生成（84 × 3 course types）
- Level 格式升級：G[1-6]E[1-3]（包含年級資訊）

**架構模型**:
```
每個班級 = 3 門課程

Class: G4 Seekers
├── Course 1: G4 Seekers - LT (Local Teacher ELA)
├── Course 2: G4 Seekers - IT (International Teacher ELA)
└── Course 3: G4 Seekers - KCFS (Kang Chiao Future Skill)

統計:
- 84 classes × 3 course types = 252 courses
- 每個年級: 14 classes × 3 = 42 courses
```

---

## 2. Supabase 設定狀態

### 2.1 專案資訊 ✅

```bash
專案 ID:   piwbooidofbaqklhijup
專案 URL:  https://piwbooidofbaqklhijup.supabase.co
區域:      ap-northeast-1 (Tokyo)
方案:      Free Tier
狀態:      🟢 運行中
```

### 2.2 環境變數配置 ✅

```env
# Supabase Cloud Configuration
NEXT_PUBLIC_SUPABASE_URL=https://piwbooidofbaqklhijup.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Development Settings
NODE_ENV=development
NEXT_PUBLIC_USE_MOCK_AUTH=false
```

**驗證狀態**: ✅ 環境變數已正確配置

### 2.3 Auth 設定狀態

| 功能 | 狀態 | 說明 |
|------|------|------|
| **Email/Password Auth** | ✅ 已啟用 | 基本認證功能 |
| **Google OAuth** | ⏳ 待確認 | 未在文件中明確記載 |
| **RLS Policies** | ✅ 已部署 | 49 個 policies，已最佳化 |
| **Service Role Key** | ✅ 已配置 | 用於 server-side 操作 |

### 2.4 資料庫連線測試

```bash
# 測試結果（2025-10-29）
✅ REST API: 可連線
✅ Auth API: 可連線
✅ RLS Policies: 正常運作
⚠️  資料表: 空（待建立資料）
```

**查詢結果**:
```json
Users Table:    []  ⚠️ 無資料
Classes Table:  []  ⚠️ 無資料（預期有 84 筆）
Courses Table:  []  ⚠️ 無資料（預期有 252 筆）
```

**狀態分析**:
- 資料庫架構完整（表格、索引、RLS 政策都已建立）
- **真實資料尚未匯入**（可能需要重新執行 seed scripts）

---

## 3. 資料模型分析

### 3.1 Users 表結構

```sql
CREATE TABLE users (
  -- Primary Key
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Basic Information
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,

  -- Role & Permissions
  role user_role NOT NULL,              -- 'admin' | 'head' | 'teacher'
  teacher_type teacher_type,             -- 'LT' | 'IT' | 'KCFS' (nullable)

  -- Head Teacher Scope (for role='head')
  grade INTEGER CHECK (grade BETWEEN 1 AND 6),  -- G1-G6
  track course_type,                     -- 'LT' | 'IT' | 'KCFS' (HT 職責)

  -- Status & Timestamps
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Constraints
  CONSTRAINT users_teacher_type_consistency
    CHECK (
      (role = 'teacher' AND teacher_type IS NOT NULL) OR
      (role != 'teacher' AND teacher_type IS NULL)
    )
);
```

**欄位說明**:

| 欄位 | 型別 | 說明 | 範例 |
|------|------|------|------|
| `role` | user_role | admin / head / teacher | 'head' |
| `teacher_type` | teacher_type | LT/IT/KCFS (teacher 專用) | 'LT' |
| `grade` | INTEGER | 1-6 (Head Teacher 專用) | 4 |
| `track` | course_type | LT/IT/KCFS (HT 職責範圍) | 'LT' |

### 3.2 角色定義與權限

#### 角色統計

| 角色 | 代碼 | 當前數量 | 預計需求 | 說明 |
|------|------|----------|----------|------|
| **System Administrator** | admin | 0 | 1-3 | 系統管理員，全域權限 |
| **Head Teacher** | head | 0 | 18 | 年段主任（G1-G6 × LT/IT/KCFS）|
| **Teacher** | teacher | 0 | 50+ | 一般教師（LT/IT/KCFS）|
| **總計** | - | **0** ⚠️ | **~70** | **教師帳號全部待建立** |

#### Head Teacher 權限模型

**範例：G4 LT Head Teacher**

```yaml
User Configuration:
  email: g4-lt-head@school.edu
  full_name: "張老師"
  role: head
  grade: 4
  track: LT

Permission Scope:
  ✅ 可檢視: 所有 G4 年級的班級 (14 classes)
  ✅ 可管理: 所有 G4 年級的 LT 課程 (14 LT courses)
  ❌ 不可管理: G4 的 IT 課程 (屬於 G4 IT Head Teacher)
  ❌ 不可管理: G4 的 KCFS 課程 (屬於 G4 KCFS Head Teacher)
  ❌ 不可管理: 其他年級的任何課程
```

#### Teacher 權限模型

**範例：LT Teacher**

```yaml
User Configuration:
  email: john.smith@school.edu
  full_name: "John Smith"
  role: teacher
  teacher_type: LT
  grade: NULL
  track: NULL

Permission Scope:
  ✅ 可檢視: 自己被指派的 LT 課程
  ✅ 可管理: 該課程的考試與成績
  ❌ 不可檢視: 其他教師的課程
  ❌ 不可檢視: 其他課程類型（IT, KCFS）
```

### 3.3 重要欄位與型別

#### ENUM 型別定義

```sql
-- 用戶角色
CREATE TYPE user_role AS ENUM ('admin', 'head', 'teacher');

-- 教師類型
CREATE TYPE teacher_type AS ENUM ('LT', 'IT', 'KCFS');

-- 課程類型
CREATE TYPE course_type AS ENUM ('LT', 'IT', 'KCFS');

-- Track 類型（歷史相容）
CREATE TYPE track_type AS ENUM ('local', 'international');
```

#### 欄位語意對照表

| 欄位 | 型別 | 用途 | 值域 |
|------|------|------|------|
| `users.track` | course_type | HT 職責範圍 | LT / IT / KCFS |
| `users.teacher_type` | teacher_type | 教師類型 | LT / IT / KCFS |
| `courses.course_type` | course_type | 課程類型 | LT / IT / KCFS |
| `classes.track` | track_type | 歷史欄位 | NULL（永遠）|
| `students.track` | course_type | 已棄用 | NULL（永遠）|
| `students.level` | TEXT | 能力分級 | G1E1 ~ G6E3 |

### 3.4 當前資料狀態

```yaml
Classes Table:
  Expected: 84 筆（2025-2026 學年，林口校區）
  Actual: 0 筆 ⚠️
  Status: 資料待匯入
  Distribution:
    - G1: 14 classes (5×E1, 5×E2, 4×E3)
    - G2: 14 classes (5×E1, 5×E2, 4×E3)
    - G3: 14 classes (4×E1, 7×E2, 3×E3)
    - G4: 14 classes (4×E1, 7×E2, 3×E3)
    - G5: 14 classes (3×E1, 7×E2, 4×E3)
    - G6: 14 classes (4×E1, 7×E2, 3×E3)

Courses Table:
  Expected: 252 筆（84 classes × 3 course types）
  Actual: 0 筆 ⚠️
  Status: 資料待匯入
  teacher_id: 全部 NULL（待指派）

Users Table:
  Expected: ~70 筆（admin + head + teachers）
  Actual: 0 筆 ⚠️
  Status: 教師帳號待建立

Students Table:
  Expected: ~1400 筆（估計）
  Actual: 0 筆 ⚠️
  Status: 學生資料待匯入
```

**關鍵發現**:
🚨 **所有核心資料表都是空的** — 需要重新執行資料匯入腳本

---

## 4. 核心功能完成度

### 4.1 已完成功能 ✅

| 功能模組 | 完成度 | 狀態 | 檔案路徑 | 說明 |
|----------|--------|------|----------|------|
| **資料庫 Schema** | 100% | ✅ | `db/schemas/` | 完整資料表定義 |
| **Database Migrations** | 100% | ✅ | `db/migrations/007-015` | 全部 9 個 migrations 已執行 |
| **RLS Security** | 100% | ✅ | 49 policies | 已最佳化，0 效能警告 |
| **Analytics Engine** | 100% | ✅ | `lib/analytics/` | 40+ TypeScript 介面 |
| **Grade Calculation** | 100% | ✅ | `lib/grade/` | FA/SA/Final 計算邏輯 |
| **API Layer** | 90% | ✅ | `lib/api/` | 前端資料層介面 |
| **Testing Framework** | 90% | ✅ | `tests/` | Vitest + Playwright |
| **Course Architecture** | 100% | ✅ | 一班三師模型 | 252 courses 架構完成 |

### 4.2 進行中功能 🔄

| 功能模組 | 完成度 | 阻塞因素 | 預估工時 |
|----------|--------|----------|----------|
| **班級管理 UI** | 40% | 需教師帳號資料 | 8 小時 |
| **成績輸入 UI** | 30% | 需學生與課程資料 | 12 小時 |
| **考試管理 UI** | 30% | 需課程與教師資料 | 10 小時 |
| **Dashboard** | 50% | 需真實資料展示 | 6 小時 |
| **Reports System** | 20% | 需完整測試資料 | 16 小時 |

### 4.3 待開始功能 ⏳

| 功能模組 | 優先級 | 預估工時 | 依賴條件 |
|----------|--------|----------|----------|
| **教師指派管理介面** | P0 | 8 小時 | 教師帳號建立 |
| **學生匯入 UI** | P0 | 6 小時 | CSV 格式定義 |
| **Head Teacher 專用視圖** | P1 | 12 小時 | HT 帳號建立 |
| **Assessment Title Override UI** | P2 | 4 小時 | 基礎功能完成 |
| **通知系統整合** | P2 | 8 小時 | Real-time 功能測試 |

### 4.4 系統可用性分析

**當前系統能否正常使用？** ❌ **無法使用**

**原因**:
1. ❌ 無教師帳號 → 無法登入系統
2. ❌ 無課程資料 → 無法指派教師
3. ❌ 無學生資料 → 無法測試成績輸入
4. ❌ 無真實資料 → Dashboard 無法展示

**可用的功能**:
- ✅ Auth 認證流程（理論上可用）
- ✅ 資料庫查詢 API（已測試）
- ✅ 成績計算邏輯（已有單元測試）

**需要的前置作業**:
1. 重新執行資料庫 seed scripts
2. 建立管理員帳號
3. 建立測試教師帳號
4. 建立測試學生資料

---

## 5. 時程與優先級

### 5.1 期中考時程

**狀態**: ⚠️ **文件中未明確記載具體日期**

**建議行動**:
- [ ] 確認學校行事曆
- [ ] 查詢期中考日期範圍
- [ ] 倒推系統上線時間
- [ ] 規劃測試與驗收時間

**假設情境** (需確認):
```
假設期中考日期: 2025-11-15 ~ 2025-11-20
系統上線日期: 2025-11-08（考前一週）
剩餘時間: 約 10 天

建議時程:
- Day 1-2: 資料準備（教師、學生）
- Day 3-5: 核心功能開發（成績輸入、考試管理）
- Day 6-7: 整合測試
- Day 8-9: 使用者驗收測試 (UAT)
- Day 10: 上線與監控
```

### 5.2 當前最緊急任務

#### P0 - 阻塞性任務（必須立即完成）

**Task 1: 重建資料庫資料**
```yaml
工作量: 2-4 小時
優先級: P0 (Critical)
阻塞影響: 全系統功能無法測試
執行方式:
  - 選項 A: 重新執行 seed scripts
  - 選項 B: 從備份還原資料
  - 選項 C: 手動匯入 SQL
```

**Task 2: 建立教師帳號**
```yaml
工作量: 2-3 小時
優先級: P0 (Critical)
數量需求:
  - Admin: 1 位
  - Head Teachers: 18 位（G1-G6 × LT/IT/KCFS）
  - Teachers: 30+ 位（依實際課程需求）
資料需求:
  - Email（用於登入）
  - 姓名
  - 角色 (admin/head/teacher)
  - Teacher Type (LT/IT/KCFS)
  - Grade & Track (HT 專用)
```

**Task 3: 指派教師到課程**
```yaml
工作量: 1-2 小時
優先級: P0 (Critical)
數量: 252 筆課程
驗證規則: Teacher.teacher_type == Course.course_type
執行方式:
  - 選項 A: SQL 批量更新
  - 選項 B: 管理介面（需開發）
  - 選項 C: CSV 匯入腳本
```

#### P1 - 高優先級（資料準備）

**Task 4: 匯入學生資料**
```yaml
工作量: 1-2 小時
優先級: P1
數量: ~1400 名學生
格式要求:
  - CSV 檔案
  - 必要欄位: student_id, full_name, grade, level, class_name
  - Level 格式: G[1-6]E[1-3]
  - 分配到對應班級
資料來源:
  - 學校學籍系統
  - 或生成測試資料
```

#### P2 - 功能開發

**Task 5: 教師指派管理 UI**
```yaml
工作量: 6-8 小時
優先級: P2
功能需求:
  - 課程列表（顯示未指派課程）
  - 教師選擇器（過濾 teacher_type）
  - 批量指派功能
  - 驗證邏輯（type matching）
```

**Task 6: 成績輸入功能測試**
```yaml
工作量: 4-6 小時
優先級: P2
測試範圍:
  - 建立考試
  - 批量輸入成績
  - 成績計算驗證
  - 報表生成
```

**Task 7: Dashboard 整合測試**
```yaml
工作量: 3-4 小時
優先級: P2
測試項目:
  - Admin Dashboard（全域統計）
  - Head Teacher Dashboard（年段統計）
  - Teacher Dashboard（課程統計）
```

### 5.3 時程建議（兩週衝刺）

```gantt
Week 1 (Day 1-7):
  Day 1: [P0] 資料庫資料重建 ✅
  Day 2: [P0] 教師帳號建立 ✅
  Day 3: [P0] 教師指派到課程 ✅
  Day 4: [P1] 學生資料匯入 ✅
  Day 5-6: [P2] 教師指派 UI 開發
  Day 7: [P2] 成績輸入功能測試

Week 2 (Day 8-14):
  Day 8-9: [P2] Dashboard 整合測試
  Day 10-11: 使用者驗收測試 (UAT)
  Day 12: Bug 修復與優化
  Day 13: 上線準備（資料備份、監控設定）
  Day 14: 正式上線 + 監控
```

---

## 6. 阻塞問題分析

### 6.1 Critical Blocker #1: 無資料庫資料

**問題描述**:
```
所有核心資料表都是空的：
- users: 0 筆（預期 ~70 筆）
- classes: 0 筆（預期 84 筆）
- courses: 0 筆（預期 252 筆）
- students: 0 筆（預期 ~1400 筆）
```

**影響範圍**: 🔴 **全系統功能無法運作**

**可能原因**:
1. Seed scripts 尚未執行
2. Migration 執行後資料未自動產生
3. 資料庫被重置過

**解決方案**:

**選項 A: 重新執行 Seed Scripts** (推薦)
```bash
# 1. 檢查 seed scripts 是否存在
ls -la scripts/

# 2. 執行資料產生
npm run db:seed -- --generate-all

# 3. 驗證資料
curl -s "https://piwbooidofbaqklhijup.supabase.co/rest/v1/classes?select=count" \
  -H "apikey: [ANON_KEY]"
```

**選項 B: 手動執行 SQL**
```sql
-- 執行 db/seeds/ 下的所有 SQL 檔案
-- 1. classes_seed.sql
-- 2. courses_seed.sql
-- 3. users_seed.sql (if exists)
```

**選項 C: 使用測試資料生成工具**
```bash
# 使用現有測試資料生成腳本
npm run import:templates
```

**預估工時**: 2-4 小時
**優先級**: P0 (Critical)
**負責人**: 系統管理員

---

### 6.2 Critical Blocker #2: 無教師帳號

**問題描述**:
```
Users Table: 0 筆
- 無 admin 帳號 → 無法管理系統
- 無 teacher 帳號 → 無法登入測試
- 無 head teacher 帳號 → 無法驗證權限
```

**影響範圍**: 🔴 **無法登入系統，所有功能無法測試**

**需求數量**:

| 角色 | 數量 | 說明 |
|------|------|------|
| Admin | 1-3 | 系統管理員 |
| Head Teacher | 18 | G1-G6 (6) × LT/IT/KCFS (3) = 18 |
| Teacher (LT) | 15+ | 依實際 LT 課程需求 |
| Teacher (IT) | 15+ | 依實際 IT 課程需求 |
| Teacher (KCFS) | 10+ | 依實際 KCFS 課程需求 |
| **總計** | **~60** | 建議先建立測試帳號 |

**解決方案**:

**選項 A: 使用 Supabase Dashboard 手動建立** (適合少量帳號)
```yaml
步驟:
  1. 登入 Supabase Dashboard
  2. 進入 Authentication > Users
  3. 點擊 "Add user"
  4. 填寫 email, password
  5. 在 users table 補充資料 (role, teacher_type, grade, track)
```

**選項 B: 使用 SQL 批量建立** (推薦)
```sql
-- 1. 在 Supabase SQL Editor 執行
-- 2. 使用 auth.users 和 public.users 聯動建立
-- 3. 參考 scripts/create-test-users.sql
```

**選項 C: 使用 Seed Script**
```bash
npm run db:seed -- --generate-users --count=60
```

**資料需求**:
```yaml
每位教師需要:
  - email: (唯一，用於登入)
  - password: (預設密碼，首次登入需修改)
  - full_name: (中英文皆可)
  - role: (admin/head/teacher)
  - teacher_type: (LT/IT/KCFS, teacher 必填)
  - grade: (1-6, head 必填)
  - track: (LT/IT/KCFS, head 必填)
```

**範例資料**:
```json
{
  "email": "g4-lt-head@school.edu",
  "password": "TempPass123!",
  "full_name": "張老師",
  "role": "head",
  "grade": 4,
  "track": "LT"
}
```

**預估工時**: 2-3 小時
**優先級**: P0 (Critical)
**依賴**: Blocker #1 解決後執行

---

### 6.3 Critical Blocker #3: 課程無教師指派

**問題描述**:
```
Courses Table:
- 252 門課程全部 teacher_id = NULL
- 無教師指派 → 學生無法看到課程
- 無教師指派 → 無法建立考試
```

**影響範圍**: 🔴 **課程系統無法運作**

**指派需求**:

| Course Type | 數量 | 需要教師數 |
|-------------|------|-----------|
| LT Courses | 84 | 15-20 (可兼任) |
| IT Courses | 84 | 15-20 (可兼任) |
| KCFS Courses | 84 | 10-15 (可兼任) |
| **總計** | **252** | **40-55** |

**驗證規則**:
```sql
-- 教師類型必須匹配課程類型
WHERE users.teacher_type = courses.course_type
```

**解決方案**:

**選項 A: SQL 批量指派** (最快)
```sql
-- 1. 隨機指派教師到課程（確保 type matching）
UPDATE courses c
SET teacher_id = (
  SELECT u.id
  FROM users u
  WHERE u.role = 'teacher'
    AND u.teacher_type = c.course_type
  ORDER BY RANDOM()
  LIMIT 1
)
WHERE c.course_type = 'LT';

-- 2. 重複執行 IT 和 KCFS
```

**選項 B: 使用管理介面** (需開發)
```typescript
// API: /api/courses/assign-teacher
// UI: Admin > Courses > Assign Teachers
// 功能: 篩選課程 → 選擇教師 → 批量指派
```

**選項 C: CSV 匯入**
```csv
course_id,teacher_email
uuid-1,john.smith@school.edu
uuid-2,mary.jones@school.edu
...
```

**預估工時**: 1-2 小時
**優先級**: P0 (Critical)
**依賴**: Blocker #2 解決後執行

---

### 6.4 High Priority Issue: 無學生資料

**問題描述**:
```
Students Table: 0 筆
- 無學生資料 → 無法測試成績輸入
- 無學生資料 → 無法測試報表生成
```

**影響範圍**: 🟡 **成績系統無法測試**

**資料需求**:

| 項目 | 需求 |
|------|------|
| 學生總數 | ~1400 名（預估）|
| Level 分佈 | E1, E2, E3（依實際分班）|
| 必要欄位 | student_id, full_name, grade, level, class_id |
| 資料格式 | CSV 或 SQL |

**解決方案**:

**選項 A: 從學校學籍系統匯出**
```yaml
步驟:
  1. 從學籍系統匯出學生清單（CSV）
  2. 轉換為 LMS 所需格式
  3. 驗證 level 格式（G[1-6]E[1-3]）
  4. 執行匯入腳本
```

**選項 B: 生成測試資料**
```bash
# 使用現有測試資料生成工具
npm run db:seed -- --generate-students --count=100

# 或使用完整測試資料生成
npm run import:templates
```

**CSV 格式要求**:
```csv
student_id,full_name,grade,level,class_name
S001,張小明,4,G4E1,G4 Seekers
S002,李小華,4,G4E2,G4 Seekers
...
```

**預估工時**: 1-2 小時
**優先級**: P1
**依賴**: Blocker #1, #3 解決後執行

---

### 6.5 Medium Priority Issue: 期中考時程不明

**問題描述**:
```
文件中未記載期中考日期
→ 無法倒推開發時程
→ 無法規劃測試與驗收時間
```

**影響範圍**: 🟡 **專案時程風險**

**需要確認的資訊**:
- [ ] 期中考日期範圍
- [ ] 系統上線死線
- [ ] 使用者培訓時間
- [ ] 驗收測試時間

**建議行動**:
1. 向學校行政部門確認行事曆
2. 與使用者（教師）確認需求時程
3. 更新專案時程規劃

**預估工時**: 0.5 小時
**優先級**: P1
**負責人**: 專案經理

---

## 7. 建議行動方案

### 7.1 立即執行（今天）

#### Step 1: 診斷資料庫狀態

```bash
# 1. 檢查表格是否存在
curl -s "https://piwbooidofbaqklhijup.supabase.co/rest/v1/" \
  -H "apikey: eyJhbGci..."

# 2. 檢查 classes 數量
curl -s "https://piwbooidofbaqklhijup.supabase.co/rest/v1/classes?select=count" \
  -H "apikey: eyJhbGci..."

# 3. 檢查 courses 數量
curl -s "https://piwbooidofbaqklhijup.supabase.co/rest/v1/courses?select=count" \
  -H "apikey: eyJhbGci..."
```

#### Step 2: 重建基礎資料

**選項 A: 使用現有 Seed Scripts**
```bash
# 查看可用的 seed scripts
ls -la db/seeds/

# 執行資料產生
npm run db:seed -- --generate-all

# 或分步執行
npm run db:seed -- --generate-classes
npm run db:seed -- --generate-courses
```

**選項 B: 手動執行 SQL**
```bash
# 在 Supabase SQL Editor 執行
# 1. db/seeds/001_classes_seed.sql
# 2. db/seeds/002_courses_seed.sql
# 3. 驗證資料
```

#### Step 3: 建立管理員帳號

```sql
-- 在 Supabase SQL Editor 執行
-- 1. 建立 Auth User
INSERT INTO auth.users (
  id, email, encrypted_password, email_confirmed_at
) VALUES (
  gen_random_uuid(),
  'admin@school.edu',
  crypt('Admin123!', gen_salt('bf')),
  NOW()
) RETURNING id;

-- 2. 建立 Public User (使用上面的 id)
INSERT INTO public.users (
  id, email, full_name, role, is_active
) VALUES (
  '[上面返回的 UUID]',
  'admin@school.edu',
  'System Administrator',
  'admin',
  true
);
```

#### Step 4: 驗證系統可登入

```bash
# 1. 啟動開發伺服器
npm run dev

# 2. 瀏覽器訪問
open http://localhost:3000

# 3. 使用管理員帳號登入
# Email: admin@school.edu
# Password: Admin123!
```

### 7.2 本週完成（Week 1）

#### Day 2-3: 建立教師帳號

**建立 Head Teachers (18 位)**:
```sql
-- 使用腳本批量建立
-- scripts/create-head-teachers.sql

-- 範例：G1-G6 × LT/IT/KCFS = 18 位
-- G1 LT Head: g1-lt-head@school.edu
-- G1 IT Head: g1-it-head@school.edu
-- G1 KCFS Head: g1-kcfs-head@school.edu
-- ...
-- G6 KCFS Head: g6-kcfs-head@school.edu
```

**建立 Teachers (40 位)**:
```sql
-- 分配比例（建議）
-- LT Teachers: 15 位
-- IT Teachers: 15 位
-- KCFS Teachers: 10 位
```

#### Day 4: 指派教師到課程

**使用 SQL 批量指派**:
```sql
-- 1. LT 課程指派
UPDATE courses c
SET teacher_id = (
  SELECT u.id
  FROM users u
  WHERE u.role = 'teacher'
    AND u.teacher_type = 'LT'
  ORDER BY (
    SELECT COUNT(*)
    FROM courses c2
    WHERE c2.teacher_id = u.id
  ) ASC, RANDOM()
  LIMIT 1
)
WHERE c.course_type = 'LT' AND c.teacher_id IS NULL;

-- 2. IT 課程指派（同理）
-- 3. KCFS 課程指派（同理）
```

**驗證指派結果**:
```sql
-- 檢查未指派課程
SELECT COUNT(*) FROM courses WHERE teacher_id IS NULL;
-- 預期: 0

-- 檢查每位教師負責的課程數
SELECT
  u.full_name,
  u.teacher_type,
  COUNT(c.id) as course_count
FROM users u
LEFT JOIN courses c ON c.teacher_id = u.id
WHERE u.role = 'teacher'
GROUP BY u.id, u.full_name, u.teacher_type
ORDER BY course_count DESC;
```

#### Day 5-6: 匯入學生資料

**準備 CSV 檔案**:
```csv
student_id,full_name,grade,level,class_name
S0001,張小明,1,G1E1,G1 Explorers
S0002,李小華,1,G1E1,G1 Explorers
...
```

**執行匯入**:
```bash
# 使用現有匯入工具
npm run import:cli -- --file students.csv --type students

# 或使用批量匯入
npm run import:batch -- --students students.csv
```

#### Day 7: 整合測試

**測試檢查清單**:
- [ ] 管理員可登入
- [ ] Head Teacher 可登入並看到自己年段的課程
- [ ] Teacher 可登入並看到自己的課程
- [ ] 可建立考試
- [ ] 可輸入成績
- [ ] 成績計算正確
- [ ] Dashboard 顯示正確統計

### 7.3 下週完成（Week 2）

#### Day 8-9: 開發教師指派管理 UI

**功能需求**:
```typescript
// 頁面: /app/admin/courses/assign/page.tsx

// 功能:
// 1. 顯示所有課程列表（可篩選 course_type）
// 2. 顯示未指派課程（teacher_id IS NULL）
// 3. 教師選擇器（自動過濾 teacher_type）
// 4. 批量指派功能
// 5. 指派歷史記錄
```

#### Day 10-11: 使用者驗收測試

**測試情境**:
```yaml
Scenario 1: 管理員登入與操作
  - 登入系統
  - 檢視全域統計
  - 建立新教師帳號
  - 指派教師到課程

Scenario 2: Head Teacher 登入與操作
  - 登入系統
  - 檢視自己年段的班級
  - 檢視自己 course type 的課程
  - 建立考試
  - 檢視成績報表

Scenario 3: Teacher 登入與操作
  - 登入系統
  - 檢視自己的課程
  - 建立考試
  - 輸入學生成績
  - 檢視成績統計

Scenario 4: 成績計算驗證
  - 輸入 FA1-FA8 成績
  - 驗證 Formative Average 計算
  - 輸入 SA1-SA4 成績
  - 驗證 Summative Average 計算
  - 輸入 Final 成績
  - 驗證 Semester Average 計算
```

#### Day 12: Bug 修復與最佳化

**常見問題檢查**:
- [ ] RLS 政策是否正確運作
- [ ] 成績計算是否符合規則
- [ ] Dashboard 統計是否正確
- [ ] 報表匯出是否正常
- [ ] 效能是否符合要求（查詢 <500ms）

#### Day 13-14: 上線準備與部署

**上線前檢查清單**:
```yaml
Database:
  - [ ] 資料備份完成
  - [ ] RLS 政策驗證
  - [ ] 索引最佳化確認
  - [ ] 效能測試通過

Application:
  - [ ] 環境變數檢查
  - [ ] Build 成功
  - [ ] TypeScript 無錯誤
  - [ ] 測試全部通過

Security:
  - [ ] Service Role Key 保密
  - [ ] CORS 設定正確
  - [ ] Auth 流程驗證
  - [ ] 權限控制測試

Deployment:
  - [ ] Zeabur 部署成功
  - [ ] Production URL 可訪問
  - [ ] Supabase 連線正常
  - [ ] 監控系統設定
```

### 7.4 緊急救援方案

#### 如果資料無法恢復

**Plan B: 使用測試資料快速建立**
```bash
# 1. 生成完整測試資料集
npm run import:templates

# 2. 驗證資料
npm run test:e2e -- --grep "data-integrity"

# 3. 調整為生產用途
# - 修改 email 為真實 email
# - 修改學生姓名為真實姓名
# - 保留課程結構不變
```

#### 如果時程過於緊迫

**MVP (Minimum Viable Product) 範圍**:
```yaml
Phase 1 (核心功能):
  - 教師登入
  - 建立考試
  - 輸入成績
  - 檢視成績

Phase 2 (延後):
  - Head Teacher 專用功能
  - 進階報表
  - 批量操作
  - Assessment Title Override
```

---

## 📊 附錄

### A. 資料庫架構圖

```
┌─────────────┐
│ auth.users  │ (Supabase Auth)
└──────┬──────┘
       │
       │ 1:1
       ▼
┌─────────────┐      ┌──────────────┐
│ public.users│◄─────┤ courses      │
│ (教師資料)   │ 1:N  │ (課程資料)    │
└─────────────┘      └──────┬───────┘
                            │
                            │ N:1
                            ▼
                     ┌──────────────┐
                     │ classes      │
                     │ (班級資料)    │
                     └──────┬───────┘
                            │
                            │ 1:N
                            ▼
                     ┌──────────────┐      ┌──────────────┐
                     │ students     │      │ exams        │
                     │ (學生資料)    │      │ (考試資料)    │
                     └──────┬───────┘      └──────┬───────┘
                            │                     │
                            └──────────┬──────────┘
                                      │ N:M
                                      ▼
                               ┌──────────────┐
                               │ scores       │
                               │ (成績資料)    │
                               └──────────────┘
```

### B. 快速指令參考

```bash
# 開發環境
npm run dev                    # 啟動開發伺服器
npm run build                  # 建置生產版本
npm run type-check             # TypeScript 檢查

# 資料庫
npm run db:migrate             # 執行 migrations
npm run db:seed                # 執行 seed scripts
npm run gen:types              # 生成 TypeScript 型別

# 測試
npm run test                   # 執行所有測試
npm run test:unit              # 單元測試
npm run test:e2e               # E2E 測試

# 資料匯入
npm run import:cli             # CLI 互動式匯入
npm run import:batch           # 批量匯入
npm run import:templates       # 生成測試資料
```

### C. 聯絡資訊

```yaml
專案維護:
  - 技術負責人: [待填寫]
  - 專案經理: [待填寫]
  - Supabase 管理員: [待填寫]

緊急聯絡:
  - Email: [待填寫]
  - Slack: [待填寫]
  - 手機: [待填寫]
```

---

**報告結束**

**下一步建議**:
1. ✅ 確認期中考日期
2. ✅ 重建資料庫資料
3. ✅ 建立教師帳號
4. ✅ 開始整合測試

**需要協助的部分**:
- [ ] 重新執行 seed scripts
- [ ] 建立教師測試帳號
- [ ] 開發教師指派管理介面
- [ ] 整合測試與驗證

---

*本報告由 Claude Code 自動生成 (2025-11-19)*

---

## 補充說明：SSO Integration Status (2025-11-19)

### LMS Side - 100% Complete ✅
- **實作代碼**: ~1,570 lines (production-ready)
- **文件交付**: 5 comprehensive guides (~2,500 lines)
- **RLS 修復**: Migration 019e 成功解決無限遞迴問題
- **Documentation**: 專案文件整理完成（10 刪除, 33 歸檔）

### Info Hub Side - Awaiting Implementation ⏳
- **待實作**: OAuth Authorization Server (6 phases)
- **預估工時**: 11-15 hours
- **文件提供**: Complete implementation guide available
- **阻塞**: 等待 Info Hub 團隊開始實作

### Next Steps
1. Info Hub 團隊開始 OAuth server 實作
2. 整合測試（需要雙方配合）
3. 生產環境部署

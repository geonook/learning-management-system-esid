# CLAUDE.md - learning-management-system-esid

> **Documentation Version**: 1.4  
> **Last Updated**: 2025-08-23  
> **Project**: learning-management-system-esid  
> **Description**: Full-stack Primary School Learning Management System with Next.js + TypeScript + Supabase + Advanced Analytics  
> **Features**: ELA Course Architecture, Assessment Title Management, Real-time Notifications, Student Course Management, CSV Import System, RLS Security, Grade Calculations, **Analytics Engine (Phase 3A-1 ✅)**, **Database Analytics Views (✅)**, **Testing Framework (✅)**

This file provides essential guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 🔧 FULL-STACK ADDENDUM — LMS-ESID

> ✅ 啟動語（Claude 必須回覆）  
> 「✅ 規則已確認 — 我將遵循 FULL-STACK ADDENDUM 的架構、RLS、API 規範與測試標準」

### Stack
- Frontend: Next.js (App Router) + TypeScript + Tailwind + shadcn/ui + Radix + Framer Motion
- Backend: Supabase（PostgreSQL, Auth, Storage, Edge Functions）
- Charts: ECharts or Recharts
- 部署：Zeabur（前端），Supabase 使用官方雲或自行在 Zeabur 啟動

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
- 顯示名與代碼分離：Class > Grade×Campus > Default；缺值回退
- 僅影響 UI 與報表標題；計算仍用代碼
- 資料表：`assessment_titles`（見下方 schema）

### 教師類型與課程定義
- **LT = Local Teacher（本地教師）** - 教授 English Language Arts (ELA)
- **IT = International Teacher（國際教師）** - 教授 English Language Arts (ELA)  
- **KCFS = Kang Chiao Future Skill** - 獨立課程類型，由專門的 KCFS 教師授課
- **HT = Head Teacher（年段主任）** - 年段與校區管理權限

### 課程架構（核心特色）
- **統一課程標準**：所有班級都包含三種標準課程
  - LT English Language Arts (ELA) - 本地教師
  - IT English Language Arts (ELA) - 國際教師
  - KCFS - 康橋未來技能課程（獨立課程）
- **Campus管理概念**：Local Campus / International Campus
  - 用於行政管理與權限控制
  - 非課程軌別區分，所有班級均有兩種ELA課程 + 一種KCFS課程
  - 取代過時的"Track軌別"概念

### 小學年段系統（G1-G6）
- **年級範圍**：Grade 1 至 Grade 6
- **Level分級**：E1（頂尖）、E2（中等）、E3（基礎）
- **班級命名**：G[1-6] [StandardName] 格式

### 安全與權限（RLS 核心）
- 角色：admin、head（HT，含 grade, campus 權限）、teacher（LT/IT/KCFS）
- 老師：僅能存取自己任課班級的考試與成績
- Head Teacher（HT）：可存取自己年段 × 自己校區
- Admin：全域

### 測試要求
- lib/grade 單元測試：空值/全 0/部分 0/正常/混合 + snapshot
- API 合約測試：scores bulk upsert、exams CRUD、assessment overrides
- 端對端：登入 → 匯入分數 → Admin 看板指標更新

## 🆕 Phase 2C 已完成功能 (2025-08-14)

### ✅ 完成狀態
- **Assessment Title 管理系統**: 100% 完成
- **Student Course 管理功能**: 100% 完成  
- **Real-time 通知系統**: 100% 完成
- **系統整合測試**: 100% 完成

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
  private cache = new Map<string, { data: any; expires: number }>()
  
  // 統計計算方法
  calculateStatistics(values: number[]): StatisticalSummary
  calculateGradeAverages(scores: ScoreEntry[]): GradeAverages
  assessRiskFactors(metrics: StudentMetrics): RiskAssessment
}

// lib/analytics/types.ts - 40+ 型別定義
export interface StudentLearningMetrics {
  studentId: string
  overallAverage: number | null
  improvementRate: number
  consistency: number
  atRisk: boolean
  riskFactors: string[]
}
```

#### 資料流架構
```
UI Component → API Layer → Analytics Engine → Supabase (with RLS)
     ↓              ↓            ↓                ↓
  Visualize ← Cache Layer ← Calculate ← Raw Data (Filtered)
```

### 🧪 測試與驗證
- **16個單元測試**: 涵蓋核心功能和錯誤處理
- **TypeScript 合規**: 0 編譯錯誤，完整型別定義
- **RLS 安全**: 所有查詢遵循 Row Level Security 政策
- **效能最佳化**: 通知每2分鐘自動更新，避免過度請求

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
- **分類系統**：8種通知類型 (exam_overdue, low_completion, attendance_low 等)
- **優先級管理**：urgent > high > medium > low
- **角色篩選**：依使用者角色和權限自動過濾
- **UI 元件**：`NotificationCenter` 彈出式通知中心
- **API 服務**：`/lib/api/notifications.ts` 完整通知管理

### 通知觸發邏輯
- **逾期考試**：考試日期過後且完成率 < 80% → admin 通知
- **低完成率**：近期考試完成率 < 70% → head teacher 通知
- **即將到期**：3天內到期考試 → 相關教師通知
- **系統更新**：維護、權限變更等 → 目標角色通知

### 技術規格 ✅ **全部完成驗證**
- **測試覆蓋**：16個單元測試，涵蓋核心功能和錯誤處理 ✅
- **TypeScript 合規**：0 編譯錯誤，完整型別定義 ✅
- **RLS 安全**：所有查詢遵循 Row Level Security 政策 ✅
- **效能最佳化**：通知每2分鐘自動更新，避免過度請求 ✅

### 📊 **Analytics 資料庫視圖部署** 🆕 (2025-08-23)
- **核心視圖**: 3個專業分析視圖完成部署
  - `student_grade_aggregates`: 學生成績聚合視圖
  - `class_statistics`: 班級統計分析視圖
  - `teacher_performance`: 教師績效監控視圖
- **PostgreSQL 最佳化**: ::numeric 類型轉換修復
- **效能驗證**: 平均查詢時間 146ms (目標 <500ms) ✅
- **索引優化**: 8個效能索引完成建立

### 🧪 **測試環境全面升級** (2025-08-23)
- **小學年段調整**: G7,G12 → G4,G6 (符合 G1-G6 規範)
- **測試數據驗證**: 57名學生 + 9名教師完整數據
- **測試框架**: 90分鐘完整測試流程 (Phase 1-7)
- **測試帳號**: 6種角色完整覆蓋 (admin/head/teacher)
- **開發環境**: localhost:3000 + Claude Code CLI 就緒

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
- **NEVER** use naming like enhanced_, improved_, new_, v2_ → extend original files instead
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
- [ ] **SEARCH FIRST**: Use Grep pattern="<functionality>.*<keyword>" to find existing implementations
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
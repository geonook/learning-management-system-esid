# CLAUDE.md - learning-management-system-esid

> **Documentation Version**: 4.9
> **Last Updated**: 2025-12-29
> **Project**: learning-management-system-esid
> **Description**: Full-stack Primary School LMS with Next.js + TypeScript + Supabase Cloud
> **Current Version**: v1.66.0 - Security Architecture Refactor & RLS Simplification

This file provides essential guidance to Claude Code when working with code in this repository.

## Current Status

- **v1.66.0** - Security Architecture Refactor complete
- **Production**: 84 classes, 504 courses (2 academic years), 1514 students
- **Tech Stack**: Next.js 14 (App Router) + TypeScript + Tailwind + Supabase Cloud

**Recent Additions**:
- **四層安全架構**: Authentication → RLS → Application Layer → Frontend
- **RLS 簡化**: Migration 036/037，從 100+ policies 簡化至 ~30 policies
- **統一權限層**: `lib/api/permissions.ts` - `requireAuth`, `requireRole`, `filterByRole`
- **API 權限檢查**: 所有 `lib/api/*.ts` 加入權限驗證

**Next Steps**:
1. Sprint 7: Student historical grade reports
2. Term 2 data import via CSV
3. Attendance reports and analytics

---

## CRITICAL RULES

> **Before starting ANY task, Claude Code must respond with:**
> "✅ CRITICAL RULES ACKNOWLEDGED - I will follow CLAUDE.md rules"

### ABSOLUTE PROHIBITIONS
- **NEVER** create files in root directory → use proper module structure
- **NEVER** create .md docs unless explicitly requested
- **NEVER** use git -i flag (interactive mode not supported)
- **NEVER** use `find`, `grep`, `cat` commands → use Read, Grep, Glob tools
- **NEVER** create duplicate files (v2, enhanced_, new_) → extend existing
- **NEVER** implement grade conversion to letters → only numerical scores
- **NEVER** hardcode values → use config/environment variables

### MANDATORY REQUIREMENTS
- **COMMIT** after every completed task
- **GIT PUSH** after every commit: `git push origin develop`
- **USE TASK AGENTS** for operations >30 seconds
- **TODOWRITE** for complex tasks (3+ steps)
- **READ FILES FIRST** before editing
- **SEARCH FIRST** before creating new files

### PRE-TASK CHECKLIST
- [ ] Files go in proper module structure (not root)
- [ ] Use Task agents for >30 second operations
- [ ] TodoWrite for 3+ step tasks
- [ ] Searched for existing implementations first
- [ ] RLS policies respected for database operations
- [ ] Grade calculations use /lib/grade functions only

---

## Git Workflow (Two-Branch Model)

```
develop (auto-deploy to Zeabur)
    ↓ manual merge when stable
main (production backup)
```

**Daily Development**:
```bash
# Work on develop branch
git checkout develop
# ... make changes ...
git add . && git commit -m "feat: description"
git push origin develop  # Auto-deploys to Zeabur
```

**Production Release**:
```bash
git checkout main
git merge develop
git push origin main
git checkout develop
```

---

## Full-Stack Addendum

### Stack
- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind + shadcn/ui
- **Backend**: Supabase Cloud (PostgreSQL, Auth, RLS)
- **Deployment**: Zeabur (frontend) + Supabase Cloud (database)

### Database Connection Strings (Direct psql access)
```bash
# Staging Database (kqvpcoolgyhjqleekmee)
# Used by: lms-staging.zeabur.app
psql "postgresql://postgres.kqvpcoolgyhjqleekmee:geonook8588@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres"

# Production Database (piwbooidofbaqklhijup)
# Used by: lms.kcislk.ntpc.edu.tw (future)
psql "postgresql://postgres.piwbooidofbaqklhijup:geonook8588@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres"
```

### Supabase API Settings (IMPORTANT)
- **Max rows**: Must be set to **10000** in Supabase Dashboard → API Settings
- Default 1000 row limit will truncate large queries (scores, exams, students)
- Use `.range()` pagination for queries that may exceed max_rows

### Core Directories
```
/app/**                 # Next.js routes
/components/**          # Reusable UI components
/lib/supabase/**        # Supabase clients
/lib/grade/**           # Grade calculation (NEVER convert to letters)
/lib/api/**             # Frontend data layer + permissions.ts
/db/migrations/**       # SQL migrations
```

### One Class, Three Teachers System
每個班級包含三種課程：
- **LT** (Local Teacher) - English Language Arts
- **IT** (International Teacher) - English Language Arts
- **KCFS** (Kang Chiao Future Skill) - 獨立課程

### Grade Calculation (唯一真相)
```typescript
// LT/IT Codes: FA1-8, SA1-4, FINAL, MID（共 14 個代碼）
// 僅計入 >0 分數；全 0 → null
// Semester = (FA_avg × 0.15 + SA_avg × 0.20 + FINAL/MID × 0.10) ÷ 0.45
//
// 兩個計算引擎：
// - lib/grade/calculations.ts：使用 FINAL
// - lib/gradebook/FormulaEngine.ts：使用 MID
//
// KCFS Codes: COMM, COLLAB, SD, CT, BW, PORT, PRES（依年級）
// KCFS 公式：50 + Σ(category_score × weight)
```

### Auth Pattern (MANDATORY)
```typescript
// ✅ 永遠使用 useAuthReady，不用 useAuth
import { useAuthReady } from "@/hooks/useAuthReady";

const { userId, isReady, role } = useAuthReady();

useEffect(() => {
  if (!isReady) return;
  fetchData();
}, [userId]);  // primitive 依賴，穩定
```

### Role Permissions
| Role | Scope |
|------|-------|
| admin | Full access |
| head | Grade + Course Type |
| teacher | Own courses only |
| office_member | Read-only + own courses edit |

---

## Project Structure

```
learning-management-system-esid/
├── app/                    # Next.js App Router
│   ├── (lms)/             # LMS pages (dashboard, browse, class)
│   ├── api/               # API routes
│   └── auth/              # Authentication
├── components/            # UI components
├── lib/
│   ├── supabase/         # Supabase clients + auth-context
│   ├── grade/            # Grade calculations
│   ├── api/              # Data fetching
│   └── actions/          # Server actions
├── db/migrations/         # SQL migrations (007-037)
├── hooks/                 # Custom React hooks
├── types/                 # TypeScript definitions
└── .claude/skills/        # LMS-specific knowledge
```

---

## Common Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm run type-check       # TypeScript check
npm run lint             # ESLint

# Database
npx supabase gen types   # Generate TypeScript types

# Git
git push origin develop  # Push to develop (auto-deploy)
```

---

## Skills & Documentation

### Claude Skills (詳細知識)
| Skill | 內容 |
|-------|------|
| [kcis-school-config](.claude/skills/kcis-school-config.md) | **康橋專屬設定**：術語、角色、課程類型、時間 |
| [lms-architecture](.claude/skills/lms-architecture.md) | 一班三師、課程架構、年段系統 |
| [lms-database](.claude/skills/lms-database.md) | RLS、Migration、Nested Join 模式 |
| [lms-gradebook](.claude/skills/lms-gradebook.md) | 成績計算、Expectations |
| [lms-auth](.claude/skills/lms-auth.md) | SSO、useAuthReady、權限 |
| [lms-troubleshooting](.claude/skills/lms-troubleshooting.md) | 已解決問題、除錯技巧 |
| [lms-features](.claude/skills/lms-features.md) | Browse、Kanban、Communications |
| [lms-teacher-timetable](.claude/skills/lms-teacher-timetable.md) | 課表系統、點名導航、課程類型 |
| [lms-nwea-map](.claude/skills/lms-nwea-map/) | **MAP 系統**：CDF 匯入、成績分析、Benchmarks |
| [lms-map-analytics](.claude/skills/lms-map-analytics/) | **MAP 分析**：UI 組件、官方資料、圖表 |

### Documentation
| 類別 | 位置 |
|------|------|
| SSO 整合 | [docs/sso/](./docs/sso/) |
| Migration 歷史 | [docs/migrations/](./docs/migrations/) |
| CSV 範本 | [templates/import/](./templates/import/) |

---

## Technical Debt Prevention

### WRONG (Creates Debt):
```bash
Write(file_path="new_grade_calc.ts", content="...")
```

### CORRECT (Prevents Debt):
```bash
# 1. SEARCH FIRST
Grep(pattern="grade.*calculation", glob="**/*.ts")
# 2. READ EXISTING
Read(file_path="lib/grade/index.ts")
# 3. EXTEND
Edit(file_path="lib/grade/index.ts", ...)
```

### Before Creating New Files:
1. **Search First** - Grep/Glob for existing implementations
2. **Read Existing** - Understand current patterns
3. **Extend** - Prefer extension over creation
4. **Follow Patterns** - Use established project patterns

---

**Focus on single source of truth and extending existing functionality.**

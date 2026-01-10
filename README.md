# Learning Management System - ESID

> **Version**: 1.68.0
> **Status**: Production Ready (RWD & Sidebar Collapse)
> **Tech Stack**: Next.js 14 + TypeScript + Supabase Cloud + Tailwind CSS
> **Last Updated**: 2026-01-10

A comprehensive **Primary School (G1-G6)** Learning Management System featuring English Language Arts (ELA) and KCFS courses with advanced **Analytics Engine**, **Four-Layer Security Architecture**, and **Info Hub SSO Integration**. Features **One Class, Three Teachers (一班三師)** architecture where each class has dedicated LT, IT, and KCFS instructors, plus **NWEA MAP Growth Assessment** analysis, real-time performance analytics, and **Teacher Schedule System**.

## 🎯 Current Status (Updated 2026-01-10)

### ✅ Completed Features

- **v1.68.0 RWD & Sidebar**: ✅ Full responsive design + collapsible sidebar for all devices
- **Responsive Web Design**: ✅ Phase 2-4 complete - mobile, tablet, desktop support
- **Sidebar Collapse**: ✅ Desktop w-64→w-16, MobileNav Compact Mode, localStorage persistence
- **Design System**: ✅ Grid, Container components, Status Colors (success/warning/info)
- **v1.67.0 Gradebook UX**: ✅ Keyboard navigation, zero score warning, hover menu
- **v1.66.0 Security Architecture**: ✅ Four-layer security (Auth → RLS → Application → Frontend)
- **RLS Simplification**: ✅ Migration 036/037 - simplified from 100+ to ~30 policies
- **Application Permission Layer**: ✅ Unified `lib/api/permissions.ts` with role-based access
- **Browse Gradebook Fix**: ✅ Two-stage batch queries to handle 26,000+ scores
- **v1.65.0 MAP Visualization**: ✅ Expert review, Level Compare View, E2 color unification
- **NWEA MAP Growth Assessment**: ✅ CDF data import, benchmark classification (E1/E2/E3), growth analysis
- **Teacher Schedule System**: ✅ Weekly timetable grid, course navigation, attendance integration
- **Gradebook System**: ✅ LT/IT and KCFS grading formulas, expectations tracking
- **Browse Pages**: ✅ Classes, Students, Teachers, Gradebook, Statistics with real data
- **SSO Integration**: ✅ Full OAuth 2.0 + PKCE flow with Info Hub
- **Real Data Deployment**: ✅ 84 classes, 504 courses (2 academic years), 1514 students
- **Database Migrations**: ✅ 44 migrations deployed (007-044)
- **Analytics Engine**: ✅ 40+ TypeScript interfaces, professional chart components

### ⏳ In Progress

- **Sprint 7**: Student historical grade reports
- **Term 2 Data Import**: CSV-based import workflow

### 📋 Upcoming

- **Attendance Reports**: Analytics and tracking
- **Communications Browse**: Parent communication oversight (UI complete, awaiting data)

## Quick Start

1. **Read CLAUDE.md first** - Contains essential rules for Claude Code
2. Follow the pre-task compliance checklist before starting any work
3. Use proper module structure under appropriate directories
4. Commit after every completed task

## 🔧 Technology Stack

**Frontend**:

- Next.js 14 (App Router)
- TypeScript 5.3
- Tailwind CSS 3.4
- shadcn/ui + Radix UI
- Framer Motion

**Backend**:

- Supabase Cloud (PostgreSQL 15)
- Supabase Auth (Google OAuth)
- Supabase Storage
- Edge Functions

**Authentication**:

- OAuth 2.0 + PKCE (RFC 7636)
- Info Hub SSO integration
- Webhook-based user sync

**Dev Tools**:

- ESLint + Prettier
- Vitest (unit tests)
- Playwright (E2E tests)

**Deployment**:

- Zeabur (frontend)
- Supabase Cloud (backend)

## 🏗️ Project Structure

```
learning-management-system-esid/
├── CLAUDE.md              # Essential rules and guidelines
├── app/                   # Next.js App Router pages
│   ├── auth/              # Authentication pages
│   ├── dashboard/         # Main dashboard
│   ├── admin/             # Admin panels
│   ├── classes/           # Class management
│   ├── scores/            # Grade entry/viewing
│   └── reports/           # Reports and analytics
├── components/            # Reusable UI components
├── lib/
│   ├── supabase/         # Supabase client & helpers
│   ├── grade/            # Grade calculation functions (🧮 CORE)
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

## 🧮 Grade Calculation System

The system uses a strict numerical scoring approach with these rules:

### Assessment Codes (Single Source of Truth)

- **Formative**: FA1, FA2, FA3, FA4, FA5, FA6, FA7, FA8
- **Summative**: SA1, SA2, SA3, SA4
- **Final**: FINAL

### Calculation Rules

- **Only count scores > 0** (null and 0 are excluded from averages)
- **Formative Average** = Average of all FA scores > 0
- **Summative Average** = Average of all SA scores > 0
- **Semester Grade** = (Formative × 0.15 + Summative × 0.2 + Final × 0.1) ÷ 0.45
- **Rounding**: All final grades rounded to 2 decimal places

### Key Features

- ✅ **No letter grades or 等第** - Pure numerical system
- ✅ **Frontend-backend consistency** - Same calculation logic everywhere
- ✅ **Comprehensive testing** - Unit tests for all scenarios
- ✅ **Type safety** - Full TypeScript coverage with Zod validation

## 🎓 ELA Course Architecture

### Unified Course Structure

Every class includes three standardized courses:

- **LT English Language Arts (ELA)** - Local Teacher instruction
- **IT English Language Arts (ELA)** - International Teacher instruction
- **KCFS** - Kang Chiao Future Skill program (independent course)

### Course-Teacher Assignment System

- **One Class, Three Teachers (一班三師)**: Each class has three dedicated course instructors
  - **LT Course**: Local Teacher for ELA
  - **IT Course**: International Teacher for ELA
  - **KCFS Course**: KCFS specialist teacher
- **Database Architecture**: Implemented through `courses` table (class_id + course_type + teacher_id)
- **Track Field Semantics**:
  - `classes.track`: Always NULL (classes don't belong to single track)
  - `users.track`: Stores Head Teacher's course_type responsibility (LT/IT/KCFS)
  - `courses.course_type`: Stores actual course type

## 🔐 Security & Permissions

### Role-Based Access Control (RLS)

- **Admin**: Full system access across all grades and course types
- **Head Teacher (HT)**: Access to specific Grade + Course Type combinations
  - Example: G4 LT Head Teacher manages all G4 LT courses (14 courses)
  - Can view all classes in their grade, but only manage their course_type
- **Teacher** (LT/IT/KCFS): Access only to assigned classes and courses

### Row Level Security

All database operations enforce user permissions automatically through Supabase RLS policies.

## 🎨 Assessment Display Names

Head teachers can customize assessment display names:

- **Priority**: Class-specific > Grade×Track > Default
- **Examples**: "FA1" → "Reading Assessment 1", "SA1" → "Midterm Exam"
- **Note**: Display names only affect UI, never calculations
- **Implementation**: `assessment_titles` table

## 🚀 Development Commands

```bash
# Development
npm run dev              # Start Next.js dev server
npm run build           # Build for production
npm run type-check      # TypeScript type checking
npm run lint            # ESLint

# Testing
npm run test            # Run all tests
npm run test:unit       # Run unit tests only
npm run test:e2e        # Run E2E tests
npm run test:watch      # Watch mode for unit tests

# Database
npm run db:migrate      # Run database migrations
npm run db:seed         # Seed database with test data
npm run db:reset        # Reset local database
npm run gen:types       # Generate TypeScript types from Supabase

# Deployment
npm run deploy          # Deploy to Zeabur
```

## 🧪 Testing Strategy

### Unit Tests (Vitest)

- **Grade calculations** - All scenarios including edge cases with snapshots
- **Analytics functions** - Statistical calculations, risk assessment algorithms
- **Utility functions** - Helper functions and validation
- **Components** - UI component behavior

### E2E Tests (Playwright)

- **Authentication flow** - Login/logout/role-based access
- **Grade entry workflow** - Complete score import to dashboard update
- **Analytics workflow** - Data visualization and real-time updates
- **Multi-role scenarios** - Admin, head teacher, teacher workflows

### Contract Tests

- **API endpoints** - Scores bulk upsert, exams CRUD, analytics queries
- **Database operations** - RLS policy enforcement
- **Assessment overrides** - Display name resolution

## 🧪 Test Environment

### Available Test Accounts 🆕 Updated for Primary School System

> **Important**: All accounts updated to comply with G1-G6 primary school system

#### System Administrator

- `admin@school.edu` - Full system access

#### Head Teachers (Primary Focus: G4, G6)

- `head.g4.lt@school.edu` - Grade 4 LT Head Teacher (manages G4 LT courses)
- `head.g4.it@school.edu` - Grade 4 IT Head Teacher (manages G4 IT courses)
- `head.g6.kcfs@school.edu` - Grade 6 KCFS Head Teacher (manages G6 KCFS courses)
  > **Testing Focus**: Assessment Title management, grade-level statistics, RLS boundary testing, Grade+CourseType permissions

#### Subject Teachers

- `teacher.lt.1@school.edu` - Local Teacher (LT English)
- `teacher.it.1@school.edu` - International Teacher (IT English)
- `teacher.kcfs.1@school.edu` - KCFS Teacher (Future Skills)
  > **Testing Focus**: Grade entry, course permissions, personal analytics

### Test Data Overview 🆕 Optimized for Testing

- **Test Students**: 57 students (verified count for analytics)
- **Test Teachers**: 9 teachers (complete role coverage)
- **Course Structure**: ELA Three-Track System (LT + IT + KCFS)
- **Grade Scope**: G4, G6 (representing mid-high primary grades)
- **Complete Test Scores**: Full FA/SA/FINAL data for calculation verification
- **Analytics Data**: Complete statistical calculation validation

## 📊 Key Features

### 🔐 SSO Integration (Phase 1-4 Complete)

- **OAuth 2.0 + PKCE**: Industry-standard authorization flow with enhanced security
- **Webhook User Sync**: Real-time user data synchronization from Info Hub
- **Session Management**: Secure Supabase session creation and maintenance
- **Multi-role Support**: Admin, Head Teacher, Teacher, Office Member
- **Zero Service Key Sharing**: LMS maintains complete control over credentials
- **CSRF Protection**: State token validation prevents cross-site attacks
- **Type-Safe Implementation**: 40+ TypeScript interfaces, 0 compilation errors

**Files Created**:

- `types/sso.ts` - Complete SSO type definitions
- `lib/config/sso.ts` - Environment configuration helper
- `lib/auth/pkce.ts` - PKCE RFC 7636 implementation
- `lib/auth/sso-state.ts` - State management with CSRF protection
- `app/api/webhook/user-sync/route.ts` - Webhook receiver endpoint
- `app/api/auth/callback/infohub/route.ts` - OAuth callback handler
- `components/auth/SSOLoginButton.tsx` - SSO login button UI

**Security Measures**:

- PKCE (Proof Key for Code Exchange) - prevents code interception
- CSRF State Token - prevents cross-site request forgery
- Webhook Secret - authenticates user sync requests
- Service Role Key Isolation - LMS never shares credentials
- RLS Policy Enforcement - all queries respect permissions

### Primary School Dashboard with Analytics

- **Admin**: System-wide analytics and user management across all grades and course types with advanced statistical insights
- **Head Teachers**: Grade×CourseType-specific insights and course controls (LT/IT/KCFS) with performance tracking
- **Teachers**: Class-specific course management and student progress (assigned courses) with learning analytics
- **Office Members**: Limited view-only access to class rosters and schedules

### 🧠 Analytics System (Phase 3A-1 ✅ Complete)

- **40+ TypeScript Interfaces** - Comprehensive type system for all analytics data structures
- **Statistical Calculations** - Mean, median, standard deviation, trend analysis, risk assessment
- **Performance Metrics** - Student learning trajectories, improvement rates, engagement tracking
- **Real-time Caching** - TTL-based cache system for optimal performance
- **Role-based Filtering** - Analytics queries respect RLS policies automatically
- **Grade Integration** - Seamless integration with existing grade calculation system

### 📊 Database Analytics Views 🆕 (Deployed 2025-08-23)

- **student_grade_aggregates** - Student performance aggregation with risk assessment
- **class_statistics** - Class-level statistical analysis and comparisons
- **teacher_performance** - Teacher effectiveness monitoring and metrics
- **PostgreSQL Optimized** - ::numeric type casting for accurate calculations
- **Performance Verified** - Average query time 146ms (well under 500ms target)
- **Index Optimized** - 8 strategic indexes for maximum query performance

### 🧪 Comprehensive Testing Framework ✅

- **90-Minute Test Workflow** - Complete Phase 1-7 testing process
- **Primary School Compliant** - All test data adjusted to G1-G6 system
- **Role-Complete Testing** - 6 user types with full permission coverage
- **Development Ready** - localhost:3000 + Claude Code CLI setup

### Grade Management

- **Unified CSV import system** with validation and error handling for all three courses (LT/IT ELA + KCFS)
- **Individual score entry** with real-time calculation across LT/IT/KCFS
- **Weighted grade calculations** following primary school standards

### Reporting & Advanced Analytics

- **Performance tracking** by class, grade, and course type across all courses with statistical analysis
- **Course comparison** between LT ELA, IT ELA, and KCFS performance with trend visualization
- **Learning Analytics** - Student risk identification, improvement tracking, consistency analysis
- **Predictive Insights** - Early warning systems and intervention recommendations
- **Export capabilities** for external reporting and parent communication

## 🔄 Development Workflow

1. **Always search first** before creating new files
2. **Extend existing** functionality rather than duplicating
3. **Use Task agents** for operations >30 seconds
4. **Single source of truth** for all functionality
5. **Commit frequently** - after each completed feature
6. **Test comprehensively** - unit, integration, and E2E

## 🗄️ Database Migrations

**Latest Migration**: **037 - Complete RLS Policies for 12 Tables** (2025-12-29) ✅

### Recent Migration History

- **037**: Complete RLS policies for 12 tables ✅
  - Added policies for: academic_periods, attendance, behavior_tags, communications, etc.
  - Simplified RLS architecture (~30 policies total)

- **036**: RLS simplification - removed complex recursive policies ✅
  - Moved permission logic to application layer
  - Eliminated RLS recursion issues

- **033-035**: Attendance system and behavior tags ✅
- **030-032**: MAP assessment integration ✅
- **027-029**: Gradebook expectations system ✅
- **022-026**: Assessment codes and titles ✅
- **007-021**: Core architecture and initial RLS policies ✅

### Four-Layer Security Architecture (2025-12-29)

```
Layer 1: Authentication (Supabase Auth)
Layer 2: Row-Level Security (Simple policies)
Layer 3: Application Permission Layer (lib/api/permissions.ts)
Layer 4: Frontend Guards (AuthGuard, role checks)
```

### Database Design

- **15+ Core Tables**: users, classes, courses, students, exams, scores, attendance, communications, etc.
- **~30 RLS Policies**: Simplified, non-recursive policies
- **Application Permissions**: `requireAuth()`, `requireRole()`, `filterByRole()`

See [CLAUDE.md](CLAUDE.md) for complete migration documentation.

## 📝 Environment Setup

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

### Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Info Hub SSO (awaiting production secrets)
NEXT_PUBLIC_INFOHUB_CLIENT_ID=lms-esid-client-id
NEXT_PUBLIC_INFOHUB_AUTH_URL=https://infohub.com/api/oauth/authorize
NEXT_PUBLIC_INFOHUB_TOKEN_URL=https://infohub.com/api/oauth/token
NEXT_PUBLIC_INFOHUB_REDIRECT_URI=https://lms-esid.zeabur.app/api/auth/callback/infohub
INFOHUB_WEBHOOK_SECRET=shared-webhook-secret

# App Config
NEXT_PUBLIC_APP_URL=https://lms-esid.zeabur.app
NODE_ENV=production
```

### Installation Steps

1. **Clone the repository**

   ```bash
   git clone [repository-url]
   cd learning-management-system-esid
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Set up environment variables**

   ```bash
   cp .env.example .env.local
   # Edit .env.local with your credentials
   ```

4. **Initialize database**

   ```bash
   npm run db:migrate
   npm run db:seed
   ```

5. **Start development server**
   ```bash
   npm run dev
   ```

## 🚨 Important Notes

- **Primary School Focus** - System designed specifically for G1-G6 primary school structure
- **One Class, Three Teachers** - All classes must have LT, IT, and KCFS courses (252 courses for 84 classes)
- **Track Field Semantics** - `classes.track` = NULL, `users.track` = HT responsibility, `courses.course_type` = actual type
- **Level Format** - Use G[1-6]E[1-3] format (e.g., G4E2), not just E1-E3
- **Follow CLAUDE.md rules** - All development must adhere to the guidelines
- **RLS enforcement** - All database queries automatically respect user permissions
- **Grade calculation integrity** - Only use `/lib/grade` functions for calculations
- **Type safety** - Maintain strict TypeScript compliance
- **Testing requirements** - All new features require corresponding tests

## 📚 Documentation

### SSO Integration Guides

Comprehensive SSO documentation available in `docs/sso/`:

- [SSO Integration Overview](docs/sso/SSO_INTEGRATION_OVERVIEW.md) - Architecture & decisions
- [SSO Implementation Plan - LMS](docs/sso/SSO_IMPLEMENTATION_PLAN_LMS.md) - Detailed tasks & checklist
- [SSO Security Analysis](docs/sso/SSO_SECURITY_ANALYSIS.md) - Security review & threat model
- [SSO API Reference](docs/sso/SSO_API_REFERENCE.md) - API specifications & contracts
- [SSO Testing Guide](docs/sso/SSO_TESTING_GUIDE.md) - Test strategy & scenarios
- [SSO Deployment Guide](docs/sso/SSO_DEPLOYMENT_GUIDE.md) - Deployment steps & rollback

### Project Guides

- [CLAUDE.md](CLAUDE.md) - Complete project documentation for AI assistants
- [Troubleshooting Guide](docs/troubleshooting/TROUBLESHOOTING_CLAUDE_CODE.md) - Environment variable caching fixes
- [Migration Guide](docs/testing/MIGRATION_014_VIEW_DEPENDENCY_FIX.md) - Database migration dependency handling
- [CSV Import Templates](templates/import/README.md) - Bulk data import documentation

### External Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.io/docs)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [OAuth 2.0 RFC 6749](https://datatracker.ietf.org/doc/html/rfc6749)
- [PKCE RFC 7636](https://datatracker.ietf.org/doc/html/rfc7636)

## 🔐 Security

- **RLS Policies**: 49 policies across 9 tables with InitPlan optimization
- **PKCE OAuth**: RFC 7636 implementation for authorization code flow
- **Webhook Signature**: HMAC-SHA256 verification for user sync
- **CSRF Protection**: State token validation prevents cross-site attacks
- **Service Role Isolation**: No credential sharing between systems
- **Type Safety**: Full TypeScript coverage with runtime Zod validation

## 📈 Performance

- **Database Queries**: <500ms average (optimized with strategic indexes)
- **SSO Login**: <5s end-to-end (target for Phase 5-7)
- **Page Load**: <2s (LCP)
- **RLS Overhead**: Minimal with InitPlan caching (0 performance warnings)
- **Analytics Views**: 146ms average query time

## 🤝 Contributing

This is a private project. For internal contributions, please follow the coding standards in [CLAUDE.md](CLAUDE.md).

### Key Contribution Guidelines

1. Read CLAUDE.md before starting any task
2. Follow pre-task compliance checklist
3. Commit after every completed task
4. Maintain single source of truth (no duplicate implementations)
5. All database operations must respect RLS policies
6. Grade calculations must use `/lib/grade` functions only

## 📝 License

Proprietary - All Rights Reserved

---

**🎯 Primary School ELA LMS | 康橋小學英語學習管理系統 | v1.68.0**

**Maintained By**: ESID Development Team
**Last Updated**: 2026-01-10

🏫 **Core Features**: G1-G6 支援 | 一班三師架構 | Grade×CourseType 權限 | CSV 批量匯入 | 📊 Analytics 引擎 | 🧠 MAP 成長分析 | 🔐 Info Hub SSO 整合 | 🛡️ 四層安全架構 | 📱 RWD 響應式設計

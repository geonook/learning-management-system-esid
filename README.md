# Learning Management System - ESID

A comprehensive **Primary School (G1-G6)** Learning Management System featuring English Language Arts (ELA) and KCFS courses with advanced **Analytics Engine** and **Database Analytics Views**. Features **One Class, Three Teachers (一班三師)** architecture where each class has dedicated LT, IT, and KCFS instructors, plus real-time performance analytics, intelligent insights, and comprehensive testing framework. Built with Next.js, TypeScript, Tailwind CSS, and Supabase Cloud.

## 🎯 Current Status (Updated 2025-10-17)
- **Database Migrations**: ✅ Migrations 007-011 完全部署
- **Real Data Deployment**: ✅ 84 classes + 252 courses (2025-2026 學年度)
- **Supabase Cloud**: ✅ Official cloud migration complete
- **Analytics Engine**: ✅ Complete with 40+ TypeScript interfaces
- **Database Views**: ✅ 3 professional analytics views deployed
- **Performance**: ✅ Average query time 146ms (target <500ms)
- **Testing Framework**: ✅ 90-minute comprehensive testing workflow
- **Known Issues**: ⚠️ Claude Code env cache (See [TROUBLESHOOTING](CLAUDE.md#⚠️-已知問題與解決方案-2025-10-16))
- **Ready for**: 👥 Teacher Assignment + Student Import

## Quick Start

1. **Read CLAUDE.md first** - Contains essential rules for Claude Code
2. Follow the pre-task compliance checklist before starting any work
3. Use proper module structure under appropriate directories
4. Commit after every completed task

## 🔧 Technology Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **UI Components**: shadcn/ui + Radix UI + Framer Motion
- **Backend**: Supabase Cloud (Official) - PostgreSQL, Auth, Storage, Edge Functions
- **Charts**: Recharts
- **Testing**: Vitest (unit) + Playwright (E2E)
- **Deployment**: Zeabur (frontend) + Supabase Cloud (backend)

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

### Primary School Dashboard with Analytics
- **Admin**: System-wide analytics and user management across all grades and course types with advanced statistical insights
- **Head Teachers**: Grade×CourseType-specific insights and course controls (LT/IT/KCFS) with performance tracking
- **Teachers**: Class-specific course management and student progress (assigned courses) with learning analytics

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

## 📝 Environment Setup

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
   # Edit .env.local with your Supabase credentials
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

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [Supabase Documentation](https://supabase.io/docs)
- [shadcn/ui Components](https://ui.shadcn.com)
- [Tailwind CSS](https://tailwindcss.com/docs)

---

**🎯 Primary School ELA LMS |康橋小學英語學習管理系統 | v1.2.0**
🏫 Features: G1-G6 支援 | 一班三師架構 | Grade×CourseType 權限 | CSV批量匯入 | 📊 Analytics引擎 | 🧠 智能分析
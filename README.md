# Learning Management System - ESID

A comprehensive English subject gradebook and academic management system for multi-role users (Admin, Head Teachers, Local Teachers, International Teachers, KCFS Teachers). Built with Next.js, TypeScript, Tailwind CSS, and Supabase.

## Quick Start

1. **Read CLAUDE.md first** - Contains essential rules for Claude Code
2. Follow the pre-task compliance checklist before starting any work
3. Use proper module structure under appropriate directories
4. Commit after every completed task

## 🔧 Technology Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **UI Components**: shadcn/ui + Radix UI + Framer Motion
- **Backend**: Supabase (PostgreSQL, Auth, Storage, Edge Functions)
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

## 🔐 Security & Permissions

### Role-Based Access Control (RLS)
- **Admin**: Full system access
- **Head Teacher**: Access to specific grade × track combinations
- **Teacher** (LT/IT/KCFS): Access only to assigned classes

### Row Level Security
All database operations enforce user permissions automatically through Supabase RLS policies.

## 🎨 Assessment Display Names

Head teachers can customize assessment display names:
- **Priority**: Class-specific > Grade×Track > Default
- **Examples**: "FA1" → "Reading Assessment 1", "SA1" → "Midterm Exam"
- **Note**: Display names only affect UI, never calculations

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
- **Grade calculations** - All scenarios including edge cases
- **Utility functions** - Helper functions and validation
- **Components** - UI component behavior

### E2E Tests (Playwright)
- **Authentication flow** - Login/logout/role-based access
- **Grade entry workflow** - Complete score import to dashboard update
- **Multi-role scenarios** - Admin, head teacher, teacher workflows

### Contract Tests
- **API endpoints** - Scores bulk upsert, exams CRUD
- **Database operations** - RLS policy enforcement
- **Assessment overrides** - Display name resolution

## 📊 Key Features

### Multi-Role Dashboard
- **Admin**: System-wide analytics and user management
- **Head Teachers**: Grade/track-specific insights and controls
- **Teachers**: Class-specific grade entry and student progress

### Grade Management
- **Bulk CSV import** with validation and error handling
- **Individual score entry** with real-time calculation
- **Weighted grade calculations** following school standards

### Reporting & Analytics
- **Performance tracking** by class, grade, and track
- **Attendance integration** with academic performance
- **Export capabilities** for external reporting

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

**🎯 Template by Chang Ho Chien | HC AI 說人話channel | v1.0.0**  
📺 Tutorial: https://youtu.be/8Q1bRZaHH24
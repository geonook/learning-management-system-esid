# LMS TODO List

> **Last Updated**: 2025-12-02
> **Current Phase**: Phase 4.2 - Browse Pages Data Integration

## Priority Legend
- 🔴 Critical - Blocking other work
- 🟠 High - Should be done this week
- 🟡 Medium - Should be done this month
- 🟢 Low - Nice to have

---

## Immediate Tasks (This Week)

### 🔴 Browse Pages Data Integration (Phase 4.2)
- [ ] **Browse Classes Page** - Replace static placeholder with real data
  - File: `app/(lms)/browse/classes/page.tsx`
  - Fetch from Supabase: `classes` table (84 records)
  - Display: class name, grade, level, student count, assigned teachers

- [ ] **Browse Students Page** - Replace static placeholder with real data
  - File: `app/(lms)/browse/students/page.tsx`
  - Fetch from Supabase: `students` table (1,511 records)
  - Implement: pagination, search, grade/level filters

- [ ] **Browse Teachers Page** - Implement teacher listing
  - File: `app/(lms)/browse/teachers/page.tsx` (if exists)
  - Fetch from Supabase: `users` table (role = 'teacher')
  - Display: name, email, teacher_type, assigned courses

### 🟠 Teacher Course Assignment (Phase 4.3)
- [ ] **Process course_assignments.csv**
  - Match teachers to courses by email and course_type
  - Script needed: `scripts/assign-teachers.ts`

- [ ] **Update courses table**
  - Set `teacher_id` for each of the 252 courses
  - Verify: each course has correct teacher assigned

- [ ] **Test Teacher SSO Login**
  - Verify teachers can login via Info Hub SSO
  - Verify RLS: teachers only see their own courses/classes

---

## Short-term Tasks (This Month)

### 🟡 Dashboard Enhancements
- [ ] Connect admin KPI cards to real data (currently showing 0s for some metrics)
- [ ] Add course assignment progress indicator
- [ ] Show recent activity feed

### 🟡 Gradebook Functionality
- [ ] Verify gradebook works with real student data
- [ ] Test score entry for assigned courses
- [ ] Validate grade calculation formulas

### 🟡 Search & Filter
- [ ] Implement actual search functionality in Browse pages
- [ ] Add filter by grade, level, class
- [ ] Add export to CSV feature

---

## Backlog (Future)

### 🟢 Academic Year Management (Phase 5)
- [ ] One-click year rollover feature
- [ ] Class structure copy
- [ ] Bulk teacher assignment UI
- [ ] Academic year selector

### 🟢 Communication Logs
- [ ] Parent communication tracking
- [ ] Phone call records

### 🟢 Advanced Analytics
- [ ] Student performance trends
- [ ] Class comparison reports
- [ ] Teacher workload analysis

### 🟢 Attendance System
- [ ] Daily attendance tracking
- [ ] Attendance reports

---

## Recently Completed

| Task | Completed Date |
|------|----------------|
| E2E SSO Integration Testing on Staging | 2025-12-02 |
| SSO User ID Mismatch Fix (Auth ID vs public.users ID) | 2025-12-02 |
| Production & Staging Data Seeding | 2025-12-02 |
| Migration 022: Assessment Codes | 2025-12-02 |
| Info Hub Teacher Import (72 teachers) | 2025-12-02 |
| v1.41.0 TeacherOS UI Refinements | 2025-12-01 |
| Dockerfile Optimization | 2025-11-28 |
| Phase 4.1: One OS Interface | 2025-11-28 |
| SSO Implementation Complete | 2025-11-19 |

---

## Known Issues

### ⚠️ Browse Pages Show Placeholder Data
- **Issue**: Classes/Students/Teachers pages display hardcoded placeholder data
- **Root Cause**: Pages were built as UI mockups without data fetching
- **Impact**: Users see fake data instead of real database records
- **Status**: Phase 4.2 will address this

### ⚠️ All Courses Have No Teacher Assigned
- **Issue**: `teacher_id = NULL` for all 252 courses
- **Root Cause**: Teachers not yet imported/assigned to LMS
- **Impact**: Teachers cannot see their courses after SSO login
- **Status**: Phase 4.3 will address this

---

## Environment Status

| Environment | URL | Status |
|-------------|-----|--------|
| Production | https://lms-esid.zeabur.app | 🟢 Running |
| Staging | https://lms-staging.zeabur.app | 🟢 Running |
| Local Dev | http://localhost:3000 | 🟢 Available |

### Database Status (2025-12-02)

| Table | Production | Staging |
|-------|------------|---------|
| classes | 84 | 84 |
| courses | 252 | 252 |
| students | 1,511 | 1,511 |
| users | 4 | 4 |
| assessment_codes | 13 | 13 |

# LMS TODO List

> **Last Updated**: 2025-12-24
> **Current Phase**: Sprint 7 - Student Historical Reports
> **Version**: v1.64.0

## Priority Legend
- 🔴 Critical - Blocking other work
- 🟠 High - Should be done this week
- 🟡 Medium - Should be done this month
- 🟢 Low - Nice to have

---

## ✅ Completed (v1.41.0 - v1.64.0)

- [x] Browse Classes Page - Real data integration
- [x] Browse Students Page - With pagination and filters
- [x] Browse Teachers Page - Teacher listing with assignments
- [x] Gradebook System - LT/IT and KCFS formulas
- [x] NWEA MAP Growth Assessment - CDF import, analytics, benchmark classification
- [x] Teacher Schedule System - Weekly timetable, course navigation
- [x] MAP Statistics Page - Chart redesign, hybrid view mode

---

## Immediate Tasks (This Week)

### 🟠 Sprint 7: Student Historical Reports
- [ ] **Historical Grade View** - Show student grades across terms
  - File: `app/(lms)/student/[id]/grades/page.tsx`
  - Display term-by-term grade progression

- [ ] **Term 2 Data Import**
  - Prepare CSV import workflow for new term data
  - Scripts: `scripts/import-gradebook.ts`

---

## Short-term Tasks (This Month)

### 🟡 Attendance Analytics
- [ ] Attendance reports by class/student
- [ ] Trend analysis and alerts

### 🟡 Enhanced MAP Analysis
- [ ] Individual student growth projections
- [ ] Peer comparison reports

---

## Backlog (Future)

### 🟢 Academic Year Management
- [ ] One-click year rollover feature
- [ ] Class structure copy
- [ ] Bulk teacher assignment UI

### 🟢 Communication Logs
- [ ] Parent communication tracking
- [ ] Phone call records

### 🟢 Advanced Analytics
- [ ] Predictive models
- [ ] Intervention recommendations
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
| Migration 022: Assessment Codes (Production) | 2025-12-08 |
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

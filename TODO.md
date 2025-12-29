# LMS TODO List

> **Last Updated**: 2025-12-29
> **Current Phase**: Sprint 7 - Student Historical Reports
> **Version**: v1.66.0

## Priority Legend
- 🔴 Critical - Blocking other work
- 🟠 High - Should be done this week
- 🟡 Medium - Should be done this month
- 🟢 Low - Nice to have

---

## ✅ Completed (v1.64.0 - v1.66.0)

- [x] Security Architecture Refactor - Four-layer security model
- [x] RLS Simplification - Migration 036/037
- [x] Application Permission Layer - `lib/api/permissions.ts`
- [x] Browse Gradebook Fix - Two-stage batch queries for 26,000+ scores
- [x] Admin Sidebar Fix - Added 3 missing admin pages
- [x] MAP Visualization Expert Review
- [x] Level Compare View - Fall vs Spring by Level
- [x] E2 Color Unification - orange-500 (#f97316)

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
- Backend tables exist: `attendance`, `behavior_tags`, `student_behaviors`

### 🟡 Communications Input
- [ ] Teacher communication input from class pages
- Browse page UI complete (`/browse/comms`)
- API ready (`lib/api/communications.ts`)

---

## Backlog (Future)

### 🟢 Academic Year Management
- [ ] Year rollover workflow
- [ ] Academic year selector improvements

### 🟢 Advanced Analytics
- [ ] Predictive models
- [ ] Intervention recommendations
- [ ] Teacher workload analysis

### 🟢 Parent Portal
- [ ] Parent access to student grades
- [ ] Progress reports

---

## Recently Completed

| Task | Completed Date | Version |
|------|----------------|---------|
| Security Architecture Refactor | 2025-12-29 | v1.66.0 |
| RLS Simplification (Migration 036-037) | 2025-12-29 | v1.66.0 |
| Application Permission Layer | 2025-12-29 | v1.66.0 |
| Browse Gradebook Progress Fix | 2025-12-29 | v1.66.0 |
| Admin Sidebar Fix | 2025-12-29 | v1.66.0 |
| MAP Visualization Expert Review | 2025-12-24 | v1.65.0 |
| MAP Statistics Redesign | 2025-12-24 | v1.64.0 |

---

## Environment Status

| Environment | URL | Status |
|-------------|-----|--------|
| Production | lms-staging.zeabur.app | 🟢 Running |
| Local Dev | http://localhost:3000 | 🟢 Available |

### Database Status (2025-12-29)

| Table | Count |
|-------|-------|
| classes | 84 (2 years) |
| courses | 504 (2 years) |
| students | 1,514 |
| users | 73 |
| scores | 26,170+ (Term 1) |
| exams | 5,000+ |

---

## Known Issues

_No critical issues at this time._

### ✅ Resolved Issues
- ~~Browse Gradebook showing 0% for some courses~~ - Fixed with batch queries
- ~~RLS recursion errors~~ - Fixed with Migration 036-037
- ~~Admin sidebar missing pages~~ - Fixed in v1.66.0

# LMS Roadmap

> **Last Updated**: 2025-12-29
> **Current Version**: v1.66.0

## Active Development

### Sprint 7: Student Historical Reports
**Priority**: High
**Status**: Planning
**Target**: Q1 2026

#### Tasks
| Task | Status | Description |
|------|--------|-------------|
| Historical Grade View | 🔄 Pending | Show student grades across terms |
| Term 2 Data Import | 🔄 Pending | CSV import workflow for new term data |
| Student Progress Charts | 🔄 Pending | Visualization of grade trends |

---

## Planned Features

### Phase 5: Academic Year Management (學年管理系統)

**Priority**: Medium
**Status**: Planning

#### Background

Database architecture supports multi-year data (`courses.academic_year`, `classes.academic_year`), with 2 academic years (2025-2026, 2026-2027) already in production.

#### Planned Features

| Feature | Description |
|---------|-------------|
| **Academic Year Selector** | Frontend UI to switch between academic years (partially implemented) |
| **Year Rollover Workflow** | Streamlined process for new academic year setup |
| **Historical Data Access** | Define access permissions for past year data |

---

### Attendance Analytics

**Priority**: Medium
**Status**: Backend Ready

- Database tables exist: `attendance`, `behavior_tags`, `student_behaviors`
- UI components partially implemented
- Pending: Reports and trend analysis

---

### Communications System

**Priority**: Low
**Status**: UI Complete

- Browse Communications page (`/browse/comms`) - UI ready
- API functions implemented (`lib/api/communications.ts`)
- Database table exists but no records yet
- Pending: Teacher input workflow from class pages

---

## Backlog

_Items to be prioritized_

- Advanced Analytics (進階分析) - Predictive models, intervention recommendations
- Parent Portal - Parent access to student grades
- Mobile Optimization - Responsive design improvements

---

## Completed

_Archive of completed features_

| Feature | Completed Date | Version |
|---------|----------------|---------|
| Security Architecture Refactor (四層安全架構) | 2025-12-29 | v1.66.0 |
| RLS Simplification (Migration 036-037) | 2025-12-29 | v1.66.0 |
| Application Permission Layer | 2025-12-29 | v1.66.0 |
| Browse Gradebook Progress Fix (batch queries) | 2025-12-29 | v1.66.0 |
| Admin Sidebar Fix (3 missing pages) | 2025-12-29 | v1.66.0 |
| MAP Visualization Expert Review | 2025-12-24 | v1.65.0 |
| Level Compare View | 2025-12-24 | v1.65.0 |
| E2 Color Unification | 2025-12-24 | v1.65.0 |
| MAP Statistics Redesign | 2025-12-24 | v1.64.0 |
| NWEA MAP Growth Assessment | 2025-12-20 | v1.63.0 |
| Teacher Schedule System | 2025-12-15 | v1.60.0 |
| Gradebook Expectations System | 2025-12-10 | v1.55.0 |
| Browse Pages Data Integration | 2025-12-03 | v1.50.0 |
| E2E SSO Integration Testing | 2025-12-02 | v1.45.0 |
| Production Data Seeding (84 classes, 504 courses, 1514 students) | 2025-12-02 | v1.42.0 |
| TeacherOS UI Refinements | 2025-12-01 | v1.41.0 |
| Dockerfile Optimization | 2025-11-28 | v1.40.0 |
| Phase 4.1: One OS Interface | 2025-11-28 | v1.40.0 |
| SSO Implementation (LMS + Info Hub) | 2025-11-19 | v1.30.0 |
| Phase 3A-1: Analytics Engine | 2025-08-23 | v1.20.0 |

---

## Technical Debt

| Item | Priority | Notes |
|------|----------|-------|
| Supabase max_rows (10,000) | ✅ Resolved | Fixed with batch queries in browse-gradebook.ts |
| RLS Recursion Issues | ✅ Resolved | Migration 036-037, moved to application layer |
| Browse Pages Placeholder Data | ✅ Resolved | All browse pages now use real data |

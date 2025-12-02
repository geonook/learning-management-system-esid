# LMS Roadmap

> **Last Updated**: 2025-12-02

## Active Development

### Phase 4.2: Browse Pages Data Integration
**Priority**: High
**Status**: In Progress
**Target**: 2025-12-09

#### Background
Browse Classes, Students, and Teachers pages currently display static placeholder data instead of fetching real data from the database. With Staging data confirmed (84 classes, 1,511 students, 252 courses), these pages need to be connected to actual data.

#### Tasks
| Task | Status | Description |
|------|--------|-------------|
| Browse Classes Data Fetching | 🔄 Pending | Replace placeholder with real class data from Supabase |
| Browse Students Data Fetching | 🔄 Pending | Replace placeholder with real student data, add pagination |
| Browse Teachers Data Fetching | 🔄 Pending | Fetch teacher data, show assigned courses |
| Search & Filter Implementation | 🔄 Pending | Implement actual search and filter functionality |
| Pagination | 🔄 Pending | Handle large datasets (1,500+ students) |

### Phase 4.3: Teacher Course Assignment
**Priority**: High
**Status**: Pending
**Target**: 2025-12-15

#### Background
72 teachers have been imported to Info Hub and are ready for SSO sync. Courses exist (252) but all have `teacher_id = NULL`. Need to assign teachers to their courses.

#### Tasks
| Task | Status | Description |
|------|--------|-------------|
| Process course_assignments.csv | 🔄 Pending | Match teachers to courses by email and course_type |
| Update courses table | 🔄 Pending | Set teacher_id for each course |
| Test teacher SSO login | 🔄 Pending | Verify teachers can login and see only their classes |
| Validate RLS permissions | 🔄 Pending | Ensure teachers only access their own courses |

---

## Planned Features

### Phase 5: Academic Year Management (學年管理系統)

**Priority**: Medium
**Status**: Planning
**Discussion Date**: 2025-12-01

#### Background

Database architecture supports multi-year data (`courses.academic_year`), but lacks convenient year rollover workflow. Each school year requires manual:
- Creating new classes
- Creating 3 courses per class (LT/IT/KCFS)
- Re-assigning teachers

#### Planned Features

| Feature | Description |
|---------|-------------|
| **One-click Year Rollover** | Admin initiates new academic year, auto-creates classes and courses |
| **Class Structure Copy** | Copy previous year's class structure to new year |
| **Bulk Teacher Assignment UI** | Interface for Admin/Head to quickly assign teachers |
| **Academic Year Selector** | Frontend UI to switch between academic years |
| **Historical Data Access** | Define access permissions and UI for past year data |

#### Suggested Workflow

```
1. Admin clicks "Create New Academic Year"
2. System copies class structure (or allows adjustments)
3. Auto-create 3 courses per class (LT/IT/KCFS) with teacher_id = NULL
4. Admin/Head assigns teachers via bulk UI
5. Previous year courses set to is_active = false
```

#### Database Considerations

**Already Supported**:
- `courses.academic_year` - TEXT field
- `courses.is_active` - Can deactivate old year courses
- `UNIQUE(class_id, course_type, academic_year)` - Ensures data isolation per year

**May Need**:
- `classes.academic_year` field (currently classes have no year distinction)
- `academic_years` settings table (store year list and current year)

---

## Backlog

_Items to be prioritized_

- Communication Logs (電訪紀錄) - See [LMS_TEACHEROS_PLAN.md](docs/planning/LMS_TEACHEROS_PLAN.md)
- Advanced Analytics (進階分析)
- Attendance System (點名系統)

---

## Completed

_Archive of completed features_

| Feature | Completed Date |
|---------|----------------|
| E2E SSO Integration Testing | 2025-12-02 |
| SSO User ID Mismatch Fix | 2025-12-02 |
| Production & Staging Data Seeding (84 classes, 1,511 students, 252 courses) | 2025-12-02 |
| Migration 022: Assessment Codes | 2025-12-02 |
| Info Hub Teacher Import (72 teachers) | 2025-12-02 |
| v1.41.0 TeacherOS UI Refinements | 2025-12-01 |
| Dockerfile Optimization | 2025-11-28 |
| Phase 4.1: One OS Interface | 2025-11-28 |
| SSO Implementation (LMS + Info Hub) | 2025-11-19 |
| Phase 3A-1: Analytics Engine | 2025-08-23 |

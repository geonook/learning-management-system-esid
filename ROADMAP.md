# LMS Roadmap

> **Last Updated**: 2025-12-03

## Active Development

### Phase 4.3: Teacher Course Assignment
**Priority**: High
**Status**: In Progress
**Target**: 2025-12-09

#### Background
72 teachers have been imported to Info Hub and are ready for SSO sync. Courses exist (252) but all have `teacher_id = NULL`. Need to assign teachers to their courses.

**Important**: Teachers must SSO login first to create their `auth.users` record before course assignment. LMS uses `users.id` foreign key to `auth.users.id`.

#### Tasks
| Task | Status | Description |
|------|--------|-------------|
| Create assignment scripts | ✅ Complete | `scripts/import-teachers.ts` and `scripts/assign-teachers-to-courses.ts` |
| Teachers SSO login | 🔄 Pending | Teachers must login via SSO to sync from Info Hub |
| Run course assignments | 🔄 Pending | Execute assignment script after teachers exist in LMS |
| Validate RLS permissions | 🔄 Pending | Ensure teachers only access their own courses |

#### Workflow
```
1. Teachers login via Info Hub SSO
2. Webhook syncs user to LMS public.users table
3. Run: npx tsx scripts/assign-teachers-to-courses.ts
4. Verify teacher can see only their assigned classes
```

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
| Phase 4.2: Browse Pages Data Integration | 2025-12-03 |
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

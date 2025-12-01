# LMS Roadmap

> **Last Updated**: 2025-12-01

## Active Development

_Currently no active items_

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
| Phase 4.1: One OS Interface | 2025-11-28 |
| SSO Integration | 2025-11-19 |
| Phase 3A-1: Analytics Engine | 2025-08-23 |

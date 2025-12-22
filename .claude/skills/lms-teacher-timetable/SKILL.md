---
name: lms-teacher-timetable
description: KCIS Linkou Campus elementary teacher timetable system. Use this skill when implementing teacher schedule features, querying schedules by teacher, displaying weekly timetables, or handling multi-type courses (English/HomeRoom/EV). Covers 73 teachers, 42 classes (G1-G6), and 8 daily periods.
---

# KCIS Teacher Timetable System

## Quick Reference

| Item | Value |
|------|-------|
| **Teachers** | 73 |
| **Classes** | 42 (G1-G6, 7 per grade) |
| **Daily Periods** | 8 |
| **School Days** | Monday - Friday |

## Teacher Identification

**Primary Key**: `email` (unique, for login/auth)

**Timetable Join Key**: `teacher_name` (links to timetable records)

```
Teacher lookup flow:
1. Get teacher by email → retrieve teacher_name
2. Query timetable_entries by teacher_name → get schedule
```

## Course Types

| Type | Description | Example |
|------|-------------|---------|
| `english` | English class courses | G1 Visionaries |
| `homeroom` | Homeroom courses (國語/數學/生活/社會) | 101 |
| `ev` | EV special courses | G1I, G2B |

## Period Schedule

| Period | Time |
|--------|------|
| 1 | 08:25-09:05 |
| 2 | 09:10-09:50 |
| 3 | 10:20-11:00 |
| 4 | 11:05-11:45 |
| 5 | 12:55-13:35 |
| 6 | 13:40-14:20 |
| 7 | 14:25-15:05 |
| 8 | 15:10-15:50 |

## Database Schema

### timetable_periods
```sql
CREATE TABLE timetable_periods (
  id UUID PRIMARY KEY,
  period_number INTEGER NOT NULL UNIQUE,  -- 1-8
  start_time TIME NOT NULL,
  end_time TIME NOT NULL
);
```

### timetable_entries
```sql
CREATE TABLE timetable_entries (
  id UUID PRIMARY KEY,
  teacher_id UUID REFERENCES users(id),
  teacher_name TEXT NOT NULL,            -- Join key: "張家芸 Kenny"
  day TEXT NOT NULL,                     -- 'Monday' - 'Friday'
  period INTEGER NOT NULL,               -- 1-8
  class_name TEXT NOT NULL,              -- 'G1 Visionaries' or '101'
  course_type TEXT NOT NULL,             -- 'english', 'homeroom', 'ev'
  course_name TEXT,                      -- For homeroom: '國語', '數學'
  classroom TEXT,                        -- 'E101' or '一年一班'
  course_id UUID REFERENCES courses(id), -- Link to LMS course
  academic_year TEXT NOT NULL,
  UNIQUE(teacher_name, day, period, academic_year)
);
```

### users.teacher_name
Added column to users table for timetable join:
```sql
ALTER TABLE users ADD COLUMN teacher_name TEXT;
```

## Key Files

| File | Purpose |
|------|---------|
| `lib/api/timetable.ts` | API functions |
| `components/schedule/WeeklyTimetable.tsx` | Week view component |
| `app/(lms)/schedule/page.tsx` | Schedule page |
| `db/migrations/036_create_timetable_system.sql` | Database schema |
| `scripts/import-timetable.ts` | CSV import script |

## Query Examples

See `references/query-examples.md` for common query patterns.

## CSV Import

See `references/csv-format.md` for CSV structure and import specifications.

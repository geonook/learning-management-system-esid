# LMS Teacher Timetable System

> **Version**: 1.0
> **Last Updated**: 2025-12-22

## Overview

Teacher timetable system for KCIS Linkou Campus elementary division. Displays weekly schedule grid with click-to-navigate functionality for attendance taking.

## Database Schema

### timetable_entries
```sql
CREATE TABLE timetable_entries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID REFERENCES users(id),
  teacher_name TEXT NOT NULL,
  teacher_email TEXT NOT NULL,
  day TEXT NOT NULL CHECK (day IN ('Monday','Tuesday','Wednesday','Thursday','Friday')),
  period INTEGER NOT NULL CHECK (period BETWEEN 1 AND 8),
  class_name TEXT NOT NULL,
  course_type TEXT NOT NULL CHECK (course_type IN ('english','ev','kcfs')),
  course_name TEXT,
  classroom TEXT,
  course_id UUID REFERENCES courses(id),
  academic_year TEXT NOT NULL DEFAULT '2025-2026',
  UNIQUE(teacher_name, day, period, academic_year)
);
```

### timetable_periods
```sql
CREATE TABLE timetable_periods (
  period_number INTEGER PRIMARY KEY,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL
);

-- Period times:
-- 1: 08:25-09:05
-- 2: 09:10-09:50
-- 3: 10:20-11:00
-- 4: 11:05-11:45
-- 5: 12:55-13:35
-- 6: 13:40-14:20
-- 7: 14:25-15:05
-- 8: 15:10-15:50
```

## Course Types

| Type | Color | Click Action | Description |
|------|-------|--------------|-------------|
| english | Blue (`bg-blue-500`) | → `/class/{id}/attendance` | English Language Arts (LT/IT) |
| kcfs | Emerald (`bg-emerald-500`) | → `/class/{id}` | Kang Chiao Future Skill |
| ev | Purple (`bg-purple-500`) | → `/class/{id}` | Extended Vocabulary |

## File Structure

```
app/(lms)/schedule/
  page.tsx                    # Main schedule page

components/schedule/
  WeeklyTimetable.tsx         # Week grid view component
  TimetableCell.tsx           # Individual cell with course type styling
  TodaySchedule.tsx           # Today's schedule list view

lib/api/
  timetable.ts                # API functions for timetable queries
```

## Key Functions

### lib/api/timetable.ts

```typescript
// Get schedule by email (primary matching method)
getTeacherScheduleByEmail(email: string, academicYear?: string): Promise<WeeklyTimetable>

// Get schedule by name (fallback)
getTeacherScheduleByName(teacherName: string, academicYear?: string): Promise<WeeklyTimetable>

// Get current user's schedule (auto-detect matching method)
getCurrentUserSchedule(userId: string, academicYear?: string): Promise<{
  weekly: WeeklyTimetable;
  stats: TeacherScheduleStats;
  periods: TimetablePeriod[];
}>

// Get schedule statistics
getTeacherScheduleStatsByEmail(email: string, academicYear?: string): Promise<TeacherScheduleStats>

// Utility functions
getCurrentDayOfWeek(): DayOfWeek | null  // Returns null on weekends
formatPeriodTime(period: TimetablePeriod): string
```

## Click Navigation Logic

```typescript
const handleCellClick = (entry: TimetableEntryWithPeriod) => {
  if (!entry.course_id) return;

  if (entry.course_type === "ev" || entry.course_type === "kcfs") {
    // EV/KCFS: Navigate to course page (no attendance)
    window.location.href = `/class/${entry.course_id}`;
  } else {
    // English: Navigate to attendance page
    window.location.href = `/class/${entry.course_id}/attendance`;
  }
};
```

## Data Statistics (2025-2026)

| Course Type | Entries | With course_id | Match Rate |
|-------------|---------|----------------|------------|
| English | 1,064 | 1,064 | 100% |
| KCFS | 167 | 167 | 100% |
| EV | 56 | 0 | N/A (no attendance) |

## Teacher Matching Priority

1. **Email match** (most reliable): `timetable_entries.teacher_email = users.email`
2. **Name match** (fallback): `timetable_entries.teacher_name = users.teacher_name`
3. **ID match** (last resort): `timetable_entries.teacher_id = users.id`

## UI Components

### WeeklyTimetable
- 5-column grid (Mon-Fri) + period column
- Current day highlighted with primary color
- Current period indicator with left border accent

### TimetableCell
- Color-coded by course type
- Shows class name and classroom
- Hover effects and click interaction

### TodaySchedule
- Vertical list view for mobile
- Current class indicator with "Now" badge
- Past classes dimmed

## KCFS Teachers (9 total)

| Teacher | Email | Classes |
|---------|-------|---------|
| Adriaan Louw | adriaanlouw@ | G2, G5, G6 |
| Ava Joy Melocotones | avajoymelocotones@ | G1, G2, G3 |
| Carole Godfrey | carolegodfrey@ | G1, G2, G5 |
| Caseylyn Javier | caseylynjavier@ | G3-G5 |
| Elliot Turner | elliotturner@ | G3, G6 |
| Harry Keys | harrykeys@ | G5, G6 |
| John Adams Villamoran | johnadamsvillamoran@ | G2, G4 |
| Marisa Chapman | marisachapman@ | G2-G4 |

## Troubleshooting

### Schedule not showing
1. Check `users.email` matches `timetable_entries.teacher_email`
2. Verify `academic_year` is correct (default: 2025-2026)
3. Check RLS policies allow access

### Click not navigating
1. Verify `course_id` is populated in `timetable_entries`
2. Check course exists in `courses` table
3. Confirm `course_type` is set correctly

### Wrong teacher showing
1. Check unique constraint: `(teacher_name, day, period, academic_year)`
2. Verify no duplicate entries for same time slot
3. Ensure `teacher_email` matches exactly (lowercase)

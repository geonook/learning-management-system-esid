# Query Examples

## Get Teacher Schedule by Email

```sql
-- Get full weekly schedule for a teacher
SELECT
  te.day,
  te.period,
  tp.start_time,
  tp.end_time,
  te.class_name,
  te.course_type,
  te.course_name,
  te.classroom
FROM timetable_entries te
JOIN timetable_periods tp ON tp.period_number = te.period
JOIN users u ON u.teacher_name = te.teacher_name
WHERE u.email = 'kennyjhang@kcislk.ntpc.edu.tw'
  AND te.academic_year = '2024-2025'
ORDER BY
  CASE te.day
    WHEN 'Monday' THEN 1
    WHEN 'Tuesday' THEN 2
    WHEN 'Wednesday' THEN 3
    WHEN 'Thursday' THEN 4
    WHEN 'Friday' THEN 5
  END,
  te.period;
```

## Get Today's Classes

```sql
-- Get teacher's classes for a specific day
SELECT
  te.period,
  tp.start_time,
  tp.end_time,
  te.class_name,
  te.course_type,
  te.classroom,
  te.course_id
FROM timetable_entries te
JOIN timetable_periods tp ON tp.period_number = te.period
WHERE te.teacher_id = $teacher_id
  AND te.day = $day_name  -- 'Monday', 'Tuesday', etc.
  AND te.academic_year = '2024-2025'
ORDER BY te.period;
```

## Get Teacher Statistics

```sql
SELECT
  COUNT(DISTINCT te.class_name) as unique_classes,
  COUNT(*) as total_periods,
  SUM(CASE WHEN te.course_type = 'english' THEN 1 ELSE 0 END) as english_periods,
  SUM(CASE WHEN te.course_type = 'homeroom' THEN 1 ELSE 0 END) as homeroom_periods
FROM timetable_entries te
WHERE te.teacher_id = $teacher_id
  AND te.academic_year = '2024-2025';
```

## Weekly Grid Query (Pivot)

```typescript
// TypeScript representation for weekly view
interface WeeklyTimetable {
  [day: string]: {
    [period: number]: TimetableEntry;
  };
}

// Example output
{
  "Monday": {
    3: { class_name: "G1 Visionaries", classroom: "E101", course_type: "english" },
    4: { class_name: "G1 Visionaries", classroom: "E101", course_type: "english" },
    5: { class_name: "G1 Inventors", classroom: "E101", course_type: "english" }
  },
  "Tuesday": { /* ... */ }
}
```

## Find Classes by Teacher Name

```sql
-- When you only have teacher_name (from CSV import)
SELECT DISTINCT class_name, course_type
FROM timetable_entries
WHERE teacher_name = '張家芸 Kenny'
  AND academic_year = '2024-2025';
```

## Link Timetable to LMS Courses

```sql
-- Update timetable entries with course_id links
UPDATE timetable_entries te
SET course_id = c.id
FROM courses c
JOIN classes cl ON cl.id = c.class_id
WHERE te.class_name = cl.name
  AND te.academic_year = c.academic_year
  AND (
    (te.course_type = 'english' AND c.course_type IN ('LT', 'IT'))
    OR (te.course_type = 'homeroom' AND c.course_type = 'KCFS')
  );
```

## Get All Periods

```sql
SELECT
  period_number,
  TO_CHAR(start_time, 'HH24:MI') as start,
  TO_CHAR(end_time, 'HH24:MI') as end
FROM timetable_periods
ORDER BY period_number;
```

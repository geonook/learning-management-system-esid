# Courses Table Migration Guide

> **部署狀態**: ✅ **完全部署** (2025-10-17)
> **驗證狀態**: ✅ **全部通過** (ALL CHECKS PASSED)
> **真實資料**: ✅ 84 classes + 252 courses
> **執行記錄**: [MIGRATION_EXECUTION_LOG.md](../../db/migrations/MIGRATION_EXECUTION_LOG.md)

## Overview
This migration implements the **Course Assignment Architecture** (方案 A) which enables:
- One class to have three different course types: LT, IT, and KCFS
- Each course type can be taught by a different teacher
- Track field semantics clarified: classes.track = NULL, users.track = HT responsibility, courses.course_type = actual type

## Architecture Benefits
✅ **Clear Architecture** - One Class, Three Teachers model fully implemented
✅ **Clear Separation** - `classes.track` = NULL, `users.track` = HT responsibility, `courses.course_type` = actual type
✅ **Flexible** - Easy to add more course types in the future
✅ **Scalable** - Supports complex course-teacher assignments
✅ **RLS Compliant** - Head Teacher permissions based on Grade + Course Type

## Files Created

### 1. Database Migration
- **File**: `/db/migrations/008_create_courses_table.sql`
- **Purpose**: Creates `courses` table with proper constraints and indexes
- **Features**:
  - Automatic course creation for existing classes
  - Teacher-course type validation constraint
  - Performance indexes
  - Updated_at trigger

### 2. RLS Policies
- **File**: `/db/policies/003_courses_rls.sql`
- **Purpose**: Row Level Security policies for courses table
- **Policies**:
  - Admin: Full access to all courses
  - Head Teacher: Manage courses in their grade and track
  - Teacher: View courses they teach and related class courses

### 3. API Functions
- **File**: `/lib/api/courses.ts`
- **Functions**:
  - `getCoursesByClass()` - Get all courses for a class
  - `getCoursesByTeacher()` - Get courses taught by a teacher
  - `assignTeacherToCourse()` - Assign teacher to course (with validation)
  - `unassignTeacherFromCourse()` - Remove teacher assignment
  - `createCoursesForClass()` - Auto-create LT/IT/KCFS courses for new class
  - `getUnassignedCourses()` - Find courses without teachers
  - `getCourseStatistics()` - Get course assignment statistics
  - `bulkAssignTeachers()` - Batch assign multiple teachers

### 4. TypeScript Types
- **File**: `/types/database.ts` (Updated)
- **Changes**: Fixed `courses` table type definition (removed `course_name` field)

## Migration Steps

### Step 1: Execute Database Migration

1. Open Supabase Dashboard: https://supabase.com/dashboard
2. Navigate to: **Your Project** → **SQL Editor**
3. Create new query and paste content from:
   ```
   /db/migrations/008_create_courses_table.sql
   ```
4. Click **Run** (Cmd + Enter)
5. Verify output shows: `Migration 008 completed: courses table created with X records`

### Step 2: Apply RLS Policies

1. In SQL Editor, create another new query
2. Paste content from:
   ```
   /db/policies/003_courses_rls.sql
   ```
3. Click **Run**
4. Verify no errors

### Step 3: Verify Table Creation

Run this verification query in SQL Editor:

```sql
-- Check courses table structure
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'courses'
ORDER BY ordinal_position;

-- Check initial course records
SELECT
  c.name AS class_name,
  c.grade,
  c.track,
  co.course_type,
  u.full_name AS teacher_name,
  co.academic_year
FROM courses co
JOIN classes c ON co.class_id = c.id
LEFT JOIN users u ON co.teacher_id = u.id
ORDER BY c.grade, c.name, co.course_type;

-- Check RLS policies
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'courses';
```

Expected results:
- **courses** table should have 8 columns (id, class_id, course_type, teacher_id, academic_year, is_active, created_at, updated_at)
- For each active class, there should be **3 course records** (LT, IT, KCFS)
- All courses should initially have `teacher_id = null` (to be assigned later)
- **4 RLS policies** should be created

### Step 4: Test API Functions

Use the browser console on http://localhost:3001 to test:

```javascript
// Import API functions
import { getCoursesByClass, getCourseStatistics } from '@/lib/api/courses'

// Get courses for a specific class (replace with actual class ID)
const courses = await getCoursesByClass('your-class-id')
console.log('Class courses:', courses)

// Get overall statistics
const stats = await getCourseStatistics()
console.log('Course statistics:', stats)
```

## Data Model

### Before Migration (Old Architecture)
```
classes table:
- teacher_id (single teacher per class)

Problem: One class could only have ONE teacher
```

### After Migration (New Architecture)
```
classes table:
- teacher_id (kept for backward compatibility, deprecated)

courses table:
- class_id (one class has many courses)
- course_type (LT/IT/KCFS)
- teacher_id (each course has its own teacher)

Result: One class can have THREE teachers (one per course type)
```

## Example Usage

### Creating a New Class with Courses
```typescript
import { createCoursesForClass } from '@/lib/api/courses'

// After creating a class
const classId = 'new-class-uuid'
const academicYear = '2024'

// Automatically creates 3 courses (LT, IT, KCFS)
const courses = await createCoursesForClass(classId, academicYear)
// Returns: [
//   { course_type: 'LT', teacher_id: null, ... },
//   { course_type: 'IT', teacher_id: null, ... },
//   { course_type: 'KCFS', teacher_id: null, ... }
// ]
```

### Assigning Teachers to Courses
```typescript
import { assignTeacherToCourse } from '@/lib/api/courses'

// Assign LT teacher to LT course
await assignTeacherToCourse('lt-course-id', 'lt-teacher-id')

// Assign IT teacher to IT course
await assignTeacherToCourse('it-course-id', 'it-teacher-id')

// Assign KCFS teacher to KCFS course
await assignTeacherToCourse('kcfs-course-id', 'kcfs-teacher-id')

// ⚠️ This will fail (teacher type mismatch):
await assignTeacherToCourse('lt-course-id', 'it-teacher-id')
// Error: "Teacher type (IT) does not match course type (LT)"
```

### Viewing Teacher's Courses
```typescript
import { getCoursesByTeacher } from '@/lib/api/courses'

const teacherId = 'current-user-id'
const myCourses = await getCoursesByTeacher(teacherId)

// Returns all classes this teacher teaches
// Example: [
//   { class: { name: 'G4 Luna', grade: 4 }, course_type: 'LT' },
//   { class: { name: 'G5 Mars', grade: 5 }, course_type: 'LT' }
// ]
```

## Rollback Plan (If Needed)

If you need to rollback this migration:

```sql
-- Drop RLS policies
DROP POLICY IF EXISTS "admin_full_access_courses" ON courses;
DROP POLICY IF EXISTS "head_teacher_access_courses" ON courses;
DROP POLICY IF EXISTS "teacher_view_own_courses" ON courses;
DROP POLICY IF EXISTS "teacher_view_class_courses" ON courses;

-- Drop table (this will also drop all indexes and triggers)
DROP TABLE IF EXISTS courses CASCADE;
```

## Next Steps

After successful migration:

1. ✅ Update admin UI to manage course-teacher assignments
2. ✅ Modify class creation workflow to automatically create courses
3. ✅ Update dashboard to show courses instead of single teacher
4. ✅ Create course management page for Head Teachers
5. ✅ Update reports to group by course type

## Support

If you encounter any issues:
1. Check Supabase logs for error details
2. Verify RLS policies are correctly applied
3. Ensure TypeScript types are up to date
4. Review [TROUBLESHOOTING_CLAUDE_CODE.md](../troubleshooting/TROUBLESHOOTING_CLAUDE_CODE.md)

---

**Migration Version**: 008
**Created**: 2025-10-17
**Deployed**: 2025-10-17 ✅
**Architecture**: Course Assignment (方案 A)
**Status**: ✅ **Successfully Deployed to Supabase Cloud**

## Post-Deployment Verification ✅ **COMPLETED**

### Verification Results (2025-10-17)

Executed: `VERIFY_MIGRATIONS_SIMPLE.sql`
**Result**: 🎉 **ALL CHECKS PASSED** ✅

```
Total Courses: 252
Active Classes: 84
Courses Per Class: 3.00 ✅
RLS Policies: 7+ ✅
Indexes: 8+ ✅
Overall Status: 🎉 ALL CHECKS PASSED ✅
```

**Verified Components**:
- ✅ Courses table structure (8 columns)
- ✅ Indexes (8 indexes including UNIQUE constraints)
- ✅ RLS policies (7 policies including extras from previous migrations)
- ✅ Course records (3 per active class = 252 total)
- ✅ Trigger function and trigger
- ✅ ENUM types (LT, IT, KCFS)
- ✅ Level format (G[1-6]E[1-3])
- ✅ Track fields (classes.track = NULL)
- ✅ Teacher assignment support (teacher_id allows NULL)

### Additional Migrations Completed

**Migration 009**: Level format upgrade to TEXT
- Support for G[1-6]E[1-3] format
- 84 classes using new format

**Migration 010**: Remove track NOT NULL constraint
- All classes.track = NULL
- Supports "One Class, Three Teachers" architecture

**Migration 011**: Remove teacher_id NOT NULL constraint
- 252 courses with teacher_id = NULL (ready for assignment)
- Supports two-phase workflow

**RLS 003 Fix**: Head Teacher permissions corrected
- Matching on course_type instead of classes.track
- Grade + Course Type permission model

### Deployment Log
See complete deployment record: [MIGRATION_EXECUTION_LOG.md](../../db/migrations/MIGRATION_EXECUTION_LOG.md)

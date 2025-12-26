# Migration 003: Courses Architecture - Two-Part Migration

## 🚨 IMPORTANT: Two-Step Migration Process

Due to PostgreSQL ENUM transaction requirements, this migration has been split into two files that **MUST** be executed in sequence:

### Step 1: Execute ENUM Changes
```sql
-- Run this file FIRST in your Supabase SQL Editor:
/db/migrations/003a_add_enum_values.sql
```

This will:
- Add 'student' to user_role ENUM
- Add 'KCFS' to teacher_type ENUM  
- Create course_type ENUM
- Update users table structure

### Step 2: Execute Architecture Changes
```sql
-- Run this file SECOND in your Supabase SQL Editor:
/db/migrations/003b_add_courses_architecture.sql
```

This will:
- Create courses and student_courses tables
- Add RLS policies (now 'student' enum value is available)
- Create triggers for automatic enrollment
- Add views and indexes

## Why Two Files?

PostgreSQL requires new ENUM values to be **committed** before they can be referenced in policies or constraints. Running both parts in a single script causes:

```
ERROR: 55P04: unsafe use of new value "student" of enum type user_role
HINT: New enum values must be committed before they can be used.
```

## Backup

The original single migration file is backed up as:
```
/db/migrations/003_add_courses_architecture.sql.backup
```

## Verification

After running both migrations, you should have:
- 3 ENUM types: user_role, teacher_type, course_type
- 2 new tables: courses, student_courses  
- Automatic course creation for new classes
- Automatic student enrollment in class courses
- Course-based RLS policies

## Test Data

Use the test data files in `/test-data-courses/` to verify the architecture works correctly with the CSV import system.
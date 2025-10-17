# Migration Execution Guide - 2025-2026 Real Data

## 📋 Overview

This guide provides step-by-step instructions for deploying the complete LMS database with real class data for the 2025-2026 academic year.

**Current Status**: ✅ **ALL MIGRATIONS DEPLOYED** (2025-10-17)

**Completed**: 84 real classes (G1-G6) with 252 course records and corrected Head Teacher permissions.

**Verification**: 🎉 ALL CHECKS PASSED ✅

---

## 🎯 Execution Steps

### Step 0: Remove Track NOT NULL Constraint ⚠️ **REQUIRED FIRST**

**File**: `010_remove_track_not_null.sql`

**Purpose**: Allow NULL values in `classes.track` and `students.track` columns

**Why**: In the "one class, three teachers" architecture, classes don't belong to a single track. Track concept only exists in `courses.course_type`.

**Instructions**:
1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the entire contents of `010_remove_track_not_null.sql`
3. Click "Run" button
4. Verify results in the output tables

**Expected Output**:
```
=== TRACK COLUMN NULLABLE STATUS ===
table_name | column_name | is_nullable | status
-----------|-------------|-------------|---------------
classes    | track       | YES         | ✅ NULLABLE
students   | track       | YES         | ✅ NULLABLE

✅ Track NULL constraint test PASSED - NULL values accepted

=== MIGRATION 010 COMPLETED ===
status: Track columns now allow NULL values
```

**What This Does**:
- Removes NOT NULL constraint from `classes.track`
- Removes NOT NULL constraint from `students.track`
- Allows classes to have NULL track (符合「一班三師」架構)
- Existing data with track values remains unchanged

**Critical**: This migration MUST be executed before CREATE_REAL_CLASSES_2025.sql

---

### Step 1: Modify Level Field Type ✅ Ready

**File**: `009_change_level_to_text.sql`

**Purpose**: Change `level` column from ENUM to TEXT to support G1E1~G6E3 format

**Why**: Different grades have different E1 ability standards (G1E1 ≠ G4E1)

**Instructions**:
1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the entire contents of `009_change_level_to_text.sql`
3. Click "Run" button
4. Verify results in the output tables

**Expected Output**:
```
=== CLASSES.LEVEL COLUMN INFO ===
data_type: text

=== STUDENTS.LEVEL COLUMN INFO ===
data_type: text

=== MIGRATION 009 COMPLETED ===
status: Level columns changed to TEXT with format validation
valid_formats: G1E1 ~ G6E3
```

**What This Does**:
- Changes `classes.level` and `students.level` from ENUM to TEXT
- Adds format validation: only accepts `G[1-6]E[1-3]` or NULL
- Examples: G1E1, G2E2, G3E3, G4E1, G5E2, G6E3

---

### Step 2: Fix RLS Policies for Head Teachers ✅ Ready

**File**: `003_courses_rls.sql` (Updated)

**Purpose**: Correct Head Teacher permission logic

**Key Changes**:
- **OLD (Wrong)**: `WHERE u.track = c.track` (classes.track is NULL, so this fails)
- **NEW (Correct)**: `WHERE u.track::text = courses.course_type::text` (match course type)

**Instructions**:
1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the entire contents of `db/policies/003_courses_rls.sql`
3. Click "Run" button

**What This Does**:
- **Head Teacher** can manage courses in their grade + course_type
  - Example: G4 LT Head Teacher manages all G4 LT courses
- **Head Teacher** can VIEW all classes in their grade (but only MANAGE specific course_type)
- **Teachers** can view courses they teach and courses in same class

---

### Step 3: Create Real Classes (84 classes) ✅ Ready

**File**: `CREATE_REAL_CLASSES_2025.sql`

**Purpose**: Create all 84 Linkou campus classes for 2025-2026

**Instructions**:
1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the entire contents of `CREATE_REAL_CLASSES_2025.sql`
3. Click "Run" button
4. Verify results in the output tables

**Expected Output**:
```
=== CLASSES BY GRADE AND LEVEL ===
grade | e1_count | e2_count | e3_count | total
------|----------|----------|----------|------
1     | 5        | 5        | 4        | 14
2     | 5        | 5        | 4        | 14
3     | 4        | 7        | 3        | 14
4     | 4        | 7        | 3        | 14
5     | 3        | 7        | 4        | 14
6     | 4        | 7        | 3        | 14

=== TOTAL SUMMARY ===
total_classes: 84
active_classes: 84
total_classes_status: ✅ PASS

=== TRACK FIELD CHECK ===
null_track_count: 84
track_status: ✅ PASS - All tracks are NULL
```

**Class Distribution**:
- G1: 14 classes (5×E1, 5×E2, 4×E3)
- G2: 14 classes (5×E1, 5×E2, 4×E3)
- G3: 14 classes (4×E1, 7×E2, 3×E3)
- G4: 14 classes (4×E1, 7×E2, 3×E3)
- G5: 14 classes (3×E1, 7×E2, 4×E3)
- G6: 14 classes (4×E1, 7×E2, 3×E3)

**Total**: 84 classes

---

### Step 3.5: Remove Teacher_id NOT NULL Constraint ⚠️ **REQUIRED BEFORE STEP 4**

**File**: `011_remove_teacher_id_not_null.sql`

**Purpose**: Allow NULL values in `courses.teacher_id` column

**Why**: Courses are created without teacher assignment initially. Teachers are assigned later by admin/head teacher.

**Instructions**:
1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the entire contents of `011_remove_teacher_id_not_null.sql`
3. Click "Run" button
4. Verify results in the output tables

**Expected Output**:
```
=== TEACHER_ID COLUMN NULLABLE STATUS ===
column_name | data_type | is_nullable | status
------------|-----------|-------------|---------------
teacher_id  | uuid      | YES         | ✅ NULLABLE

✅ Teacher_id NULL constraint test PASSED - NULL values accepted

=== MIGRATION 011 COMPLETED ===
status: Teacher_id column now allows NULL values
```

**What This Does**:
- Removes NOT NULL constraint from `courses.teacher_id`
- Allows courses to be created without teacher assignment
- Teachers can be assigned later by admin/head teacher
- Supports workflow: Create Course Structure → Assign Teachers

**Critical**: This migration MUST be executed before INSERT_COURSES_FOR_EXISTING_CLASSES.sql

---

### Step 4: Create Course Records (252 courses) ✅ Ready

**File**: `INSERT_COURSES_FOR_EXISTING_CLASSES.sql`

**Purpose**: Create 3 course records (LT/IT/KCFS) for each class

**Instructions**:
1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the entire contents of `INSERT_COURSES_FOR_EXISTING_CLASSES.sql`
3. Click "Run" button
4. Verify results in the output tables

**Expected Output**:
```
=== COURSES CREATION SUMMARY ===
total_courses_created: 252
lt_courses: 84
it_courses: 84
kcfs_courses: 84
classes_with_courses: 84

=== COURSES BY CLASS ===
84 rows, each showing course_count = 3, status = ✅ Complete

=== COURSES BY TYPE ===
LT: 84 total, 0 assigned, 84 unassigned
IT: 84 total, 0 assigned, 84 unassigned
KCFS: 84 total, 0 assigned, 84 unassigned
```

**What This Creates**:
- 252 course records (84 classes × 3 course types)
- Each class has: LT course, IT course, KCFS course
- All `teacher_id` initially NULL (to be assigned by admin)

---

### Step 5: Verify Complete Deployment ✅ Ready

**File**: `VERIFY_MIGRATIONS_SIMPLE.sql`

**Purpose**: Final verification that all migrations and data are correct

**Instructions**:
1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the entire contents of `VERIFY_MIGRATIONS_SIMPLE.sql`
3. Click "Run" button
4. Check the final summary table for `overall_status`

**Expected Output**:
```
=== FINAL VERIFICATION SUMMARY ===
total_courses: 252
active_classes: 84
courses_per_class: 3.00
courses_per_class_status: ✅ PASS
rls_policies_count: 7+
rls_policies_status: ✅ PASS
indexes_count: 8+
indexes_status: ✅ PASS
overall_status: 🎉 ALL CHECKS PASSED ✅
```

---

## 🔍 Troubleshooting

### Issue: "null value in column track violates not-null constraint" ⚠️ **COMMON**
**Error**: `ERROR: 23502: null value in column "track" of relation "classes" violates not-null constraint`
**Solution**: Execute Step 0 (Migration 010) FIRST to remove NOT NULL constraint
**Why**: Classes don't belong to a single track in the "one class, three teachers" architecture

### Issue: "null value in column teacher_id violates not-null constraint" ⚠️ **COMMON**
**Error**: `ERROR: 23502: null value in column "teacher_id" of relation "courses" violates not-null constraint`
**Solution**: Execute Step 3.5 (Migration 011) BEFORE Step 4 to remove NOT NULL constraint
**Why**: Courses are created without teacher assignment initially. Teachers are assigned later.

### Issue: "column level cannot be cast to type text"
**Solution**: Make sure to execute Step 1 (Migration 009) first

### Issue: "new row violates check constraint level_format_check"
**Solution**: Level format must be G[1-6]E[1-3], e.g., G1E1, G4E2, G6E3

### Issue: "policy already exists" error
**Solution**: All scripts are idempotent - safe to re-run

### Issue: Head Teacher cannot see courses
**Solution**: Execute Step 2 (RLS policy fix) to correct permission logic

---

## 📊 Database Structure After Completion

### Classes Table (84 records)
**Academic Year**: 2025-2026
**Campus**: Linkou (林口)
**Track**: All NULL (班級不屬於任何單一 track)

**Examples**:
- G1 Achievers (Grade 1, Level G1E1)
- G4 Seekers (Grade 4, Level G4E1)
- G6 Navigators (Grade 6, Level G6E3)

### Courses Table (252 records)
Each class has 3 courses:
- **LT** (Local Teacher) - English Language Arts
- **IT** (International Teacher) - English Language Arts
- **KCFS** (Kang Chiao Future Skill)

All courses initially have `teacher_id = NULL` (to be assigned by admin)

### Level Format
- **G1E1 ~ G1E3**: Grade 1 ability levels
- **G2E1 ~ G2E3**: Grade 2 ability levels
- **G3E1 ~ G3E3**: Grade 3 ability levels
- **G4E1 ~ G4E3**: Grade 4 ability levels
- **G5E1 ~ G5E3**: Grade 5 ability levels
- **G6E1 ~ G6E3**: Grade 6 ability levels

**Note**: G1E1 ≠ G4E1 (different grade ability standards)

---

## ✅ Success Criteria

- [x] Migration 007: User self-registration policy active ✅
- [x] Migration 008: Courses table created ✅
- [x] **Migration 010**: Track NOT NULL constraint removed ✅
- [x] **Migration 009**: Level field changed to TEXT ✅
- [x] **RLS 003 Fix**: Head Teacher permissions corrected ✅
- [x] **Real Data**: 84 classes created ✅
- [x] **Migration 011**: Teacher_id NOT NULL constraint removed ✅
- [x] **Real Data**: 252 courses created ✅
- [x] **Verification**: All checks pass ✅

---

## 📝 Next Steps (Post-Migration)

### 🎯 現在可以進行的工作

1. **教師指派 (Teacher Assignment)**:
   - Admin assigns teachers to 252 courses
   - Update `courses.teacher_id` from NULL to actual teacher UUID
   - Ensure teacher type matches course type (LT → LT course, etc.)

2. **學生資料匯入 (Student Data Import)**:
   - Import student records via CSV or manual entry
   - Assign students to classes
   - Set student level (G[1-6]E[1-3] format)

3. **年段主任設定 (Head Teacher Setup)**:
   - Create Head Teacher accounts
   - Set grade + track (course_type) for permission scope
   - Example: G4 LT Head Teacher (grade=4, track='LT')

4. **系統測試 (System Testing)**:
   - Verify RLS permissions for each role
   - Test teacher assignment workflow
   - Validate grade calculations

---

## 🏗️ Architecture Summary

### Head Teacher Permission Model
- **G1 LT Head Teacher**: Manages all G1 LT courses (14 courses)
- **G1 IT Head Teacher**: Manages all G1 IT courses (14 courses)
- **G1 KCFS Head Teacher**: Manages all G1 KCFS courses (14 courses)
- ... (same for G2-G6)

### Course Architecture (方案 A - 一班三師)
```
Class: G4 Seekers
├── Course 1: G4 Seekers - LT (teacher_id: NULL → to be assigned)
├── Course 2: G4 Seekers - IT (teacher_id: NULL → to be assigned)
└── Course 3: G4 Seekers - KCFS (teacher_id: NULL → to be assigned)
```

### Track Field
- **classes.track**: Always NULL (班級不屬於單一 track)
- **users.track**: Stores HT's course_type responsibility (LT/IT/KCFS)
- **courses.course_type**: Stores actual course type (LT/IT/KCFS)

---

## 🐛 Known Issues & Resolutions

### ✅ RESOLVED: RLS Policy Error
- **Issue**: Head Teacher permission used `u.track = c.track` but classes.track is NULL
- **Fix**: Changed to `u.track::text = courses.course_type::text`
- **Status**: Fixed in Step 2

### ✅ RESOLVED: Level Format
- **Issue**: ENUM only supported E1/E2/E3, not G1E1~G6E3
- **Fix**: Changed to TEXT with format validation
- **Status**: Fixed in Step 1

### Expected Behavior
- Extra RLS policies (7+) and indexes (8+) are normal
- UNIQUE constraints auto-create additional indexes
- This does not affect functionality

---

**Last Updated**: 2025-10-17
**Migration Status**: ✅ **ALL COMPLETED**
**Migration Version**: 007 + 008 + 009 + 010 + 011 + RLS 003 (Fixed)
**Academic Year**: 2025-2026
**Real Data**: 84 classes + 252 courses (Linkou Campus)
**Deployment Date**: 2025-10-17
**Verification Status**: 🎉 ALL CHECKS PASSED ✅

**Key Architectural Changes**:
- Migration 009: Level format changed to G[1-6]E[1-3] (TEXT with validation)
- Migration 010: classes.track and students.track now allow NULL
- Migration 011: courses.teacher_id now allows NULL (supports two-phase workflow)
- RLS 003: Head Teacher permissions fixed to use course_type matching

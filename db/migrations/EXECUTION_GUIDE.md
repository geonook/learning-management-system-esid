# Migration Execution Guide

## 📋 Overview

This guide provides step-by-step instructions for executing all pending migrations and test data setup.

**Current Status**: Migration 007 + 008 + RLS 003 successfully deployed, but no test data exists.

**Target**: Create test classes and courses to verify the complete migration.

---

## 🎯 Execution Steps

### Step 1: Create Test Classes ✅ Ready

**File**: `CREATE_TEST_CLASSES.sql`

**Purpose**: Create 5 test classes to enable course record creation

**Instructions**:
1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the entire contents of `CREATE_TEST_CLASSES.sql`
3. Click "Run" button
4. Verify results in the output tables:
   - `total_test_classes` should be **5**
   - `active_test_classes` should be **5**
   - `local_track_count` should be **3**
   - `international_track_count` should be **2**

**Expected Output**:
```
=== TEST CLASSES CREATED ===
total_test_classes: 5
active_test_classes: 5
local_track_count: 3
international_track_count: 2

=== TEST CLASSES LIST ===
5 rows showing Test_G1_Luna, Test_G4_Mars, Test_G4_Venus, Test_G6_Jupiter, Test_G6_Saturn
```

---

### Step 2: Insert Courses for Test Classes ✅ Ready

**File**: `INSERT_COURSES_FOR_EXISTING_CLASSES.sql`

**Purpose**: Create 3 course records (LT/IT/KCFS) for each test class

**Instructions**:
1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the entire contents of `INSERT_COURSES_FOR_EXISTING_CLASSES.sql`
3. Click "Run" button
4. Verify results in the output tables:
   - `total_courses_created` should be **15** (5 classes × 3 types)
   - `lt_courses` should be **5**
   - `it_courses` should be **5**
   - `kcfs_courses` should be **5**
   - Each class should show `status: ✅ Complete`

**Expected Output**:
```
=== COURSES CREATION SUMMARY ===
total_courses_created: 15
lt_courses: 5
it_courses: 5
kcfs_courses: 5
classes_with_courses: 5

=== COURSES BY CLASS ===
5 rows, each showing course_count = 3, status = ✅ Complete

=== COURSES BY TYPE ===
LT: 5 total, 0 assigned, 5 unassigned
IT: 5 total, 0 assigned, 5 unassigned
KCFS: 5 total, 0 assigned, 5 unassigned
```

---

### Step 3: Verify Complete Migration ✅ Ready

**File**: `VERIFY_MIGRATIONS_SIMPLE.sql`

**Purpose**: Final verification that all migrations are successful

**Instructions**:
1. Open Supabase Dashboard → SQL Editor
2. Copy and paste the entire contents of `VERIFY_MIGRATIONS_SIMPLE.sql`
3. Click "Run" button
4. Check the final summary table for `overall_status`

**Expected Output**:
```
=== FINAL VERIFICATION SUMMARY ===
total_courses: 15
active_classes: 5
courses_per_class: 3.00
courses_per_class_status: ✅ PASS
rls_policies_count: 7
rls_policies_status: ✅ PASS (4+ expected)
indexes_count: 8
indexes_status: ✅ PASS (5+ expected)
overall_status: 🎉 ALL CHECKS PASSED ✅
```

---

## 🔍 Troubleshooting

### Issue: "classes table is empty"
**Solution**: Execute Step 1 (CREATE_TEST_CLASSES.sql) first

### Issue: "courses table is empty"
**Solution**: Execute Step 2 (INSERT_COURSES_FOR_EXISTING_CLASSES.sql) after Step 1

### Issue: "policy already exists" error
**Solution**: All scripts are idempotent - this is safe to ignore, or the policy already exists from previous execution

### Issue: "function does not exist" error
**Solution**: Re-run `EXECUTE_ALL_MIGRATIONS.sql` which includes the function definition

---

## 📊 Database Structure After Completion

### Classes Table (5 records)
- Test_G1_Luna (Grade 1, Local)
- Test_G4_Mars (Grade 4, Local)
- Test_G4_Venus (Grade 4, International)
- Test_G6_Jupiter (Grade 6, Local)
- Test_G6_Saturn (Grade 6, International)

### Courses Table (15 records)
Each class has 3 courses:
- **LT** (Local Teacher) - English Language Arts
- **IT** (International Teacher) - English Language Arts
- **KCFS** (Kang Chiao Future Skill)

All courses initially have `teacher_id = NULL` (to be assigned by admin)

---

## ✅ Success Criteria

- [x] Migration 007: User self-registration policy active
- [x] Migration 008: Courses table created with all constraints and indexes
- [x] RLS 003: 4 courses policies active
- [x] Helper function: `update_updated_at_column()` exists
- [ ] Test data: 5 classes created → **Execute Step 1**
- [ ] Test data: 15 courses created → **Execute Step 2**
- [ ] Verification: All checks pass → **Execute Step 3**

---

## 📝 Next Steps After Verification

1. **Teacher Assignment**: Use admin interface to assign teachers to courses
2. **Phase 3-4 of Registration**: User management and approval workflow (deferred)
3. **Real Data Migration**: Import actual classes and student data

---

## 🐛 Known Issues

### Schema Differences (Non-blocking)
- `classes` table does not have `teacher_id` field
- This is **not a problem** - the new course architecture doesn't need it
- The `courses` table handles teacher assignments instead

### Extra Policies and Indexes (Expected)
- 7 RLS policies instead of 4 → Some existing policies from previous migrations
- 8 indexes instead of 5 → UNIQUE constraints auto-create additional indexes
- Both are **harmless** and do not affect functionality

---

**Last Updated**: 2025-10-17
**Migration Version**: 007 + 008 + RLS 003
**Test Data Version**: v1.0

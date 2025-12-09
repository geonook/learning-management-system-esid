# 📋 CSV Field Mapping Guide

> **Created**: 2025-10-29
> **Version**: LMS-ESID v1.2.0
> **Purpose**: English field names reference for CSV import templates

This document provides a complete mapping between database fields and CSV column headers.

---

## 📊 Field Mapping Overview

### 1️⃣ Classes Table

| CSV Column | Database Field | Type | Example | Notes |
|------------|----------------|------|---------|-------|
| `class_name` | `name` | TEXT | G4 Seekers | Unique per academic year |
| `grade` | `grade` | INTEGER | 4 | Range: 1-6 (Primary school) |
| `level` | `level` | TEXT | G4E1 | Format: G[1-6]E[1-3] |
| `academic_year` | `academic_year` | TEXT | 2025-2026 | Default: current year |
| `campus` | `campus` | TEXT | Linkou | Campus name in English |

**Example CSV**:
```csv
class_name,grade,level,academic_year,campus
G4 Seekers,4,G4E1,2025-2026,Linkou
```

---

### 2️⃣ Users Table (Teachers)

| CSV Column | Database Field | Type | Example | Notes |
|------------|----------------|------|---------|-------|
| `full_name` | `full_name` | TEXT | John Smith | English name preferred (can be empty, filled by SSO) |
| `email` | `email` | TEXT | john.smith@kcislk.ntpc.edu.tw | Unique, used for login |
| `teacher_type` | `teacher_type` | ENUM | LT, IT, KCFS | Required for teacher/head |
| `grade_band` | `grade_band` | TEXT | 3-4, 1-6 | **Grade Band** for head teachers |
| `role` | `role` | ENUM | admin, head, teacher, office_member | User role |

**Example CSV**:
```csv
full_name,email,teacher_type,grade_band,role
,john.smith@kcislk.ntpc.edu.tw,IT,,teacher
,kassieshih@kcislk.ntpc.edu.tw,LT,1,head
,angelpeng@kcislk.ntpc.edu.tw,LT,3-4,head
,jonathanperry@kcislk.ntpc.edu.tw,IT,1-2,head
,carolegodfrey@kcislk.ntpc.edu.tw,KCFS,1-6,head
,tsehungchen@kcislk.ntpc.edu.tw,,,admin
,vickielicari@kcislk.ntpc.edu.tw,,,office_member
```

**Field Rules**:
- `full_name`: Optional (will be filled via Google SSO on first login)
- `teacher_type`: Required when `role` is `teacher`, `head`, or `office_member` (if teaching)
- `grade_band`: Required when `role` is `head`. Valid values:
  - Single grade: `1`, `2`, `3`, `4`, `5`, `6`
  - Grade range: `1-2`, `3-4`, `5-6`, `1-6`
- `role`: Must be one of: `admin`, `head`, `teacher`, `office_member`

**Note**: `office_member` with `teacher_type` can be assigned to teach specific classes via course assignments.

---

### 🎓 Grade Band System

Head Teachers are assigned to **Grade Bands** based on their teacher type:

| Teacher Type | Grade Bands | Description |
|--------------|-------------|-------------|
| **LT** | `1`, `2`, `3-4`, `5-6` | Local Teachers - separate bands per grade/range |
| **IT** | `1-2`, `3-4`, `5-6` | International Teachers - paired grade bands |
| **KCFS** | `1-6` | KCFS Teachers - all grades |

**Grade Band Examples**:
```
G1 LT Head → grade_band: 1
G2 LT Head → grade_band: 2
G3-G4 LT Head → grade_band: 3-4
G5-G6 LT Head → grade_band: 5-6
G1-G2 IT Head → grade_band: 1-2
G3-G4 IT Head → grade_band: 3-4
G5-G6 IT Head → grade_band: 5-6
G1-G6 KCFS Head → grade_band: 1-6
```

---

### 3️⃣ Course Assignments

| CSV Column | Database Field | Type | Example | Notes |
|------------|----------------|------|---------|-------|
| `teacher_email` | *(join key)* | TEXT | john.smith@kcis.ntpc.edu.tw | Must exist in users table |
| `class_name` | *(join key)* | TEXT | G4 Seekers | Must exist in classes table |
| `course_type` | `course_type` | ENUM | LT, IT, KCFS | Must match teacher_type |

**Example CSV**:
```csv
teacher_email,class_name,course_type
john.smith@kcis.ntpc.edu.tw,G4 Seekers,IT
john.smith@kcis.ntpc.edu.tw,G4 Explorers,IT
```

**Validation Rules**:
- Teacher's `teacher_type` must match `course_type`
- Both teacher and class must exist before assignment
- One teacher can teach multiple classes
- One class has 3 courses (LT + IT + KCFS)

---

### 4️⃣ Students Table

| CSV Column | Database Field | Type | Example | Notes |
|------------|----------------|------|---------|-------|
| `student_id` | `student_id` | TEXT | S2025001 | Unique student ID from school system |
| `full_name` | `full_name` | TEXT | Alex Chen | English name preferred |
| `grade` | `grade` | INTEGER | 4 | Range: 1-6 |
| `level` | `level` | TEXT | G4E1 | Format: G[1-6]E[1-3] |
| `class_name` | *(join key)* | TEXT | G4 Seekers | Must exist in classes table |

**Example CSV**:
```csv
student_id,full_name,grade,level,class_name
S2025001,Alex Chen,4,G4E1,G4 Seekers
S2025002,Bella Wang,4,G4E2,G4 Explorers
```

---

## 🔤 Enum Type Values

### Role Types
```typescript
type Role = 'admin' | 'head' | 'teacher' | 'office_member';
```

**Usage**:
- `admin`: System Administrator (full access)
- `head`: Head Teacher (grade + course_type scope)
- `teacher`: Regular Teacher (assigned courses only)
- `office_member`: Office Staff (can view all classes, edit only assigned courses)

**Special Case: Office Member + Teacher**:
- If someone is both office staff and a teacher, use `office_member` role
- Then assign them to courses via `course_assignments.csv`
- They can **view** all classes (via office_member role)
- They can **edit grades** only for classes they're assigned to (via courses.teacher_id)

---

### Teacher Types
```typescript
type TeacherType = 'LT' | 'IT' | 'KCFS';
```

**Definitions**:
- `LT`: **Local Teacher** - Teaches English Language Arts (ELA)
- `IT`: **International Teacher** - Teaches English Language Arts (ELA)
- `KCFS`: **Kang Chiao Future Skill** - Teaches KCFS curriculum

---

### Course Types
```typescript
type CourseType = 'LT' | 'IT' | 'KCFS';
```

**Note**: Course types match teacher types for assignment validation.

---

## 📐 Format Specifications

### Level Format
```
Pattern: G[1-6]E[1-3]

Valid Examples:
  ✅ G1E1  (Grade 1, English Level 1)
  ✅ G4E2  (Grade 4, English Level 2)
  ✅ G6E3  (Grade 6, English Level 3)

Invalid Examples:
  ❌ E1    (Missing grade)
  ❌ G7E1  (Grade out of range)
  ❌ G4E4  (Level out of range)
```

**Why include grade in level?**
- Different grades have different E1 standards
- G1E1 (top tier Grade 1) ≠ G4E1 (top tier Grade 4)
- Prevents mixing students from different grades

---

### Email Format
```
Pattern: [username]@[domain]

Valid Examples:
  ✅ john.smith@kcis.ntpc.edu.tw
  ✅ g4-lt-head@kcis.ntpc.edu.tw
  ✅ admin@kcis.ntpc.edu.tw

Recommended Format:
  - Teachers: [firstname].[lastname]@kcis.ntpc.edu.tw
  - Head Teachers: g[1-6]-[lt|it|kcfs]-head@kcis.ntpc.edu.tw
  - Admin: admin@kcis.ntpc.edu.tw
```

---

### Academic Year Format
```
Pattern: YYYY-YYYY

Valid Examples:
  ✅ 2025-2026
  ✅ 2026-2027

Invalid Examples:
  ❌ 2025
  ❌ 25-26
```

---

## 🌍 Campus Names

### Supported Campuses (English)

| English Name | Chinese Name | Code |
|--------------|--------------|------|
| `Linkou` | 林口 | LK |
| `Qingshan` | 青山 | QS |

**Note**: Always use English names in CSV files for consistency.

---

## ✅ Data Validation Rules

### Classes
- [ ] `class_name` is unique within same `academic_year`
- [ ] `grade` is between 1-6
- [ ] `level` matches format G[1-6]E[1-3]
- [ ] `level` grade matches `grade` field (e.g., G4E1 requires grade=4)

### Teachers
- [ ] `email` is unique across all users
- [ ] `email` is valid format (contains @)
- [ ] `teacher_type` is LT, IT, or KCFS (for teacher/head/office_member roles if teaching)
- [ ] `grade_band` is valid format for head role:
  - Single: `1`, `2`, `3`, `4`, `5`, `6`
  - Range: `1-2`, `3-4`, `5-6`, `1-6`
- [ ] `role` is admin, head, teacher, or office_member
- [ ] `full_name` is optional (will be filled via SSO)

### Course Assignments
- [ ] `teacher_email` exists in users table
- [ ] `class_name` exists in classes table
- [ ] Teacher's `teacher_type` matches `course_type`
- [ ] No duplicate assignments (same teacher + class + course_type)

### Students
- [ ] `student_id` is unique
- [ ] `grade` is between 1-6
- [ ] `level` matches format G[1-6]E[1-3]
- [ ] `level` grade matches `grade` field
- [ ] `class_name` exists in classes table

---

## 🔧 Import Processing Flow

```
1. Parse CSV file (UTF-8 encoding)
   ↓
2. Validate column headers match expected fields
   ↓
3. Validate data types and formats
   ↓
4. Check business rules (uniqueness, references)
   ↓
5. Begin database transaction
   ↓
6. Insert/Update records
   ↓
7. Commit transaction (or rollback on error)
   ↓
8. Return success report or error details
```

---

## 📝 Quick Reference

### Column Name Changes (Chinese → English)

| Old (Chinese) | New (English) | Table |
|---------------|---------------|-------|
| `teacher_name` | `full_name` | users |
| `teacher_email` | `email` | users |
| `校區` (林口) | `campus` (Linkou) | classes |

### Important Notes
1. **All CSV column names must be in English**
2. **Data values can be English or Chinese** (e.g., names)
3. **Email addresses must be real** (used for login)
4. **Use UTF-8 encoding** to support Chinese names

---

## 💡 Best Practices

### Naming Conventions
```csv
✅ Good Examples:
full_name,email,teacher_type
John Smith,john.smith@kcis.ntpc.edu.tw,IT
Ming-Li Chang,chang.mingli@kcis.ntpc.edu.tw,LT

❌ Bad Examples:
full_name,email,teacher_type
John,john@gmail.com,international
Smith,teacher1,IT
```

### Email Consistency
```csv
✅ Consistent Domain:
john.smith@kcis.ntpc.edu.tw
mary.jones@kcis.ntpc.edu.tw
david.chen@kcis.ntpc.edu.tw

❌ Mixed Domains:
john@gmail.com
mary@yahoo.com
david@kcis.ntpc.edu.tw
```

---

## 🚨 Common Errors

### Error 1: Column Name Mismatch
```
❌ Error: Column 'teacher_name' not found
✅ Fix: Change 'teacher_name' to 'full_name'
```

### Error 2: Invalid Level Format
```
❌ Error: Level 'E1' does not match pattern G[1-6]E[1-3]
✅ Fix: Change 'E1' to 'G4E1' (assuming grade 4)
```

### Error 3: Teacher Type Mismatch
```
❌ Error: Teacher type 'LT' cannot be assigned to course type 'IT'
✅ Fix: Ensure teacher_type matches course_type in assignments
```

### Error 4: Missing Required Field
```
❌ Error: grade_band is required for role 'head'
✅ Fix: Add grade_band value (e.g., '3-4', '1-6') for head teachers
```

### Error 5: Invalid Grade Band Format
```
❌ Error: grade_band '3-4-5' does not match pattern
✅ Fix: Use valid formats: '1', '2', '3-4', '5-6', '1-2', '1-6'
```

---

**Last Updated**: 2025-12-02
**Maintained By**: System Administrator

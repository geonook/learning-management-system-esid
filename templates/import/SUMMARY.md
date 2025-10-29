# 📦 CSV Import Templates - Summary

> **All field names are now in ENGLISH** ✅
> **Last Updated**: 2025-10-29

---

## 🎯 Key Changes

### ✨ English Field Names

All CSV templates now use **English column headers** for consistency with the LMS system display.

---

## 📂 Files Overview

### 📋 CSV Templates (4 files)

| File | Purpose | Key Fields |
|------|---------|-----------|
| **1_classes_template.csv** | Class data | `class_name`, `grade`, `level`, `campus` |
| **2_teachers_template.csv** | Teacher accounts | `full_name`, `email`, `teacher_type`, `role` |
| **3_teacher_course_assignments_template.csv** | Teacher-course mapping | `teacher_email`, `class_name`, `course_type` |
| **4_students_template.csv** | Student data | `student_id`, `full_name`, `grade`, `level` |

### 📖 Documentation (3 files)

| File | Purpose | When to Use |
|------|---------|-------------|
| **README.md** | Complete guide | First-time users, detailed reference |
| **FIELD_MAPPING.md** | Field specifications | Database mapping, validation rules |
| **QUICK_REFERENCE.md** | Quick lookup | Fast reference during data entry |

---

## 🔤 Field Name Changes

### Teachers Template

| Before | After | Notes |
|--------|-------|-------|
| ❌ `teacher_name` | ✅ `full_name` | Matches database field |
| ❌ `teacher_email` | ✅ `email` | Matches database field |
| ✅ `teacher_type` | ✅ `teacher_type` | No change |
| ✅ `grade` | ✅ `grade` | No change |
| ✅ `role` | ✅ `role` | No change |

### Classes Template

| Before | After | Notes |
|--------|-------|-------|
| ✅ `class_name` | ✅ `class_name` | No change |
| ✅ `grade` | ✅ `grade` | No change |
| ✅ `level` | ✅ `level` | No change |
| ✅ `academic_year` | ✅ `academic_year` | No change |
| ❌ `林口` | ✅ `Linkou` | Campus name in English |

### Students Template

| Before | After | Notes |
|--------|-------|-------|
| ✅ `student_id` | ✅ `student_id` | No change |
| ✅ `full_name` | ✅ `full_name` | Already English |
| ✅ `grade` | ✅ `grade` | No change |
| ✅ `level` | ✅ `level` | No change |
| ✅ `class_name` | ✅ `class_name` | No change |

---

## 📊 Example Data Preview

### Teachers CSV (2_teachers_template.csv)
```csv
full_name,email,teacher_type,grade,role
John Smith,john.smith@kcis.ntpc.edu.tw,IT,,teacher
G4 IT Head Teacher,g4-it-head@kcis.ntpc.edu.tw,IT,4,head
System Administrator,admin@kcis.ntpc.edu.tw,,,admin
```

### Classes CSV (1_classes_template.csv)
```csv
class_name,grade,level,academic_year,campus
G4 Seekers,4,G4E1,2025-2026,Linkou
G4 Explorers,4,G4E2,2025-2026,Linkou
```

### Course Assignments CSV (3_teacher_course_assignments_template.csv)
```csv
teacher_email,class_name,course_type
john.smith@kcis.ntpc.edu.tw,G4 Seekers,IT
john.smith@kcis.ntpc.edu.tw,G4 Explorers,IT
```

### Students CSV (4_students_template.csv)
```csv
student_id,full_name,grade,level,class_name
S2025001,Alex Chen,4,G4E1,G4 Seekers
S2025002,Bella Wang,4,G4E2,G4 Explorers
```

---

## ✅ What You Need to Do

### Step 1: Open Teacher Template
File: `2_teachers_template.csv`

### Step 2: Replace with Real Data
```csv
full_name,email,teacher_type,grade,role
[Teacher Name],[real.email@kcis.ntpc.edu.tw],[LT/IT/KCFS],,[teacher/head/admin]
```

### Step 3: Fill in Other Templates
- Classes (if different from examples)
- Course assignments (match teachers to classes)
- Students (if available)

### Step 4: Save as UTF-8 CSV
- Excel: File → Save As → CSV UTF-8
- Google Sheets: File → Download → CSV

### Step 5: Send Files to Developer
- We will validate and import

---

## 🎯 Important Notes

### ✅ What Works
- **English field names** - System will recognize
- **Chinese names** - OK in `full_name` field
- **Mixed data** - English headers + Chinese names

### ❌ What Doesn't Work
- Chinese column headers
- Wrong field names (e.g., `teacher_name` instead of `full_name`)
- Wrong encoding (not UTF-8)

---

## 💡 Quick Tips

1. **Use the templates** - Don't create from scratch
2. **Check spelling** - Field names must match exactly
3. **UTF-8 encoding** - Required for Chinese names
4. **Email format** - Use `@kcis.ntpc.edu.tw` domain
5. **Match types** - Teacher type must match course type

---

## 📞 Next Steps

1. ✅ **Review templates** - Check examples
2. ✅ **Prepare data** - Gather teacher emails
3. ✅ **Fill templates** - Use provided CSV files
4. ✅ **Validate** - Check field names and formats
5. ✅ **Submit** - Send completed files

---

## 🚀 Ready to Start?

Open these files:
1. `2_teachers_template.csv` ⭐ **Most important**
2. `3_teacher_course_assignments_template.csv`
3. `1_classes_template.csv` (if needed)
4. `4_students_template.csv` (optional)

Questions? Check:
- `README.md` - Full documentation
- `FIELD_MAPPING.md` - Technical details
- `QUICK_REFERENCE.md` - Fast lookup

---

**Created**: 2025-10-29
**Status**: ✅ Ready for use
**Encoding**: UTF-8
**Format**: CSV (Comma-separated values)

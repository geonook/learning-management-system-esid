# 🚀 Quick Reference - CSV Import Templates

> **Quick Start Guide** for LMS Data Import
> **Version**: 1.2.0 | **Date**: 2025-10-29

---

## 📋 Column Headers Quick Reference

### 1️⃣ Classes CSV
```csv
class_name,grade,level,academic_year,campus
```

### 2️⃣ Teachers CSV
```csv
full_name,email,teacher_type,grade,role
```

### 3️⃣ Course Assignments CSV
```csv
teacher_email,class_name,course_type
```

### 4️⃣ Students CSV
```csv
student_id,full_name,grade,level,class_name
```

---

## 🎯 Fill-in Template

### Teachers CSV Example
```csv
full_name,email,teacher_type,grade,role
John Smith,john.smith@kcis.ntpc.edu.tw,IT,,teacher
Mary Johnson,mary.johnson@kcis.ntpc.edu.tw,IT,,teacher
David Chen,david.chen@kcis.ntpc.edu.tw,LT,,teacher
Emily Lin,emily.lin@kcis.ntpc.edu.tw,LT,,teacher
Sarah Wang,sarah.wang@kcis.ntpc.edu.tw,KCFS,,teacher
G1 IT Head Teacher,g1-it-head@kcis.ntpc.edu.tw,IT,1,head
G1 LT Head Teacher,g1-lt-head@kcis.ntpc.edu.tw,LT,1,head
G1 KCFS Head Teacher,g1-kcfs-head@kcis.ntpc.edu.tw,KCFS,1,head
System Administrator,admin@kcis.ntpc.edu.tw,,,admin
```

---

## ✅ Field Validation Checklist

### Before Import
- [ ] CSV file is UTF-8 encoded
- [ ] Column headers exactly match template
- [ ] No extra spaces in headers
- [ ] All required fields are filled

### Teacher Data
- [ ] Email format: `name@kcis.ntpc.edu.tw`
- [ ] Teacher type: `LT`, `IT`, or `KCFS`
- [ ] Role: `admin`, `head`, or `teacher`
- [ ] Grade: 1-6 (only for head teachers)

### Class Data
- [ ] Level format: `G[1-6]E[1-3]`
- [ ] Campus: `Linkou` or `Qingshan`
- [ ] Grade: 1-6

### Assignment Data
- [ ] Teacher email exists in teachers CSV
- [ ] Class name exists in classes CSV
- [ ] Course type matches teacher type

---

## 🔑 Key Values Reference

### Roles
- `admin` - System Administrator
- `head` - Head Teacher
- `teacher` - Regular Teacher

### Teacher Types / Course Types
- `LT` - Local Teacher (ELA)
- `IT` - International Teacher (ELA)
- `KCFS` - Kang Chiao Future Skill

### Grades
- `1` to `6` (Primary school only)

### Levels
- `G1E1`, `G1E2`, `G1E3`
- `G2E1`, `G2E2`, `G2E3`
- ...
- `G6E1`, `G6E2`, `G6E3`

### Campus
- `Linkou` (林口)
- `Qingshan` (青山)

---

## 📊 Data Volume Estimate

**2025-2026 Academic Year (Linkou Campus)**:
```
Classes:  84 (G1-G6, 14 per grade)
Courses:  252 (84 × 3 types)
Teachers: ~60
  - Admin: 1-3
  - Head Teachers: 18 (6 grades × 3 types)
  - LT Teachers: 15-20
  - IT Teachers: 15-20
  - KCFS Teachers: 10-15
Students: ~1400
```

---

## 🚨 Common Mistakes

### ❌ Wrong
```csv
teacher_name,teacher_email,type,grade,role
張老師,zhang@gmail.com,本地,4,老師
```

### ✅ Correct
```csv
full_name,email,teacher_type,grade,role
Ming-Li Chang,chang.mingli@kcis.ntpc.edu.tw,LT,,teacher
```

---

## 📞 Need Help?

1. **Check**: [README.md](./README.md) - Full documentation
2. **Reference**: [FIELD_MAPPING.md](./FIELD_MAPPING.md) - Field details
3. **Templates**: `1_classes_template.csv` to `4_students_template.csv`

---

**Created**: 2025-10-29 | **Format**: CSV UTF-8

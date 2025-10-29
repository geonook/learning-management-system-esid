# 📋 LMS 資料匯入 CSV 範本

> **建立日期**: 2025-10-29
> **適用版本**: LMS-ESID v1.2.0
> **資料格式**: UTF-8 CSV

本目錄包含 LMS 系統資料匯入所需的 CSV 範本檔案。

---

## 📂 檔案清單

### 1️⃣ `1_classes_template.csv` - 班級資料
**用途**: 建立班級基本資料

**必要欄位**:
| 欄位名稱 | 說明 | 範例 | 必填 |
|----------|------|------|------|
| `class_name` | 班級名稱 | G4 Seekers | ✅ |
| `grade` | 年級 (1-6) | 4 | ✅ |
| `level` | 能力分級 | G4E1, G4E2, G4E3 | ✅ |
| `academic_year` | 學年度 | 2025-2026 | ✅ |
| `campus` | 校區 | Linkou, Qingshan | ✅ |

**Level 格式規則**:
- 格式: `G[1-6]E[1-3]`
- 範例: G1E1, G4E2, G6E3
- 說明: 包含年級資訊，因為不同年級的 E1 能力標準不同

**資料範例**:
```csv
class_name,grade,level,academic_year,campus
G4 Seekers,4,G4E1,2025-2026,Linkou
G4 Explorers,4,G4E2,2025-2026,Linkou
```

---

### 2️⃣ `2_teachers_template.csv` - 教師資料
**用途**: 建立教師帳號（含 admin 和 head teacher）

**必要欄位**:
| 欄位名稱 | 說明 | 範例 | 必填 |
|----------|------|------|------|
| `full_name` | 教師姓名 | John Smith, Ming-Li Chang | ✅ |
| `email` | Email (登入帳號) | john.smith@kcis.ntpc.edu.tw | ✅ |
| `teacher_type` | 教師類型 | LT, IT, KCFS | ✅ (teacher/head) |
| `grade` | 年級 (1-6) | 4 | ✅ (僅 head) |
| `role` | 角色 | admin, head, teacher | ✅ |

**角色說明**:
- `admin`: 系統管理員（teacher_type 和 grade 留空）
- `head`: Head Teacher（必須填寫 teacher_type 和 grade）
- `teacher`: 一般教師（必須填寫 teacher_type，grade 留空）

**Teacher Type 說明**:
- `LT`: Local Teacher（本地教師，教授 ELA）
- `IT`: International Teacher（國際教師，教授 ELA）
- `KCFS`: Kang Chiao Future Skill（康橋未來技能課程）

**資料範例**:
```csv
full_name,email,teacher_type,grade,role
Ming-Li Chang,chang.mingli@kcis.ntpc.edu.tw,LT,,teacher
John Smith,john.smith@kcis.ntpc.edu.tw,IT,,teacher
G4 LT Head Teacher,g4-lt-head@kcis.ntpc.edu.tw,LT,4,head
System Administrator,admin@kcis.ntpc.edu.tw,,,admin
```

---

### 3️⃣ `3_teacher_course_assignments_template.csv` - 教師配課
**用途**: 指派教師到課程

**必要欄位**:
| 欄位名稱 | 說明 | 範例 | 必填 |
|----------|------|------|------|
| `teacher_email` | 教師 Email | john.smith@kcis.ntpc.edu.tw | ✅ |
| `class_name` | 班級名稱 | G4 Seekers | ✅ |
| `course_type` | 課程類型 | LT, IT, KCFS | ✅ |

**重要規則**:
- ⚠️ **教師類型必須匹配課程類型**
  - LT 教師只能教 LT 課程
  - IT 教師只能教 IT 課程
  - KCFS 教師只能教 KCFS 課程
- ✅ 一位教師可以教多個班級
- ✅ 一個班級有三門課程（LT + IT + KCFS）

**資料範例**:
```csv
teacher_email,class_name,course_type
chang.mingli@kcis.ntpc.edu.tw,G4 Seekers,LT
chang.mingli@kcis.ntpc.edu.tw,G4 Explorers,LT
john.smith@kcis.ntpc.edu.tw,G4 Seekers,IT
```

---

### 4️⃣ `4_students_template.csv` - 學生資料
**用途**: 建立學生資料並分配到班級

**必要欄位**:
| 欄位名稱 | 說明 | 範例 | 必填 |
|----------|------|------|------|
| `student_id` | 學號 | S2025001 | ✅ |
| `full_name` | 學生姓名 | 張小明 | ✅ |
| `grade` | 年級 (1-6) | 4 | ✅ |
| `level` | 能力分級 | G4E1 | ✅ |
| `class_name` | 所屬班級 | G4 Seekers | ✅ |

**資料範例**:
```csv
student_id,full_name,grade,level,class_name
S2025001,Alex Chen,4,G4E1,G4 Seekers
S2025002,Bella Wang,4,G4E2,G4 Explorers
```

---

## 🚀 使用步驟

### Step 1: 準備資料
1. 複製範本檔案
2. 填入真實資料
3. 確認格式正確（UTF-8 編碼）

### Step 2: 資料驗證檢查清單
- [ ] 所有必填欄位都有填寫
- [ ] Email 格式正確（包含 @）
- [ ] Level 格式符合 G[1-6]E[1-3]
- [ ] Grade 範圍在 1-6 之間
- [ ] Teacher Type 符合 LT/IT/KCFS
- [ ] 教師配課的 teacher_type 與 course_type 匹配

### Step 3: 匯入順序（重要！）
```
1️⃣ 先匯入: 1_classes_template.csv
   ↓
2️⃣ 再匯入: 2_teachers_template.csv
   ↓
3️⃣ 然後匯入: 3_teacher_course_assignments_template.csv
   ↓
4️⃣ 最後匯入: 4_students_template.csv
```

**為什麼要按順序？**
- Classes 必須存在，才能建立 Courses
- Teachers 必須存在，才能指派到 Courses
- Classes 必須存在，才能分配 Students

---

## 📊 資料量參考

### 2025-2026 Academic Year (Linkou Campus)
```
班級數: 84 classes
  - G1: 14 classes
  - G2: 14 classes
  - G3: 14 classes
  - G4: 14 classes
  - G5: 14 classes
  - G6: 14 classes

課程數: 252 courses (84 × 3)
  - LT 課程: 84
  - IT 課程: 84
  - KCFS 課程: 84

教師數 (建議):
  - Admin: 1-3 位
  - Head Teachers: 18 位 (G1-G6 × LT/IT/KCFS)
  - LT Teachers: 15-20 位
  - IT Teachers: 15-20 位
  - KCFS Teachers: 10-15 位
  - 總計: ~60 位

學生數: ~1400 名 (預估)
```

---

## ⚠️ 常見錯誤與解決

### 錯誤 1: Level 格式錯誤
```
❌ 錯誤: E1, E2, Level1
✅ 正確: G1E1, G4E2, G6E3
```

### 錯誤 2: Teacher Type 與 Course Type 不匹配
```
❌ 錯誤: LT 教師指派到 IT 課程
✅ 正確: LT 教師只能指派到 LT 課程
```

### 錯誤 3: Grade 超出範圍
```
❌ 錯誤: grade=7, grade=12
✅ 正確: grade=1 到 grade=6 (小學年段)
```

### 錯誤 4: Head Teacher 缺少 grade 或 track
```
❌ 錯誤: role=head, grade=空, teacher_type=空
✅ 正確: role=head, grade=4, teacher_type=LT
```

### 錯誤 5: CSV 編碼問題（中文亂碼）
```
❌ 錯誤: ANSI, Big5 編碼
✅ 正確: UTF-8 編碼
```

**解決方法**:
- Excel: 另存新檔 → CSV UTF-8 (逗號分隔)
- Google Sheets: 檔案 → 下載 → CSV

---

## 🔧 匯入工具使用

### 方式 1: 使用 CLI 互動式工具
```bash
npm run import:cli
```

### 方式 2: 使用批量匯入腳本
```bash
# 匯入班級
npm run import:batch -- --file templates/import/1_classes_template.csv --type classes

# 匯入教師
npm run import:batch -- --file templates/import/2_teachers_template.csv --type teachers

# 匯入配課
npm run import:batch -- --file templates/import/3_teacher_course_assignments_template.csv --type assignments

# 匯入學生
npm run import:batch -- --file templates/import/4_students_template.csv --type students
```

### 方式 3: 使用 Supabase SQL Editor（進階）
```sql
-- 直接在 Supabase Dashboard 執行 SQL
-- 適合大量資料匯入
```

---

## 📞 需要協助？

如果遇到以下問題：
- ❓ 不確定資料格式是否正確
- ❓ 匯入時出現錯誤訊息
- ❓ 需要自定義欄位

請聯絡系統管理員或參考：
- [資料匯入指南](../../docs/guides/DATA_IMPORT_GUIDE.md)
- [疑難排解](../../docs/troubleshooting/DATA_IMPORT_TROUBLESHOOTING.md)

---

## ✅ 資料驗證

匯入後，請執行以下驗證：

```sql
-- 檢查班級數量
SELECT COUNT(*) FROM classes WHERE academic_year = '2025-2026';
-- 預期: 84

-- 檢查課程數量
SELECT COUNT(*) FROM courses;
-- 預期: 252

-- 檢查教師數量
SELECT role, COUNT(*) FROM users GROUP BY role;
-- 預期: admin (1-3), head (18), teacher (40+)

-- 檢查未指派課程
SELECT COUNT(*) FROM courses WHERE teacher_id IS NULL;
-- 預期: 0 (全部已指派)

-- 檢查學生數量
SELECT COUNT(*) FROM students WHERE is_active = true;
-- 預期: 依實際匯入數量
```

---

**最後更新**: 2025-10-29
**維護者**: System Administrator

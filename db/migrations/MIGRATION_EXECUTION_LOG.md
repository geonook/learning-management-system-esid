# Migration 執行記錄

## 📊 最新狀態總覽 (2025-10-17)

### ✅ 所有 Migrations 完成部署

- **Migration 007**: User self-registration RLS policy ✅
- **Migration 008**: Courses table creation ✅
- **RLS 003**: Courses RLS policies (+ Head Teacher fix) ✅
- **Migration 009**: Level field format upgrade (TEXT with G[1-6]E[1-3]) ✅
- **Migration 010**: Remove track NOT NULL constraint ✅
- **Migration 011**: Remove teacher_id NOT NULL constraint ✅

### 📈 真實資料部署狀態

- **班級數量**: 84 classes (2025-2026 學年度，林口校區)
- **課程數量**: 252 courses (84 × 3 course types)
- **Level 分佈**: G1-G6，每個年級 14 個班級
- **教師狀態**: 全部待指派 (teacher_id = NULL)

### 🎯 驗證結果

**執行**: `VERIFY_MIGRATIONS_SIMPLE.sql`
**結果**: 🎉 **ALL CHECKS PASSED** ✅
- 總課程數: 252 ✅
- 活躍班級: 84 ✅
- 每班課程數: 3.00 ✅
- RLS Policies: 7+ ✅
- Indexes: 8+ ✅

---

## Migration 007 + 008 + RLS 003 - 課程關聯表架構

### 執行資訊

- **執行日期**: 2025-10-17
- **執行者**: System Administrator
- **執行腳本**: `EXECUTE_ALL_MIGRATIONS.sql`
- **執行狀態**: ✅ **SUCCESS**
- **執行結果**: "Success. No rows returned"

---

## 執行內容摘要

### Migration 007: 用戶自主註冊 RLS 政策
- **目的**: 允許 Google OAuth 登入的用戶為自己創建帳號記錄
- **變更**: 新增 RLS policy `allow_authenticated_user_self_insert`
- **影響範圍**: `public.users` 表
- **狀態**: ✅ 已部署

### Migration 008: Courses 表建立
- **目的**: 實現「一班三師」系統架構
- **變更**:
  - 建立 `courses` 表（8 個欄位）
  - 建立 4 個索引（class, teacher, type, academic_year）
  - 建立 `update_updated_at_column()` trigger function
  - 為所有 active classes 自動建立 3 筆課程記錄（LT/IT/KCFS）
- **影響範圍**: 新增 `public.courses` 表
- **狀態**: ✅ 已部署

### RLS 003: Courses 表權限政策
- **目的**: 控制課程資料的存取權限
- **變更**: 建立 4 個 RLS policies
  - `admin_full_access_courses` - Admin 全域存取
  - `head_teacher_access_courses` - Head Teacher 依年段和校區存取
  - `teacher_view_own_courses` - Teacher 檢視自己的課程
  - `teacher_view_class_courses` - Teacher 檢視相關班級的所有課程
- **影響範圍**: `public.courses` 表
- **狀態**: ✅ 已部署

---

## 驗證步驟

### 下一步：執行驗證腳本

請在 Supabase Dashboard SQL Editor 執行：
```
db/migrations/VERIFY_MIGRATIONS.sql
```

### 預期驗證結果

1. **Courses 表結構**
   - ✅ 8 個欄位正確建立
   - ✅ 3 個約束正確套用（PK, UNIQUE, CHECK, 2x FK）
   - ✅ 5 個索引正確建立

2. **RLS Policies**
   - ✅ 4 個 courses policies
   - ✅ 1 個 user self-registration policy

3. **課程記錄**
   - ✅ 每個 active class 有 3 筆課程（LT/IT/KCFS）
   - ✅ 所有 teacher_id 為 null（待指派）

4. **Trigger Function**
   - ✅ `update_updated_at_column()` 函數存在
   - ✅ `update_courses_updated_at` trigger 已啟用

---

## 已解決的技術問題

### 問題 1: Campus vs Track 欄位名稱錯誤
- **錯誤**: `Could not find the 'campus' column`
- **原因**: API 使用 `campus` 但資料庫實際欄位是 `track`
- **解決**: 修正 `/app/api/users/create/route.ts` 使用正確欄位名稱
- **Commit**: `446a5a4`

### 問題 2: RLS Policy 重複建立錯誤
- **錯誤**: `policy "allow_authenticated_user_self_insert" already exists`
- **原因**: Migration 不是 idempotent
- **解決**: 加入 `DROP POLICY IF EXISTS` 前置語句
- **Commit**: `9548edb`

### 問題 3: Trigger Function 不存在
- **錯誤**: `function update_updated_at_column() does not exist`
- **原因**: Supabase Cloud 資料庫沒有執行過初始 schema
- **解決**: 在 migration 中加入函數定義
- **Commit**: `93133d7`

### 問題 4: ENUM 類型不匹配
- **錯誤**: `column "course_type" is of type course_type but expression is of type teacher_type`
- **原因**: PostgreSQL 將不同名稱的 ENUM 視為不同類型
- **解決**: 統一使用 `course_type` ENUM，約束條件使用 `::text` 轉型比較
- **Commit**: `c3faf60`

---

## 架構設計決策

### 方案選擇：課程關聯表（方案 A - 一班三師）

**核心概念**:
- 保留 `track` 欄位但語意變更（見 Migration 010）
- 新增 `courses` 表實現「一班三師」架構
- 清楚區分：classes.track = NULL, users.track = HT 職責, courses.course_type = 實際類型

**優點**:
- ✅ 完全遵循「一班三師」教學模式
- ✅ 未來可擴充更多課程類型
- ✅ 語意清晰，符合現實教學場景
- ✅ Head Teacher 權限明確（Grade + Course Type）

**實際架構圖** (Updated after Migration 009-011):
```
classes (班級)
├── track: NULL  (班級不屬於單一 track)
├── level: TEXT 'G[1-6]E[1-3]'  (例如：G4E2)
└── courses (課程) [1:3 關係]
    ├── LT 課程 (course_type='LT', teacher_id=NULL or UUID)
    ├── IT 課程 (course_type='IT', teacher_id=NULL or UUID)
    └── KCFS 課程 (course_type='KCFS', teacher_id=NULL or UUID)

users (Head Teacher)
├── grade: INTEGER  (例如：4)
└── track: course_type  (例如：'LT')
```

---

## 後續待辦事項

### ✅ 已完成

1. **驗證 Migration** ✅
   - 已執行 `VERIFY_MIGRATIONS_SIMPLE.sql`
   - 所有檢查項目通過 🎉

2. **真實資料部署** ✅
   - 84 個班級資料建立完成
   - 252 筆課程記錄建立完成

### 🎯 當前優先事項

3. **教師指派 (Teacher Assignment)**
   - 建立教師指派介面
   - 為 252 門課程指派教師
   - 確保 teacher type 與 course type 匹配

4. **學生資料匯入 (Student Import)**
   - CSV 匯入功能開發
   - 學生分班作業
   - Level 分級設定（G[1-6]E[1-3] 格式）

### 中期計畫

5. **Admin 管理介面**
   - 課程管理頁面
   - 教師指派功能
   - 批量操作工具

6. **Dashboard 更新**
   - 顯示課程統計
   - 未指派課程警告

### 長期規劃

7. **成績系統整合**
   - 修改 `exams` 表關聯到 `courses`（而非 `classes`）
   - 更新成績計算邏輯

8. **報表系統**
   - 依課程類型產生報表
   - 教師績效分析

---

## 相關文件

- **Migration 指南**: [COURSES_MIGRATION_GUIDE.md](./COURSES_MIGRATION_GUIDE.md)
- **API 文件**: [/lib/api/courses.ts](../../lib/api/courses.ts)
- **架構設計**: [CLAUDE.md](../../CLAUDE.md) - Phase 2C

---

## 版本控制

### Git Commits
- `446a5a4` - feat: 實作課程關聯表架構 (方案 A) - 一班三師系統
- `9548edb` - fix: 修正 migrations 為 idempotent 版本 + 建立一鍵執行腳本
- `93133d7` - fix: 加入 update_updated_at_column() 函數定義到 migrations
- `c3faf60` - fix: 修正 courses 表 ENUM 類型不匹配問題

### 最後更新
- **日期**: 2025-10-17
- **Branch**: `main`
- **遠端**: `origin/main` (已推送)

---

## 附註

### Idempotent 設計
所有 migrations 都已改為 idempotent 設計：
- ✅ `CREATE TABLE IF NOT EXISTS`
- ✅ `CREATE INDEX IF NOT EXISTS`
- ✅ `DROP POLICY IF EXISTS` + `CREATE POLICY`
- ✅ `CREATE OR REPLACE FUNCTION`
- ✅ `INSERT ... ON CONFLICT DO NOTHING`

這表示可以安全地重複執行腳本，不會產生錯誤。

### 資料安全
- ✅ 所有現有資料保持完整
- ✅ 新增的 courses 記錄都是 `teacher_id = null`（需要 admin 手動指派）
- ✅ RLS policies 確保資料存取安全

### 效能考量
- ✅ 已建立必要的索引（class_id, teacher_id, course_type, academic_year）
- ✅ Trigger 使用輕量級函數（只更新 updated_at）
- ✅ RLS policies 使用 EXISTS 子查詢（效能優化）

---

**記錄建立**: 2025-10-17
**最後更新**: 2025-10-17
**記錄狀態**: ✅ **所有 Migrations 完成部署**

---

## Migration 009 - Level 欄位格式升級 (2025-10-17)

### 執行資訊

- **執行日期**: 2025-10-17
- **執行者**: System Administrator
- **執行腳本**: `009_change_level_to_text.sql`
- **執行狀態**: ✅ **SUCCESS**

### 變更內容

**目的**: 支援包含年級資訊的 Level 格式，因為不同年級的 E1 能力標準不同

**技術變更**:
- 將 `classes.level` 從 ENUM 改為 TEXT
- 將 `students.level` 從 ENUM 改為 TEXT
- 新增 CHECK 約束確保格式：`G[1-6]E[1-3]`

**範例值**:
- G1E1, G1E2, G1E3 (一年級三個等級)
- G4E1, G4E2, G4E3 (四年級三個等級)
- G6E1, G6E2, G6E3 (六年級三個等級)

**設計理由**:
- G1E1 ≠ G4E1（不同年級的 E1 能力標準不同）
- 需要完整的年級+等級資訊才能正確分類學生
- TEXT 類型比 ENUM 更靈活，支援格式驗證

### 影響範圍

- `public.classes` 表的 `level` 欄位
- `public.students` 表的 `level` 欄位
- 真實資料：84 個班級已使用新格式

---

## Migration 010 - 移除 Track NOT NULL 約束 (2025-10-17)

### 執行資訊

- **執行日期**: 2025-10-17
- **執行者**: System Administrator
- **執行腳本**: `010_remove_track_not_null.sql`
- **執行狀態**: ✅ **SUCCESS**

### 變更內容

**目的**: 允許 `classes.track` 和 `students.track` 為 NULL，支援「一班三師」架構

**技術變更**:
```sql
ALTER TABLE classes ALTER COLUMN track DROP NOT NULL;
ALTER TABLE students ALTER COLUMN track DROP NOT NULL;
```

**架構語意變更**:
- **舊語意**: `classes.track` = 班級屬性 (local/international)
- **新語意**: `classes.track` = NULL（班級不屬於單一 track）
- **users.track**: 儲存 Head Teacher 的課程類型職責 (LT/IT/KCFS)
- **courses.course_type**: 儲存實際課程類型 (LT/IT/KCFS)

### 設計理由

在「一班三師」架構中：
- 一個班級同時有 LT、IT、KCFS 三種課程
- 班級不應該只屬於某一種 track
- 因此 `classes.track` 應該永遠為 NULL
- Head Teacher 的 track 欄位代表他們負責的課程類型

### 影響範圍

- `public.classes` 表：84 個班級的 track 全部設為 NULL
- `public.students` 表：允許學生 track 為 NULL
- RLS policies: Head Teacher 權限邏輯已在 RLS 003 中修正

---

## Migration 011 - 移除 Teacher_id NOT NULL 約束 (2025-10-17)

### 執行資訊

- **執行日期**: 2025-10-17
- **執行者**: System Administrator
- **執行腳本**: `011_remove_teacher_id_not_null.sql`
- **執行狀態**: ✅ **SUCCESS**

### 變更內容

**目的**: 支援兩階段課程工作流程：1) 建立課程結構 2) 指派教師

**技術變更**:
```sql
ALTER TABLE courses ALTER COLUMN teacher_id DROP NOT NULL;
```

**工作流程支援**:
1. **建立階段**: 系統為每個班級自動建立 3 筆課程（teacher_id = NULL）
2. **指派階段**: Admin 或 Head Teacher 手動指派教師（更新 teacher_id）

**業務邏輯**:
- `teacher_id = NULL`: 課程已建立但未指派教師（初始狀態）
- `teacher_id = UUID`: 課程已指派給特定教師
- 僅 admin 和 head teacher 可修改 teacher_id（RLS 政策控制）
- Teacher 僅能查看自己被指派的課程（`teacher_id = auth.uid()`）

### 影響範圍

- `public.courses` 表：252 筆課程記錄全部 teacher_id = NULL
- 支援彈性的教師指派工作流程
- Admin 可批量指派教師
- Head Teacher 可指派自己管理的課程類型

### 真實數據狀態

**執行後狀態** (2025-10-17):
```
course_type | total | assigned | unassigned
------------|-------|----------|------------
LT          | 84    | 0        | 84
IT          | 84    | 0        | 84
KCFS        | 84    | 0        | 84
Total       | 252   | 0        | 252
```

**下一步**: 教師指派作業

---

## RLS 003 - Head Teacher 權限修正 (2025-10-17)

### 問題描述

**原始錯誤邏輯**:
```sql
-- 錯誤：classes.track 已經是 NULL，無法匹配
WHERE u.track = c.track
```

**修正後邏輯**:
```sql
-- 正確：在 courses 層級比對 course_type
WHERE u.track::text = courses.course_type::text
```

### 修正內容

**Policy 更新**: `head_teacher_access_courses`
- Head Teacher 管理範圍：Grade（年級）+ Course Type（課程類型）
- 範例：G4 LT Head Teacher (grade=4, track='LT')
  - 可管理所有 G4 年級的 LT 課程（14 個班級 × 1 個 LT 課程 = 14 筆）
  - 不能管理 G4 的 IT 或 KCFS 課程

**新增 Policy**: `head_teacher_view_classes`
- Head Teacher 可檢視自己年級的所有班級
- 但只能管理自己 course_type 的課程

### 影響範圍

- Head Teacher 權限範圍明確定義
- 遵循「一班三師」架構的權限模型
- 確保 Head Teacher 只能管理自己負責的課程類型

---

**最終部署狀態**: ✅ **100% 完成**
**驗證結果**: 🎉 ALL CHECKS PASSED
**系統狀態**: 生產就緒

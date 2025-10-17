# Migration 執行記錄

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

### 方案選擇：課程關聯表（方案 A）

**核心概念**:
- 保留 `track` 欄位用於行政分類（local/international）
- 新增 `courses` 表實現「一班三師」
- 清楚區分：track = 班級屬性，course_type = 課程類型

**優點**:
- ✅ 不破壞現有 RLS 政策和資料結構
- ✅ 未來可擴充更多課程類型
- ✅ 語意清晰，符合現實教學場景

**架構圖**:
```
classes (班級)
├── track: 'local' | 'international'  (行政分類)
└── courses (課程) [1:3 關係]
    ├── LT 課程 → LT Teacher
    ├── IT 課程 → IT Teacher
    └── KCFS 課程 → KCFS Teacher
```

---

## 後續待辦事項

### 立即執行

1. **驗證 Migration** ⏳
   - 執行 `VERIFY_MIGRATIONS.sql`
   - 確認所有檢查項目通過

### 短期（本週）

2. **更新 API 文件**
   - 確保 `/lib/api/courses.ts` 與資料庫一致
   - 測試所有 API functions

3. **前端 UI 整合**
   - 修改班級管理介面顯示三個課程
   - 建立課程-教師指派介面

### 中期（下週）

4. **Admin 管理介面**
   - 課程管理頁面
   - 教師指派功能
   - 批量操作工具

5. **Dashboard 更新**
   - 顯示課程統計
   - 未指派課程警告

### 長期

6. **成績系統整合**
   - 修改 `exams` 表關聯到 `courses`（而非 `classes`）
   - 更新成績計算邏輯

7. **報表系統**
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
**記錄狀態**: 等待驗證確認 ⏳

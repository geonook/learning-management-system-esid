# 資料庫架構狀態診斷報告

**執行日期**: 2025-10-27
**診斷人員**: Claude Code Analysis Agent
**專案**: LMS-ESID (Primary School Learning Management System)

---

## 📊 執行摘要

**整體狀態**: 🔴 **發現關鍵問題需立即修復**

**關鍵發現**:
1. 🚨 **安全風險（極高）**: RLS 政策完全開放，允許匿名存取所有資料
2. ⚠️ **架構不完整**: Migration 008 缺少 `student_courses` 表和 `scores.course_id` 欄位
3. ✅ **資料完整性**: 84 個班級、252 個課程記錄存在且正確

---

## 🔍 詳細診斷結果

### 1. Migration 狀態分析

#### Migration 003b vs Migration 008 比較

| 特性 | Migration 003b | Migration 008 | 狀態 |
|------|---------------|---------------|------|
| `courses` 表 | ✅ 存在 | ✅ 存在 | ✅ 正常 |
| `student_courses` 表 | ✅ 存在 | ❌ **缺失** | 🚨 **需補齊** |
| `scores.course_id` 欄位 | ✅ 存在 | ❌ **缺失** | 🚨 **需補齊** |
| `course_name` GENERATED 欄位 | ✅ 存在 | ❌ 缺失 | ⚠️ 建議加入 |
| RLS 政策 | ✅ 完整 | ❌ 未包含 | ⚠️ 已在其他檔案 |

**結論**: Migration 008 是簡化版本，缺少關鍵的學生選課機制。

---

### 2. RLS 政策狀態 🚨 **嚴重安全風險**

#### 當前政策（`db/policies/002_simple_rls_policies.sql`）

**發現的危險政策**:
```sql
-- Line 51-52: CRITICAL SECURITY ISSUE
CREATE POLICY "Anonymous can view users" ON users
  FOR SELECT USING (true);  -- ⚠️ 允許任何人查看所有用戶資料！

-- Line 55-56
CREATE POLICY "Anonymous can view classes" ON classes
  FOR SELECT USING (true);

-- Line 59-60
CREATE POLICY "Anonymous can view students" ON students
  FOR SELECT USING (true);  -- ⚠️ 學生個資完全公開！

-- Line 63-64
CREATE POLICY "Anonymous can view exams" ON exams
  FOR SELECT USING (true);

-- Line 67-68
CREATE POLICY "Anonymous can view scores" ON scores
  FOR SELECT USING (true);  -- ⚠️ 所有成績資料可被任意存取！
```

**影響範圍**:
- ✅ RLS 已啟用（`ALTER TABLE ... ENABLE ROW LEVEL SECURITY`）
- ❌ 但政策設定為 `USING (true)`，等同於完全開放
- ❌ 檔案註解標明 "for testing purposes only"，但可能在生產環境使用

**風險評估**:
- 🔴 **隱私權違規**: GDPR/PDPA 等資料保護法規
- 🔴 **學生個資外洩**: 姓名、年級、班級等敏感資訊
- 🔴 **成績資料外洩**: 所有學生成績可被任意查詢
- 🔴 **教師帳號資訊**: Email、姓名等可被存取

---

### 3. 資料庫表格狀態

#### 核心表格檢查

基於 schema 檔案分析：

| 表格名稱 | 預期存在 | 實際狀態 | 記錄數 |
|---------|---------|---------|-------|
| `users` | ✅ | ✅ 確認 | 未知 |
| `classes` | ✅ | ✅ 確認 | 84 (2025-2026學年) |
| `courses` | ✅ | ✅ 確認 | 252 (84×3) |
| `students` | ✅ | ✅ 確認 | 未知 |
| `student_courses` | ✅ | ❓ **可能不存在** | N/A |
| `exams` | ✅ | ✅ 確認 | 未知 |
| `scores` | ✅ | ✅ 確認 | 未知 |
| `assessment_codes` | ✅ | ✅ 確認 | 13 |
| `assessment_titles` | ✅ | ✅ 確認 | 未知 |

**`student_courses` 表狀態**:
- Migration 003b 中有定義
- Migration 008 中**未包含**
- Analytics 視圖引用此表（`db/views/002_analytics_views.sql`）
- **結論**: 如果部署使用 Migration 008，此表可能不存在，導致視圖失效

---

### 4. 欄位檢查

#### `scores` 表欄位

**預期欄位** (Migration 003b):
```sql
- id (UUID, Primary Key)
- student_id (UUID, FK to students)
- exam_id (UUID, FK to exams)
- course_id (UUID, FK to courses)  ← 可能缺失
- assessment_code (assessment_code_type)
- score (DECIMAL)
- entered_by (UUID, FK to users)
- entered_at (TIMESTAMPTZ)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)
```

**Migration 008 狀態**:
- ❌ 未包含 `course_id` 欄位
- ⚠️ 成績無法與特定課程關聯（LT/IT/KCFS）

---

### 5. Analytics 視圖依賴問題

#### `student_grade_aggregates` 視圖

**檔案**: `db/views/002_analytics_views.sql`

**依賴的表格/欄位**:
```sql
FROM students s
LEFT JOIN student_courses sc_rel ON s.id = sc_rel.student_id  ← 依賴 student_courses
LEFT JOIN courses c ON sc_rel.course_id = c.id
LEFT JOIN scores sc ON sc.student_id = s.id AND sc.course_id = c.id  ← 依賴 scores.course_id
```

**潛在問題**:
- 如果 `student_courses` 表不存在 → 視圖建立失敗
- 如果 `scores.course_id` 欄位不存在 → 視圖建立失敗

---

### 6. 「一班三師」架構驗證

#### Courses 表資料完整性

**預期狀態**:
- 84 個班級 × 3 種課程類型 = 252 筆課程記錄

**檢查方式**:
```sql
SELECT
  class_id,
  COUNT(*) as course_count,
  STRING_AGG(course_type::text, ', ') as types
FROM courses
GROUP BY class_id
HAVING COUNT(*) != 3 OR COUNT(DISTINCT course_type) != 3;
```

**如果查詢返回任何結果** → 表示有班級缺少完整的三種課程

---

## 🎯 修復建議

### 優先級 1 - 立即執行（關鍵安全問題）

#### 1.1 修復 RLS 政策
**檔案**: `db/migrations/012_fix_rls_policies.sql`

**修復內容**:
1. 移除所有 "Anonymous can view" 政策
2. 實施基於角色的存取控制：
   - **Admin**: 完整存取權限
   - **Head Teacher**: 限制於指定年級+課程類型
   - **Teacher**: 只能存取自己任課班級
   - **Student**: 只能存取自己的資料

**預計工時**: 2-3 小時
**風險等級**: 🔴 CRITICAL

#### 1.2 補齊資料庫架構
**檔案**: `db/migrations/012_add_missing_tables.sql`

**修復內容**:
1. 建立 `student_courses` 表（如果不存在）
2. 新增 `scores.course_id` 欄位（如果不存在）
3. 新增 `courses.course_name` GENERATED 欄位（建議）
4. 建立相關索引

**預計工時**: 1-2 小時
**風險等級**: 🟡 HIGH

---

### 優先級 2 - 短期執行（資料完整性）

#### 2.1 資料遷移
**檔案**: `db/migrations/013_migrate_existing_data.sql`

**修復內容**:
1. 為現有學生建立 `student_courses` 記錄
2. 更新現有 `scores` 記錄的 `course_id`（基於 exam 與 class 關聯）

**預計工時**: 2-3 小時
**風險等級**: 🟡 MEDIUM

---

### 優先級 3 - 長期執行（測試與驗證）

#### 3.1 RLS 政策測試
**檔案**: `tests/unit/security/rls-policies.test.ts`

**測試內容**:
1. 驗證匿名用戶無法存取任何資料
2. 驗證 Teacher 只能存取自己的班級
3. 驗證 Head Teacher 權限邊界
4. 驗證 Admin 完整權限

**預計工時**: 8-12 小時
**風險等級**: 🟢 MEDIUM

---

## 📋 執行檢查清單

### 修復前準備
- [ ] 備份當前資料庫（Supabase Dashboard > Database > Backups）
- [ ] 確認當前環境（開發/測試/生產）
- [ ] 通知相關人員維護時間窗口（如在生產環境）

### 階段 1：資料庫架構修復
- [ ] 執行 Migration 012: 補齊缺失的表格與欄位
- [ ] 驗證 `student_courses` 表存在
- [ ] 驗證 `scores.course_id` 欄位存在
- [ ] 執行資料完整性檢查

### 階段 2：RLS 政策修復
- [ ] 執行 RLS 政策修復 migration
- [ ] 驗證所有 "Anonymous" 政策已移除
- [ ] 驗證角色權限正確
- [ ] 測試各角色存取權限

### 階段 3：資料遷移
- [ ] 執行資料遷移 script
- [ ] 驗證所有學生都有 student_courses 記錄
- [ ] 驗證所有成績都有正確的 course_id
- [ ] 執行 Analytics 視圖查詢測試

### 階段 4：測試與驗證
- [ ] 執行 RLS 政策測試套件
- [ ] 執行前端功能測試
- [ ] 執行效能測試
- [ ] 確認無資料遺失

---

## 🔗 相關檔案

### Migration 檔案
- `db/migrations/003b_add_courses_architecture.sql` - 完整架構定義
- `db/migrations/008_create_courses_table.sql` - 簡化版本（當前使用）
- `db/migrations/009_update_level_to_text.sql` - Level 欄位格式升級
- `db/migrations/010_remove_track_not_null.sql` - Track 允許 NULL
- `db/migrations/011_remove_teacher_id_not_null.sql` - Teacher ID 允許 NULL

### RLS 政策檔案
- `db/policies/001_rls_policies.sql` - 原始 RLS 政策
- `db/policies/002_simple_rls_policies.sql` - **當前使用（危險）**
- `db/policies/003_courses_rls.sql` - Courses 表 RLS
- `db/policies/005_complete_rls_reset.sql` - RLS 重置腳本
- `db/policies/006_nuclear_rls_reset.sql` - 完全重置腳本

### Analytics 視圖
- `db/views/002_analytics_views.sql` - 主要 Analytics 視圖
- `db/views/003_manual_analytics_views.sql` - 手動建立視圖

---

## 📝 建議的下一步行動

1. **立即執行（今天）**:
   - 建立 Migration 012 修復資料庫架構
   - 建立 RLS 修復 migration
   - 在開發環境測試

2. **本週內執行**:
   - 部署 Migration 012 到測試/生產環境
   - 部署 RLS 修復
   - 執行完整測試

3. **2週內完成**:
   - 建立 RLS 政策測試套件
   - 建立資料完整性驗證腳本
   - 建立監控與告警機制

---

**報告生成時間**: 2025-10-27
**診斷工具版本**: Claude Code Analysis v1.0
**下次審查建議**: 完成修復後立即進行驗證

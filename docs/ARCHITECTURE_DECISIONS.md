# 架構決策記錄 (Architecture Decision Record)

> **文件版本**: 1.0
> **最後更新**: 2025-10-17
> **專案**: Learning Management System - ESID

本文件記錄 LMS-ESID 專案中所有重要的架構決策、設計理由與演變歷程。

---

## 📋 目錄

1. [ADR-001: 一班三師架構](#adr-001-一班三師架構)
2. [ADR-002: Track 欄位語意演變](#adr-002-track-欄位語意演變)
3. [ADR-003: Level 格式選擇](#adr-003-level-格式選擇)
4. [ADR-004: 課程教師指派工作流程](#adr-004-課程教師指派工作流程)
5. [ADR-005: Head Teacher 權限模型](#adr-005-head-teacher-權限模型)

---

## ADR-001: 一班三師架構

### 狀態
✅ **已實施** (2025-10-17 - Migration 008)

### 背景
傳統 LMS 系統中，一個班級只能分配一位教師。但康橋小學的 ELA 課程體系中，每個班級需要：
- 一位 Local Teacher (LT) 教授 ELA
- 一位 International Teacher (IT) 教授 ELA
- 一位 KCFS 教師教授未來技能課程

### 決策
採用 **方案 A：課程關聯表 (courses table)**

#### 資料庫架構
```sql
classes (班級)
├── id (primary key)
├── name
├── grade
├── level
├── track (保留但設為 NULL)
└── ... (other fields)

courses (課程) [NEW]
├── id (primary key)
├── class_id (foreign key → classes.id)
├── course_type (ENUM: 'LT' | 'IT' | 'KCFS')
├── teacher_id (foreign key → users.id, nullable)
├── academic_year
└── ... (timestamps)

關係：1 class → 3 courses (LT + IT + KCFS)
```

### 設計理由

**優點**：
- ✅ **清晰的語意分離**：course_type 明確區分課程類型
- ✅ **彈性擴充**：未來可輕鬆新增其他課程類型
- ✅ **權限控制明確**：RLS policies 可精確控制每種課程的存取
- ✅ **保留現有資料**：不破壞 classes 表現有結構
- ✅ **符合教學現實**：一對三關係完美映射「一班三師」模式

**為何不選擇其他方案**：

**方案 B (修改 classes 表新增三個 teacher 欄位)**:
- ❌ 不符合正規化原則 (違反 1NF)
- ❌ 難以擴充（新增課程類型需要 ALTER TABLE）
- ❌ 查詢複雜度高（需要 JOIN 三次）

**方案 C (將 teacher_type 改為 Array)**:
- ❌ PostgreSQL Array 類型難以建立 Foreign Key
- ❌ RLS policies 複雜度高
- ❌ 難以維護單一教師-單一課程的約束

### 影響範圍
- 新增 `courses` 表
- 新增 4 個 RLS policies
- 新增 5 個索引
- 影響 API: `/lib/api/courses.ts`
- 影響 UI: 班級管理介面需顯示三個課程

### 相關 Migrations
- Migration 008: `create_courses_table.sql`
- RLS 003: `courses_rls.sql`

---

## ADR-002: Track 欄位語意演變

### 狀態
✅ **已實施** (2025-10-17 - Migration 010)

### 背景演變

#### 階段 1: 原始設計 (Migration 001-007)
```sql
classes.track: ENUM 'local' | 'international'
用途：區分班級屬性（本地班 vs 國際班）
```

#### 階段 2: 發現問題 (2025-10-17)
「一班三師」架構下，所有班級都同時有 LT、IT、KCFS 三種課程。
一個班級不應該只屬於某一種 track。

#### 階段 3: 語意重新定義 (Migration 010)
```sql
classes.track: NULL (永遠為 NULL)
用途：保留欄位但不使用，未來可能移除

users.track: ENUM 'LT' | 'IT' | 'KCFS'
用途：儲存 Head Teacher 的課程類型職責

courses.course_type: ENUM 'LT' | 'IT' | 'KCFS'
用途：儲存實際課程類型
```

### 決策
**保留 track 欄位但語意變更，並移除 NOT NULL 約束**

### 設計理由

**為何不直接刪除 classes.track**：
- ✅ 保持向後相容性
- ✅ 避免大規模程式碼修改
- ✅ 未來可能用於其他用途
- ✅ NULL 值明確表達「不屬於任何單一 track」的語意

**為何 users.track 改用 course_type 語意**：
- ✅ Head Teacher 的職責範圍是「Grade + Course Type」
- ✅ 範例：G4 LT Head Teacher 管理所有 G4 年級的 LT 課程
- ✅ 與 courses.course_type 語意一致，便於 RLS 政策比對

### 影響範圍
- 84 個真實班級的 track 全部設為 NULL
- Head Teacher RLS policies 修正（RLS 003）
- API 查詢需調整 (不再依賴 classes.track)

### 相關 Migrations
- Migration 010: `remove_track_not_null.sql`
- RLS 003 Fix: Head Teacher 權限修正

---

## ADR-003: Level 格式選擇

### 狀態
✅ **已實施** (2025-10-17 - Migration 009)

### 背景
原始設計使用 ENUM: `'E1' | 'E2' | 'E3'` 代表學生能力等級。

### 問題發現
用戶反饋：**「不同年級的 E1 能力標準不同」**
- G1E1（一年級頂尖學生）≠ G4E1（四年級頂尖學生）
- 僅用 E1-E3 無法區分年級差異
- 在跨年級查詢時會產生混淆

### 決策
**將 level 改為 TEXT 類型，格式為 `G[1-6]E[1-3]`**

#### Schema 變更
```sql
-- OLD
level level_type NOT NULL  -- ENUM('E1', 'E2', 'E3')

-- NEW
level TEXT  -- 格式：G[1-6]E[1-3]
CHECK (level IS NULL OR level ~ '^G[1-6]E[1-3]$')
```

#### 範例值
```
G1E1, G1E2, G1E3  (一年級三個等級)
G2E1, G2E2, G2E3  (二年級三個等級)
...
G6E1, G6E2, G6E3  (六年級三個等級)
```

### 設計理由

**為何選擇 TEXT 而非複合 ENUM**：
- ✅ **簡單直觀**：單一欄位完整表達年級+等級
- ✅ **易於查詢**：WHERE level = 'G4E2' 比 WHERE grade = 4 AND level = 'E2' 更清晰
- ✅ **格式驗證**：CHECK 約束確保資料正確性
- ✅ **易於擴充**：未來可支援更多格式變化
- ✅ **人類可讀**：G4E2 立即知道是「四年級中等程度」

**為何不使用兩個欄位 (grade + level)**：
- ❌ 冗餘資料（classes 表已有 grade）
- ❌ 查詢複雜度增加
- ❌ 需要額外的複合索引

### 影響範圍
- `classes` 表：84 個班級已使用新格式
- `students` 表：學生分級需使用新格式
- UI 顯示：需解析 level 格式（例如：G4E2 → 「四年級 E2」）
- 匯入系統：CSV 檔案需使用新格式

### 相關 Migrations
- Migration 009: `change_level_to_text.sql`

---

## ADR-004: 課程教師指派工作流程

### 狀態
✅ **已實施** (2025-10-17 - Migration 011)

### 背景
原始設計中，`courses.teacher_id` 為 NOT NULL，意味著建立課程時必須指定教師。

### 問題發現
實際工作流程中：
1. **階段一**：學期開始前，先建立所有班級的課程結構（84 classes × 3 = 252 courses）
2. **階段二**：由 Admin 或 Head Teacher 逐步指派教師

如果 teacher_id 必須有值，階段一無法執行。

### 決策
**移除 `courses.teacher_id` 的 NOT NULL 約束，支援兩階段工作流程**

#### 業務邏輯定義
```sql
courses.teacher_id:
  NULL     → 課程已建立但未指派教師（初始狀態）
  UUID     → 課程已指派給特定教師（可正常運作）
```

#### 權限控制
```sql
-- 僅 admin 和 head teacher 可修改 teacher_id
-- Teachers 只能查看 teacher_id = auth.uid() 的課程
```

### 設計理由

**支援彈性工作流程**：
- ✅ **分階段部署**：先建結構，後指派人員
- ✅ **批量操作**：Admin 可一次建立所有課程
- ✅ **權限分離**：Head Teacher 只能指派自己管理的課程類型
- ✅ **未指派追蹤**：可查詢 WHERE teacher_id IS NULL 找出待指派課程

**為何不使用預設值（例如 dummy UUID）**：
- ❌ NULL 語意更清楚（「未指派」 vs 「指派給假教師」）
- ❌ 需要額外的 dummy user 資料
- ❌ RLS policies 邏輯更複雜

### 影響範圍
- 252 筆課程記錄初始狀態：`teacher_id = NULL`
- Admin UI: 需提供教師指派介面
- Dashboard: 顯示未指派課程警告
- API: 新增 `getUnassignedCourses()` 函數

### 相關 Migrations
- Migration 011: `remove_teacher_id_not_null.sql`

---

## ADR-005: Head Teacher 權限模型

### 狀態
✅ **已實施** (2025-10-17 - RLS 003 Fix)

### 背景
Head Teacher (HT) 是年段主任，負責管理特定年級的特定課程類型。

### 原始設計問題

#### 錯誤的權限邏輯 (RLS 003 原始版)
```sql
-- 錯誤：classes.track 已經是 NULL，永遠無法匹配
WHERE users.track = classes.track
```

這導致所有 Head Teacher 都無法存取任何課程。

### 決策
**Head Teacher 權限範圍 = Grade（年級）+ Course Type（課程類型）**

#### 正確的權限邏輯 (RLS 003 Fixed)
```sql
-- 正確：在 courses 層級比對 course_type
WHERE users.grade = classes.grade
  AND users.track::text = courses.course_type::text
```

### 權限模型定義

#### 範例：G4 LT Head Teacher
```
user.grade = 4
user.track = 'LT'

管理範圍：
  ✅ 可檢視：所有 G4 年級的班級（14 個班級）
  ✅ 可管理：所有 G4 年級的 LT 課程（14 個 LT 課程）
  ❌ 不可管理：G4 年級的 IT 課程（屬於 G4 IT HT）
  ❌ 不可管理：G4 年級的 KCFS 課程（屬於 G4 KCFS HT）
  ❌ 不可管理：其他年級的任何課程
```

### 設計理由

**為何使用 Grade + Course Type 模型**：
- ✅ **符合真實職責**：年段主任負責特定年級的特定科目
- ✅ **權限明確**：G4 有三位 HT (LT, IT, KCFS)，各管各的
- ✅ **易於擴充**：新增課程類型時權限邏輯不變
- ✅ **RLS 查詢效率高**：簡單的 AND 條件

**為何不使用 Campus 概念**：
- ❌ 所有班級都有三種課程，不存在「只有本地課程的班級」
- ❌ Campus 概念會與「一班三師」架構衝突
- ❌ Grade + Course Type 更精確表達實際管理範圍

### 影響範圍
- RLS Policies: `head_teacher_access_courses`
- RLS Policies: `head_teacher_view_classes` (新增)
- User Management: Head Teacher 建立時需設定 grade + track
- Dashboard: HT 只看到自己管理範圍內的資料

### 相關 Migrations
- RLS 003 Fix: Head Teacher 權限修正

---

## 🎯 架構演變時間軸

```
2025-10-17
├── 08:00 Migration 007-008 部署
│         └── 建立 courses 表 (一班三師架構)
├── 10:00 發現 Level ENUM 限制
│         └── 用戶需求：G[1-6]E[1-3] 格式
├── 12:00 Migration 009 執行
│         └── Level 改為 TEXT + CHECK 約束
├── 13:00 發現 Track NOT NULL 問題
│         └── Classes 無法設為 NULL
├── 14:00 Migration 010 執行
│         └── 移除 track NOT NULL 約束
├── 14:20 發現 Teacher_id NOT NULL 問題
│         └── 課程無法批量建立
├── 14:30 Migration 011 執行
│         └── 移除 teacher_id NOT NULL 約束
├── 14:45 發現 Head Teacher 權限失效
│         └── RLS 邏輯使用錯誤的 track 比對
├── 15:00 RLS 003 修正
│         └── 改用 course_type 比對
└── 15:30 真實資料部署完成
          └── 84 classes + 252 courses ✅
```

---

## 📚 參考文件

- [CLAUDE.md](../CLAUDE.md) - 專案規範與架構文件
- [README.md](../README.md) - 專案說明
- [EXECUTION_GUIDE.md](../db/migrations/EXECUTION_GUIDE.md) - Migration 執行指南
- [MIGRATION_EXECUTION_LOG.md](../db/migrations/MIGRATION_EXECUTION_LOG.md) - Migration 執行記錄
- [COURSES_MIGRATION_GUIDE.md](./migrations/COURSES_MIGRATION_GUIDE.md) - 課程遷移指南

---

**文件維護者**: Claude Code
**版本歷史**:
- v1.0 (2025-10-17) - 初始版本，記錄 ADR-001 至 ADR-005

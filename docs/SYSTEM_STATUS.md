# 系統狀態總覽 (System Status)

> **最後更新**: 2025-11-28
> **版本**: v1.5.0
> **狀態**: 🟢 Phase 4.1 完成，One OS Interface 統一 (Phase 4.1 Complete, One OS Interface Unified)

本文件提供 LMS-ESID 系統當前狀態的快速查閱。

---

## 📊 系統概況

### 🎯 當前狀態

| 項目 | 狀態 | 說明 |
|------|------|------|
| **Phase 4.1 UI** | 🟢 完成 | One OS Interface 與 Info Hub 統一 |
| **Dockerfile 優化** | 🟢 完成 | Multi-stage build, standalone mode |
| **Dashboard 性能** | 🟢 完成 | Incremental loading + Skeleton UI |
| **資料庫 Migrations** | 🟡 部分待執行 | 007-021 完成，022 待執行於 Production |
| **SSO Integration** | 🟢 已完成 | Phase 1-4 + RLS Fix + Documentation ✅ |
| **CSV Import Templates** | 🟢 已完成 | 英文欄位 + 完整文件 ✅ |
| **真實資料結構** | 🟢 已部署 | 84 班級 + 252 課程架構就緒 |
| **教師資料** | 🟡 待匯入 | CSV 範本已準備 |
| **Supabase Cloud** | 🟢 運行中 | Official cloud instance |
| **Analytics Engine** | 🟢 可用 | 40+ TypeScript interfaces |
| **測試框架** | 🟢 就緒 | 90-minute comprehensive workflow |

### 🔢 資料統計 (2025-11-28)

```
學年度: 2025-2026
校區: 林口 (Linkou)

班級數: 84 classes ✅
  - G1: 14 classes (Level: E1×5, E2×5, E3×4)
  - G2: 14 classes (Level: E1×5, E2×5, E3×4)
  - G3: 14 classes (Level: E1×4, E2×7, E3×3)
  - G4: 14 classes (Level: E1×4, E2×7, E3×3)
  - G5: 14 classes (Level: E1×3, E2×7, E3×4)
  - G6: 14 classes (Level: E1×4, E2×7, E3×3)

課程數: 252 courses ✅ (84 classes × 3 course types)
  - LT 課程: 84 ✅
  - IT 課程: 84 ✅
  - KCFS 課程: 84 ✅
  - 教師指派狀態: teacher_id = NULL（待指派）

教師數: 待匯入 ⏳
  - Admin: 待建立
  - Head Teachers: 待建立 (18 位，每年級每課程類型 1 位)
  - Teachers: 待建立 (~40+ 位)

學生數: 待匯入 ⏳ (預期 ~1400)

📋 CSV Templates: ✅ 已準備 (4 核心範本 + 完整文件)
```

---

## 🗄️ 資料庫狀態

### 已完成的 Migrations

| Migration | 狀態 | 執行日期 | 說明 |
|-----------|------|----------|------|
| **007** | ✅ | 2025-10-17 | User self-registration RLS policy |
| **008** | ✅ | 2025-10-17 | Courses table creation (一班三師) |
| **009** | ✅ | 2025-10-17 | Level format upgrade to G[1-6]E[1-3] |
| **010** | ✅ | 2025-10-17 | Remove track NOT NULL constraint |
| **011** | ✅ | 2025-10-17 | Remove teacher_id NOT NULL constraint |
| **012-013** | ✅ | 2025-10-17 | Student courses + RLS security |
| **RLS 003** | ✅ | 2025-10-17 | Courses RLS policies + HT fix |
| **014** | ✅ | 2025-10-27 | Track column type fix + Analytics views rebuild |
| **015** | ✅ | 2025-10-28 | RLS performance optimization (49 policies) |
| **018-019e** | ✅ | 2025-11-18 | RLS recursion fix series |
| **020** | ✅ | 2025-11-21 | Disable auto user sync trigger |
| **021** | ✅ | 2025-11-21 | Fix courses RLS with SECURITY DEFINER |
| **022** | ⏳ | 待執行 | Fix assessment_codes schema (Production only) |

### Supabase 環境對照

| 環境 | Project ID | 用途 | Migration 022 |
|------|-----------|------|---------------|
| **Staging** | `kqvpcoolgyhjqleekmee` | 測試環境 | ✅ 已有資料 |
| **Production** | `piwbooidofbaqklhijup` | 正式環境 | ⏳ 待執行 |

**Production 部署前步驟**:
1. 在 Supabase Dashboard (Production) 進入 SQL Editor
2. 執行 `db/migrations/022_fix_assessment_codes_schema.sql`
3. 驗證 `assessment_codes` 表有 13 筆資料

### 資料庫架構要點

**核心表格**:
- `classes` - 84 records (track = NULL, level = G[1-6]E[1-3])
- `courses` - 252 records (teacher_id = NULL, 待指派)
- `users` - 教師與管理員資料
- `students` - 學生資料（待匯入）
- `scores` - 成績資料
- `exams` - 考試資料

**Track 欄位語意**:
```
classes.track      → NULL (永遠)
users.track        → HT 職責範圍 (LT/IT/KCFS)
courses.course_type → 實際課程類型 (LT/IT/KCFS)
```

**Level 格式**:
```
格式: G[1-6]E[1-3]
範例: G1E1, G4E2, G6E3
說明: 包含年級資訊，因為不同年級的 E1 能力標準不同
```

---

## 🎓 課程架構

### 一班三師模型 (One Class, Three Teachers)

```
每個班級 = 3 門課程：

Class: G4 Seekers
├── Course 1: G4 Seekers - LT (teacher_id: NULL → 待指派)
├── Course 2: G4 Seekers - IT (teacher_id: NULL → 待指派)
└── Course 3: G4 Seekers - KCFS (teacher_id: NULL → 待指派)

統計:
- 84 classes × 3 course types = 252 courses
- 每個年級: 14 classes × 3 = 42 courses
```

### 課程類型定義

| 代碼 | 全名 | 說明 |
|------|------|------|
| **LT** | Local Teacher | 本地教師教授 English Language Arts |
| **IT** | International Teacher | 國際教師教授 English Language Arts |
| **KCFS** | Kang Chiao Future Skill | 康橋未來技能課程（獨立課程）|

---

## 👥 角色與權限

### 角色定義

| 角色 | 代碼 | 權限範圍 | 數量 (當前) |
|------|------|----------|-------------|
| **System Administrator** | admin | 全域存取 | - |
| **Head Teacher** | head | Grade + Course Type | - (待建立) |
| **Local Teacher** | teacher (track='LT') | 指派的 LT 課程 | - (待建立) |
| **International Teacher** | teacher (track='IT') | 指派的 IT 課程 | - (待建立) |
| **KCFS Teacher** | teacher (track='KCFS') | 指派的 KCFS 課程 | - (待建立) |

### Head Teacher 權限模型

**範例：G4 LT Head Teacher**
```
user.grade = 4
user.track = 'LT'

權限範圍:
✅ 可檢視: 所有 G4 年級的班級 (14 classes)
✅ 可管理: 所有 G4 年級的 LT 課程 (14 LT courses)
❌ 不可管理: G4 的 IT 課程 (屬於 G4 IT HT)
❌ 不可管理: G4 的 KCFS 課程 (屬於 G4 KCFS HT)
❌ 不可管理: 其他年級的任何課程
```

---

## 📝 待辦事項

### 🎯 高優先級 (當前可執行)

1. **📋 CSV Templates 完成** ✅
   - 狀態: ✅ 已完成 (2025-10-29)
   - 工作量: 4 CSV templates + 4 documentation files
   - 成果: 英文欄位名稱 + 完整驗證規則
   - 位置: `templates/import/`

2. **教師資料填寫 (Teacher Data Entry)**
   - 狀態: ⏳ 待執行
   - 工作量: ~60 位教師資料
   - 檔案: `templates/import/2_teachers_template.csv`
   - 必填: full_name, email, teacher_type, role
   - 說明: 填寫真實教師 Email（用於登入）

3. **資料驗證與匯入 (Data Validation & Import)**
   - 狀態: ⏳ 待執行
   - 依賴: 教師資料填寫完成
   - 工作量: 驗證 + 匯入 4 類資料
   - 順序: Classes → Teachers → Assignments → Students

### 📅 中期計畫

4. **教師指派管理介面**
   - UI 開發: 課程列表 + 教師選擇器
   - 批量操作: 支援一次指派多門課程
   - 驗證邏輯: Teacher type 必須匹配 course type

5. **學生匯入 UI**
   - CSV 上傳功能
   - 資料驗證與預覽
   - 錯誤處理與回報

6. **Dashboard 更新**
   - 顯示課程統計
   - 未指派課程警告
   - Head Teacher 專用視圖

### 🔮 長期規劃

7. **成績系統整合**
   - Exams 表關聯到 courses (而非 classes)
   - 成績計算邏輯更新

8. **報表系統**
   - 依課程類型產生報表
   - 教師績效分析

---

## 🧪 測試環境

### 開發環境配置

```bash
前端: localhost:3000 (Next.js Dev Server)
後端: Supabase Cloud (Official)
CLI: Claude Code (VSCode Extension)

環境變數:
- NEXT_PUBLIC_SUPABASE_URL=https://piwbooidofbaqklhijup.supabase.co
- NEXT_PUBLIC_SUPABASE_ANON_KEY=[SECRET]
- SUPABASE_SERVICE_ROLE_KEY=[SECRET]
```

### 測試帳號 (計畫中)

**測試資料**:
- 57 名測試學生 (G4, G6 年段)
- 9 名測試教師 (LT/IT/KCFS 完整覆蓋)
- 6 種角色測試帳號 (admin/head/teacher)

**測試流程**: 90 分鐘完整測試 (Phase 1-7)

---

## 🔧 技術規格

### Tech Stack

```
Frontend:
- Next.js 14 (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui + Radix UI
- Framer Motion

Backend:
- Supabase Cloud (Official)
- PostgreSQL 15
- Row Level Security (RLS)
- Edge Functions

Analytics:
- 40+ TypeScript interfaces
- Statistical calculations (mean, median, std dev)
- Risk assessment algorithms
- TTL-based caching

Testing:
- Vitest (unit tests)
- Playwright (E2E tests)
- Contract tests

Deployment:
- Zeabur (frontend)
- Supabase Cloud (backend)
```

### 效能指標

| 指標 | 當前值 | 目標值 | 狀態 |
|------|--------|--------|------|
| **Analytics 查詢** | 146ms | <500ms | ✅ |
| **資料庫 Views** | 3 個 | - | ✅ |
| **效能索引** | 8 個 | - | ✅ |
| **RLS Policies** | 7+ | - | ✅ |

---

## ⚠️ 已知問題

### 1. Claude Code 環境變數快取

**狀態**: 🟡 已記錄 (非阻塞)

**說明**: Claude Code 會將 `.env.local` 快取，更新環境變數後需清除會話快取

**解決方案**: 詳見 [TROUBLESHOOTING_CLAUDE_CODE.md](./troubleshooting/TROUBLESHOOTING_CLAUDE_CODE.md)

---

## 📚 相關文件

### 核心文件
- [CLAUDE.md](../CLAUDE.md) - 專案規範與架構
- [README.md](../README.md) - 專案說明
- [ARCHITECTURE_DECISIONS.md](./ARCHITECTURE_DECISIONS.md) - 架構決策記錄

### Migration 相關
- [EXECUTION_GUIDE.md](../db/migrations/EXECUTION_GUIDE.md) - 執行指南
- [MIGRATION_EXECUTION_LOG.md](../db/migrations/MIGRATION_EXECUTION_LOG.md) - 執行記錄
- [COURSES_MIGRATION_GUIDE.md](./migrations/COURSES_MIGRATION_GUIDE.md) - 課程遷移指南

### 設定與疑難排解
- [SUPABASE_CLOUD_SETUP.md](./setup/SUPABASE_CLOUD_SETUP.md) - Supabase 設定
- [TROUBLESHOOTING_CLAUDE_CODE.md](./troubleshooting/TROUBLESHOOTING_CLAUDE_CODE.md) - 疑難排解

---

## 🎯 下一步行動

### 立即可執行

1. ✅ **CSV Templates 建立完成** (2025-10-29)
   - 4 個 CSV 範本檔案
   - 4 個完整文件
   - 英文欄位名稱
   - 完整驗證規則

2. ⏳ **填寫教師資料** (待使用者)
   - 開啟 `templates/import/2_teachers_template.csv`
   - 填入真實教師姓名與 Email
   - 確認 teacher_type 與 role
   - 儲存為 UTF-8 CSV

3. ⏳ **資料驗證與匯入** (待開發者)
   - 驗證 CSV 格式與內容
   - 執行資料匯入腳本
   - 驗證資料正確性

4. ⏳ **系統測試**
   - 教師登入測試
   - 課程存取測試
   - Dashboard 顯示測試

### 📋 CSV Templates 資訊

**位置**: `templates/import/`

**檔案清單**:
- `1_classes_template.csv` - 班級資料
- `2_teachers_template.csv` - 教師資料 ⭐
- `3_teacher_course_assignments_template.csv` - 配課資料
- `4_students_template.csv` - 學生資料
- `README.md` - 完整使用指南
- `FIELD_MAPPING.md` - 欄位對照
- `QUICK_REFERENCE.md` - 快速參考
- `SUMMARY.md` - 總覽說明

### 需求確認

- [x] CSV Templates 準備 ✅
- [ ] 教師真實資料收集
- [ ] 班級資料確認（84 個班級）
- [ ] 學生資料來源與格式

---

**文件維護者**: System Administrator
**更新頻率**: 每次重大變更後更新
**版本歷史**:
- v1.4.0 (2025-11-19) - SSO Integration 完成 + Documentation Cleanup + Migration 019e
- v1.3.0 (2025-10-29) - CSV Import Templates 完成 + 狀態報告更新
- v1.2.0 (2025-10-17) - Migration 007-011 完成後的狀態
- v1.1.0 (2025-10-16) - Supabase Cloud 遷移完成
- v1.0.0 (2025-08-23) - Analytics Engine 完成

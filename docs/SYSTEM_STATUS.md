# 系統狀態總覽 (System Status)

> **最後更新**: 2025-10-17
> **版本**: v1.2.0
> **狀態**: 🟢 生產就緒

本文件提供 LMS-ESID 系統當前狀態的快速查閱。

---

## 📊 系統概況

### 🎯 當前狀態

| 項目 | 狀態 | 說明 |
|------|------|------|
| **資料庫 Migrations** | 🟢 完全部署 | 007-011 + RLS 003 全部完成 |
| **真實資料** | 🟢 已部署 | 84 classes + 252 courses |
| **驗證測試** | 🟢 全部通過 | ALL CHECKS PASSED ✅ |
| **Supabase Cloud** | 🟢 運行中 | Official cloud instance |
| **Analytics Engine** | 🟢 可用 | 40+ TypeScript interfaces |
| **測試框架** | 🟢 就緒 | 90-minute comprehensive workflow |

### 🔢 資料統計 (2025-10-17)

```
學年度: 2025-2026
校區: 林口 (Linkou)

班級數: 84 classes
  - G1: 14 classes (5×E1, 5×E2, 4×E3)
  - G2: 14 classes (5×E1, 5×E2, 4×E3)
  - G3: 14 classes (4×E1, 7×E2, 3×E3)
  - G4: 14 classes (4×E1, 7×E2, 3×E3)
  - G5: 14 classes (3×E1, 7×E2, 4×E3)
  - G6: 14 classes (4×E1, 7×E2, 3×E3)

課程數: 252 courses (84 × 3)
  - LT 課程: 84 (teacher_id = NULL)
  - IT 課程: 84 (teacher_id = NULL)
  - KCFS 課程: 84 (teacher_id = NULL)

學生數: 待匯入
教師數: 待建立
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
| **RLS 003** | ✅ | 2025-10-17 | Courses RLS policies + HT fix |

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

1. **教師指派 (Teacher Assignment)**
   - 狀態: ⏳ 待執行
   - 工作量: 252 courses 需指派教師
   - 負責人: System Administrator
   - 說明: 為每門課程指派對應類型的教師

2. **學生資料匯入 (Student Import)**
   - 狀態: ⏳ 待執行
   - 工作量: 全校學生資料
   - 格式要求: CSV 檔案，Level 使用 G[1-6]E[1-3] 格式
   - 說明: 匯入學生並分配到班級

3. **Head Teacher 帳號建立**
   - 狀態: ⏳ 待執行
   - 數量: 18 位 (G1-G6 × 3 course types)
   - 必填欄位: grade, track (course_type)
   - 說明: 每個年級需要 3 位 HT (LT, IT, KCFS)

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

1. ✅ **驗證現有部署**
   - 執行 `VERIFY_MIGRATIONS_SIMPLE.sql` → 🎉 ALL CHECKS PASSED

2. ⏳ **建立教師帳號**
   - 為 252 門課程準備教師

3. ⏳ **指派教師到課程**
   - 確保 Teacher type 匹配 Course type

4. ⏳ **匯入學生資料**
   - 使用 G[1-6]E[1-3] Level 格式

### 需求確認

- [ ] 是否需要建立 Head Teacher 帳號？(18 位)
- [ ] 學生資料來源與格式？
- [ ] 教師資料來源與數量？

---

**文件維護者**: System Administrator
**更新頻率**: 每次重大變更後更新
**版本歷史**:
- v1.2.0 (2025-10-17) - Migration 007-011 完成後的狀態
- v1.1.0 (2025-10-16) - Supabase Cloud 遷移完成
- v1.0.0 (2025-08-23) - Analytics Engine 完成

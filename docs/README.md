# LMS-ESID 文檔索引

> **Last Updated**: 2025-12-24
> **Project**: learning-management-system-esid
> **Version**: 1.64.0

本目錄包含專案的所有技術文檔、指南與參考資料。

---

## 📋 文檔目錄

### 🚀 設定指南 (Setup)

- **[Supabase Cloud 設定指南](setup/SUPABASE_CLOUD_SETUP.md)**
  - 完整的 Supabase Official Cloud 專案建立步驟
  - 資料庫 Schema 部署方法
  - 環境變數配置指引
  - 資料遷移步驟
  - 驗證測試清單

---

### 📖 開發指南 (Guides)

- **[部署指南 (DEPLOYMENT_GUIDE.md)](guides/DEPLOYMENT_GUIDE.md)**
  - 生產環境部署完整流程
  - Zeabur (前端) + Supabase Cloud (後端) 配置
  - 環境變數設定
  - 資料庫初始化
  - 驗證測試步驟

- **[測試指南 (TESTING_GUIDE.md)](guides/TESTING_GUIDE.md)**
  - 測試框架說明
  - 單元測試規範
  - 端對端測試流程
  - 測試資料準備

---

### 🔧 故障排除 (Troubleshooting)

- **[Claude Code 環境變數快取問題](troubleshooting/TROUBLESHOOTING_CLAUDE_CODE.md)**
  - 問題描述與技術根因
  - 症狀識別清單
  - 完整診斷步驟
  - 4 種解決方案（含優缺點分析）
  - 預防策略建議

---

### 📚 參考資料 (Reference)

- **[測試帳號清單 (TEST_ACCOUNTS.md)](reference/TEST_ACCOUNTS.md)**
  - Admin、Head Teacher、Teacher 測試帳號
  - 角色權限說明
  - 測試資料概覽

- **[LMS 架構決策分析 (LMS_ARCHITECTURE_DECISION_ANALYSIS.md)](reference/LMS_ARCHITECTURE_DECISION_ANALYSIS.md)**
  - 系統架構設計決策
  - 技術選型理由
  - 架構演進歷史

#### 🗂️ 資料庫 Migration 文檔

- **[Migration 003: Courses Architecture](reference/migrations/README_MIGRATION_003.md)**
  - 課程架構兩階段遷移說明
  - ENUM 值新增步驟
  - 課程與學生註冊表建立

- **[Migration 004: Primary School Constraints](reference/migrations/README_MIGRATION_004.md)**
  - 從中學制 (G7-G12) 改為小學制 (G1-G6)
  - Grade 約束條件更新
  - 驗證測試步驟

- **[Migration 004 Fix: 現存資料處理](reference/migrations/README_MIGRATION_004_FIX.md)**
  - 處理現存中學制資料的約束衝突
  - 兩階段修復流程
  - 安全遷移策略

---

### 🗄️ 歷史歸檔 (Archived)

- **[Zeabur 自架 Supabase 配置（已廢棄）](archived/ARCHIVED_ZEABUR_CONFIG.md)**
  - 舊版 Zeabur 自託管 Supabase 設定方式
  - 已於 2025-10-16 遷移至 Supabase Official Cloud
  - 僅供歷史參考

---

## 🔗 快速導航

### 新手入門
1. 閱讀 [專案根目錄 README.md](../README.md) 了解專案概覽
2. 閱讀 [CLAUDE.md](../CLAUDE.md) 了解開發規範
3. 參考 [Supabase Cloud 設定指南](setup/SUPABASE_CLOUD_SETUP.md) 建立開發環境
4. 使用 [測試帳號](reference/TEST_ACCOUNTS.md) 進行功能測試

### 遇到問題？
1. 檢查 [故障排除指南](troubleshooting/TROUBLESHOOTING_CLAUDE_CODE.md)
2. 參考 [測試指南](guides/TESTING_GUIDE.md) 驗證環境配置
3. 查看 [部署指南](guides/DEPLOYMENT_GUIDE.md) 的驗證步驟

### 部署到生產環境
1. 完成 [Supabase Cloud 設定](setup/SUPABASE_CLOUD_SETUP.md)
2. 遵循 [部署指南](guides/DEPLOYMENT_GUIDE.md) 步驟
3. 執行完整測試驗證

---

## 📝 文檔貢獻

### 文檔組織原則

根據 [CLAUDE.md](../CLAUDE.md) 規範：

- ✅ **根目錄僅保留**: `CLAUDE.md`, `README.md`
- ✅ **所有其他文檔**: 必須放在 `/docs/` 目錄下
- ✅ **分類原則**:
  - `setup/` - 初始設定與環境配置
  - `guides/` - 開發、測試、部署指南
  - `troubleshooting/` - 問題診斷與解決方案
  - `reference/` - 參考資料與技術文檔
  - `archived/` - 已廢棄或歷史文檔

### 文檔更新指引

1. 所有文檔使用 Markdown 格式
2. 包含 `Last Updated` 日期標記
3. 使用相對路徑進行文檔間連結
4. 重大變更需更新此索引文件
5. 廢棄文檔移至 `archived/` 並加上警告標記

---

**🎯 LMS-ESID Documentation | v1.4.0**
📅 Updated: 2025-10-16 | 📁 Organized Structure | 🔗 Cross-Referenced

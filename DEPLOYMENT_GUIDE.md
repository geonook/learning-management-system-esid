# 🚀 Primary School LMS - 部署指南

## 🎯 清空重建部署流程

這個指南說明如何部署全新的小學 LMS 架構，解決所有先前的 migration 混亂問題。

## 📋 前置準備

### 1. Supabase 配置
確保你有以下資訊：
- ✅ Supabase Project URL
- ✅ Anon Key  
- 🚨 **Service Role Key**（必須！用於資料庫寫入操作）

### 2. 環境變數配置
編輯 `.env.local` 檔案：

```env
# Zeabur Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://esid-lms.zeabur.app
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# 🚨 Critical: 取消註解並填入真實的 Service Role Key
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Development settings
NODE_ENV=development
```

**⚠️ 如何獲取 Service Role Key：**
1. 登入 Supabase Dashboard
2. 前往 Settings > API
3. 複製 `service_role` secret (不是 anon public)
4. 貼到 `.env.local` 的 `SUPABASE_SERVICE_ROLE_KEY`

## 🔄 部署步驟

### Phase 1: 重置資料庫
```bash
# 1. 登入 Supabase
npx supabase login

# 2. 連接到專案
npx supabase link --project-ref YOUR_PROJECT_ID

# 3. 重置資料庫（⚠️ 會清空所有資料）
npx supabase db reset

# 4. 部署新的乾淨架構
psql -h YOUR_DB_HOST -U postgres -d postgres -f db/schemas/primary_school_clean_schema.sql
```

### Phase 2: 驗證部署
```bash
# 1. 啟動開發伺服器
npm run dev

# 2. 測試基礎連線
curl http://localhost:3000/api/test-db

# 3. 執行匯入測試
# 前往 /admin/import 頁面測試上傳功能
```

### Phase 3: 匯入測試資料
使用新的 CSV 模板（基於乾淨架構）匯入測試資料：

1. **Users** (25 records)
2. **Classes** (18 records) 
3. **Courses** (54 records)
4. **Students** (19 records)

## 📊 預期結果

### 成功指標
- ✅ 資料庫表格結構乾淨，沒有 migration 殘留
- ✅ Service Role 權限正常，可以寫入資料
- ✅ CSV 匯入功能完全正常
- ✅ 所有 4 個階段匯入成功，資料確實寫入資料庫

### 故障排除

#### 問題：「403 Forbidden」錯誤
**原因：** Service Role Key 未配置或錯誤
**解決：** 確認 `.env.local` 中的 `SUPABASE_SERVICE_ROLE_KEY` 正確

#### 問題：「Migration 錯誤」
**原因：** 舊的 migration 殘留
**解決：** 完全重置資料庫，重新執行乾淨架構

#### 問題：「RLS policy 阻擋」
**原因：** Service role 政策未正確配置
**解決：** 檢查乾淨架構中的 RLS 政策是否正確部署

## 🏗️ 架構說明

### 清理的問題
- ❌ 移除了 6+ 個混亂的 migration 檔案
- ❌ 移除了重複的 enum 定義
- ❌ 移除了中學→小學的轉換殘留

### 新架構優勢
- ✅ 一次到位的小學 G1-G6 設計
- ✅ 清楚的業務邏輯和約束條件
- ✅ 完整的 RLS 安全政策
- ✅ 最佳化的索引策略
- ✅ 標準化的 CSV 匯入流程

## 📝 後續維護

### 資料庫變更
- 所有變更都基於這個乾淨的 `primary_school_clean_schema.sql`
- 新增功能時，建立新的 migration 檔案，但基於乾淨基礎

### CSV 匯入
- 使用新的模板和驗證規則
- 所有匯入都透過 Service Role 執行
- 完整的錯誤處理和回復機制

---

**🎯 記住：這是一次性的大清理。完成後，系統將更穩定、可維護，不會再有「越改越多洞」的問題。**
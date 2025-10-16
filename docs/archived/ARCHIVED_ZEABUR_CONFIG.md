# 🗄️ [ARCHIVED] Zeabur Supabase 配置指南

> **⚠️ ARCHIVED DOCUMENTATION**
> **Archived Date**: 2025-10-16
> **Reason**: Project migrated to Supabase Official Cloud
> **Current Setup**: See [SUPABASE_CLOUD_SETUP.md](../setup/SUPABASE_CLOUD_SETUP.md)
>
> This document is preserved for historical reference only.

---

## 🎯 問題確認
你的 Supabase 是部署在 Zeabur 上的**自託管實例**，不是 Supabase Cloud。配置方式完全不同！

**注意**: 本專案已於 2025-10-16 遷移至 Supabase Official Cloud，此配置方式已不再使用。

## 📋 獲取正確的 API Keys

### Step 1: 登入 Zeabur 控制台
1. 前往 https://zeabur.com
2. 登入你的帳號
3. 進入包含 `esid-lms` Supabase 部署的專案

### Step 2: 找到 Supabase 服務
在 Zeabur 專案中，你應該會看到多個 Supabase 相關的服務：
- **kong**（API Gateway）- 這裡有 API Keys
- **postgresql**（資料庫）- 這裡有 JWT Secret
- **supabase-studio**（管理界面）
- **auth**（認證服務）
- 其他服務...

### Step 3: 獲取 API Keys

#### 方法 A：從 Kong 服務環境變數
1. 點擊 **kong** 服務
2. 前往 **Variables** 或 **Environment** 標籤
3. 尋找以下變數：
   ```
   SUPABASE_ANON_KEY=eyJ...
   SUPABASE_SERVICE_ROLE_KEY=eyJ...
   ```
4. 複製這些完整的 JWT token

#### 方法 B：從 Supabase Studio
1. 點擊 **supabase-studio** 服務
2. 開啟服務的公開 URL（通常是你的 studio 管理界面）
3. 登入 Supabase Studio
4. 前往 **Settings** → **API**
5. 複製 **anon** 和 **service_role** keys

### Step 4: 更新 .env.local
將獲取的 keys 填入：

```env
# Zeabur Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://esid-lms.zeabur.app
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... (從上面獲取的 ANON KEY)

# 🚨 Critical: 填入從 Zeabur/Kong 獲取的 Service Role Key
SUPABASE_SERVICE_ROLE_KEY=eyJ... (從上面獲取的 SERVICE ROLE KEY)

# Development settings
NODE_ENV=development
```

## ⚠️ 常見問題

### Q: 找不到 kong 服務？
A: 檢查專案中是否有其他名稱的 API Gateway 服務，或查看 Docker Compose 配置

### Q: Environment Variables 是空的？
A: 可能需要重新部署或檢查 Zeabur 模板配置

### Q: JWT Token 格式不對？
A: 正確的格式應該是 `eyJ...` 開頭的長字串（通常 200+ 字符）

## 🧪 驗證配置

完成配置後：
1. 重新啟動 Next.js 應用：`npm run dev`
2. 測試連接：`curl http://localhost:3000/api/test-db`
3. 查看結果應該顯示：
   ```json
   {
     "overall_status": "ready_for_import" 或 "needs_schema",
     "environment": {
       "has_service_key": true
     }
   }
   ```

## 🆘 如果還是找不到

如果你在 Zeabur 中找不到這些配置，請：
1. 截圖 Zeabur 專案的服務列表
2. 截圖任何看起來像 Supabase 相關的服務配置
3. 告訴我你看到了什麼服務名稱

我會根據你的具體配置調整指導。

---

**🗄️ ARCHIVED DOCUMENT | Zeabur Self-Hosted Supabase Configuration**
📅 Archived: 2025-10-16 | ☁️ Migrated to Supabase Official Cloud
🔗 Current Setup Guide: [SUPABASE_CLOUD_SETUP.md](../setup/SUPABASE_CLOUD_SETUP.md)
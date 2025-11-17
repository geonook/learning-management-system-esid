# Zeabur 環境變數檢查清單

> **文件版本**: 1.0.0
> **最後更新**: 2025-11-17
> **目的**: 確保 Zeabur 部署環境的所有必要環境變數都已正確設定

---

## 📋 環境變數檢查清單

### ✅ 核心 SSO 配置（必須設定）

| 變數名稱 | 必要性 | Staging 值 | Production 值 | 說明 |
|---------|--------|-----------|--------------|------|
| `NEXT_PUBLIC_APP_URL` | **🔴 CRITICAL** | `https://lms-staging.zeabur.app` | `https://lms.kcislk.ntpc.edu.tw` | LMS 應用程式網址（用於 OAuth redirect_uri） |
| `NEXT_PUBLIC_INFOHUB_AUTH_URL` | **🔴 CRITICAL** | `https://next14-landing.zeabur.app/api/oauth/authorize` | `https://infohub.kcislk.ntpc.edu.tw/api/oauth/authorize` | Info Hub OAuth 授權端點 |
| `NEXT_PUBLIC_INFOHUB_OAUTH_CLIENT_ID` | **🔴 CRITICAL** | `eb88b24e-8392-45c4-b7f7-39f03b6df208` | (待提供) | OAuth Client ID |
| `INFOHUB_TOKEN_URL` | **🔴 CRITICAL** | `https://next14-landing.zeabur.app/api/oauth/token` | `https://infohub.kcislk.ntpc.edu.tw/api/oauth/token` | Info Hub Token Exchange 端點 |
| `INFOHUB_OAUTH_CLIENT_SECRET` | **🔴 CRITICAL** | `gmkJlzEuEsr0DxdKqtAO/eyTK+5UqnqT9QWPojkROd0=` | (待提供) | OAuth Client Secret (256-bit) |

### ✅ Webhook 配置（必須設定）

| 變數名稱 | 必要性 | Staging 值 | Production 值 | 說明 |
|---------|--------|-----------|--------------|------|
| `LMS_WEBHOOK_SECRET` | **🔴 CRITICAL** | `9SMvwZ8SAumw5qJ/QAX0XMRz7XH8n3jEVjTjSFe3YuE=` | (待提供) | Webhook 驗證密鑰（256-bit） |
| `NEXT_PUBLIC_LMS_WEBHOOK_URL` | **🔴 CRITICAL** | `https://lms-staging.zeabur.app/api/webhook/user-sync` | `https://lms.kcislk.ntpc.edu.tw/api/webhook/user-sync` | LMS Webhook 接收端點 |

### ✅ Supabase 配置（必須設定）

| 變數名稱 | 必要性 | 值（所有環境相同） | 說明 |
|---------|--------|------------------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | **🔴 CRITICAL** | `https://piwbooidofbaqklhijup.supabase.co` | Supabase 專案 URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | **🔴 CRITICAL** | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Supabase Anon Key（公開金鑰） |
| `SUPABASE_SERVICE_ROLE_KEY` | **🔴 CRITICAL** | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` | Supabase Service Role Key（**保密**） |

### ✅ 功能開關（Feature Flags）

| 變數名稱 | 必要性 | 建議值 | 說明 |
|---------|--------|--------|------|
| `NEXT_PUBLIC_ENABLE_SSO` | **🔴 CRITICAL** | `true` | 啟用 SSO 登入功能 |
| `NEXT_PUBLIC_ENABLE_EMAIL_PASSWORD_AUTH` | 🟡 OPTIONAL | `true` | 啟用 Email/Password 登入（建議在 SSO 完成前保留） |

### ✅ Next.js 環境配置

| 變數名稱 | 必要性 | 值 | 說明 |
|---------|--------|-----|------|
| `NODE_ENV` | **🔴 CRITICAL** | `production` | Node.js 環境（Zeabur 自動設定） |
| `NEXT_PUBLIC_USE_MOCK_AUTH` | 🟡 OPTIONAL | `false` | 開發用 Mock 認證（正式環境**必須**為 false） |

### ✅ Zeabur 內部變數（自動設定）

| 變數名稱 | 設定方式 | 說明 |
|---------|---------|------|
| `PORT` | 自動 | Zeabur 自動設定的服務埠號 |
| `PASSWORD` | 自動 | Zeabur 內部服務密碼 |
| `*_HOST` | 自動 | Zeabur 服務內部主機名稱 |

---

## 🔍 驗證方式

### Method 1: Zeabur 控制台檢查

1. 登入 Zeabur Dashboard
2. 選擇專案：`learning-management-system-esid`
3. 進入「Environment Variables」
4. 逐一檢查上述所有變數

**檢查要點**：
- ✅ 變數名稱拼寫正確
- ✅ 沒有多餘的空格
- ✅ 值沒有被意外刪除或修改
- ✅ URL 使用正確的 protocol（http vs https）
- ✅ URL 沒有結尾斜線（`/`）

---

### Method 2: 使用診斷 API

**部署後驗證**：

1. 訪問診斷端點：
   ```
   https://lms-staging.zeabur.app/api/debug/env
   ```

2. 檢查回應的 JSON：

**Staging 環境預期輸出**：
```json
{
  "NEXT_PUBLIC_APP_URL": "https://lms-staging.zeabur.app",
  "NEXT_PUBLIC_INFOHUB_AUTH_URL": "https://next14-landing.zeabur.app/api/oauth/authorize",
  "NEXT_PUBLIC_INFOHUB_OAUTH_CLIENT_ID": "eb88b24e-8392-45c4-b7f7-39f03b6df208",
  "NEXT_PUBLIC_LMS_WEBHOOK_URL": "https://lms-staging.zeabur.app/api/webhook/user-sync",
  "NEXT_PUBLIC_ENABLE_SSO": "true",
  "NEXT_PUBLIC_ENABLE_EMAIL_PASSWORD_AUTH": "true",
  "NEXT_PUBLIC_SUPABASE_URL": "https://piwbooidofbaqklhijup.supabase.co",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY": "eyJhbGciOiJIUzI1NiI...",
  "INFOHUB_TOKEN_URL": "https://next14-landing.zeabur.app/api/oauth/token",
  "INFOHUB_OAUTH_CLIENT_SECRET": "SET (hidden)",
  "LMS_WEBHOOK_SECRET": "SET (hidden)",
  "SUPABASE_SERVICE_ROLE_KEY": "SET (hidden)",
  "NODE_ENV": "production",
  "computed": {
    "oauth_callback_url": "https://lms-staging.zeabur.app/api/auth/callback/infohub",
    "is_production": true,
    "sso_enabled": true
  }
}
```

**檢查要點**：
- ✅ 所有 `NEXT_PUBLIC_*` 變數都**不是** `NOT SET`
- ✅ `computed.oauth_callback_url` 使用正確的部署網址（**非 localhost**）
- ✅ `NODE_ENV` 為 `production`
- ✅ `computed.sso_enabled` 為 `true`
- ✅ 所有 secret 變數顯示 `SET (hidden)`

---

## ⚠️ 常見錯誤

### 錯誤 1: localhost 出現在 redirect_uri

**症狀**：
```json
{
  "computed": {
    "oauth_callback_url": "http://localhost:3000/api/auth/callback/infohub"
  }
}
```

**原因**：
- `NEXT_PUBLIC_APP_URL` 未設定或設定錯誤
- 或者環境變數設定後**未觸發重新建置**

**解決方案**：
1. 確認 Zeabur 環境變數 `NEXT_PUBLIC_APP_URL` 已正確設定
2. 觸發 Zeabur Redeploy（參考 [ZEABUR_REDEPLOY_GUIDE.md](./ZEABUR_REDEPLOY_GUIDE.md)）

---

### 錯誤 2: Secret 變數顯示 NOT SET

**症狀**：
```json
{
  "INFOHUB_OAUTH_CLIENT_SECRET": "NOT SET",
  "LMS_WEBHOOK_SECRET": "NOT SET",
  "SUPABASE_SERVICE_ROLE_KEY": "NOT SET"
}
```

**原因**：
- Server-side 環境變數未在 Zeabur 設定

**解決方案**：
1. 登入 Zeabur Dashboard
2. 在「Environment Variables」中新增缺少的變數
3. 觸發 Redeploy

---

### 錯誤 3: SSO 未啟用

**症狀**：
```json
{
  "NEXT_PUBLIC_ENABLE_SSO": "false",
  "computed": {
    "sso_enabled": false
  }
}
```

**原因**：
- Feature flag 設定錯誤

**解決方案**：
1. 確認 `NEXT_PUBLIC_ENABLE_SSO=true`（字串 "true"，非布林值）
2. 觸發 Redeploy

---

### 錯誤 4: 診斷 API 404 Not Found

**症狀**：
```
GET https://lms-staging.zeabur.app/api/debug/env
404 Not Found
```

**原因**：
- 診斷 API 程式碼尚未部署

**解決方案**：
1. 確認最新 commit 包含 `app/api/debug/env/route.ts`
2. Git push 到 main branch
3. 等待 Zeabur 自動部署完成

---

## 📊 完整環境變數範本

### Staging 環境

```env
# ========================================
# NEXT.JS ENVIRONMENT
# ========================================
NODE_ENV=production

# ========================================
# LMS APPLICATION URL
# ========================================
NEXT_PUBLIC_APP_URL=https://lms-staging.zeabur.app

# ========================================
# SSO INTEGRATION - INFO HUB STAGING
# ========================================
# OAuth 2.0 + PKCE Configuration
NEXT_PUBLIC_INFOHUB_OAUTH_CLIENT_ID=eb88b24e-8392-45c4-b7f7-39f03b6df208
INFOHUB_OAUTH_CLIENT_SECRET=gmkJlzEuEsr0DxdKqtAO/eyTK+5UqnqT9QWPojkROd0=

# Info Hub OAuth Endpoints
NEXT_PUBLIC_INFOHUB_AUTH_URL=https://next14-landing.zeabur.app/api/oauth/authorize
INFOHUB_TOKEN_URL=https://next14-landing.zeabur.app/api/oauth/token

# Webhook Configuration
LMS_WEBHOOK_SECRET=9SMvwZ8SAumw5qJ/QAX0XMRz7XH8n3jEVjTjSFe3YuE=
NEXT_PUBLIC_LMS_WEBHOOK_URL=https://lms-staging.zeabur.app/api/webhook/user-sync

# SSO Feature Flags
NEXT_PUBLIC_ENABLE_SSO=true
NEXT_PUBLIC_ENABLE_EMAIL_PASSWORD_AUTH=true

# ========================================
# SUPABASE CONFIGURATION
# ========================================
NEXT_PUBLIC_SUPABASE_URL=https://piwbooidofbaqklhijup.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpd2Jvb2lkb2ZiYXFrbGhpanVwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MDgxMTIsImV4cCI6MjA3NjA4NDExMn0.Pu1MDlfbJkzXLbfBVMp9Gnz5oF0zWhVEgUq-l6BYVvQ
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBpd2Jvb2lkb2ZiYXFrbGhpanVwIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDUwODExMiwiZXhwIjoyMDc2MDg0MTEyfQ.UQUvbBrbc1eR6Ox_RIpxq8Qviiw8zWjHDlObcTfZGPE

# ========================================
# DEVELOPMENT SETTINGS (Optional)
# ========================================
NEXT_PUBLIC_USE_MOCK_AUTH=false
```

### Production 環境（待完成）

```env
# ========================================
# NEXT.JS ENVIRONMENT
# ========================================
NODE_ENV=production

# ========================================
# LMS APPLICATION URL
# ========================================
NEXT_PUBLIC_APP_URL=https://lms.kcislk.ntpc.edu.tw

# ========================================
# SSO INTEGRATION - INFO HUB PRODUCTION
# ========================================
# OAuth 2.0 + PKCE Configuration (待提供)
NEXT_PUBLIC_INFOHUB_OAUTH_CLIENT_ID=(待 Info Hub 提供)
INFOHUB_OAUTH_CLIENT_SECRET=(待 Info Hub 提供)

# Info Hub OAuth Endpoints (Production)
NEXT_PUBLIC_INFOHUB_AUTH_URL=https://infohub.kcislk.ntpc.edu.tw/api/oauth/authorize
INFOHUB_TOKEN_URL=https://infohub.kcislk.ntpc.edu.tw/api/oauth/token

# Webhook Configuration (待提供)
LMS_WEBHOOK_SECRET=(待 Info Hub 提供)
NEXT_PUBLIC_LMS_WEBHOOK_URL=https://lms.kcislk.ntpc.edu.tw/api/webhook/user-sync

# SSO Feature Flags
NEXT_PUBLIC_ENABLE_SSO=true
NEXT_PUBLIC_ENABLE_EMAIL_PASSWORD_AUTH=false

# ========================================
# SUPABASE CONFIGURATION (相同)
# ========================================
NEXT_PUBLIC_SUPABASE_URL=https://piwbooidofbaqklhijup.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=(相同)
SUPABASE_SERVICE_ROLE_KEY=(相同)

# ========================================
# DEVELOPMENT SETTINGS
# ========================================
NEXT_PUBLIC_USE_MOCK_AUTH=false
```

---

## 📚 相關文件

- [SSO Integration Overview](./SSO_INTEGRATION_OVERVIEW.md)
- [Redirect URI Mismatch Fix](./REDIRECT_URI_MISMATCH_FIX.md)
- [Zeabur Redeploy Guide](./ZEABUR_REDEPLOY_GUIDE.md)
- [.env.local.example](../../.env.local.example)

---

## ✅ 檢查清單總結

**部署前檢查**：
- [ ] 所有 🔴 CRITICAL 變數都已在 Zeabur 設定
- [ ] 變數值與環境相符（Staging vs Production）
- [ ] Secret 變數已正確複製（無多餘空格）
- [ ] URL 使用正確 protocol（http vs https）
- [ ] `NEXT_PUBLIC_APP_URL` 匹配部署網址

**部署後驗證**：
- [ ] 訪問診斷 API 確認環境變數
- [ ] 檢查 `computed.oauth_callback_url` 為正確網址
- [ ] 測試 SSO 登入流程
- [ ] 驗證 redirect_uri 一致性

---

**最後更新**: 2025-11-17
**文件狀態**: ✅ 完整

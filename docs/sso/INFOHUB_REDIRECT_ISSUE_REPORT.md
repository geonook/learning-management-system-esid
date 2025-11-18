# Info Hub OAuth Redirect Issue Report

> **日期**: 2025-11-18
> **嚴重程度**: 🔴 **CRITICAL** - 阻止 SSO 整合測試
> **狀態**: ⏳ **待 Info Hub 團隊修復**

---

## 📋 問題摘要

**問題描述**: Info Hub 在 Google 登入成功後，沒有重定向回 LMS 的 `redirect_uri`，而是重定向到錯誤的網址 `https://localhost:8080/dashboard`

**影響範圍**: 100% 的 SSO 登入失敗，無法完成 OAuth 流程

**預期行為**: Info Hub 應該重定向回 LMS 提供的 `redirect_uri` 參數
**實際行為**: Info Hub 重定向到 `https://localhost:8080/dashboard`

---

## 🔍 技術分析

### OAuth 2.0 標準流程

```
1. LMS 發送授權請求到 Info Hub
   ↓
   GET https://next14-landing.zeabur.app/api/oauth/authorize
   Parameters:
   - client_id: eb88b24e-8392-45c4-b7f7-39f03b6df208
   - redirect_uri: https://lms-staging.zeabur.app/api/auth/callback/infohub ✅
   - response_type: code
   - code_challenge: [PKCE challenge]
   - code_challenge_method: S256
   - state: [CSRF token]
   - scope: openid profile email

2. Info Hub 重定向到 Google OAuth
   ↓
   [使用者在 Google 登入成功]

3. Google 重定向回 Info Hub
   ↓
   Info Hub 收到 Google 的 authorization code

4. Info Hub 應該重定向回 LMS ❌ (此步驟失敗)
   ↓
   預期: https://lms-staging.zeabur.app/api/auth/callback/infohub?code=xxx&state=yyy
   實際: https://localhost:8080/dashboard ❌
```

### 實際錯誤截圖證據

**瀏覽器 DevTools Network 標籤顯示**:
- Request URL: `https://localhost:8080/dashboard`
- Referrer: `https://accounts.google.com/`
- Status: ERR_CONNECTION_REFUSED（因為 localhost:8080 不存在）

**關鍵發現**:
- Referrer 是 `accounts.google.com`，證明上一步是 Google OAuth
- 但重定向的目標不是 LMS 的 callback endpoint
- 而是 `localhost:8080/dashboard`（這個網址來源不明）

---

## 🐛 問題根源推測

### 可能原因 1: Info Hub 使用了錯誤的配置
Info Hub 在 Google 登入成功後，可能從某個配置檔案或資料庫讀取了錯誤的 `redirect_uri`，而不是使用 LMS 在步驟 1 提供的參數。

**檢查項目**:
```javascript
// Info Hub 應該儲存並使用授權請求中的 redirect_uri
const savedRedirectUri = authorizationRequest.redirect_uri // 應該是這個
const wrongRedirectUri = config.default_redirect_uri      // 不應該用這個
```

### 可能原因 2: Session 或 State 管理問題
Info Hub 可能在 Google 回調後，無法正確找回原始的授權請求資訊（包括 `redirect_uri`），導致使用了預設值。

**檢查項目**:
```javascript
// Info Hub 需要在 Google 回調時，根據 state 參數找回原始請求
const originalRequest = findAuthorizationRequest(state)
const redirectUri = originalRequest.redirect_uri // 必須正確取得
```

### 可能原因 3: OAuth Client 配置錯誤
OAuth Client (`eb88b24e-8392-45c4-b7f7-39f03b6df208`) 的配置中，可能有一個 `default_redirect_uri` 設定為 `localhost:8080/dashboard`。

**檢查項目**:
```sql
-- 檢查 OAuth Client 配置
SELECT
  client_id,
  redirect_uris,  -- 應該包含 https://lms-staging.zeabur.app/api/auth/callback/infohub
  default_redirect_uri  -- 不應該是 localhost:8080
FROM oauth_clients
WHERE client_id = 'eb88b24e-8392-45c4-b7f7-39f03b6df208';
```

---

## ✅ LMS 端驗證（已完成）

### 1. 環境變數檢查 ✅
```bash
curl https://lms-staging.zeabur.app/api/debug/env
```

**結果**:
```json
{
  "NEXT_PUBLIC_APP_URL": "https://lms-staging.zeabur.app",
  "computed": {
    "oauth_callback_url": "https://lms-staging.zeabur.app/api/auth/callback/infohub"
  }
}
```
✅ LMS 環境變數正確

### 2. 授權請求參數檢查 ✅
使用瀏覽器 DevTools 檢查 LMS 發送的授權請求：

**預期 URL**:
```
https://next14-landing.zeabur.app/api/oauth/authorize
  ?client_id=eb88b24e-8392-45c4-b7f7-39f03b6df208
  &redirect_uri=https://lms-staging.zeabur.app/api/auth/callback/infohub
  &response_type=code
  &code_challenge=[SHA256 hash]
  &code_challenge_method=S256
  &state=[random token]
  &scope=openid+profile+email
```

✅ LMS 發送正確的 `redirect_uri` 參數

### 3. Client-side 程式碼驗證 ✅
```typescript
// lib/config/sso.ts
export function getOAuthCallbackUrl(): string {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/auth/callback/infohub`
  }
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  return `${baseUrl}/api/auth/callback/infohub`
}
```

✅ 使用 `window.location.origin`，在 staging 環境會返回正確的 URL

---

## 🔧 需要 Info Hub 團隊檢查的項目

### Critical 檢查清單

- [ ] **1. OAuth Client 配置檢查**
  ```sql
  SELECT * FROM oauth_clients
  WHERE client_id = 'eb88b24e-8392-45c4-b7f7-39f03b6df208';
  ```
  確認:
  - `redirect_uris` 是否包含 `https://lms-staging.zeabur.app/api/auth/callback/infohub`
  - `default_redirect_uri` 是否正確（不應該是 localhost:8080）

- [ ] **2. 授權請求儲存邏輯檢查**
  Info Hub 在收到 LMS 的授權請求時，是否正確儲存 `redirect_uri` 參數？
  ```javascript
  // Info Hub 授權端點應該儲存請求參數
  app.get('/api/oauth/authorize', (req, res) => {
    const { redirect_uri, state, code_challenge } = req.query

    // 儲存到 session 或資料庫
    saveAuthorizationRequest({
      state,
      redirect_uri,  // ← 必須儲存這個
      code_challenge,
      client_id: req.query.client_id
    })

    // 重定向到 Google
    res.redirect(googleAuthUrl)
  })
  ```

- [ ] **3. Google 回調處理邏輯檢查**
  Info Hub 收到 Google 回調後，是否正確取得原始的 `redirect_uri`？
  ```javascript
  // Info Hub Google 回調端點
  app.get('/api/oauth/google/callback', (req, res) => {
    const { code, state } = req.query

    // 根據 state 找回原始授權請求
    const originalRequest = findAuthorizationRequest(state)
    const redirectUri = originalRequest.redirect_uri  // ← 必須正確取得

    // 重定向回 LMS
    res.redirect(`${redirectUri}?code=xxx&state=${state}`)  // ← 應該用這個
  })
  ```

- [ ] **4. 日誌檢查**
  請檢查 Info Hub 伺服器日誌，查看：
  - 授權請求收到的 `redirect_uri` 參數值
  - Google 回調後，準備重定向的目標 URL
  - 任何錯誤或警告訊息

---

## 📊 測試資料

### LMS 測試帳號
- Email: `lkclassipd@kcislk.ntpc.edu.tw`
- Role: `head`
- Teacher Type: `IT`
- Grade: 需要設定（目前為 null，會導致資料庫約束錯誤）

### OAuth Client 資訊
- Client ID: `eb88b24e-8392-45c4-b7f7-39f03b6df208`
- Client Secret: `gmkJlzEuEsr0DxdKqtAO/eyTK+5UqnqT9QWPojkROd0=`
- 預期 redirect_uri: `https://lms-staging.zeabur.app/api/auth/callback/infohub`

---

## 🎯 預期修復方案

Info Hub 團隊需要確保以下流程正確：

```javascript
// Step 1: 收到 LMS 授權請求
POST /api/oauth/authorize
{
  client_id: "eb88b24e-8392-45c4-b7f7-39f03b6df208",
  redirect_uri: "https://lms-staging.zeabur.app/api/auth/callback/infohub",
  state: "xyz123",
  ...
}
→ 儲存 redirect_uri 到 session/database

// Step 2: 重定向到 Google
→ Google OAuth

// Step 3: Google 回調
GET /api/oauth/google/callback?code=abc&state=xyz123
→ 根據 state 找回原始 redirect_uri
→ redirect_uri = "https://lms-staging.zeabur.app/api/auth/callback/infohub"

// Step 4: 重定向回 LMS
res.redirect("https://lms-staging.zeabur.app/api/auth/callback/infohub?code=abc&state=xyz123")
→ 必須使用步驟 1 儲存的 redirect_uri
→ 不能使用預設值或配置檔案中的值
```

---

## 📝 驗證步驟

修復後，請執行以下測試：

1. **訪問 LMS 登入頁面**:
   ```
   https://lms-staging.zeabur.app/auth/login
   ```

2. **點擊 "Login with Google"**

3. **完成 Google 登入**

4. **預期結果**:
   - 瀏覽器應重定向到: `https://lms-staging.zeabur.app/api/auth/callback/infohub?code=...&state=...`
   - **不應該**重定向到: `https://localhost:8080/dashboard`

5. **檢查 Network 標籤**:
   - 應該看到對 `https://lms-staging.zeabur.app/api/auth/callback/infohub` 的請求
   - 狀態碼應該是 302 (重定向到 dashboard)
   - 最終應該成功登入到 LMS Dashboard

---

## 🔗 相關文件

- [SSO Integration Overview](./SSO_INTEGRATION_OVERVIEW.md)
- [OAuth 2.0 RFC 6749 - Redirection Endpoint](https://datatracker.ietf.org/doc/html/rfc6749#section-3.1.2)
- [redirect_uri Mismatch Fix Documentation](./REDIRECT_URI_MISMATCH_FIX.md)

---

## 📞 聯絡資訊

**LMS 開發團隊**: 已完成所有 LMS 端的配置和驗證
**Info Hub 開發團隊**: 請協助檢查上述項目並修復重定向邏輯

**緊急程度**: 🔴 CRITICAL - 此問題阻止所有 SSO 整合測試進行

---

**報告日期**: 2025-11-18
**報告者**: LMS Development Team
**狀態**: ⏳ 待 Info Hub 團隊回覆

# Zeabur 重新部署指南 - 環境變數更新

> **文件版本**: 1.0.0
> **最後更新**: 2025-11-17
> **目的**: 解決 Next.js 環境變數硬編碼導致的 redirect_uri 問題

---

## 📋 問題說明

### 為什麼需要重新部署？

**Next.js `NEXT_PUBLIC_*` 環境變數的特性**：

1. ⚠️ **建置時編譯**: `NEXT_PUBLIC_*` 變數會在 `next build` 時被**硬編碼**進 JavaScript bundle
2. ⚠️ **非執行時讀取**: 這些變數**不是**在執行時動態讀取的
3. ⚠️ **更新無效**: 在 Zeabur 控制台更新環境變數後，**必須重新建置**才會生效

### 症狀識別

如果您遇到以下情況，代表需要重新部署：

```
✅ Zeabur 環境變數已正確設定 NEXT_PUBLIC_APP_URL=https://lms-staging.zeabur.app
❌ 但 OAuth callback URL 仍顯示 http://localhost:3000/api/auth/callback/infohub
❌ SSO 登入失敗，redirect_uri 不匹配錯誤
```

**原因**: 舊的建置已將 `localhost:3000` 編譯進 JavaScript bundle。

---

## 🎯 解決方案

### 方案 A: Git Push 觸發自動部署（推薦）

**優點**:
- ✅ 自動化流程
- ✅ 保留 Git 歷史記錄
- ✅ 可回滾到任何版本

**步驟**:

1. **本地更新文件**（已完成）:
   ```bash
   # 診斷工具和文件已建立
   git status
   ```

2. **提交變更**:
   ```bash
   git add .
   git commit -m "fix(sso): add diagnostic tools for Zeabur environment variable verification"
   ```

3. **推送到 GitHub**:
   ```bash
   git push origin main
   ```

4. **Zeabur 自動部署**:
   - Zeabur 偵測到 GitHub 更新
   - 自動觸發新的建置
   - 環境變數正確編譯進 bundle
   - 約 2-3 分鐘完成

---

### 方案 B: Zeabur 控制台手動重新部署

**優點**:
- ✅ 立即執行
- ✅ 不需要 Git commit

**步驟**:

1. **登入 Zeabur Dashboard**:
   - 前往：https://zeabur.com

2. **選擇專案**:
   - Project: `learning-management-system-esid`
   - Service: `LMS Staging`

3. **觸發重新部署**:
   - 方式 1: 點擊右上角「...」選單 → 「Redeploy」
   - 方式 2: 在 Deployments 頁面 → 點擊最新部署 → 「Redeploy」

4. **等待部署完成**:
   - 狀態：Building → Deploying → Running
   - 時間：約 2-3 分鐘

---

## ✅ 驗證部署成功

### Step 1: 檢查部署狀態

**Zeabur 控制台**:
```
✅ Status: Running
✅ Latest Deployment: 成功
✅ Build Time: 最新時間戳記
```

### Step 2: 訪問診斷 API

**URL**: `https://lms-staging.zeabur.app/api/debug/env`

**預期輸出**:
```json
{
  "NEXT_PUBLIC_APP_URL": "https://lms-staging.zeabur.app",
  "NEXT_PUBLIC_INFOHUB_AUTH_URL": "https://next14-landing.zeabur.app/api/oauth/authorize",
  "NEXT_PUBLIC_INFOHUB_OAUTH_CLIENT_ID": "eb88b24e-8392-45c4-b7f7-39f03b6df208",
  "NEXT_PUBLIC_LMS_WEBHOOK_URL": "https://lms-staging.zeabur.app/api/webhook/user-sync",
  "NEXT_PUBLIC_ENABLE_SSO": "true",
  "NODE_ENV": "production",
  "computed": {
    "oauth_callback_url": "https://lms-staging.zeabur.app/api/auth/callback/infohub",
    "is_production": true,
    "sso_enabled": true
  }
}
```

**檢查重點**:
- ✅ `NEXT_PUBLIC_APP_URL` 為 staging URL（非 localhost）
- ✅ `computed.oauth_callback_url` 為 staging URL（非 localhost）
- ✅ `NODE_ENV` 為 `production`
- ✅ 所有 `NEXT_PUBLIC_*` 變數都不是 `NOT SET`

### Step 3: 測試 SSO 登入流程

1. **訪問登入頁面**:
   ```
   https://lms-staging.zeabur.app/auth/login
   ```

2. **點擊「Login with Google」按鈕**

3. **檢查 Browser DevTools → Network 面板**:
   - 找到 redirect 請求
   - 確認 `redirect_uri` 參數：
     ```
     redirect_uri=https://lms-staging.zeabur.app/api/auth/callback/infohub
     ```
   - ⚠️ **不應該**是 `localhost:3000`

4. **完成 Google OAuth 登入**

5. **檢查 Callback URL**:
   - 瀏覽器 URL 應為：
     ```
     https://lms-staging.zeabur.app/api/auth/callback/infohub?code=...&state=...
     ```
   - ⚠️ **不應該**是 `localhost:3000`

6. **預期結果**:
   - ✅ Token exchange 成功
   - ✅ 重定向到 Dashboard
   - ✅ 使用者已登入

---

## 🔧 疑難排解

### 問題 1: 診斷 API 仍顯示 localhost

**症狀**:
```json
{
  "NEXT_PUBLIC_APP_URL": "NOT SET",
  "computed": {
    "oauth_callback_url": "http://localhost:3000/api/auth/callback/infohub"
  }
}
```

**原因**: 環境變數未設定或部署未完成

**解決方案**:
1. 檢查 Zeabur 環境變數是否正確設定
2. 確認部署已完成（Status: Running）
3. 等待 1-2 分鐘後重新測試
4. 如果仍然失敗，執行「Hard Refresh」（Ctrl+Shift+R 或 Cmd+Shift+R）

---

### 問題 2: 診斷 API 404 Not Found

**症狀**:
```
GET https://lms-staging.zeabur.app/api/debug/env
404 Not Found
```

**原因**: 新程式碼尚未部署

**解決方案**:
1. 確認已執行 Git push（方案 A）
2. 或在 Zeabur 手動 Redeploy（方案 B）
3. 等待部署完成
4. 重新測試

---

### 問題 3: SSO 登入仍失敗

**症狀**:
```
Error: invalid_grant
redirect_uri does not match authorization request
```

**診斷步驟**:

1. **檢查診斷 API**:
   ```bash
   curl https://lms-staging.zeabur.app/api/debug/env
   ```

2. **檢查 Browser DevTools → Console**:
   ```javascript
   // SSOLoginButton.tsx 會輸出 redirect_uri
   console.log('[SSO] Redirect URI:', callbackUri)
   ```

3. **檢查 Network 面板**:
   - 找到 `/api/oauth/authorize` 請求
   - 查看 `redirect_uri` 參數值

4. **比對前後端 redirect_uri**:
   - 前端（Authorization Request）
   - 後端（Token Exchange Request）
   - 兩者**必須完全一致**

**解決方案**:
- 如果不一致，代表部署尚未完成或環境變數未正確載入
- 執行「Hard Refresh」清除瀏覽器快取
- 重新測試 SSO 流程

---

## 📊 部署時間軸

### 正常流程

```
時間點 0: 更新 Zeabur 環境變數
         ↓
時間點 1: Git commit 新文件
         ↓
時間點 2: Git push to GitHub
         ↓
時間點 3: Zeabur 偵測更新（自動，約 10 秒）
         ↓
時間點 4: 開始建置（Building，約 1-2 分鐘）
         ↓
時間點 5: 開始部署（Deploying，約 30 秒）
         ↓
時間點 6: 服務啟動（Running）
         ↓
時間點 7: 驗證診斷 API（立即可用）
         ↓
時間點 8: 測試 SSO 登入（立即可用）
```

**總時長**: 約 2-4 分鐘

---

## 📚 相關文件

- [SSO Integration Overview](./SSO_INTEGRATION_OVERVIEW.md)
- [Redirect URI Mismatch Fix](./REDIRECT_URI_MISMATCH_FIX.md)
- [Zeabur Environment Variables Checklist](./ZEABUR_ENV_CHECKLIST.md)
- [SSO Testing Guide](./SSO_TESTING_GUIDE.md)

---

## 🎯 成功標準

**部署成功的標誌**:

- ✅ 診斷 API 顯示正確的 staging URL
- ✅ SSO 登入 redirect_uri 為 staging URL
- ✅ OAuth callback URL 為 staging URL
- ✅ Token exchange 成功
- ✅ 使用者成功登入 Dashboard

**如果仍有問題**:

1. 檢查 [Zeabur 部署日誌](https://zeabur.com)
2. 查看 [Browser DevTools Console](chrome://inspect)
3. 參考 [疑難排解文件](./REDIRECT_URI_MISMATCH_FIX.md)
4. 聯繫開發團隊支援

---

**最後更新**: 2025-11-17
**文件狀態**: ✅ 完整
**測試狀態**: ⏳ 待驗證

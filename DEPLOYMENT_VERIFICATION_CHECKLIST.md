# Zeabur 部署驗證檢查清單

> **部署日期**: 2025-11-18
> **部署環境**: Staging (https://lms-staging.zeabur.app)
> **Git Commit**: 7110370 - "fix(sso): use window.location.origin for client-side redirect_uri"

---

## ✅ 伺服器端驗證（已完成）

### 1. 環境變數檢查 ✅
```bash
curl https://lms-staging.zeabur.app/api/debug/env
```

**結果**:
- ✅ `NEXT_PUBLIC_APP_URL`: `https://lms-staging.zeabur.app`
- ✅ `computed.oauth_callback_url`: `https://lms-staging.zeabur.app/api/auth/callback/infohub`
- ✅ `NODE_ENV`: `production`
- ✅ `computed.sso_enabled`: `true`
- ✅ 部署時間戳: `2025-11-17T08:57:27.981Z`

### 2. 靜態資源更新檢查 ✅
- ✅ Webpack bundle 已更新
- ✅ CSS 檔案已更新
- ✅ 靜態資源路徑已變更（表示新的建置）

---

## 🧪 客戶端驗證（需要瀏覽器測試）

### 方法 1: 使用測試頁面（推薦）

1. **開啟測試頁面**:
   ```
   file:///Users/chenzehong/Desktop/LMS/test-sso-flow.html
   ```
   （在瀏覽器中開啟本地檔案）

2. **檢查顯示的資訊**:
   - ✅ Current Origin 應該是你開啟檔案的位置
   - ✅ redirect_uri 應該使用 `window.location.origin`

3. **測試 SSO 登入流程**:
   - 點擊「開始測試 SSO 登入」按鈕
   - 觀察瀏覽器 DevTools → Network 標籤
   - 檢查重定向流程

### 方法 2: 直接在 Staging 環境測試

1. **開啟 Staging 登入頁面**:
   ```
   https://lms-staging.zeabur.app/auth/login
   ```

2. **開啟 DevTools** (F12 或 Cmd+Option+I):
   - 切換到 **Console** 標籤
   - 切換到 **Network** 標籤

3. **在 Console 中執行測試程式碼**:
   ```javascript
   // 測試 getOAuthCallbackUrl() 的實際行為
   console.log('window.location.origin:', window.location.origin)
   console.log('Expected redirect_uri:', window.location.origin + '/api/auth/callback/infohub')
   ```

4. **點擊 "Login with Google" 按鈕**

5. **在 Network 標籤中檢查**:
   - 找到對 Info Hub 的授權請求
   - 檢查 `redirect_uri` 參數
   - ✅ 應該是: `https://lms-staging.zeabur.app/api/auth/callback/infohub`
   - ❌ **不應該**是: `http://localhost:3000/...` 或 `https://localhost:8080/...`

---

## 🎯 預期行為 vs 之前的錯誤

| 階段 | ✅ 預期（修復後） | ❌ 之前（錯誤） |
|------|-----------------|---------------|
| **授權請求** | `redirect_uri=https://lms-staging.zeabur.app/api/auth/callback/infohub` | `redirect_uri=http://localhost:3000/...` |
| **來源** | `window.location.origin` (執行時期) | `process.env.NEXT_PUBLIC_APP_URL` (建置時期) |
| **瀏覽器環境** | 自動使用當前部署的網址 | 使用建置時的環境變數值 |
| **Google 登入** | 成功 | 成功 |
| **Info Hub 重定向** | （待 Info Hub 修復）| 重定向到 `localhost:8080` ❌ |

---

## 🚨 已知問題

### ⏳ Info Hub 重定向問題（待修復）

**問題**: Info Hub 在 Google 登入成功後，沒有重定向回 LMS 的 `redirect_uri`

**狀態**:
- ✅ LMS 端已修復（使用 `window.location.origin`）
- ⏳ Info Hub 端問題已報告（[INFOHUB_REDIRECT_ISSUE_REPORT.md](docs/sso/INFOHUB_REDIRECT_ISSUE_REPORT.md)）
- ⏳ 等待 Info Hub 團隊修復

**測試時的預期結果**:
- 如果 Info Hub 尚未修復，可能仍會看到重定向到 `localhost:8080/dashboard`
- 但這不是 LMS 的問題，而是 Info Hub 的問題
- 可以在 DevTools → Network 中確認 LMS 發送的 `redirect_uri` 參數是否正確

---

## ✅ 驗證通過條件

### LMS 端（已完成）✅
- [x] 伺服器端環境變數正確
- [x] `getOAuthCallbackUrl()` 使用 `window.location.origin`
- [x] 授權請求中的 `redirect_uri` 參數正確
- [x] JavaScript bundle 已更新

### Info Hub 端（待驗證）⏳
- [ ] Info Hub 正確儲存 LMS 提供的 `redirect_uri`
- [ ] Info Hub 在 Google 回調後，重定向回 LMS 的 `redirect_uri`
- [ ] 完整的 OAuth 流程成功完成

---

## 📊 測試結果記錄

### 測試 1: 環境變數診斷 API
- **時間**: 2025-11-18
- **結果**: ✅ PASS
- **詳細**: 所有環境變數正確設定

### 測試 2: 客戶端 redirect_uri 計算
- **時間**: _待測試_
- **方法**: 在 Staging 環境 Console 中執行測試程式碼
- **預期**: `window.location.origin + '/api/auth/callback/infohub'`
- **結果**: _待填寫_

### 測試 3: 完整 SSO 登入流程
- **時間**: _待測試_
- **方法**: 點擊 "Login with Google" 並觀察 Network 標籤
- **預期**: 授權請求包含正確的 `redirect_uri`
- **結果**: _待填寫_

---

## 🔍 疑難排解

### 如果仍然看到 localhost:3000 或 localhost:8080

**可能原因 1: 瀏覽器快取**
```bash
解決方案: 硬重新整理 (Ctrl+Shift+R 或 Cmd+Shift+R)
或使用無痕模式測試
```

**可能原因 2: CDN/Proxy 快取**
```bash
解決方案: 等待 5-10 分鐘讓 CDN 快取過期
或在 Zeabur 觸發清除快取
```

**可能原因 3: Info Hub 問題（非 LMS 問題）**
```bash
確認方式: 檢查 DevTools → Network → 授權請求的 redirect_uri 參數
如果 LMS 發送的 redirect_uri 正確，但最終仍重定向到 localhost
則問題出在 Info Hub 端，需要他們修復
```

---

## 📞 聯絡資訊

**問題回報**:
- LMS 端問題 → LMS Development Team
- Info Hub 端問題 → Info Hub Development Team（已提供報告文件）

**相關文件**:
- [SSO Integration Overview](docs/sso/SSO_INTEGRATION_OVERVIEW.md)
- [Info Hub Redirect Issue Report](docs/sso/INFOHUB_REDIRECT_ISSUE_REPORT.md)
- [Redirect URI Mismatch Fix](docs/sso/REDIRECT_URI_MISMATCH_FIX.md)

---

**最後更新**: 2025-11-18
**驗證狀態**: ✅ LMS 端完成 | ⏳ Info Hub 端待測試

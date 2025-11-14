# 🧪 SSO Integration Testing Guide
# SSO 整合測試指南

> **Version**: 1.0.0
> **Date**: 2025-11-14
> **Status**: Ready for Testing
> **Environment**: Local Development (localhost:3000)

---

## 📋 測試前檢查清單

### ✅ 已完成的準備工作

- [x] **PKCE Bug 已修復** - Cookie 傳遞 code_verifier
- [x] **develop 分支已建立** - `git checkout develop`
- [x] **環境變數已更新** - Info Hub Staging 憑證
- [x] **TypeScript 驗證** - 0 編譯錯誤
- [x] **開發伺服器啟動** - `npm run dev`

### 🎯 測試目標

快速驗證 OAuth 2.0 + PKCE 基本流程：

1. ✅ PKCE code_verifier 正確傳遞（via cookie）
2. ✅ Authorization request 正常
3. ✅ Token exchange 成功
4. ✅ Compensatory sync 運作（webhook 不可用時）
5. ✅ Session 建立成功
6. ✅ 使用者資料正確映射

---

## 🧪 測試案例

### Test Case 1: Head Teacher 登入（完整流程）

**測試帳號**:
- Email: `head-teacher-g1@kcislk.ntpc.edu.tw`
- Password: `Test123!`
- Expected Role: `office_member` → LMS `head`
- Expected Data:
  - Teacher Type: `LT`
  - Grade Level: `1`
  - Track: `local`

**測試步驟**:

1. **開啟登入頁面**
   ```
   http://localhost:3000/auth/login
   ```

2. **打開瀏覽器 DevTools**
   - Press `F12` or `Cmd+Option+I` (Mac)
   - 切換到 **Console** 頁籤

3. **點擊「使用 Info Hub SSO 登入」按鈕**

4. **檢查 Console 輸出**（預期）:
   ```
   [SSO] Generating PKCE parameters...
   [SSO] PKCE Code Challenge generated: <base64_hash>
   [SSO] Generating state token...
   [SSO] State token saved to sessionStorage
   [SSO] Code verifier stored in secure cookie (expires in 10 minutes)
   [SSO] Redirecting to Info Hub authorization page...
   [SSO] Redirect URI: http://localhost:3000/api/auth/callback/infohub
   ```

5. **檢查 Cookie**（DevTools → Application → Cookies）:
   ```
   Name: pkce_verifier
   Value: <43-128 chars random string>
   Domain: localhost
   Path: /
   Secure: Yes
   SameSite: Lax
   Max-Age: 600 (10 minutes)
   ```

6. **應該自動 Redirect 到 Info Hub**:
   ```
   https://next14-landing.zeabur.app/api/oauth/authorize?
     client_id=eb88b24e-8392-45c4-b7f7-39f03b6df208
     &redirect_uri=http://localhost:3000/api/auth/callback/infohub
     &response_type=code
     &code_challenge=<HASH>
     &code_challenge_method=S256
     &state=<RANDOM_TOKEN>
     &scope=openid+profile+email
   ```

7. **在 Info Hub 登入**:
   - 輸入 Email: `head-teacher-g1@kcislk.ntpc.edu.tw`
   - 輸入 Password: `Test123!`
   - 點擊「Login」或「授權」

8. **Info Hub 應該 Redirect 回 LMS**:
   ```
   http://localhost:3000/api/auth/callback/infohub?
     code=<AUTHORIZATION_CODE>
     &state=<STATE_TOKEN>
   ```

9. **檢查 Console 輸出**（預期）:
   ```
   [OAuth] Callback received
   [OAuth] Code: <code>, State: <state>
   [OAuth] Code verifier retrieved from cookie
   [OAuth] Exchanging authorization code for user data...
   [OAuth] Token exchange success
   [OAuth] Webhook status: { delivered: false }
   [OAuth] Webhook failed, performing compensatory sync
   [OAuth] Creating user via compensatory sync...
   [OAuth] User created: head-teacher-g1@kcislk.ntpc.edu.tw
   [OAuth] Cleared pkce_verifier cookie
   [OAuth] SSO login successful for: head-teacher-g1@kcislk.ntpc.edu.tw
   ```

10. **應該自動 Redirect 到 Dashboard**:
    ```
    http://localhost:3000/dashboard
    ```

11. **驗證使用者資料**（Supabase SQL Editor）:
    ```sql
    SELECT id, email, full_name, role, track, grade, created_at
    FROM users
    WHERE email = 'head-teacher-g1@kcislk.ntpc.edu.tw';
    ```

    **預期結果**:
    ```
    id: <uuid>
    email: head-teacher-g1@kcislk.ntpc.edu.tw
    full_name: Head Teacher G1
    role: head
    track: LT
    grade: 1
    created_at: <timestamp>
    ```

12. **檢查 Dashboard 顯示**:
    - ✅ 顯示使用者名稱：Head Teacher G1
    - ✅ 顯示角色：Head Teacher
    - ✅ 可以看到 Head Teacher 專屬功能
    - ✅ 可以存取 Grade 1 的相關資料

**✅ 成功標準**:
- 完整 OAuth 流程無錯誤
- pkce_verifier cookie 正確設定與清除
- Token exchange 成功
- Compensatory sync 建立使用者
- 使用者資料映射正確
- Dashboard 正常顯示

---

### Test Case 2: IT Teacher 登入（簡化）

**測試帳號**:
- Email: `it-teacher@kcislk.ntpc.edu.tw`
- Password: `Test123!`
- Expected Role: `teacher`
- Expected Data:
  - Teacher Type: `IT`
  - Track: `international`
  - Grade Level: `null`

**測試步驟**:
重複 Test Case 1 的步驟 1-10

**驗證使用者資料**:
```sql
SELECT id, email, full_name, role, track, grade
FROM users
WHERE email = 'it-teacher@kcislk.ntpc.edu.tw';
```

**預期結果**:
```
email: it-teacher@kcislk.ntpc.edu.tw
full_name: International Teacher
role: teacher
track: IT
grade: null
```

**Dashboard 驗證**:
- ✅ 顯示 Teacher 角色
- ✅ 只能看到自己任教的班級
- ✅ 無法存取 Admin/Head 功能

---

### Test Case 3: Viewer 拒絕（錯誤處理）

**測試帳號**:
- Email: `inactive-user@kcislk.ntpc.edu.tw`
- Password: `Test123!`
- Expected Role: `viewer`
- **Expected Result**: ❌ Access Denied

**測試步驟**:
1. 重複 Test Case 1 的步驟 1-7
2. 在 Info Hub 登入 viewer 帳號
3. 授權後應該 **被拒絕**

**檢查 Console 輸出**（預期）:
```
[OAuth] Callback received
[OAuth] Token exchange success
[OAuth] Viewer role denied access: inactive-user@kcislk.ntpc.edu.tw
```

**預期行為**:
- ❌ **Redirect 到**: `http://localhost:3000/auth/login?error=viewer_access_denied`
- ❌ **顯示 Toast 錯誤訊息**: "Viewer 角色無法存取 LMS 系統"
- ❌ **不建立使用者**: Supabase users 表中應該查無此人

**驗證 (Supabase SQL)**:
```sql
SELECT COUNT(*) as viewer_count
FROM users
WHERE email = 'inactive-user@kcislk.ntpc.edu.tw';

-- Expected: viewer_count = 0
```

**✅ 成功標準**:
- OAuth 流程正常完成
- Server-side 正確拒絕 viewer 角色
- 錯誤訊息清楚顯示
- 未建立任何使用者記錄

---

## 🔍 疑難排解

### Issue 1: "SSO 功能目前未啟用"

**症狀**: 點擊 SSO 按鈕後顯示錯誤 toast

**原因**: `NEXT_PUBLIC_ENABLE_SSO` 不是 `'true'` 字串

**解決方法**:
```bash
# 檢查 .env.local
grep NEXT_PUBLIC_ENABLE_SSO .env.local
# 應該顯示: NEXT_PUBLIC_ENABLE_SSO=true

# 如果不對，編輯 .env.local 並重啟 dev server
pkill -f "next dev"
npm run dev
```

---

### Issue 2: "Missing code_verifier in cookie"

**症狀**: Callback 時顯示此錯誤並 redirect 回登入頁

**原因**: Cookie 設定失敗或瀏覽器阻擋

**解決方法**:

1. **檢查瀏覽器 Cookie 設定**:
   - DevTools → Application → Cookies
   - 確認 `pkce_verifier` cookie 存在

2. **檢查 Secure flag 問題**:
   - 如果在 `http://localhost`，Secure flag 可能失敗
   - 修改 `SSOLoginButton.tsx` line 84:
     ```typescript
     // 移除 Secure flag for localhost testing
     document.cookie = `pkce_verifier=${pkceParams.codeVerifier}; path=/; SameSite=Lax; max-age=600`
     ```

3. **檢查瀏覽器隱私設定**:
   - Safari: 關閉「防止跨網站追蹤」
   - Chrome: 關閉「封鎖第三方 Cookie」

---

### Issue 3: Token Exchange 失敗 (401/403)

**症狀**: Console 顯示 `[OAuth] Token exchange failed: 401`

**可能原因**:
1. Client ID/Secret 不正確
2. PKCE verification 失敗
3. Authorization code 已過期

**解決方法**:

1. **驗證憑證**:
   ```bash
   grep "INFOHUB_OAUTH" .env.local
   # 確認是 Staging 憑證
   ```

2. **檢查 code_verifier**:
   - DevTools Console → 確認 verifier 有被設定
   - 確認 callback 有正確讀取

3. **檢查 code 是否過期**:
   - Authorization code 有效期通常 10 分鐘
   - 不要在 Info Hub 登入頁停留太久

---

### Issue 4: Compensatory Sync 失敗

**症狀**: `[OAuth] Failed to create user: ...`

**可能原因**:
1. Supabase Service Role Key 不正確
2. RLS policies 阻擋 user creation
3. Email 重複

**解決方法**:

1. **驗證 Service Role Key**:
   ```bash
   grep "SUPABASE_SERVICE_ROLE_KEY" .env.local | head -c 50
   # 應該以 eyJhbGci... 開頭
   ```

2. **檢查 Supabase Dashboard**:
   - 前往 Settings → API
   - 複製 `service_role` key（secret）
   - 更新 `.env.local`

3. **檢查 email 重複**:
   ```sql
   SELECT email, created_at FROM users
   WHERE email = 'head-teacher-g1@kcislk.ntpc.edu.tw';

   -- 如果已存在，可以刪除重測
   DELETE FROM users
   WHERE email = 'head-teacher-g1@kcislk.ntpc.edu.tw';
   ```

---

## 📊 測試結果記錄

### Test Case 1: Head Teacher
- [ ] OAuth redirect 正常
- [ ] Token exchange 成功
- [ ] Compensatory sync 運作
- [ ] 使用者資料正確
- [ ] Dashboard 顯示正常
- **狀態**: ⏸️ Pending

### Test Case 2: IT Teacher
- [ ] OAuth 流程完整
- [ ] 使用者建立成功
- [ ] 角色權限正確
- **狀態**: ⏸️ Pending

### Test Case 3: Viewer Denial
- [ ] Access denied 正確
- [ ] 錯誤訊息顯示
- [ ] 未建立使用者
- **狀態**: ⏸️ Pending

---

## 🎯 測試完成後

### 如果全部通過 ✅

1. **記錄測試結果**:
   - 更新此文件的「測試結果記錄」
   - 截圖保存關鍵步驟
   - 記錄任何觀察到的問題

2. **提交到 develop 分支**:
   ```bash
   git add docs/sso/SSO_INTEGRATION_TEST_GUIDE.md
   git commit -m "docs: add SSO integration testing guide with results"
   git push origin develop
   ```

3. **通知 Info Hub 團隊**:
   - 提供測試成功的證據
   - 請求 whitelist LMS redirect URI
   - 協調 Staging 環境測試時間

### 如果有失敗 ❌

1. **記錄問題**:
   - 錯誤訊息完整複製
   - Console logs 截圖
   - Network tab 請求/回應
   - 發生步驟記錄

2. **嘗試疑難排解**:
   - 參考上方「疑難排解」章節
   - 檢查環境變數
   - 驗證憑證

3. **如果無法解決**:
   - 建立詳細的 bug report
   - 與 Info Hub 團隊討論
   - 必要時回退並重新規劃

---

## 📞 需要協助？

### Info Hub 團隊聯絡方式

- **Technical Issue**: [Info Hub team email]
- **Credential Problem**: 檢查 Info Hub 文件或聯絡團隊
- **Integration Questions**: 參考 `LMS_INTEGRATION_RESPONSE.md`

### LMS 系統問題

- **Supabase**: 檢查 Dashboard → Logs
- **TypeScript Error**: 執行 `npx tsc --noEmit`
- **Dev Server**: 重啟 `pkill -f "next dev" && npm run dev`

---

**Document Version**: 1.0.0
**Last Updated**: 2025-11-14
**Status**: ✅ Ready for Testing
**Next Step**: 開始執行 Test Case 1 ▶️

# Google OAuth 設定指南

> **目的**: 整合 Google OAuth 登入功能到 LMS 系統
> **預估時間**: 30-45 分鐘
> **前置需求**: Google Cloud Console 帳號、Supabase Cloud 專案

---

## 📋 設定流程概覽

```
Google Cloud Console → Supabase Dashboard → Next.js 程式碼 → 測試
```

---

## 🔧 步驟 1: Google Cloud Console 設定

### 1.1 建立或選擇專案

1. 前往 [Google Cloud Console](https://console.cloud.google.com/)
2. 登入您的 Google 帳號
3. 點選左上角專案選擇器
4. 選擇現有專案或點選 **「新增專案」**
   - 專案名稱：`LMS-ESID` 或您偏好的名稱
   - 位置：選擇組織（如有）

### 1.2 啟用 Google+ API

1. 左側選單 → **「API 和服務」** → **「程式庫」**
2. 搜尋 `Google+ API`
3. 點選 **「Google+ API」**
4. 點選 **「啟用」**

### 1.3 建立 OAuth 2.0 憑證

1. 左側選單 → **「API 和服務」** → **「憑證」**
2. 點選頂部 **「+ 建立憑證」** → **「OAuth 用戶端 ID」**
3. 如果首次建立，需先設定 **OAuth 同意畫面**：
   - 使用者類型：選擇 **「外部」**（或「內部」如果您有 Google Workspace）
   - 點選 **「建立」**

#### 設定 OAuth 同意畫面

| 欄位 | 值 |
|------|-----|
| **應用程式名稱** | LMS-ESID |
| **使用者支援電子郵件** | 您的 IT 部門電子郵件 |
| **應用程式標誌** | （選填）上傳學校 Logo |
| **應用程式首頁** | `http://localhost:3000`（開發）<br>`https://[your-domain].zeabur.app`（正式） |
| **授權網域** | `zeabur.app`<br>`supabase.co` |
| **開發人員聯絡資訊** | 您的電子郵件 |

#### 設定範圍 (Scopes)

點選 **「新增或移除範圍」**，選擇以下範圍：
- ✅ `userinfo.email`
- ✅ `userinfo.profile`
- ✅ `openid`

#### 測試使用者（如選擇「外部」）

在開發階段，加入測試使用者的電子郵件：
- 您的測試帳號（如 `admin@kcislk.ntpc.edu.tw`）
- 其他測試教師帳號

### 1.4 建立 OAuth 用戶端 ID

1. 返回 **「憑證」** → **「+ 建立憑證」** → **「OAuth 用戶端 ID」**
2. 應用程式類型：選擇 **「網頁應用程式」**
3. 名稱：`LMS-ESID Web Client`

#### 設定授權的 JavaScript 來源

新增以下網址：
```
http://localhost:3000
https://[your-domain].zeabur.app
```

#### 設定授權的重新導向 URI

**重要**：新增您的 Supabase 回調網址：
```
https://piwbooidofbaqklhijup.supabase.co/auth/v1/callback
```

**注意**：URL 必須完全一致，包含 `https://` 和結尾路徑。

### 1.5 取得憑證

點選 **「建立」** 後，會顯示：
- **用戶端 ID**：`xxxxxxxxx.apps.googleusercontent.com`
- **用戶端密鑰**：`GOCSPX-xxxxxxxxxxxxx`

**⚠️ 請妥善保存這兩個值，稍後需要輸入到 Supabase Dashboard**

---

## 🔐 步驟 2: Supabase Dashboard 設定

### 2.1 啟用 Google Provider

1. 前往 [Supabase Dashboard](https://supabase.com/dashboard)
2. 選擇專案：**piwbooidofbaqklhijup**
3. 左側選單 → **「Authentication」** → **「Providers」**
4. 找到 **「Google」** 並點選

### 2.2 設定 Google Provider

| 欄位 | 值 |
|------|-----|
| **Enable Google provider** | ✅ 開啟 |
| **Client ID** | 貼上 Google Cloud Console 的用戶端 ID |
| **Client Secret** | 貼上 Google Cloud Console 的用戶端密鑰 |

點選 **「Save」**

### 2.3 設定 Redirect URLs

1. 在相同頁面，找到 **「Redirect URLs」** 區塊
2. 確認以下網址已加入（通常自動加入）：
   ```
   http://localhost:3000/**
   https://[your-domain].zeabur.app/**
   ```
3. 使用 `/**` 萬用字元允許所有子路徑

### 2.4 設定 Site URL

1. 左側選單 → **「Authentication」** → **「URL Configuration」**
2. **Site URL**: `http://localhost:3000`（開發）
3. **Redirect URLs**:
   ```
   http://localhost:3000/**
   https://[your-domain].zeabur.app/**
   ```

---

## 💻 步驟 3: Next.js 程式碼整合

### 3.1 OAuth 回調處理器

已建立檔案：`app/auth/callback/route.ts`

此檔案處理 Google OAuth 回調，交換授權碼為使用者 Session。

### 3.2 登入頁面修改

已更新檔案：`app/auth/login/page.tsx`

新增功能：
- ✅ Google 登入按鈕
- ✅ 分隔線（"或使用電子郵件"）
- ✅ 保留原有 Email/Password 登入

### 3.3 Auth Context 更新

已更新檔案：`lib/supabase/auth-context.tsx`

新增功能：
- ✅ 檢查首次 Google 登入用戶
- ✅ 導向角色選擇頁面（如 users 表無記錄）

---

## 🧪 步驟 4: 測試 Google OAuth

### 4.1 開發環境測試

1. 確保開發伺服器運行：
   ```bash
   npm run dev
   ```

2. 開啟瀏覽器：`http://localhost:3000`

3. 點選 **「使用 Google 帳號登入」** 按鈕

4. 選擇測試用的 Google 帳號

5. 授權應用程式存取您的資料

6. **預期結果**：
   - ✅ 重導向回 `http://localhost:3000/dashboard`
   - ✅ 成功登入（如 users 表已有記錄）
   - ✅ 導向角色選擇（如首次登入）

### 4.2 檢查 Console

打開瀏覽器開發者工具（F12）：
- ✅ 無錯誤訊息
- ✅ 看到 Supabase Auth Session
- ✅ `auth.user` 物件包含 Google 資料

### 4.3 驗證資料庫

在 Supabase Dashboard → **「Authentication」** → **「Users」**：
- ✅ 看到新的用戶記錄
- ✅ Provider 顯示為 `google`
- ✅ Email 正確

---

## 🔄 步驟 5: 處理首次 Google 登入

### 5.1 角色選擇流程

當使用者首次透過 Google 登入時：

1. `auth-context.tsx` 檢查 `users` 表無此用戶
2. 自動導向 `/auth/role-select`
3. 使用者選擇角色（admin/head/teacher）
4. 建立 `users` 表記錄
5. 重導向到 Dashboard

### 5.2 自動建立用戶記錄（選配）

**選項 A**：手動在 Supabase Dashboard 建立
1. **「Table Editor」** → **「users」** → **「Insert row」**
2. 填入：
   - `id`: 從 Auth Users 複製 UUID
   - `email`: Google 帳號
   - `full_name`: 使用者姓名
   - `role`: `teacher` / `head` / `admin`

**選項 B**：使用 Database Trigger（進階）

建立 PostgreSQL Trigger 自動建立 `users` 記錄：
```sql
-- 未來可實作
```

---

## 📊 故障排除

### 問題 1: 「redirect_uri_mismatch」錯誤

**原因**：Google Cloud Console 的授權重新導向 URI 不正確

**解決方案**：
1. 確認 Supabase Callback URL 正確：
   ```
   https://piwbooidofbaqklhijup.supabase.co/auth/v1/callback
   ```
2. 在 Google Cloud Console → 憑證 → 編輯 OAuth 用戶端
3. 確認 **「授權的重新導向 URI」** 包含上述 URL
4. 儲存後等待 5 分鐘生效

### 問題 2: 「Access blocked」或「This app isn't verified」

**原因**：應用程式未通過 Google 驗證（正常，開發階段）

**解決方案**：
1. 點選 **「進階」** → **「前往 [應用程式名稱]（不安全）」**
2. 這是測試環境的正常行為
3. 正式上線前需完成 Google App Verification

### 問題 3: 登入後出現「User Profile Not Found」

**原因**：`users` 表中無此 Google 用戶記錄

**解決方案**：
1. 方案 A：導向角色選擇頁面（已實作）
2. 方案 B：手動在 Supabase Dashboard 建立用戶記錄

### 問題 4: localhost 無法測試 Google OAuth

**原因**：Google OAuth 預設不支援 localhost

**解決方案**：
- ✅ Google OAuth **支援** `http://localhost:3000`
- 確認 Google Cloud Console 的授權 JavaScript 來源包含此 URL

### 問題 5: Cookie 問題（SameSite）

**原因**：瀏覽器 Cookie 政策限制

**解決方案**：
- Supabase SSR 已處理此問題
- 確保使用 `@supabase/ssr` 最新版本

---

## 🔐 安全性建議

### 生產環境檢查清單

- [ ] 移除測試用的 redirect URIs（僅保留正式網域）
- [ ] 限制 OAuth 同意畫面的測試使用者名單
- [ ] 啟用 Google App Verification（如公開使用）
- [ ] 使用環境變數儲存 Client ID 和 Secret
- [ ] 定期輪換 Client Secret
- [ ] 監控異常登入活動

### 環境變數管理

**開發環境** (`.env.local`):
```env
NEXT_PUBLIC_SUPABASE_URL=https://piwbooidofbaqklhijup.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
```

**正式環境** (Zeabur Dashboard):
- 在 Zeabur 專案設定中加入相同環境變數
- ⚠️ **切勿** 將 Supabase Service Role Key 暴露在前端

---

## 📚 相關文件

- [Supabase Auth with Google](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Google OAuth 2.0 文件](https://developers.google.com/identity/protocols/oauth2)
- [Next.js App Router with Supabase](https://supabase.com/docs/guides/auth/server-side/nextjs)

---

## ✅ 設定完成檢查點

完成以上步驟後，應該達成：

- [x] Google Cloud Console OAuth 憑證已建立
- [x] Supabase Google Provider 已啟用
- [x] Next.js 程式碼已整合
- [x] Google 登入按鈕顯示在登入頁面
- [x] 可使用 Google 帳號成功登入
- [x] Email/Password 登入仍可正常使用

---

**設定完成！** 🎉

使用者現在可以選擇：
- 🔐 使用電子郵件/密碼登入
- 🌐 使用 Google 帳號一鍵登入

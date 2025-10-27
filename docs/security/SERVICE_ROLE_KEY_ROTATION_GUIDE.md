# Service Role Key 輪換指南

**日期**: 2025-10-27
**目的**: 安全地輪換 Supabase Service Role Key
**風險等級**: 🔴 HIGH - 需要仔細執行以避免服務中斷

---

## 📋 為什麼需要輪換？

Service Role Key 擁有**完整超級管理員權限**，可以：
- 繞過所有 RLS (Row Level Security) 政策
- 存取資料庫中的所有資料
- 執行任何資料庫操作

**如果 Service Role Key 洩漏**，攻擊者可以：
- 讀取所有學生、教師、成績資料
- 修改或刪除資料
- 建立管理員帳號

---

## 🚨 何時需要立即輪換？

立即輪換 Service Role Key 如果：
- ✅ Key 已提交到 Git 歷史記錄
- ✅ Key 已暴露在公開的程式碼庫
- ✅ Key 已被未授權人員存取
- ✅ Key 出現在日誌檔案中
- ✅ 懷疑系統被入侵

**本專案狀況**:
- ⚠️ `.env.local` 可能已提交到 Git（需確認）
- ⚠️ Claude Code 會話歷史可能包含 Key
- ⚠️ 建議進行預防性輪換

---

## 🔐 輪換步驟（詳細）

### 準備階段

#### 1. 備份當前配置
```bash
# 備份當前 .env.local
cp .env.local .env.local.backup

# 記錄當前的 Service Role Key（加密儲存）
# 不要儲存在純文字檔案中！
```

#### 2. 確認 Git 歷史狀態
```bash
# 檢查 .env.local 是否曾經提交
git log --all --full-history -- .env.local

# 檢查是否有 Key 在 commit 歷史中
git log --all -p -S "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9"

# 如果發現 Key 在 Git 歷史中，需要清理歷史（進階操作）
```

---

### 執行階段

#### Step 1: 登入 Supabase Dashboard

1. 前往 [https://supabase.com](https://supabase.com)
2. 選擇您的專案：`piwbooidofbaqklhijup`
3. 點擊左側選單 **Settings** (齒輪圖示)
4. 選擇 **API**

#### Step 2: 生成新的 Service Role Key

**⚠️ 重要提示**:
- Supabase **不支援直接輪換 Service Role Key**
- 一個專案只有一組固定的 Keys
- 如果需要完全更換，需要建立新專案並遷移資料

**替代方案**:

**選項 A: 建立 Edge Function 作為中介層**（推薦）
```typescript
// 在 Supabase Edge Functions 中建立受保護的 API
// 這樣可以避免在應用程式中直接使用 Service Role Key

// supabase/functions/admin-operations/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  // 驗證請求來自授權用戶（使用 auth.uid()）
  const authHeader = req.headers.get('Authorization')!
  const supabaseClient = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: {
        headers: { Authorization: authHeader },
      },
    }
  )

  // 檢查用戶權限
  const {
    data: { user },
  } = await supabaseClient.auth.getUser()

  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  // 驗證用戶是否為 admin
  const { data: userProfile } = await supabaseClient
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single()

  if (userProfile?.role !== 'admin') {
    return new Response('Forbidden', { status: 403 })
  }

  // 使用 Service Role Key 執行操作
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  )

  // 執行需要的操作...
  // ...

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
```

**選項 B: 使用環境變數加密**（短期方案）
```bash
# 使用加密工具儲存 Service Role Key
# 例如使用 AWS Secrets Manager, HashiCorp Vault 等
```

**選項 C: 重新建立 Supabase 專案**（最徹底，但工作量大）
1. 在 Supabase 建立新專案
2. 匯出當前資料庫 Schema
3. 匯出資料
4. 匯入到新專案
5. 更新應用程式配置

---

### 驗證階段

#### Step 3: 更新環境變數（如果選擇選項 C）

```bash
# 編輯 .env.local
nano .env.local

# 更新以下變數：
NEXT_PUBLIC_SUPABASE_URL=https://新專案.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=新的_anon_key
SUPABASE_SERVICE_ROLE_KEY=新的_service_role_key
```

#### Step 4: 確認新 Key 有效

```bash
# 測試連線
curl -X GET "https://新專案.supabase.co/rest/v1/" \
  -H "apikey: 新的_anon_key" \
  -H "Authorization: Bearer 新的_service_role_key"

# 應該返回 API 資訊，而不是 401 錯誤
```

#### Step 5: 重新啟動應用程式

```bash
# 停止當前運行的應用
# (Ctrl+C 或 kill process)

# 清除 Next.js 快取
rm -rf .next

# 重新啟動
npm run dev
```

#### Step 6: 驗證功能

**測試清單**:
- [ ] 登入功能正常
- [ ] 能夠讀取資料（dashboard）
- [ ] 能夠寫入資料（新增成績）
- [ ] RLS 政策生效（teacher 無法看到其他班級）
- [ ] CSV 匯入功能正常

---

### 清理階段

#### Step 7: 廢除舊 Key（如果可能）

**Supabase 限制**:
- Supabase 不允許手動廢除 Service Role Key
- 舊專案的 Key 將持續有效，直到專案刪除

**建議做法**:
1. 如果選擇選項 C（新專案），刪除舊專案
2. 確認沒有任何服務還在使用舊 Key
3. 記錄輪換日期與原因

#### Step 8: 清理備份檔案

```bash
# 刪除包含舊 Key 的備份
rm .env.local.backup

# 清理 Git 歷史（如果 Key 曾提交）
# ⚠️ 這是進階操作，請先備份整個專案！
git filter-branch --force --index-filter \
  "git rm --cached --ignore-unmatch .env.local" \
  --prune-empty --tag-name-filter cat -- --all

# 強制推送（會改寫歷史）
git push origin --force --all
```

#### Step 9: 更新文件

- [ ] 更新 README.md 中的設定說明
- [ ] 更新團隊文件
- [ ] 通知相關人員
- [ ] 記錄輪換日期

---

## 📝 輪換檢查清單

### 輪換前
- [ ] 備份當前配置
- [ ] 檢查 Git 歷史
- [ ] 通知團隊成員
- [ ] 安排維護時間窗口
- [ ] 準備回滾計畫

### 輪換中
- [ ] 生成/取得新 Key
- [ ] 更新 .env.local
- [ ] 更新 CI/CD 環境變數（如 Zeabur）
- [ ] 清除應用程式快取
- [ ] 重新啟動服務

### 輪換後
- [ ] 驗證登入功能
- [ ] 驗證資料讀寫
- [ ] 驗證 RLS 政策
- [ ] 檢查錯誤日誌
- [ ] 監控效能指標
- [ ] 廢除舊 Key
- [ ] 更新文件

---

## 🚑 回滾計畫

如果新 Key 無法正常運作：

```bash
# 1. 立即恢復舊配置
cp .env.local.backup .env.local

# 2. 重新啟動服務
rm -rf .next
npm run dev

# 3. 檢查錯誤
# 查看 .next/server/app/dashboard/page.tsx 等編譯產物
# 確認是否使用正確的 URL
```

---

## 🔒 安全最佳實踐

### 1. 環境變數管理
```bash
# ✅ 好的做法
# 使用 .env.local（已在 .gitignore）
SUPABASE_SERVICE_ROLE_KEY=xxx

# ❌ 壞的做法
# 硬編碼在程式碼中
const key = 'eyJhbGci...'
```

### 2. 部署環境配置

**Zeabur 部署**:
1. 登入 Zeabur Dashboard
2. 選擇專案 > Settings > Environment Variables
3. 更新 `SUPABASE_SERVICE_ROLE_KEY`
4. 觸發重新部署

### 3. 定期審查

- [ ] 每季檢查環境變數
- [ ] 每季檢查存取日誌
- [ ] 定期更新相依套件
- [ ] 定期檢查 Supabase 安全通知

---

## 📞 需要協助？

如果在輪換過程中遇到問題：

1. **檢查 Supabase Status**: https://status.supabase.com
2. **查看錯誤日誌**: `.next/server/app/.../error.log`
3. **Supabase 文件**: https://supabase.com/docs/guides/api#api-keys
4. **社群支援**: https://github.com/supabase/supabase/discussions

---

## ✅ 完成確認

輪換完成後，請確認：

- [ ] 新 Key 已正確設定在 `.env.local`
- [ ] 應用程式能夠正常運作
- [ ] RLS 政策正常執行
- [ ] 所有功能測試通過
- [ ] 舊 Key 已從程式碼中移除
- [ ] Git 歷史已清理（如需要）
- [ ] 團隊成員已通知
- [ ] 文件已更新

**輪換完成日期**: ______________
**執行人員**: ______________
**驗證人員**: ______________

---

**最後更新**: 2025-10-27
**版本**: 1.0

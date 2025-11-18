# 檢查 Network 請求詳細步驟

## 🎯 目的
確認 LMS 發送的授權請求中，`redirect_uri` 參數是否正確

---

## 📋 操作步驟

### 1. 清空 Network 記錄
- 在 DevTools → Network 標籤中
- 點擊 🚫 圖示（清除按鈕）
- **勾選 "Preserve log"**（保留日誌）✅ 重要！

### 2. 重新開始 SSO 登入
- 訪問: `https://lms-staging.zeabur.app/auth/login`
- 點擊 "Login with Google"

### 3. 找到授權請求
在 Network 標籤中尋找以下請求：
```
Name: authorize
Domain: next14-landing.zeabur.app
```

### 4. 檢查 Query String Parameters
點擊該請求，查看右側面板：
- 切換到 "Headers" 或 "Payload" 標籤
- 找到 "Query String Parameters" 區塊
- 查看 `redirect_uri` 的值

---

## ❓ 如果找不到授權請求

可能原因：
1. **請求太快被重定向覆蓋** → 解決：勾選 "Preserve log"
2. **頁面直接重定向，沒有經過授權端點** → 這是問題所在

請截圖並提供：
- [ ] Network 標籤的完整請求列表（從上到下）
- [ ] 每個請求的 Domain 和 Name
- [ ] 找到的 `authorize` 請求的完整 Headers

---

## 🔍 替代檢查方法：使用 Console

如果 Network 標籤看不清楚，請在 Console 標籤中執行：

```javascript
// 1. 檢查當前 origin
console.log('Current Origin:', window.location.origin)

// 2. 模擬 getOAuthCallbackUrl() 函式
function testGetOAuthCallbackUrl() {
  if (typeof window !== 'undefined') {
    return `${window.location.origin}/api/auth/callback/infohub`
  }
  return 'http://localhost:3000/api/auth/callback/infohub'
}

console.log('Computed redirect_uri:', testGetOAuthCallbackUrl())

// 3. 檢查是否正確
const expected = 'https://lms-staging.zeabur.app/api/auth/callback/infohub'
const actual = testGetOAuthCallbackUrl()
console.log('Is Correct?', actual === expected)
console.log('Expected:', expected)
console.log('Actual:', actual)
```

**預期輸出**：
```
Current Origin: https://lms-staging.zeabur.app
Computed redirect_uri: https://lms-staging.zeabur.app/api/auth/callback/infohub
Is Correct? true
Expected: https://lms-staging.zeabur.app/api/auth/callback/infohub
Actual: https://lms-staging.zeabur.app/api/auth/callback/infohub
```

---

## 📊 截圖需求

請提供以下截圖：

1. **Network 標籤**:
   - 勾選 "Preserve log" 後的完整請求列表
   - 包含從點擊 "Login with Google" 到最終錯誤的所有請求

2. **Console 標籤**:
   - 執行上述測試程式碼的輸出結果

3. **授權請求詳情**（如果找到）:
   - Headers 標籤
   - Query String Parameters
   - 特別是 `redirect_uri` 參數的值

---

這樣我才能確定問題出在哪個環節！

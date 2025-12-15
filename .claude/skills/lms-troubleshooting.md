# LMS Troubleshooting Skill

> 已解決問題、常見錯誤、除錯技巧

## Statistics 頁面成績不顯示

### 問題描述

- `/browse/stats/students`、`/browse/stats/classes`、`/browse/stats/grades` 頁面顯示 1514 學生但成績全為 "-"
- Gradebook 頁面正常顯示成績

### 根本原因

Supabase nested join 語法理解錯誤：
- 錯誤使用 `exam.class_id` 配合 `course:courses!inner`
- Supabase 的 `courses!inner` 透過 `course_id` FK 連接，不是 `class_id`

### 解決方案

```typescript
// ❌ 錯誤
exam:exams!inner(
  class_id,  // 這個欄位與 courses!inner 無關
  course:courses!inner(course_type)
)
// 然後過濾 exam.class_id → 永遠不匹配

// ✅ 正確
exam:exams!inner(
  course_id,
  course:courses!inner(
    class_id,  // 從 course 取得 class_id
    course_type
  )
)
// 過濾 exam.course.class_id
```

### 修改檔案

`lib/api/statistics.ts`

---

## Browse 頁面無限載入

### 問題描述

Browse 頁面從其他頁面導航進入時出現無限載入，必須重新整理才能顯示資料。

### 根本原因

1. Next.js client-side navigation 時，React 可能重用組件實例
2. `useRef` 值在導航之間保持不變
3. Debounce effect 造成雙重 fetch

### 解決方案：debouncedSearch 模式

```typescript
// 1. 只對搜尋輸入做 debounce
const [debouncedSearch, setDebouncedSearch] = useState("");

useEffect(() => {
  const timer = setTimeout(() => setDebouncedSearch(searchQuery), 300);
  return () => clearTimeout(timer);
}, [searchQuery]);

// 2. 單一 effect 處理所有資料抓取
useEffect(() => {
  if (authLoading || !user) return;

  let isCancelled = false;

  async function fetchData() {
    setLoading(true);
    try {
      const data = await apiCall({
        grade: selectedGrade === "All" ? undefined : selectedGrade,
        search: debouncedSearch || undefined,
      });
      if (!isCancelled) {
        setData(data);
        setLoading(false);
      }
    } catch (err) {
      if (!isCancelled) {
        setError(err.message);
        setLoading(false);
      }
    }
  }

  fetchData();
  return () => { isCancelled = true; };
}, [authLoading, user, selectedGrade, debouncedSearch]);
```

### 重點

- 搜尋框需要 debounce，下拉選單不需要
- 使用 `isCancelled` flag 取消過時請求
- 直接在依賴陣列列出狀態

---

## RLS 無限遞迴

### 問題描述

- Migration 015/017 的 policies 造成無限遞迴
- SSO 登入成功但查詢 users 表返回 500 錯誤
- 錯誤碼：25P02（transaction aborted）

### 根本原因

```sql
-- 政策的 USING clause 調用函式查詢 users 表
CREATE POLICY "heads_view_jurisdiction" ON users
USING (
  is_head() AND get_user_grade() = grade  -- 這兩個函式查詢 users 表！
);
-- → 觸發 policy → 無限循環
```

### 解決方案

**Migration 019e**：移除 heads_view_jurisdiction policy
**Migration 028**：刪除 24 個有遞迴問題的 policies，建立簡單的 `authenticated_read_users` 政策

```sql
-- 簡單政策，不查詢 users 表
CREATE POLICY "authenticated_read_users" ON users
FOR SELECT USING (auth.role() = 'authenticated');
```

---

## Claude Code 環境變數快取

### 問題描述

- Claude Code 會將 `.env.local` 內容儲存在會話歷史檔案中
- 即使更新 `.env.local`，Next.js 編譯時仍使用舊值
- 導致客戶端 JavaScript bundle 硬編碼錯誤的 Supabase URL

### 症狀識別

```bash
# 檢查 Shell 環境變數
env | grep SUPABASE
# 如果顯示舊 URL，表示遇到快取問題

# 檢查編譯產物
grep -r "old-project-id.supabase.co" .next/static/chunks/
# 如果找到舊 URL，表示 webpack 使用了錯誤的環境變數
```

### 解決方案

**方案 A**：清除 Claude Code 會話快取（推薦）
```bash
rm -f ~/.claude/projects/-Users-chenzehong-Desktop-LMS/*.jsonl
# 重啟 Cursor/VSCode
```

**方案 B**：使用外部終端機（繞過 Claude Code）
```bash
# 在系統終端機（非 Claude Code）中執行
cd /Users/chenzehong/Desktop/LMS
npm run dev
```

---

## Gradebook 406 Error

### 問題描述

Gradebook 頁面載入時出現 406 Not Acceptable 錯誤。

### 根本原因

GradebookHeader 組件查詢 courses 表觸發 RLS 衝突。

### 解決方案

移除 GradebookHeader 中的 courses 查詢，改用從父組件傳入的資料。

---

## Signal 10 (git push 錯誤)

### 問題描述

`git push` 命令偶爾返回 Signal 10 錯誤。

### 根本原因

Claude Code 的 Bash 工具在長時間操作時可能被中斷。

### 解決方案

```bash
# 方案 1：使用外部終端機
# 在系統終端機執行 git push

# 方案 2：重試
git push origin develop
```

---

## 常見錯誤代碼

| 錯誤碼 | 說明 | 解決方案 |
|--------|------|----------|
| 406 | RLS 阻擋查詢 | 檢查用戶角色權限 |
| 500 | 伺服器錯誤 | 檢查 console log |
| 25P02 | RLS 無限遞迴 | 使用 SECURITY DEFINER 函數 |
| 42P01 | 表不存在 | 執行 migration |
| 42501 | 權限不足 | 檢查 service role key |

---

## 除錯技巧

### 檢查 Auth 狀態

```typescript
const { userId, role, isReady } = useAuthReady();
console.log('[Auth]', { userId, role, isReady });
```

### 檢查 RLS 行為

```sql
-- 以特定用戶身份查詢
SET request.jwt.claims = '{"sub": "user-uuid", "role": "authenticated"}';
SELECT * FROM some_table;
```

### 檢查 Supabase 查詢

```typescript
const { data, error } = await supabase.from('...').select('...');
if (error) {
  console.error('[Supabase Error]', error.code, error.message, error.hint);
}
```

### 檢查 Build 產物

```bash
# 搜尋硬編碼的環境變數
grep -r "supabase.co" .next/static/chunks/ | head -5
```

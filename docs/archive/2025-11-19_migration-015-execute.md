# Migration 015 執行指南

## 📋 執行前檢查清單

### ✅ 必要條件
- [ ] 已確認 Supabase Cloud 連線正常
- [ ] 已備份當前資料庫狀態（透過 Supabase Dashboard）
- [ ] 已確認沒有正在執行的重要查詢
- [ ] 已通知團隊即將進行資料庫維護

### ⚠️ 重要提醒
- 此 migration 會暫時中斷所有 RLS policies（約 5-10 秒）
- 建議在低流量時段執行
- 執行過程中會看到大量 NOTICE 訊息（這是正常的）
- 預計執行時間：10-15 秒

---

## 🚀 執行步驟

### 方法一：使用 Supabase SQL Editor（推薦）

1. **登入 Supabase Dashboard**
   ```
   https://supabase.com/dashboard/project/piwbooidofbaqklhijup
   ```

2. **開啟 SQL Editor**
   - 左側選單 → SQL Editor
   - 點擊 "New query"

3. **複製並執行 Migration 015**
   - 開啟檔案：`/db/migrations/015_optimize_rls_performance.sql`
   - 複製完整內容
   - 貼到 SQL Editor
   - 點擊 "Run" 按鈕

4. **檢查執行結果**
   - 應該看到大量 NOTICE 訊息
   - 最後應顯示：
     ```
     🎉 Migration 015 Completed Successfully
     TOTAL: XX policies
     ```

### 方法二：使用 psql 命令列

```bash
# 1. 匯出環境變數
export SUPABASE_DB_URL="postgresql://postgres.[YOUR-REF]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres"

# 2. 執行 migration
psql "$SUPABASE_DB_URL" -f db/migrations/015_optimize_rls_performance.sql

# 3. 執行驗證腳本
psql "$SUPABASE_DB_URL" -f db/migrations/VERIFY_MIGRATION_015.sql
```

### 方法三：使用 Supabase CLI（如果已安裝）

```bash
# 1. 確認專案連結
supabase link --project-ref piwbooidofbaqklhijup

# 2. 執行 migration
supabase db push

# 3. 驗證結果
supabase db execute -f db/migrations/VERIFY_MIGRATION_015.sql
```

---

## ✅ 驗證步驟

### 1. 執行驗證腳本

在 Supabase SQL Editor 中執行：

```sql
-- 複製並執行 VERIFY_MIGRATION_015.sql 的完整內容
```

### 2. 檢查驗證結果

**預期輸出應包含：**

```
Test 1: RLS Policies Count by Table
------------------------------------
users: 7 policies
classes: 6 policies
students: 7 policies
exams: 5 policies
scores: 6 policies
...

Test 2: Checking for Non-Optimized auth.uid() Calls
--------------------------------------------------
✅ ALL POLICIES OPTIMIZED

Test 3: Overall Optimization Status
-----------------------------------
total_policies: XX
unoptimized_policies: 0
✅ ALL POLICIES OPTIMIZED ✅

✅ ALL TESTS PASSED!
```

### 3. 再次執行 Database Linter

1. Supabase Dashboard → Database → Linter
2. 點擊 "Run Linter"
3. 確認 `auth_rls_initplan` 警告已消失

**預期結果：**
- ✅ 所有 `auth_rls_initplan` 警告應該消失
- ✅ 或警告數量從 44+ 降至 0

### 4. 效能測試（選擇性）

在 SQL Editor 中執行：

```sql
-- 測試查詢效能
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM users
WHERE EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = (SELECT auth.uid())
    AND u.role = 'admin'
);
```

**預期結果：**
- 應該看到 `InitPlan 1` 只出現一次（在查詢計畫頂層）
- 不應該有 `SubPlan` 重複執行 auth.uid()

---

## 📊 預期效果

### 效能改善
- **查詢速度提升**：50-200%（取決於資料量）
- **資料庫負載降低**：auth.uid() 呼叫次數從 O(n) 降至 O(1)
- **Linter 警告**：44+ 個警告 → 0 個警告

### 功能影響
- ✅ **無功能變更**：所有權限邏輯保持不變
- ✅ **向後相容**：現有查詢不需修改
- ✅ **安全性維持**：RLS 保護機制完全相同

---

## 🔧 故障排除

### 問題 1：執行時出現 "policy already exists" 錯誤

**原因**：Migration 015 已經部分執行過

**解決方案**：
```sql
-- 手動清除所有 policies 後重新執行
DO $$
DECLARE
    policy_record RECORD;
BEGIN
    FOR policy_record IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I;',
            policy_record.policyname,
            policy_record.schemaname,
            policy_record.tablename);
    END LOOP;
END $$;

-- 然後重新執行 Migration 015
```

### 問題 2：驗證腳本顯示部分 policies 未優化

**原因**：某些 policies 建立失敗

**解決方案**：
1. 檢查錯誤訊息
2. 手動執行失敗的 policy 建立語句
3. 重新執行驗證腳本

### 問題 3：前端出現權限錯誤

**原因**：RLS policies 可能未正確重建

**解決方案**：
```sql
-- 檢查特定表格的 policies
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'users';  -- 替換為問題表格名稱

-- 如果缺少 policies，重新執行 Migration 015
```

---

## 📝 執行記錄

執行後請填寫：

- **執行日期時間**：____________________
- **執行人員**：____________________
- **執行方法**：[ ] SQL Editor [ ] psql [ ] Supabase CLI
- **執行結果**：[ ] 成功 [ ] 失敗（記錄錯誤）
- **驗證結果**：[ ] 通過 [ ] 失敗（記錄問題）
- **Linter 結果**：[ ] 警告已清除 [ ] 仍有警告

**備註：**
________________________________________________________________
________________________________________________________________
________________________________________________________________

---

## 🎯 執行後檢查清單

- [ ] Migration 015 執行成功（無錯誤訊息）
- [ ] 驗證腳本顯示 "ALL TESTS PASSED"
- [ ] Database Linter 無 auth_rls_initplan 警告
- [ ] 前端應用程式運作正常
- [ ] 所有角色（admin/head/teacher）權限正常
- [ ] 效能監控無異常
- [ ] Git commit migration 檔案
- [ ] Git push 到 GitHub（備份）

---

## 📚 相關文件

- [Supabase RLS Performance Guide](https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select)
- [Migration 015 完整程式碼](./015_optimize_rls_performance.sql)
- [驗證腳本](./VERIFY_MIGRATION_015.sql)
- [CLAUDE.md - RLS 規範](../../CLAUDE.md#安全與權限rls-核心)

---

**⚠️ 重要提醒：執行前請確保已備份資料庫！**

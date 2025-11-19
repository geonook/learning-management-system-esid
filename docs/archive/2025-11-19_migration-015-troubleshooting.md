# Migration 015 故障排除指南

## 📋 目錄

1. [常見錯誤](#常見錯誤)
2. [診斷工具](#診斷工具)
3. [解決方案](#解決方案)
4. [FAQ](#faq)

---

## 🔴 常見錯誤

### 錯誤 1：Policy Already Exists

**錯誤訊息**：
```
ERROR: 42710: policy "service_role_bypass" for table "users" already exists
```

**原因**：
- Migration 015 嘗試建立 `service_role_bypass` policy
- 但資料庫中已經存在同名的 policy
- 這可能是因為：
  1. Migration 015 之前被部分執行過
  2. 手動建立過這些 policies
  3. 其他未記錄的操作建立了這些 policies

**影響**：
- Migration 015 執行失敗
- Part 1-10 的 policies 可能已經建立（優化完成）
- Part 11-12 的 policies 未建立（service_role_bypass 和 authenticated_read）

**快速修復**：
```bash
# 方案 A：使用 Migration 015b（推薦）
執行 015b_optimize_rls_performance_idempotent.sql

# 方案 B：清理後重新執行
1. 執行 CLEANUP_CONFLICTING_POLICIES.sql
2. 執行 015_optimize_rls_performance.sql
```

**詳細解決步驟**：見 [解決方案 1](#解決方案-1policy-already-exists)

---

### 錯誤 2：Permission Denied

**錯誤訊息**：
```
ERROR: permission denied for table users
```

**原因**：
- 當前使用的資料庫角色沒有足夠權限
- 需要使用 `postgres` 超級使用者或有 CREATE POLICY 權限的角色

**解決方案**：
```sql
-- 方法 1：使用 Supabase SQL Editor（推薦）
-- Supabase SQL Editor 自動使用 postgres 角色

-- 方法 2：授予權限（需要超級使用者）
GRANT ALL ON ALL TABLES IN SCHEMA public TO your_role;
```

---

### 錯誤 3：Table Does Not Exist

**錯誤訊息**：
```
ERROR: relation "student_courses" does not exist
```

**原因**：
- Migration 008 或之前的 migrations 未執行
- 資料庫結構不完整

**解決方案**：
```bash
# 確認所有之前的 migrations 都已執行
執行順序：
  001 → 002 → ... → 007 → 008 → 009 → 010 → 011 → 012 → 013 → 014 → 015b
```

**驗證方法**：
```sql
-- 檢查所有必要的資料表是否存在
SELECT tablename
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'users', 'classes', 'courses', 'students',
    'student_courses', 'exams', 'scores',
    'assessment_codes', 'assessment_titles'
  )
ORDER BY tablename;

-- 應該返回 9 個資料表
```

---

### 錯誤 4：Migration 執行到一半中斷

**症狀**：
- Migration 執行過程中連線中斷
- 部分 policies 建立，部分未建立
- 資料庫處於不一致狀態

**診斷**：
```sql
-- 執行診斷腳本
執行 DIAGNOSE_POLICY_CONFLICTS.sql
```

**解決方案**：
```sql
-- 1. 清理部分建立的 policies
執行 CLEANUP_CONFLICTING_POLICIES.sql

-- 2. 重新執行完整 migration
執行 015b_optimize_rls_performance_idempotent.sql

-- 3. 驗證結果
執行 VERIFY_MIGRATION_015.sql
```

---

## 🔍 診斷工具

### 工具 1：Policy Conflicts Diagnostic

**檔案**：`DIAGNOSE_POLICY_CONFLICTS.sql`

**用途**：
- 檢查當前資料庫中所有 RLS policies
- 識別與 Migration 015 衝突的 policies
- 分析 Migration 015 的執行狀態

**使用方法**：
```bash
# 在 Supabase SQL Editor 執行
執行 DIAGNOSE_POLICY_CONFLICTS.sql
```

**輸出解讀**：

```sql
-- Test 1: Checking for Policies that Conflict with Migration 015
-- 列出所有衝突的 policies

-- Test 2: Count of All RLS Policies by Table
-- 顯示每個資料表的 policy 數量

-- Test 3: Analyzing Migration 015 Execution Status
-- 判斷 Migration 015 執行到哪個階段
✅ Status: Part 1-10 executed, Part 11-12 not started
   → Safe to continue from Part 11

⚠️  Status: Part 1-11 executed, Part 12 not started
   → Need to cleanup Part 11 before retry

-- Test 4: Checking if Existing Policies are Optimized
-- 檢查現有 policies 是否已經優化

-- Test 5: Complete Policy List (All 9 Tables)
-- 完整列出所有 policies 和衝突狀態
```

**診斷結果範例**：

```
📊 Diagnostic Summary:
  Total RLS Policies: 45
  Conflicting Policies: 19
    - service_role_bypass: 9
    - authenticated_read: 10

⚠️  MINOR CONFLICTS DETECTED

Recommendation:
  → Run CLEANUP_CONFLICTING_POLICIES.sql
  → Then re-execute Migration 015
  → Or use Migration 015b (idempotent version)
```

---

### 工具 2：Cleanup Script

**檔案**：`CLEANUP_CONFLICTING_POLICIES.sql`

**用途**：
- 安全移除與 Migration 015 衝突的 policies
- 保留其他重要的 policies
- 準備環境以便重新執行 migration

**使用方法**：
```bash
# 1. 先執行診斷確認需要清理
執行 DIAGNOSE_POLICY_CONFLICTS.sql

# 2. 執行清理腳本
執行 CLEANUP_CONFLICTING_POLICIES.sql

# 3. 重新執行 migration
執行 015b_optimize_rls_performance_idempotent.sql
```

**安全性**：
- ✅ 只移除會被 Migration 015 重建的 policies
- ✅ 不會影響核心權限 policies（Admin full access, Teachers can view 等）
- ✅ 提供 5 秒取消時間
- ✅ 執行後會顯示驗證結果

---

### 工具 3：Verification Script

**檔案**：`VERIFY_MIGRATION_015.sql`

**用途**：
- 驗證 Migration 015 或 015b 執行是否成功
- 檢查所有 policies 是否已優化
- 確認 RLS 狀態正確

**使用方法**：
```bash
# Migration 015 或 015b 執行後驗證
執行 VERIFY_MIGRATION_015.sql
```

**預期輸出**：
```
✅ ALL TESTS PASSED!

Migration 015 was successful:
  ✅ All policies are optimized
  ✅ All tables have RLS enabled
  ✅ Performance should be improved by 50-200%
```

---

## 🛠️ 解決方案

### 解決方案 1：Policy Already Exists

#### 🎯 推薦方案：使用 Migration 015b

**優點**：
- ✅ 一步到位，不需要手動清理
- ✅ Idempotent（可重複執行）
- ✅ 安全可靠

**步驟**：

**1. 開啟 Supabase SQL Editor**
```
https://supabase.com/dashboard/project/piwbooidofbaqklhijup/sql/new
```

**2. 執行 Migration 015b**
```bash
# 複製檔案內容
pbcopy < db/migrations/015b_optimize_rls_performance_idempotent.sql

# 或手動開啟檔案
open db/migrations/015b_optimize_rls_performance_idempotent.sql
```

**3. 貼到 SQL Editor 並執行**
- 點擊 Run
- 等待執行完成（約 10-15 秒）

**4. 驗證結果**
```sql
-- 執行驗證腳本
執行 VERIFY_MIGRATION_015.sql

-- 預期結果
✅ ALL TESTS PASSED!
```

---

#### 🔧 替代方案：清理後重新執行

**優點**：
- ✅ 更清晰了解每個步驟
- ✅ 適合學習和理解過程

**步驟**：

**1. 診斷當前狀態**
```sql
-- 執行診斷腳本
執行 DIAGNOSE_POLICY_CONFLICTS.sql
```

**2. 清理衝突的 Policies**
```sql
-- 執行清理腳本
執行 CLEANUP_CONFLICTING_POLICIES.sql

-- 預期輸出
✅ SUCCESS: All conflicting policies removed
```

**3. 重新執行 Migration 015**
```sql
-- 選項 A：執行原始版本（如果清理乾淨）
執行 015_optimize_rls_performance.sql

-- 選項 B：執行修正版本（推薦）
執行 015b_optimize_rls_performance_idempotent.sql
```

**4. 驗證結果**
```sql
執行 VERIFY_MIGRATION_015.sql
```

---

### 解決方案 2：部分執行狀態恢復

**問題情境**：
- Migration 015 執行到一半中斷
- 部分 policies 已建立，部分未建立

**步驟**：

**1. 評估當前狀態**
```sql
執行 DIAGNOSE_POLICY_CONFLICTS.sql

-- 查看輸出中的 Test 3 結果
-- 判斷執行到哪個階段
```

**2. 決定策略**

**情況 A：Part 1-10 完成，Part 11-12 未開始**
```sql
-- 只執行 Part 11-12
-- 建議：使用完整的 015b，它會自動處理已存在的 policies
執行 015b_optimize_rls_performance_idempotent.sql
```

**情況 B：Part 11 部分完成**
```sql
-- 清理 Part 11-12
執行 CLEANUP_CONFLICTING_POLICIES.sql

-- 重新執行完整 migration
執行 015b_optimize_rls_performance_idempotent.sql
```

**情況 C：完全不確定狀態**
```sql
-- 最安全的方式：全部清理重來
-- 1. 清理衝突
執行 CLEANUP_CONFLICTING_POLICIES.sql

-- 2. 重新執行
執行 015b_optimize_rls_performance_idempotent.sql
```

**3. 驗證**
```sql
執行 VERIFY_MIGRATION_015.sql
```

---

### 解決方案 3：回滾到 Migration 013

**使用時機**：
- Migration 015 造成嚴重問題
- 需要回到之前的穩定狀態

**⚠️ 警告**：
- 這會失去 Migration 015 的效能優化
- auth.uid() 呼叫仍會是 O(n) 複雜度
- Database Linter 警告仍會存在

**步驟**：

**1. 清除 Migration 015 的所有 policies**
```sql
-- 手動清除 Migration 015 建立的所有 policies
執行 CLEANUP_CONFLICTING_POLICIES.sql

-- 這會移除 service_role_bypass 和 authenticated_read policies
```

**2. 重新執行 Migration 013**
```sql
-- Migration 013 會重建未優化但功能正確的 policies
執行 db/migrations/013_fix_rls_policies_security.sql
```

**3. 驗證**
```sql
-- 檢查 policies 是否正確
SELECT tablename, COUNT(*) as policy_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;
```

**4. 後續計畫**
```
等待 Migration 015 問題解決後，再次執行 015b
```

---

## ❓ FAQ

### Q1：Migration 015 和 015b 有什麼差別？

**A1**：
- **Migration 015**：原始版本
  - 在 Part 11 和 Part 12 直接 CREATE POLICY
  - 如果 policy 已存在會失敗

- **Migration 015b**：修正版本
  - 在每個 CREATE POLICY 前加上 DROP IF EXISTS
  - 可以安全地重複執行（Idempotent）
  - 推薦使用

**建議**：
- 新系統：直接使用 015b
- 遇到錯誤：使用 015b
- 學習用途：可以先看 015 理解邏輯，實際執行用 015b

---

### Q2：如果我不小心執行了兩次 Migration 015b 會怎樣？

**A2**：
- ✅ 完全安全！
- Migration 015b 是 idempotent（冪等）的
- 它會先 DROP 再 CREATE，所以重複執行只是重建一次
- 不會有任何副作用

---

### Q3：執行 Migration 015 期間前端會受影響嗎？

**A3**：
- ⚠️ 會有短暫影響（5-10 秒）
- 在 DROP 和 CREATE 之間，某些 policies 暫時不存在
- 這期間的查詢可能會失敗

**建議**：
- 在低流量時段執行
- 提前通知使用者
- 前端應有適當的錯誤處理

---

### Q4：Migration 015 會影響資料嗎？

**A4**：
- ✅ 完全不會！
- Migration 015 只修改 RLS policies（權限規則）
- 不會碰觸任何資料表的資料
- 即使執行失敗，資料也完全安全

---

### Q5：如何確認 Migration 015 真的提升了效能？

**A5**：

**方法 1：使用 EXPLAIN ANALYZE**
```sql
-- 測試查詢效能
EXPLAIN (ANALYZE, BUFFERS)
SELECT * FROM users
WHERE EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = (SELECT auth.uid())
    AND u.role = 'admin'
);

-- 檢查輸出中的 InitPlan
-- 優化後：InitPlan 只出現一次（在查詢頂層）
-- 優化前：SubPlan 會重複執行
```

**方法 2：檢查 Database Linter**
```bash
# 前往 Supabase Dashboard
Database → Linter → Run Linter

# 確認 auth_rls_initplan 警告
優化前：44+ warnings
優化後：0 warnings
```

**方法 3：實際查詢測試**
```sql
-- 查詢 1000 筆資料並計時
SELECT COUNT(*) FROM students
WHERE EXISTS (
    SELECT 1 FROM courses
    WHERE courses.class_id = students.class_id
    AND courses.teacher_id = (SELECT auth.uid())
);

-- 優化前：可能需要 200-500ms
-- 優化後：可能只需要 100-200ms（提升 50-70%）
```

---

### Q6：我可以只執行 Migration 015 的某一部分嗎？

**A6**：
- ⚠️ 不建議！
- Migration 015 是一個完整的單元
- 部分執行可能導致：
  - 某些資料表有優化的 policies
  - 某些資料表沒有
  - 權限不一致

**如果真的需要**：
```sql
-- 可以手動複製 Migration 015 的特定部分
-- 例如：只優化 users 表的 policies

-- 但建議：
執行完整的 Migration 015b
這樣確保所有資料表都一致優化
```

---

### Q7：如何知道當前使用的是 Migration 015 還是 015b？

**A7**：

**方法 1：檢查 Git 歷史**
```bash
git log --oneline | grep "015"
```

**方法 2：檢查 Policies 是否有 DROP IF EXISTS**
```sql
-- 無法直接從資料庫判斷
-- 因為最終結果都是一樣的 policies
-- 只能從執行歷史或檔案內容判斷
```

**方法 3：查看執行記錄**
```bash
# 如果有記錄執行時間和版本
# 查看 Migration 執行日誌
```

**建議**：
- 在執行時做好記錄
- 記錄執行的檔案名稱和時間
- 可以在 EXECUTE_MIGRATION_015.md 填寫執行記錄

---

### Q8：Migration 015 失敗了，我該如何聯繫支援？

**A8**：

**提供以下資訊**：

1. **錯誤訊息**
```sql
-- 完整的錯誤訊息
ERROR: 42710: policy "service_role_bypass" for table "users" already exists
```

2. **診斷結果**
```sql
-- 執行並提供輸出
執行 DIAGNOSE_POLICY_CONFLICTS.sql
```

3. **環境資訊**
```
- Supabase Project ID: piwbooidofbaqklhijup
- Migration 版本: 015 或 015b
- 執行時間: YYYY-MM-DD HH:MM
- 使用工具: SQL Editor / psql / Supabase CLI
```

4. **重現步驟**
```
1. 執行了哪些操作
2. 在哪個步驟失敗
3. 之前是否執行過其他操作
```

**聯繫管道**：
- GitHub Issues（如果是開源專案）
- 內部技術支援
- 專案負責人

---

### Q9：可以在生產環境直接執行 Migration 015b 嗎？

**A9**：

**⚠️ 建議先在測試環境驗證**

**測試環境流程**：
```
1. 複製生產環境資料到測試環境
2. 在測試環境執行 Migration 015b
3. 執行完整測試
4. 驗證效能改善
5. 確認無異常後，才在生產環境執行
```

**生產環境執行前檢查**：
- [ ] 已在測試環境成功執行
- [ ] 已備份資料庫（Supabase 自動備份確認）
- [ ] 已通知團隊維護時間
- [ ] 選擇低流量時段
- [ ] 準備好回滾計畫

**執行時建議**：
```
1. 執行時間：凌晨 2-4 點（低流量）
2. 監控：準備好監控工具
3. 通知：提前通知使用者
4. 團隊：至少 2 人在線（執行者 + 監控者）
```

---

## 📚 相關文件

- [Migration 015 原始版本](./015_optimize_rls_performance.sql)
- [Migration 015b 修正版本](./015b_optimize_rls_performance_idempotent.sql)
- [診斷腳本](./DIAGNOSE_POLICY_CONFLICTS.sql)
- [清理腳本](./CLEANUP_CONFLICTING_POLICIES.sql)
- [驗證腳本](./VERIFY_MIGRATION_015.sql)
- [執行指南](./EXECUTE_MIGRATION_015.md)
- [完整摘要](./MIGRATION_015_SUMMARY.md)

---

## 📞 需要幫助？

如果本文件未能解決您的問題，請：

1. **重新閱讀相關章節**
2. **執行診斷腳本** - `DIAGNOSE_POLICY_CONFLICTS.sql`
3. **查看完整摘要** - `MIGRATION_015_SUMMARY.md`
4. **聯繫技術支援** - 提供完整的錯誤訊息和診斷結果

---

**最後更新**：2025-10-28
**版本**：1.0
**維護者**：開發團隊

# Migration 015 快速修復指南

> **🎯 目標**：快速修復 "policy already exists" 錯誤並完成 RLS 優化

---

## 🚀 快速執行（3 個步驟）

### 步驟 1：診斷（2 分鐘）

**開啟 Supabase SQL Editor**：
```
https://supabase.com/dashboard/project/piwbooidofbaqklhijup/sql/new
```

**執行診斷腳本**：
1. 開啟檔案：`db/migrations/DIAGNOSE_POLICY_CONFLICTS.sql`
2. 複製全部內容
3. 貼到 SQL Editor
4. 點擊 **Run**

**查看結果**：
```
📊 Diagnostic Summary:
  Conflicting Policies: X

Recommendation:
  → Run CLEANUP_CONFLICTING_POLICIES.sql    ← 記下這個建議
  → Then re-execute Migration 015
```

---

### 步驟 2：清理（1 分鐘）

**執行清理腳本**：
1. 開啟檔案：`db/migrations/CLEANUP_CONFLICTING_POLICIES.sql`
2. 複製全部內容
3. 貼到 SQL Editor
4. 點擊 **Run**
5. 等待 5 秒倒數完成

**確認結果**：
```
✅ SUCCESS: All conflicting policies removed

Next Steps:
  1. Run Migration 015b
```

---

### 步驟 3：執行 Migration 015b（2 分鐘）

**執行修正版 migration**：
1. 開啟檔案：`db/migrations/015b_optimize_rls_performance_idempotent.sql`
2. 複製全部內容
3. 貼到 SQL Editor
4. 點擊 **Run**
5. 等待 10-15 秒

**確認成功**：
```
🎉 Migration 015 Completed Successfully
Total: XX policies
```

---

## ✅ 驗證（2 分鐘）

**執行驗證腳本**：
1. 開啟檔案：`db/migrations/VERIFY_MIGRATION_015.sql`
2. 複製全部內容
3. 貼到 SQL Editor
4. 點擊 **Run**

**預期結果**：
```
✅ ALL TESTS PASSED!

Migration 015 was successful:
  ✅ All policies are optimized
  ✅ All tables have RLS enabled
  ✅ Performance should be improved by 50-200%
```

---

## 🎯 確認 Linter 警告消失

**前往 Supabase Dashboard**：
```
Database → Linter → Run Linter
```

**確認結果**：
```
auth_rls_initplan warnings: 0    ← 應該是 0
```

---

## 📋 完整檔案清單

執行順序：

| 順序 | 檔案名稱 | 用途 | 時間 |
|------|---------|------|------|
| 1 | `DIAGNOSE_POLICY_CONFLICTS.sql` | 診斷當前狀態 | 2 min |
| 2 | `CLEANUP_CONFLICTING_POLICIES.sql` | 清除衝突 policies | 1 min |
| 3 | `015b_optimize_rls_performance_idempotent.sql` | 執行優化 | 2 min |
| 4 | `VERIFY_MIGRATION_015.sql` | 驗證結果 | 2 min |

**總時間**：約 7-10 分鐘

---

## ❓ 遇到問題？

### 問題 1：清理腳本執行失敗

**錯誤**：`permission denied`

**解決**：
- 確認您使用的是 Supabase SQL Editor
- SQL Editor 自動使用 postgres 超級使用者權限

---

### 問題 2：Migration 015b 仍然顯示 policy exists

**原因**：清理不完整

**解決**：
```sql
-- 手動清除所有衝突 policies
DROP POLICY IF EXISTS "service_role_bypass" ON users;
DROP POLICY IF EXISTS "service_role_bypass" ON classes;
DROP POLICY IF EXISTS "service_role_bypass" ON courses;
DROP POLICY IF EXISTS "service_role_bypass" ON students;
DROP POLICY IF EXISTS "service_role_bypass" ON student_courses;
DROP POLICY IF EXISTS "service_role_bypass" ON exams;
DROP POLICY IF EXISTS "service_role_bypass" ON assessment_codes;
DROP POLICY IF EXISTS "service_role_bypass" ON scores;
DROP POLICY IF EXISTS "service_role_bypass" ON assessment_titles;

-- 然後重新執行 Migration 015b
```

---

### 問題 3：驗證腳本顯示部分測試失敗

**查看詳細輸出**：
- 閱讀驗證腳本的完整輸出
- 找出哪個測試失敗

**常見原因**：
1. Migration 015b 未完整執行
2. 某些 policies 建立失敗
3. RLS 未啟用

**解決**：
```sql
-- 重新執行 Migration 015b
-- 它是 idempotent 的，可以安全重複執行
```

---

## 📚 詳細文件

需要更多資訊？查看：

- **故障排除** - `TROUBLESHOOTING_MIGRATION_015.md`（完整 FAQ）
- **執行指南** - `EXECUTE_MIGRATION_015.md`（詳細步驟）
- **技術摘要** - `MIGRATION_015_SUMMARY.md`（完整說明）

---

## 🎉 完成後

### 下一步

1. **Git Commit**
```bash
git add db/migrations/
git commit -m "fix: resolve Migration 015 policy conflicts with 015b"
git push origin main
```

2. **通知團隊**
```
✅ Migration 015 RLS 優化已完成
✅ 查詢效能提升 50-200%
✅ Database Linter 警告已清除（44+ → 0）
```

3. **監控效能**
- 觀察查詢速度是否改善
- 檢查是否有異常錯誤
- 使用 EXPLAIN ANALYZE 驗證查詢計畫

---

**祝您順利完成優化！** 🚀

如有任何問題，請參考 `TROUBLESHOOTING_MIGRATION_015.md`

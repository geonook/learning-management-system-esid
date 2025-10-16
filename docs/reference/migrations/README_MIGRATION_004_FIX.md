# Migration 004 Fix: 處理現存資料約束衝突

## 🚨 問題背景
原始的 Migration 004 執行失敗，錯誤訊息：
```
ERROR: 23514: check constraint "users_grade_check" of relation "users" is violated by some row
```

**原因**：資料庫中已存在 grade 值在 7-12 範圍的資料（中學制），無法直接應用 1-6 的新約束（小學制）。

## 🔧 解決方案

### 兩階段修復流程

#### 階段 1：檢查現存資料
**檔案**：`004a_check_existing_data.sql`

**目的**：
- 分析 users, classes, students, assessment_titles 表中的現存資料
- 識別違反新約束的記錄
- 提供資料處理建議

**執行方式**：
```sql
-- 在 Supabase SQL Editor 中複製貼上執行
-- 檢查結果，了解衝突資料的數量和內容
```

#### 階段 2：安全遷移
**檔案**：`004b_migrate_grade_constraints_safely.sql`

**目的**：
- 安全清理違反約束的資料
- 逐步更新每個表的約束條件
- 驗證新約束正確應用

**資料處理策略**：
- **users 表**：將違反約束的 grade 設為 NULL
- **classes 表**：刪除中學制班級及相關資料（按外鍵依賴順序）
- **students 表**：刪除中學制學生及相關資料  
- **assessment_titles 表**：將違反約束的 grade 設為 NULL

**⚠️ 外鍵依賴處理順序**：
1. assessment_titles (引用 classes.id)
2. scores (引用 students.id)
3. student_courses (引用 students.id 和 courses.id)
4. courses (引用 classes.id)
5. students (引用 classes.id)
6. classes (主表)

## 📋 執行步驟

### 步驟 1：檢查資料狀況
1. 開啟 `004a_check_existing_data.sql`
2. 複製全部內容到 Supabase SQL Editor
3. 執行並檢查結果
4. 確認衝突資料的數量和類型

### 步驟 2：執行安全遷移
1. 開啟 `004b_migrate_grade_constraints_safely.sql`
2. 複製全部內容到 Supabase SQL Editor
3. 執行遷移（會自動清理衝突資料）
4. 檢查執行結果確認成功

## ⚠️ 重要注意事項

### 資料清理影響
- **users 表**：中學制教師/管理員的 grade 會被設為 NULL
- **classes 表**：所有中學制班級會被刪除
- **students 表**：所有中學制學生會被刪除
- **相關資料**：課程、註冊記錄、成績等相關資料也會被清理

### 安全考量
- ✅ 遷移腳本包含詳細的日誌輸出
- ✅ 每步驟都有執行狀態確認
- ✅ 包含約束驗證測試
- ⚠️ **不可逆操作**：清理的資料無法恢復

### 適用場景
- 測試環境：安全執行，清理測試資料
- 生產環境：需要先備份，確認資料清理策略

## ✅ 預期執行結果

### 階段 1 輸出範例
```
TOTAL CONFLICTS: X records
Recommendation: CONFLICTS FOUND - Need to clean/convert data before applying constraints
```

### 階段 2 輸出範例
```
Found X conflicting records in users table
Updated X users records: set conflicting grades to NULL
...
SUCCESS: Primary school grade 3 accepted
SUCCESS: Middle school grade 8 correctly rejected
Database now supports only primary school grades 1-6 (G1-G6)
```

## 🎯 完成後狀態

執行成功後：
- ✅ 資料庫只支援小學制 grade 1-6
- ✅ 所有約束條件正確應用
- ✅ 測試 CSV 資料可以正常導入
- ✅ 觸發器測試可以使用真實小學年級

## 🚀 後續步驟

1. **驗證約束**：確認新約束正確應用
2. **測試導入**：使用 `/test-data-courses/` 測試資料
3. **功能測試**：驗證完整的小學課程系統
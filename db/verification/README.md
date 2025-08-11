# Database Verification Scripts

這個目錄包含用於驗證 Courses Architecture Migration (003a & 003b) 的腳本。

## 📋 驗證腳本

### 1. `verify_courses_architecture.sql`
**用途**：全面驗證 migration 是否正確執行

**檢查項目**：
- ✅ ENUM 類型 (user_role, teacher_type, course_type)
- ✅ 新表結構 (courses, student_courses)
- ✅ 新欄位 (scores.course_id)
- ✅ 索引建立
- ✅ 觸發器存在
- ✅ 視圖建立
- ✅ RLS 政策
- ✅ 資料統計

**執行方式**：
```sql
-- 直接在 Supabase SQL Editor 中複製貼上整個腳本內容並執行
-- 或者複製每個查詢部分分別執行
```

### 2. `test_triggers.sql`
**用途**：測試自動觸發器功能

**測試項目**：
- ✅ 新班級自動建立 3 個課程 (LT/IT/KCFS)
- ✅ 學生分配到班級時自動註冊所有課程
- ✅ 視圖正確顯示資料
- ✅ 後加入的學生也能自動註冊

**執行方式**：
```sql
-- 直接在 Supabase SQL Editor 中複製貼上整個腳本內容並執行
-- 腳本包含多個步驟，會依序執行測試
```

### 3. `cleanup_test_data.sql`
**用途**：清理測試過程中建立的測試資料

**清理項目**：
- 🗑️ 測試學生註冊資料
- 🗑️ 測試課程
- 🗑️ 測試學生
- 🗑️ 測試班級

**執行方式**：
```sql
-- 在測試完成後，將腳本內容複製貼上到 Supabase SQL Editor 執行
-- 會依序刪除所有 TEST_ 開頭的測試資料
```

## 🔄 完整驗證流程

### 第一階段：架構驗證
1. 開啟 `verify_courses_architecture.sql` 並複製全部內容
2. 貼上到 Supabase SQL Editor 並執行
3. 檢查所有項目都顯示正確，確認資料表結構完整

### 第二階段：功能測試
1. 開啟 `test_triggers.sql` 並複製全部內容  
2. 貼上到 Supabase SQL Editor 並執行
3. 驗證觸發器正常運作，確認視圖顯示正確資料

### 第三階段：清理
1. 開啟 `cleanup_test_data.sql` 並複製全部內容
2. 貼上到 Supabase SQL Editor 並執行
3. 確保測試資料已清除，資料庫回到乾淨狀態

## ✅ 預期結果

### 架構驗證預期結果：
- **ENUM 類型**：user_role, teacher_type, course_type 都包含正確值
- **新表**：courses, student_courses 存在且結構正確
- **索引**：所有 course 相關索引已建立
- **觸發器**：course 相關觸發器存在
- **視圖**：course_details, student_course_enrollments 可正常查詢

### 功能測試預期結果：
- **課程建立**：新班級自動建立 3 個課程 (LT/IT/KCFS)
- **學生註冊**：每個學生自動註冊到 3 個課程
- **視圖資料**：課程詳情和註冊資料正確顯示
- **總註冊數**：3 學生 × 3 課程 = 9 個註冊記錄

## 🚨 故障排除

如果驗證失敗，請檢查：
1. 是否已按順序執行 003a 和 003b migration
2. 是否有權限執行所有 SQL 操作
3. 檢查 Supabase 控制台中的錯誤日誌

## 📊 成功指標

全部驗證通過後，系統應該能支援：
- ✅ 獨立的英語課程管理 (LT/IT/KCFS)
- ✅ 學生多課程註冊
- ✅ 基於課程的成績管理
- ✅ 課程權限控制 (RLS)
- ✅ 自動化的課程和註冊管理
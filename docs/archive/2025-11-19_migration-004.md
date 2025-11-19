# Migration 004: Primary School Grade Constraints

## 🎯 目的
將系統從中學制（G7-G12）改為小學制（G1-G6），修改所有相關的 grade 約束條件。

## 🏫 背景
- **原始設計**: 中學制，grade 7-12
- **實際需求**: 小學制，grade 1-6  
- **問題**: 測試資料和 CSV 導入使用 G1-G6，但資料庫約束只允許 G7-G12

## 📋 修改內容

### 約束條件更新
將以下表的 grade 約束從 `7-12` 改為 `1-6`：

1. **users 表**
   - 舊約束: `CHECK (grade BETWEEN 7 AND 12)`
   - 新約束: `CHECK (grade IS NULL OR (grade BETWEEN 1 AND 6))`

2. **classes 表**  
   - 舊約束: `CHECK (grade BETWEEN 7 AND 12)`
   - 新約束: `CHECK (grade BETWEEN 1 AND 6)`

3. **students 表**
   - 舊約束: `CHECK (grade BETWEEN 7 AND 12)`
   - 新約束: `CHECK (grade BETWEEN 1 AND 6)`

4. **assessment_titles 表**
   - 舊約束: `CHECK (grade BETWEEN 7 AND 12)`
   - 新約束: `CHECK (grade IS NULL OR (grade BETWEEN 1 AND 6))`

## 🚀 執行方式

### 在 Supabase SQL Editor 中執行：
1. 開啟 `004_update_grade_constraints_for_primary_school.sql`
2. **複製全部內容**
3. **貼上到 Supabase SQL Editor**
4. **執行**

## ✅ 驗證功能

Migration 包含自動測試驗證：
- ✅ Grade 1 可以成功插入
- ✅ Grade 6 可以成功插入  
- ✅ Grade 7 被正確拒絕（不再支援）

## 📊 執行後效果

### 立即效果
- ✅ 所有測試資料（G1-G6）可以正常導入
- ✅ CSV 導入功能完全正常
- ✅ 觸發器測試可以使用真實的小學年級

### 系統支援範圍
- **年級範圍**: G1, G2, G3, G4, G5, G6
- **班級系統**: 每年級支援多個班級和績效等級（E1/E2/E3）
- **課程系統**: 每班級 3 個獨立英語課程（LT/IT/KCFS）

## 🔄 後續步驟

執行成功後可以：
1. **重新測試觸發器** - 使用 G1-G6 年級的測試資料
2. **執行 CSV 導入** - 使用 `/test-data-courses/` 中的完整小學資料
3. **測試前端功能** - 驗證小學年級的界面顯示

## 📝 注意事項

- **不可逆操作**: 此 migration 會拒絕 G7+ 的資料
- **資料清理**: 如有現存 G7-G12 資料，需要先清理或轉換
- **測試建議**: 在測試環境先執行，確認無問題後再在生產環境執行

## 🎉 預期結果

執行完成後：
```
SUCCESS: Grade 1 accepted for classes table
SUCCESS: Grade 6 accepted for classes table  
SUCCESS: Grade 7 correctly rejected for classes table
```

系統將完全支援小學教育環境的 G1-G6 年級結構！
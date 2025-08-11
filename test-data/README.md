# CSV Import Test Data - Grade 9

這些是為LMS系統準備的測試CSV檔案，包含完整的Grade 9資料。

## 📋 檔案說明

### 匯入順序 (非常重要！)
1. **1-users-grade9.csv** - 首先匯入用戶(老師和管理員)
2. **2-classes-grade9.csv** - 匯入班級(依賴用戶資料)  
3. **3-students-grade9.csv** - 匯入學生(依賴班級資料)
4. **4-scores-grade9.csv** - 最後匯入成績(依賴學生資料)

## 🎯 測試資料概要

- **4個用戶**: 2位老師, 1位年級主任, 1位管理員
- **3個班級**: 2個英文班 + 1個數學班
- **6位學生**: 涵蓋local和international軌別
- **18筆成績**: FA1, FA2, SA1 各項評量

## 🚀 使用方法

1. 開啟 http://localhost:3000/admin/import
2. 按檔案名稱順序(1→2→3→4)上傳CSV
3. 每個檔案上傳後檢查驗證結果
4. 使用 "Test Import (Dry Run)" 預覽
5. 執行 "Execute Import" 正式匯入

## 📊 驗證要點

- Users: 檢查角色權限正確
- Classes: 確認teacher關聯正確
- Students: 驗證班級分配
- Scores: 確認成績數值和評量代碼

Good luck! 🎉
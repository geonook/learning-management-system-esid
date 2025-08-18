# 🔐 LMS-ESID 測試帳號清單

> **用途**: 人工測試時使用的各角色測試帳號  
> **環境**: localhost:3000  
> **最後更新**: 2025-08-18

## 📋 測試帳號列表

### 👑 Admin 管理員
```
Email: admin@school.edu
Role: admin
權限: 全域管理權限，可存取所有功能
測試重點: 系統管理、用戶管理、全域 Analytics
```

### 🎓 Head Teachers (年段主任)

#### G4 Local Head Teacher
```
Email: head.g4.local@school.edu
Role: head
Teacher Type: LT
Grade: 4
Track: local
權限: G4 Local 軌的管理權限
測試重點: Assessment Title 管理、年段統計、RLS 權限邊界
```

#### G4 International Head Teacher
```
Email: head.g4.intl@school.edu
Role: head
Teacher Type: IT
Grade: 4
Track: international
權限: G4 International 軌的管理權限
測試重點: 跨軌權限隔離、國際軌特殊功能
```

#### G6 Local Head Teacher
```
Email: head.g6.local@school.edu
Role: head
Teacher Type: LT
Grade: 6
Track: local
權限: G6 Local 軌的管理權限
測試重點: 高年級管理功能、小學畢業管理
```

### 👨‍🏫 Teachers (教師)

#### Local Teachers (本地教師)
```
Email: teacher.lt.1@school.edu
Role: teacher
Teacher Type: LT
權限: 只能存取自己任教的 LT 課程
測試重點: 成績輸入、LT 課程管理、權限限制

Email: teacher.lt.2@school.edu
Role: teacher
Teacher Type: LT
權限: 只能存取自己任教的 LT 課程
測試重點: 多教師協作、課程分配
```

#### International Teachers (國際教師)
```
Email: teacher.it.1@school.edu
Role: teacher
Teacher Type: IT
權限: 只能存取自己任教的 IT 課程
測試重點: IT 課程特色、國際軌評量

Email: teacher.it.2@school.edu
Role: teacher
Teacher Type: IT
權限: 只能存取自己任教的 IT 課程
測試重點: 國際教師協作、跨文化教學
```

#### KCFS Teachers (康橋未來技能教師)
```
Email: teacher.kcfs.1@school.edu
Role: teacher
Teacher Type: KCFS
權限: 只能存取自己任教的 KCFS 課程
測試重點: KCFS 特色課程、未來技能評量
```

## 🧪 角色權限測試矩陣

| 功能/頁面 | Admin | Head Teacher | LT Teacher | IT Teacher | KCFS Teacher |
|-----------|-------|--------------|------------|------------|--------------|
| **Dashboard** | ✅ 全域 | ✅ 年段範圍 | ✅ 個人範圍 | ✅ 個人範圍 | ✅ 個人範圍 |
| **學生管理** | ✅ 全部學生 | ✅ 年段學生 | ❌ 無權限 | ❌ 無權限 | ❌ 無權限 |
| **班級管理** | ✅ 全部班級 | ✅ 年段班級 | 👁️ 只能查看 | 👁️ 只能查看 | 👁️ 只能查看 |
| **課程管理** | ✅ 全部課程 | ✅ 年段課程 | ✅ 自己課程 | ✅ 自己課程 | ✅ 自己課程 |
| **成績輸入** | ✅ 全部 | ✅ 年段範圍 | ✅ LT 課程 | ✅ IT 課程 | ✅ KCFS 課程 |
| **Analytics** | ✅ 全域分析 | ✅ 年段分析 | ✅ 個人分析 | ✅ 個人分析 | ✅ 個人分析 |
| **Assessment Title 管理** | ✅ 完整權限 | ✅ 年段權限 | ❌ 無權限 | ❌ 無權限 | ❌ 無權限 |
| **通知管理** | ✅ 全域通知 | ✅ 年段通知 | ✅ 個人通知 | ✅ 個人通知 | ✅ 個人通知 |

## 🎯 測試場景建議

### 場景 1: 權限邊界測試
1. **Teacher 權限測試**:
   - 用 `teacher.lt.1@school.edu` 登入
   - 嘗試存取其他教師的課程成績
   - 應該被 RLS 政策阻止

2. **Head Teacher 跨年段測試**:
   - 用 `head.g4.local@school.edu` 登入  
   - 嘗試存取 G6 或 International 軌數據
   - 應該被權限限制

### 場景 2: 跨軌協作測試
1. **同年段不同軌**:
   - 比較 G4 Local 和 G4 International 的數據差異
   - 測試 Assessment Title 的軌別特殊設定

2. **同軌不同年段**:
   - 比較 G4 和 G6 年段的課程設置
   - 測試年段升級功能

### 場景 3: 三軌課程測試
每個班級都應該有三種課程:
- **LT English Language Arts** (本地英語)
- **IT English Language Arts** (國際英語)  
- **KCFS** (康橋未來技能)

測試重點:
- 同一學生在不同課程的成績
- 不同教師類型的評量方式
- 跨課程的 Analytics 比較

## 🔍 權限驗證檢查清單

### Admin 權限驗證 ✅
- [ ] 可以查看所有學生資料
- [ ] 可以管理所有班級課程
- [ ] 可以存取全域 Analytics
- [ ] 可以管理 Assessment Titles
- [ ] 可以查看所有教師績效

### Head Teacher 權限驗證 ✅
- [ ] 只能查看指定年段×軌別的數據
- [ ] 可以管理 Assessment Titles (年段範圍)
- [ ] 可以查看年段 Analytics
- [ ] 無法存取其他年段/軌別數據

### Teacher 權限驗證 ✅
- [ ] 只能查看自己任教的課程
- [ ] 只能輸入自己課程的成績
- [ ] 無法存取 Assessment Title 管理
- [ ] 只能查看個人教學 Analytics
- [ ] 無法查看其他教師的數據

## 🚨 常見測試問題

### 登入問題
- **問題**: 無法登入測試帳號
- **解決**: 確認 Supabase Auth 設定正確，檢查 `.env.local` 配置

### 權限問題  
- **問題**: Teacher 看到不該看到的數據
- **解決**: 檢查 RLS 政策是否正確部署

### 數據問題
- **問題**: 學生或班級數據不正確
- **解決**: 確認種子資料 (seed data) 是否正確載入

## 📞 測試支援

如果在測試過程中遇到問題:

1. **檢查控制台錯誤** (F12 開發者工具)
2. **確認網路連接** (Zeabur Supabase 連線)
3. **驗證環境變數** (`.env.local` 設定)
4. **查看系統通知** (可能有相關錯誤訊息)

測試順利！🎯
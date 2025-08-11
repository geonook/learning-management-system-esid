# 小學LMS系統測試資料 (G1-G6)

這是為LMS-ESID小學系統準備的完整測試CSV檔案，支援G1-G6年段結構。

## 🏫 **系統架構**

### 📊 年段結構
- **6個年段**: G1, G2, G3, G4, G5, G6
- **14個標準班名** (每年段相同):
  - Trailblazers, Discoverers, Adventurers, Innovators
  - Explorers, Navigators, Inventors, Voyagers  
  - Pioneers, Guardians, Pathfinders, Seekers
  - Visionaries, Achievers

### 🎯 Level分級系統
- **E1**: 頂尖學術表現級別
- **E2**: 中等學術表現級別  
- **E3**: 基礎學術表現級別

### 👥 師資結構
- **LT (Local Teacher)**: 本地教師
- **IT (International Teacher)**: 國際教師
- **年段主任**: 各年段配置Head Teacher

## 📋 **測試資料內容**

### 檔案說明
1. **`1-users-primary.csv`** - 19位教職員工
   - 1位管理員
   - 6位年段主任 (G1-G6)
   - 12位任課教師 (LT/IT混合)

2. **`2-classes-primary.csv`** - 19個班級
   - 每年段3個代表班級 (E1/E2/E3各一個)
   - 涵蓋local/international軌別
   - 標準命名格式: "G[1-6] [ClassName]"

3. **`3-students-primary.csv`** - 20位學生
   - 各年段、各level均勻分布
   - student_id格式: P001-P053
   - 包含完整的年段/level/軌別資訊

4. **`4-scores-primary.csv`** - 60筆評量成績
   - 每位學生3項評量: FA1, FA2, SA1
   - 分數範圍70-93，符合level分級預期

## 🚀 **匯入順序**

**⚠️ 務必按順序執行！**

1. **Users** → 匯入 `1-users-primary.csv`
2. **Classes** → 匯入 `2-classes-primary.csv`
3. **Students** → 匯入 `3-students-primary.csv`  
4. **Scores** → 匯入 `4-scores-primary.csv`

## 📈 **驗證重點**

### Users驗證
- ✅ 角色分配正確 (admin/head/teacher)
- ✅ teacher_type對應 (LT/IT/KCFS)
- ✅ 年段主任grade欄位正確

### Classes驗證  
- ✅ 班名格式: "G[1-6] [StandardName]"
- ✅ Level分級: E1/E2/E3
- ✅ Teacher關聯正確

### Students驗證
- ✅ 班級分配一致
- ✅ Grade/Level/Track繼承正確
- ✅ student_id唯一性

### Scores驗證
- ✅ 評量代碼有效 (FA1/FA2/SA1)
- ✅ 分數範圍合理 (0-100)
- ✅ Student關聯正確

## 🎓 **預期成果**

匯入完成後，系統將包含：
- 完整的小學G1-G6架構
- 三級學術分級系統
- 多軌別混合環境
- 真實的師生比例配置

**開始測試小學LMS系統吧！** 🌟
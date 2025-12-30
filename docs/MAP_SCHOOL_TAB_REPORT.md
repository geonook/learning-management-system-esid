# MAP Growth 跨年級分析功能 - 實作報告

> **日期**: 2025-12-30  
> **專案**: LMS MAP Growth Analysis  
> **狀態**: ✅ 已完成並部署

---

## 執行摘要

為解決決策者無法一眼看到 **G3-G6 全校表現** 的痛點，於 MAP Growth 分析頁面新增 **School Tab**，整合四項跨年級分析功能，現已部署至 Staging 環境並通過測試。

---

## 一、專案背景

### 問題

現有 MAP 分析頁面一次只能看一個年級的資料，決策者（校長、主任）需要多次切換才能了解全校表現。

### 解決方案

新增獨立的 **[School]** Tab，不受年級選擇器限制，一次顯示 G3-G6 完整分析。

---

## 二、功能說明

### 2.1 Tab 結構

```
[School] [Grades] [Growth] [Goals] [Lexile] [Quality] [Transitions]
   🆕       原名
           Overview
```

### 2.2 四項分析功能

| 編號 | 功能                    | 說明                                 | 決策價值                     |
| ---- | ----------------------- | ------------------------------------ | ---------------------------- |
| P1   | **Cross-Grade Chart**   | G3-G6 平均 RIT 與 NWEA 常模比較      | 快速識別哪個年級需要額外支援 |
| P2   | **Summary Table**       | 各年級統計摘要（人數、平均、標準差） | 精確數據查詢                 |
| P3   | **Growth Distribution** | Fall-to-Fall 成長分佈直方圖          | 識別負成長學生數量           |
| P4   | **RIT-Growth Scatter**  | 起始分數與成長相關性分析             | 識別天花板效應               |

---

## 三、關鍵數據

### 3.1 圖表解讀

#### Cross-Grade Performance Chart

- **綠線** = KCISLK 學生平均（含誤差棒 ±1 標準差）
- **灰虛線** = NWEA 全國常模
- **高於虛線** = 表現優於全國平均

#### Summary Table

- **vs Norm** 欄位：綠色 = 高於常模，紅色 = 低於常模

#### Growth Distribution

- **紅色區塊** = 負成長學生（需關注）
- 顯示學生數量和百分比

#### RIT-Growth Correlation

- **相關係數 r** = 起始分數與成長的關係
- 負相關 = 高分學生成長較小（天花板效應）

---

## 四、測試結果

| 項目                   | 結果    | 備註                         |
| ---------------------- | ------- | ---------------------------- |
| P1 Cross-Grade Chart   | ✅ 通過 | 正確顯示 G3-G6 資料          |
| P2 Summary Table       | ✅ 通過 | 正確標記 vs Norm             |
| P3 Growth Distribution | ✅ 通過 | 709 學生，平均成長 +7.8      |
| P4 Scatter Chart       | ✅ 通過 | 相關係數 -0.29（弱負相關）   |
| 年級選擇器             | ✅ 通過 | School Tab 顯示 "All Grades" |
| 學期選擇器             | ✅ 通過 | 最新學期在最上，按時間排序   |
| 無 Console 錯誤        | ✅ 通過 |                              |

---

## 五、技術實作

### 5.1 新增檔案

| 檔案                                                | 功能         |
| --------------------------------------------------- | ------------ |
| `lib/api/map-school-analytics.ts`                   | 全校分析 API |
| `components/map/school/CrossGradeChart.tsx`         | 跨年級比較圖 |
| `components/map/school/SchoolSummaryTable.tsx`      | 統計表格     |
| `components/map/school/GrowthDistributionChart.tsx` | 成長分佈圖   |
| `components/map/school/RitGrowthScatterChart.tsx`   | 相關性散佈圖 |
| `components/map/school/SchoolTab.tsx`               | Tab 主組件   |

### 5.2 資料來源

所有資料均來自現有 `map_assessments` 表，無需新增資料庫表格。

### 5.3 Commits

| Commit    | 說明                              |
| --------- | --------------------------------- |
| `54ad49f` | P1+P2 基礎功能                    |
| `b58ff75` | Tab 命名調整（Overview → Grades） |
| `e165421` | 學期排序 + 配色優化               |
| `3fc7770` | P3 成長分佈圖                     |
| `0605535` | P4 散佈圖                         |
| `f73aedf` | 動態偵測可用學期                  |

---

## 六、使用指南

### 存取方式

1. 登入 LMS Staging: https://lms-staging.zeabur.app
2. 前往 **Browse → Stats → MAP**
3. 點選 **School** Tab（第一個）

### 操作說明

1. **學期選擇**：下拉選單選擇要分析的學期
2. **科目切換**：Average / Language Usage / Reading
3. **向下捲動**：查看所有四項分析

---

## 七、注意事項

1. **P3/P4 顯示條件**：需要資料庫有 2 個以上的 Fall terms（例如 Fall 2024-2025 和 Fall 2025-2026）才會顯示成長分析
2. **KCIS Target Range**：原規劃的紫色期望區間尚未實作（待確認數值來源）

---

## 八、下一步建議

1. **使用者培訓**：向校長、主任說明新功能使用方式
2. **KCIS Target**：確認學校期望值後可加入圖表
3. **正式部署**：確認無問題後合併至 Production

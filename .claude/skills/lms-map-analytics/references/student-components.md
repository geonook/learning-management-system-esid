# Student MAP Analysis Components (v1.60.0)

## 頁面架構

學生 MAP 分析頁面使用 4 個可收合區塊（CollapsibleSection）組織 14 個組件：

### Section 1: Current Performance（預設展開）

| 組件 | 用途 | 對應報告欄位 |
|------|------|-------------|
| ScoreSummaryCards | RIT、Percentile、Achievement Quintile | ✅ 官方報告 |
| StudentBenchmarkStatus | E1/E2/E3 分級 | 🏫 康橋加值 |
| CombinedTestValidityWarning | Rapid Guessing 警示 | ⚠️ 測驗效度 |

### Section 2: Growth & Progress（預設展開）

| 組件 | 用途 | 對應報告欄位 |
|------|------|-------------|
| StudentProgressCharts | NWEA 風格柱狀圖 | ✅ Growth Over Time |
| StudentGrowthIndex | 成長歷史 (含跨學年) | ✅ RIT Growth |
| ProjectedProficiency | Spring 預測 | ✅ Growth Projection |
| StudentPeerComparison | 同儕比較 | 🏫 康橋加值 |

### Section 3: Instructional Focus（預設展開）

| 組件 | 用途 | 對應報告欄位 |
|------|------|-------------|
| StudentGoalAreas | 技能領域表現 | ✅ Goal Areas |
| StudentLexileLevel | Lexile 分數 | ✅ Lexile Range |

### Section 4: Historical Data（預設收合）

| 組件 | 用途 | 對應報告欄位 |
|------|------|-------------|
| StudentBenchmarkHistory | E1/E2/E3 歷史 | 🏫 康橋加值 |
| StudentAssessmentTables | 完整原始數據 | 📊 詳細資料 |

---

## 組件詳細規格

### ScoreSummaryCards

**位置**：`components/map/student/ScoreSummaryCards.tsx`

```
┌─────────────────────────────────────────────────────────┐
│  Reading                          Language Usage        │
│  ┌───────────────────┐            ┌───────────────────┐ │
│  │ RIT: 215          │            │ RIT: 208          │ │
│  │ Growth: +12       │            │ Growth: +8        │ │
│  │ Percentile: 65%   │            │ Percentile: 58%   │ │
│  │ [HiAvg]           │            │ [Avg]             │ │
│  └───────────────────┘            └───────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

**功能**：
- 優先使用官方 CDF percentile
- Achievement Quintile 徽章（Low/LoAvg/Avg/HiAvg/High）
- 與上次測驗的成長比較
- 解釋文字給教師

---

### StudentGrowthIndex

**位置**：`components/map/student/StudentGrowthIndex.tsx`

**雙卡片設計**：
- `FallToSpringCard`: 完整顯示（有官方 CDF）
- `SpringToFallCard`: 簡化顯示（僅 Growth）

```
┌─────────────────────────────────────────────┐
│  Personal Growth Index                      │
├─────────────────────────────────────────────┤
│  SP25 → FA25 (G4)                           │  ← 跨學年
│  ┌─────────────┬─────────────┐              │
│  │ Lang Usage  │   Reading   │              │
│  │ Growth: +3  │ Growth: +8  │              │
│  └─────────────┴─────────────┘              │
├─────────────────────────────────────────────┤
│  FA24 → SP25 (G3)                     ✓ Met │  ← 同學年
│  ┌─────────────┬─────────────┐              │
│  │ Lang Usage  │   Reading   │              │
│  │ Growth: +5  │ Growth: +14 │              │
│  │ Expected:+10│ Expected:+10│              │
│  │ Index: 0.50 │ Index: 1.40 │  [HiAvg]     │
│  └─────────────┴─────────────┘              │
└─────────────────────────────────────────────┘
```

**成長類型差異**：

| 成長類型 | Growth | Expected | Index | Met/Not Met | Quintile |
|---------|--------|----------|-------|-------------|----------|
| FA → SP | ✅ | ✅ | ✅ | ✅（有官方） | ✅（有官方） |
| SP → FA | ✅ | ❌ | ❌ | ❌ | ❌ |

**解釋文字**：
- Growth: RIT score change between consecutive tests.
- Fall → Spring: Full metrics available from official NWEA data.
- Spring → Fall: Only Growth shown (no official NWEA benchmarks for summer growth).
- Index: Actual growth ÷ Expected growth. ≥1.0 means exceeded expectations.
- Quintile: Growth compared to similar students nationally.

---

### StudentProgressCharts

**位置**：`components/map/student/StudentProgressChart.tsx`

**NWEA 官方風格**：
- 柱狀圖（非折線圖）
- 三組資料：Student RIT、Level Avg、Norm
- 斜線填充 Projection
- 右側資料表格

**配色**：

```typescript
const NWEA_COLORS = {
  studentRit: "#5B8BD9",   // 柔和藍色
  levelMean: "#E6B800",    // 柔和金黃
  norm: "#3D5A80",         // 灰藍色
  projection: "#5B8BD9",   // 斜線填充
  gridLine: "#e5e7eb",
};
```

**X 軸格式**：`FA25 (G4)`

**Y 軸設計**：
- 最小值：max(100, 最小數據 - 20)
- 最大值：最大數據 + 15

---

### StudentPeerComparison

**位置**：`components/map/student/StudentPeerComparison.tsx`

**隱私設計 (v1.55.0+)**：
- 使用 English Level 分組（非班級）
- 避免洩露班級平均給家長

**顯示內容**：
- Level Rank: 在同年級同英文等級中的排名
- Grade Rank: 在同年級所有學生中的排名
- vs Level Avg: 與英文等級平均的差距
- vs Grade Avg: 與年級平均的差距
- vs NWEA Norm: 與全國平均的差距

---

### StudentGoalAreas

**位置**：`components/map/student/StudentGoalAreas.tsx`

**Goal Areas by Course**：
- Reading: Informational Text, Literary Text, Vocabulary
- Language Usage: Grammar and Usage, Mechanics, Writing

**標記系統**：
- ★ Relative Strength: Goal RIT > Overall RIT + 5
- ◆ Suggested Focus: Goal RIT < Overall RIT - 5

**Quintile 計算**（基於 vsOverall）：
- High: vsOverall ≥ 5
- HiAvg: 2 ≤ vsOverall < 5
- Avg: -2 < vsOverall < 2
- LoAvg: -5 < vsOverall ≤ -2
- Low: vsOverall ≤ -5

---

### ProjectedProficiency

**位置**：`components/map/student/ProjectedProficiency.tsx`

**顯示條件**：
- 僅在 Fall 學期顯示
- 同學年有 Spring 資料時隱藏

**動態標題**：`SP25 (G4) Projection`

**狀態**：
- On Track: 預測達到年級標準
- Exceeding: 預測超越年級標準
- Needs Support: 預測需要額外支持

---

### StudentBenchmarkStatus

**位置**：`components/map/student/StudentBenchmarkStatus.tsx`

**分類標準**（基於 Spring Average）：

| Grade | E1 | E2 | E3 |
|-------|-----|-----|-----|
| G3 | ≥206 | ≥183 | <183 |
| G4 | ≥213 | ≥191 | <191 |
| G5 | ≥218 | ≥194 | <194 |
| G6 | — | — | — |

**視覺元素**：
- 進度條顯示當前位置
- 顯示距離 E1 的差距
- 顯示距離 E3 的緩衝

---

### StudentLexileLevel

**位置**：`components/map/student/StudentLexileLevel.tsx`

**顯示內容**：
- Lexile 分數（如 `1190L` 或 `BR400`）
- 視覺 band 指示器
- 建議書籍範圍：Lexile-50L ~ Lexile+100L
- 與上次測驗的成長

---

### TestValidityWarning

**位置**：`components/map/student/TestValidityWarning.tsx`

**警告門檻**：
- > 15%：黃色警告
- > 25%：紅色警告

**版本**：
- 單科版本
- 合併版本（同時顯示 Reading 和 Language Usage）

---

### StudentBenchmarkHistory

**位置**：`components/map/student/StudentBenchmarkHistory.tsx`

**顯示內容**：
- 歷史學期的 E1/E2/E3 分類
- 簡化學期名稱（F25、S25）
- 趨勢變化

---

### StudentAssessmentTables

**位置**：`components/map/student/StudentAssessmentTable.tsx`

**表格欄位**：
- Term
- Grade
- RIT Score
- Growth
- Percentile
- Achievement Quintile

---

## API 函數對應

| 組件 | API 函數 | 檔案 |
|------|----------|------|
| ScoreSummaryCards | `getStudentProgressHistory()` | map-student-analytics.ts |
| StudentGrowthIndex | `getStudentAllGrowthRecords()` | map-student-analytics.ts |
| StudentBenchmarkStatus | `getStudentBenchmarkStatus()` | map-student-analytics.ts |
| StudentPeerComparison | `getStudentRankings()` | map-student-analytics.ts |
| StudentGoalAreas | `getStudentGoalPerformance()` | map-student-analytics.ts |
| StudentLexileLevel | `getStudentLexileStatus()` | map-student-analytics.ts |
| StudentBenchmarkHistory | `getStudentBenchmarkHistory()` | map-student-analytics.ts |
| StudentProgressCharts | `getStudentProgressHistory()` | map-student-analytics.ts |
| ProjectedProficiency | `getStudentProgressHistory()` | map-student-analytics.ts |

---

## 設計原則

### 1. 官方數據優先

優先使用 CDF 提供的官方資料：
- `test_percentile` → 優先於計算值
- `achievement_quintile` → Low/LoAvg/Avg/HiAvg/High
- `conditional_growth_index` → 官方成長指數
- `growth_quintile` → 成長五分位
- `met_projected_growth` → Yes/No

### 2. 隱私保護

- Peer Comparison 使用 English Level 分組（非班級）
- 避免家長看到班級排名或班級平均

### 3. 教師友善

- 所有組件包含解釋文字
- 使用非技術性用語
- Tooltip 提供額外說明

### 4. NWEA 官方風格

- 圖表仿照官方報告樣式
- 配色柔和但清晰
- X 軸標籤格式統一：`FA25 (G4)`

---

## 檔案路徑總結

```
components/map/student/
├── index.ts                      # 匯出列表
├── StudentMapAnalysisTab.tsx     # 主容器
├── CollapsibleSection.tsx        # 收合區塊
├── ScoreSummaryCards.tsx         # 分數摘要
├── ProjectedProficiency.tsx      # 預測能力
├── StudentGrowthIndex.tsx        # 成長指數
├── StudentProgressChart.tsx      # 進度圖表
├── StudentBenchmarkStatus.tsx    # 基準狀態
├── StudentGoalAreas.tsx          # 教學診斷
├── StudentLexileLevel.tsx        # Lexile 分數
├── StudentPeerComparison.tsx     # 同儕比較
├── StudentBenchmarkHistory.tsx   # 基準歷史
├── StudentAssessmentTable.tsx    # 原始資料表
└── TestValidityWarning.tsx       # 測驗效度警告
```

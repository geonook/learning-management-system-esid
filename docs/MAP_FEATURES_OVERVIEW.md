# MAP Growth Assessment 功能彙整

> **版本**: v1.64.0
> **更新日期**: 2025-12-24
> **適用年級**: G3-G6
> **科目**: Reading, Language Usage

---

## 📊 統計頁面 (`/browse/stats/map`)

群組層級的 MAP 資料分析，提供年級整體表現概覽。

### 頁面架構

```
┌─────────────────────────────────────────────────────────┐
│  MAP Growth Analysis                        [Refresh]   │
├─────────────────────────────────────────────────────────┤
│  [G3] [G4] [G5] [G6]                    ← 年級選擇器    │
├─────────────────────────────────────────────────────────┤
│  [Overview] [Growth] [Goals] [Lexile] [Quality] [Trans] │
│                                          ↑ 分析 Tabs    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│              Tab 內容區域                               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

### Tab 1: Overview（概覽）

**功能摘要**：RIT 趨勢、Benchmark 分佈、總覽表格

#### 圖表組件

| 組件 | 說明 | 特色 |
|------|------|------|
| **MapGrowthLineChart** | RIT 分數折線圖 | X軸=學期, Y軸=RIT, 線條=English Level (E1/E2/E3/All) |
| **MapBenchmarkDonutChart** | E1/E2/E3 分佈圓餅圖 | 僅 G3-G5 支援（G6 無 Benchmark） |
| **MapOverviewTable** | 各英語等級統計表 | 學生數、RIT 平均、vs Norm 比較 |

#### 視圖模式 (v1.64.0)

- **Grid View**: 3 張圖表並排（Language Usage / Reading / Average）
- **Single View**: 單張大圖 + Tab 切換

#### 圖表特色

- 折線圖末端標籤顯示等級與數值（如 `E1 (215.3)`）
- 虛線 Norm 參考線
- 滑鼠懸停顯示詳細 Tooltip
- 動畫過渡效果

---

### Tab 2: Growth（成長分析）

**功能摘要**：成長指數分析、成長分佈統計

#### 成長類型選擇

| 類型 | 時間跨度 | 說明 |
|------|----------|------|
| **Within Year** | Fall → Spring | 同學年內成長（FA 24-25 → SP 24-25） |
| **Year-over-Year** | Fall → Fall | 跨學年成長（FA 24-25 → FA 25-26） |
| **Consecutive** | 連續學期 | 所有連續測驗（FA→SP 完整 / SP→FA 僅 Growth） |

#### 圖表組件

| 組件 | 說明 |
|------|------|
| **MapGrowthIndexChart** | 各 English Level 的成長指數柱狀圖 |
| **MapGrowthDistribution** | 成長分佈直方圖 |
| **MapConsecutiveGrowth** | 連續成長表格（含 FA→SP 和 SP→FA） |

#### 指標說明

```
Growth Index = Actual Growth ÷ Expected Growth
- Index ≥ 1.0：達到或超越預期
- Index < 1.0：低於預期

成長五分位：
- High / HiAvg / Avg / LoAvg / Low
```

---

### Tab 3: Goals（目標領域）

**功能摘要**：各科目的 Goal Area 表現分析

#### 圖表組件

| 組件 | 說明 |
|------|------|
| **MapGoalRadar** | 雷達圖顯示各 Goal Area 表現 |
| **MapGoalTable** | 表格顯示各 Goal Area 的 RIT 與 vs Overall |

#### Goal Areas

**Reading**:
- Informational Text
- Literary Text
- Vocabulary

**Language Usage**:
- Grammar and Usage
- Mechanics
- Writing

---

### Tab 4: Lexile（閱讀程度）

**功能摘要**：Lexile 分數分佈與統計

#### 圖表組件

| 組件 | 說明 |
|------|------|
| **MapLexileStats** | 統計卡片（Count / Mean / Median / Range） |
| **MapLexileDistribution** | Lexile 分佈直方圖 |

#### Lexile 格式

- 正分：`1190L`
- BR（Beginning Reader）：`BR400`

---

### Tab 5: Quality（測驗品質）

**功能摘要**：Rapid Guessing 監控

#### 圖表組件

| 組件 | 說明 |
|------|------|
| **MapTestQualityPie** | Rapid Guessing 分佈圓餅圖 |
| 統計卡片 | Normal / Caution / Flagged 人數 |
| Flagged 學生列表 | 超過 30% Rapid Guessing 的學生 |

#### 警示門檻

| 狀態 | Rapid Guessing % | 顏色 |
|------|------------------|------|
| Normal | ≤ 15% | 綠色 |
| Caution | 15-30% | 黃色 |
| Flagged | > 30% | 紅色 |

---

### Tab 6: Transitions（Benchmark 變遷）

**功能摘要**：學生 Benchmark 等級變化追蹤

> ⚠️ 僅支援 G3-G5（G6 無 Benchmark 分類）

#### 變遷期間選項

| 期間 | 說明 |
|------|------|
| **Fall → Spring** | 同學年內變化（使用同年級門檻） |
| **Spring → Fall** | 跨學年變化（學生升級，使用新年級門檻） |

#### 圖表組件

| 組件 | 說明 |
|------|------|
| **MapBenchmarkTransition** | 轉移矩陣（From E1/E2/E3 → To E1/E2/E3） |
| Summary Cards | Improved / Same / Declined 統計 |

---

## 👤 學生頁面 (`/student/[id]` → MAP Tab)

個人層級的 MAP 資料分析，提供單一學生的完整測驗歷史與表現。

### 頁面架構

```
┌─────────────────────────────────────────────────────────┐
│  [Student Info Header]                                  │
├─────────────────────────────────────────────────────────┤
│  [Overview] [Gradebook] [MAP] [Attendance]  ← Tabs      │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ▼ Current Performance        ← 預設展開               │
│  ▼ Growth & Progress          ← 預設展開               │
│  ▼ Instructional Focus        ← 預設展開               │
│  ▶ Historical Data            ← 預設收合               │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

### Section 1: Current Performance（當前表現）

| 組件 | 功能 | 資料來源 |
|------|------|----------|
| **ScoreSummaryCards** | RIT 分數、成長、百分位、Achievement Quintile | CDF 官方 |
| **StudentBenchmarkStatus** | E1/E2/E3 分級狀態、進度條 | 康橋加值 |
| **CombinedTestValidityWarning** | Rapid Guessing 警示（雙科） | CDF 官方 |

#### ScoreSummaryCards 顯示內容

```
┌─────────────────────┬─────────────────────┐
│ Reading             │ Language Usage      │
│ RIT: 215            │ RIT: 208            │
│ Growth: +12         │ Growth: +8          │
│ Percentile: 65%     │ Percentile: 58%     │
│ [HiAvg]             │ [Avg]               │
└─────────────────────┴─────────────────────┘
```

---

### Section 2: Growth & Progress（成長與進度）

| 組件 | 功能 | 資料來源 |
|------|------|----------|
| **StudentProgressCharts** | NWEA 風格柱狀圖（Student / Level Avg / Norm） | CDF + 計算 |
| **StudentGrowthIndex** | 個人成長歷史（含跨學年） | CDF 官方 |
| **ProjectedProficiency** | Spring 預測（僅 Fall 學期顯示） | CDF 官方 |
| **StudentPeerComparison** | 同儕比較（用 English Level 分組，非班級） | 康橋加值 |

#### StudentGrowthIndex 雙卡片設計

**Fall → Spring（同學年）**：完整顯示
- Growth / Expected / Index / Met or Not Met / Quintile

**Spring → Fall（跨學年）**：簡化顯示
- 僅 Growth（無官方 NWEA 暑期成長基準）

#### StudentPeerComparison 隱私設計

- 使用 **English Level** 分組比較（非班級）
- 避免洩露班級平均給家長
- 顯示：Level Rank / Grade Rank / vs Level Avg / vs Grade Avg / vs NWEA Norm

---

### Section 3: Instructional Focus（教學重點）

| 組件 | 功能 | 資料來源 |
|------|------|----------|
| **StudentGoalAreas** | 技能領域表現（Strength / Focus 標記） | CDF 官方 |
| **StudentLexileLevel** | Lexile 分數與建議書籍範圍 | CDF 官方 |

#### StudentGoalAreas 標記系統

- ★ **Relative Strength**：Goal RIT > Overall RIT + 5
- ◆ **Suggested Focus**：Goal RIT < Overall RIT - 5

---

### Section 4: Historical Data（歷史資料）

| 組件 | 功能 | 資料來源 |
|------|------|----------|
| **StudentBenchmarkHistory** | E1/E2/E3 歷史變化 | 康橋加值 |
| **StudentAssessmentTables** | 完整原始測驗數據表格 | CDF 官方 |

---

## 📁 關鍵檔案路徑

### 統計頁面

```
app/(lms)/browse/stats/map/page.tsx          # 主頁面
components/map/charts/
├── index.ts                                  # 匯出
├── MapGrowthLineChart.tsx                    # RIT 折線圖
├── MapBenchmarkDonutChart.tsx                # Benchmark 圓餅圖
├── MapOverviewTable.tsx                      # 總覽表格
├── MapGrowthIndexChart.tsx                   # 成長指數圖
├── MapGrowthDistribution.tsx                 # 成長分佈
├── MapConsecutiveGrowth.tsx                  # 連續成長
├── MapGoalRadar.tsx                          # Goal 雷達圖
├── MapGoalTable.tsx                          # Goal 表格
├── MapLexileDistribution.tsx                 # Lexile 分佈
├── MapLexileStats.tsx                        # Lexile 統計
├── MapTestQualityPie.tsx                     # 測驗品質圓餅圖
└── MapBenchmarkTransition.tsx                # Benchmark 轉移
```

### 學生頁面

```
components/map/student/
├── index.ts                                  # 匯出
├── StudentMapAnalysisTab.tsx                 # 主容器
├── CollapsibleSection.tsx                    # 收合區塊
├── ScoreSummaryCards.tsx                     # 分數摘要
├── StudentBenchmarkStatus.tsx                # Benchmark 狀態
├── TestValidityWarning.tsx                   # Rapid Guessing 警告
├── StudentProgressChart.tsx                  # 進度圖表
├── StudentGrowthIndex.tsx                    # 成長指數
├── ProjectedProficiency.tsx                  # 預測能力
├── StudentPeerComparison.tsx                 # 同儕比較
├── StudentGoalAreas.tsx                      # Goal 領域
├── StudentLexileLevel.tsx                    # Lexile 程度
├── StudentBenchmarkHistory.tsx               # Benchmark 歷史
└── StudentAssessmentTable.tsx                # 原始資料表
```

### API 層

```
lib/api/map-analytics.ts                      # 統計頁面 API
lib/api/map-student-analytics.ts              # 學生頁面 API
lib/map/
├── colors.ts                                 # 配色常數
├── utils.ts                                  # 工具函數
├── norms.ts                                  # NWEA Norm 查詢
└── benchmarks.ts                             # Benchmark 門檻
```

---

## 🎨 設計原則

### 1. 官方數據優先

優先使用 CDF 提供的官方資料：
- `test_percentile` → 優先於計算值
- `achievement_quintile` → Low/LoAvg/Avg/HiAvg/High
- `conditional_growth_index` → 官方成長指數
- `met_projected_growth` → Yes/No

### 2. 隱私保護

- Peer Comparison 使用 **English Level** 分組（非班級）
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

## 📈 資料流程

```
1. Import    : CDF CSV → map_assessments 表
2. Link      : Match student_number → students.id
3. Analyze   : Group by English Level, calculate averages
4. Display   : Stats Page + Student Page
```

### 資料來源

| 來源 | 說明 |
|------|------|
| **CDF (Combined Data File)** | NWEA 官方匯出的完整測驗資料 |
| **計算值** | 基於 CDF 資料計算的衍生指標 |
| **康橋加值** | 學校自定義的分類與分析 |

---

## 📋 Benchmark 門檻參考

### E1/E2/E3 分類標準（基於 Spring Average）

| Grade | E1 (Advanced) | E2 (Intermediate) | E3 (Developing) |
|-------|---------------|-------------------|-----------------|
| G3 | ≥ 206 | ≥ 183, < 206 | < 183 |
| G4 | ≥ 213 | ≥ 191, < 213 | < 191 |
| G5 | ≥ 218 | ≥ 194, < 218 | < 194 |
| G6 | — | — | — |

> G6 不使用 Benchmark 分類

---

## 🔧 技術規格

### 圖表庫

- **Recharts**: 折線圖、柱狀圖、圓餅圖、雷達圖

### 配色系統

```typescript
// English Level 顏色
E1: "#22c55e" (green-500)
E2: "#3b82f6" (blue-500)
E3: "#f97316" (orange-500)
All: "#6b7280" (gray-500)

// NWEA 風格顏色
studentRit: "#5B8BD9"  // 柔和藍
levelMean: "#E6B800"   // 柔和金黃
norm: "#3D5A80"        // 灰藍
```

### 版本歷程

| 版本 | 日期 | 主要變更 |
|------|------|----------|
| v1.64.0 | 2025-12-24 | Chart-Dominant Layout, Hybrid View Mode |
| v1.60.0 | 2025-12-20 | 學生頁面 4 區塊重構 |
| v1.55.0 | 2025-12-15 | Peer Comparison 改用 English Level 分組 |

---

## 🔗 相關文件

- [SKILL.md](.claude/skills/lms-map/SKILL.md) - MAP 技能定義
- [references/benchmarks.md](.claude/skills/lms-map/references/benchmarks.md) - Benchmark 詳細規則
- [references/growth.md](.claude/skills/lms-map/references/growth.md) - Growth 計算邏輯
- [references/norms.md](.claude/skills/lms-map/references/norms.md) - NWEA Norm 資料

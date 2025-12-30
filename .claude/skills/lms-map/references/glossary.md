# NWEA MAP Growth Glossary

## 術語對照表

### 成績指標 (Achievement Metrics)

| 英文術語 | 中文 | 定義 | 資料來源 |
|---------|------|------|----------|
| **RIT Score** | RIT 分數 | Rasch Unit，MAP 測驗的量尺分數 | CDF |
| **Achievement Percentile** | 成就百分位數 | 學生 RIT 與全國同年級學生的相對位置 | CDF / Technical Manual |
| **Achievement Quintile** | 成就五分位 | Low / LoAvg / Avg / HiAvg / High | CDF |
| **Test Percentile** | 測驗百分位數 | 同 Achievement Percentile | CDF 欄位名 |

### 成長指標 (Growth Metrics)

| 英文術語 | 中文 | 定義 | 資料來源 |
|---------|------|------|----------|
| **Growth** | 成長值 | 兩次測驗的 RIT 差異 (End - Start) | 計算值 |
| **Projected Growth** | 預期成長 | NWEA 預測的典型成長值 | CDF |
| **Observed Growth** | 實際成長 | 學生實際達成的成長值 | CDF |
| **Growth Index** | 成長指數 | Observed ÷ Projected，≥1.0 表示達標 | CDF |
| **Growth Quintile** | 成長五分位 | Low / LoAvg / Avg / HiAvg / High | CDF |
| **Met Projected Growth** | 達成預期 | 是否達到預期成長目標 | CDF |
| **Growth Percentile (cGP)** | 成長百分位數 | 基於起始 RIT 的條件成長百分位 | **Technical Manual 3.3.3** |

### Growth Index vs Growth Percentile (cGP)

| 比較項目 | Growth Index | Growth Percentile (cGP) |
|---------|--------------|-------------------------|
| **來源** | CDF 報告欄位 | Technical Manual Section 3.3.3 |
| **公式** | Observed ÷ Projected | Φ(z) 條件正態分佈 |
| **用途** | 快速判斷達標 (≥1.0) | 公平比較不同起點學生 |
| **優點** | 簡單直觀 | 考慮 regression to mean 效應 |
| **程式碼** | `conditional_growth_index` (CDF) | `lib/map/conditional-growth.ts` |

### 時間術語 (Time Periods)

| 英文術語 | 中文 | 定義 | 使用場景 |
|---------|------|------|----------|
| **MapTerm** | MAP 測驗期 | fall / winter / spring | MAP 資料 |
| **ELA Term** | ELA 學期 | 1 / 2 / 3 / 4 (學期分段) | 成績簿 |
| **Academic Year** | 學年 | 例：2024-2025, 2025-2026 | 全系統 |

### 成長期間 (Growth Periods)

| 英文術語 | 說明 | 時間跨度 |
|---------|------|----------|
| **Fall → Winter** | 秋季到冬季 | ~3 個月 |
| **Winter → Spring** | 冬季到春季 | ~3 個月 |
| **Fall → Spring** | 秋季到春季 (學年內) | ~6 個月 |
| **Fall → Fall** | 跨學年秋季到秋季 | ~12 個月 |
| **Spring → Fall** | 春季到秋季 (暑假) | ~4 個月 |

### KCIS 專屬術語

| 英文術語 | 中文 | 定義 |
|---------|------|------|
| **English Level** | 英語等級 | E1 (Advanced) / E2 (Intermediate) / E3 (Developing) |
| **Benchmark** | 分級標準 | 根據 Spring 平均 RIT 決定下學年英語等級 |
| **Average RIT** | 平均 RIT | (Reading RIT + Language Usage RIT) / 2 |

## 資料來源說明

### CDF (Combined Data File)
NWEA 官方匯出的學生測驗資料，包含所有成績和成長指標欄位。

### Technical Manual
NWEA 2025 Norms Technical Manual，提供完整的統計方法論：
- Section 3.3.2: Conditional Growth Population Distribution
- Section 3.3.3: Conditional Growth Percentiles

### Quick Reference
NWEA 2025 Norms Quick Reference，提供查表用的 Mean 和 SD 數據。

---

> 最後更新：2025-12-30
> 參考：NWEA 2025 Technical Manual, CDF Documentation

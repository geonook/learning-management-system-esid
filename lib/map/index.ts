// MAP Analytics utilities
export * from "./benchmarks";
export * from "./norms";
export * from "./kcis-expected";
export * from "./statistics";
// colors.ts - 排除重複的 BENCHMARK_COLORS（已在 benchmarks.ts 定義）
export {
  NWEA_COLORS,
  GROWTH_INDEX_THRESHOLDS,
  GROWTH_INDEX_COLORS,
  TERM_SEQUENCE_COLORS,
  TERM_COMPARE_COLORS,
  ENGLISH_LEVEL_COLORS,
  QUINTILE_COLORS,
  LEXILE_BAND_COLORS,
  GROWTH_DISTRIBUTION_COLORS,
  KCIS_EXPECTED_COLORS,
  SCHOOL_CHART_COLORS,
  GROWTH_QUINTILE_THRESHOLDS,
  getGrowthIndexColor,
  getGrowthQuintileColor,
  getGrowthQuintileLabel,
  getBenchmarkColor,
  getQuintileColors,
} from "./colors";

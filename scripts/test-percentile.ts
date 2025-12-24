// 直接複製計算邏輯來測試

type Term = "fall" | "spring";
type Course = "Reading" | "Language Usage";

interface SDData {
  reading: number;
  languageUsage: number;
}

const SD_DATA: Record<number, Record<Term, SDData>> = {
  3: {
    fall: { reading: 17, languageUsage: 16 },
    spring: { reading: 17, languageUsage: 16 },
  },
  4: {
    fall: { reading: 16, languageUsage: 15 },
    spring: { reading: 16, languageUsage: 15 },
  },
};

const MEAN_RIT: Record<string, Record<number, Record<Term, SDData>>> = {
  "2024-2025": {
    3: {
      fall: { reading: 187, languageUsage: 188 },
      spring: { reading: 197, languageUsage: 198 },
    },
    4: {
      fall: { reading: 197, languageUsage: 197 },
      spring: { reading: 205, languageUsage: 205 },
    },
  },
  "2025-2026": {
    3: {
      fall: { reading: 185, languageUsage: 184 },
      spring: { reading: 194, languageUsage: 193 },
    },
    4: {
      fall: { reading: 196, languageUsage: 195 },
      spring: { reading: 202, languageUsage: 201 },
    },
  },
};

function normalCDF(z: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const sign = z < 0 ? -1 : 1;
  const absZ = Math.abs(z);

  const t = 1.0 / (1.0 + p * absZ);
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-absZ * absZ / 2);

  return 0.5 * (1.0 + sign * y);
}

function ritToPercentile(
  rit: number,
  grade: number,
  term: Term,
  course: Course,
  academicYear: string = "2024-2025"
): number {
  const yearData = MEAN_RIT[academicYear] || MEAN_RIT["2024-2025"];
  const gradeData = yearData?.[grade];
  if (!gradeData) return 50;

  const termData = gradeData[term];
  if (!termData) return 50;

  const sdData = SD_DATA[grade]?.[term];
  if (!sdData) return 50;

  const mean = course === "Reading" ? termData.reading : termData.languageUsage;
  const sd = course === "Reading" ? sdData.reading : sdData.languageUsage;

  const z = (rit - mean) / sd;
  const percentile = Math.round(normalCDF(z) * 100);

  return Math.max(1, Math.min(99, percentile));
}

function getPercentileRange(
  rit: number,
  grade: number,
  term: Term,
  course: Course,
  academicYear: string = "2024-2025",
  stdError: number = 3
): { low: number; mid: number; high: number } {
  const low = ritToPercentile(rit - stdError, grade, term, course, academicYear);
  const mid = ritToPercentile(rit, grade, term, course, academicYear);
  const high = ritToPercentile(rit + stdError, grade, term, course, academicYear);

  return { low, mid, high };
}

function formatPercentileRange(range: { low: number; mid: number; high: number }): string {
  return `${range.low}-${range.mid}-${range.high}`;
}

// 測試
console.log("======================================================================");
console.log("NWEA 報表 vs 我們的計算 - Percentile Range 比較");
console.log("======================================================================");

const testCases = [
  // Reading
  { course: "Reading" as const, term: "fall" as const, grade: 4, rit: 188, nwea: "23-29-36", label: "FA26 G4 Reading" },
  { course: "Reading" as const, term: "spring" as const, grade: 3, rit: 186, nwea: "27-33-40", label: "SP25 G3 Reading" },
  { course: "Reading" as const, term: "fall" as const, grade: 3, rit: 172, nwea: "19-24-30", label: "FA25 G3 Reading" },
  // Language Usage
  { course: "Language Usage" as const, term: "fall" as const, grade: 4, rit: 201, nwea: "53-61-68", label: "FA26 G4 LU" },
  { course: "Language Usage" as const, term: "spring" as const, grade: 3, rit: 197, nwea: "50-58-66", label: "SP25 G3 LU" },
  { course: "Language Usage" as const, term: "fall" as const, grade: 3, rit: 192, nwea: "60-67-73", label: "FA25 G3 LU" },
];

console.log("\n📊 Reading\n");
console.log("| 測驗             | RIT | NWEA報表  | 我們計算  | Mid差距 |");
console.log("|------------------|-----|----------|----------|---------|");

for (const tc of testCases.filter(t => t.course === "Reading")) {
  const academicYear = tc.label.includes("FA26") || tc.label.includes("SP26") ? "2025-2026" : "2024-2025";
  const range = getPercentileRange(tc.rit, tc.grade, tc.term, tc.course, academicYear);
  const calculated = formatPercentileRange(range);

  const nweaParts = tc.nwea.split("-").map(Number);
  const nweaMid = nweaParts[1] ?? 0;
  const midDiff = range.mid - nweaMid;
  const diffStr = midDiff === 0 ? "✅ 0" : midDiff > 0 ? `+${midDiff}` : `${midDiff}`;

  console.log(`| ${tc.label.padEnd(16)} | ${tc.rit} | ${tc.nwea.padEnd(8)} | ${calculated.padEnd(8)} | ${diffStr.padStart(7)} |`);
}

console.log("\n📊 Language Usage\n");
console.log("| 測驗             | RIT | NWEA報表  | 我們計算  | Mid差距 |");
console.log("|------------------|-----|----------|----------|---------|");

for (const tc of testCases.filter(t => t.course === "Language Usage")) {
  const academicYear = tc.label.includes("FA26") || tc.label.includes("SP26") ? "2025-2026" : "2024-2025";
  const range = getPercentileRange(tc.rit, tc.grade, tc.term, tc.course, academicYear);
  const calculated = formatPercentileRange(range);

  const nweaParts = tc.nwea.split("-").map(Number);
  const nweaMid = nweaParts[1] ?? 0;
  const midDiff = range.mid - nweaMid;
  const diffStr = midDiff === 0 ? "✅ 0" : midDiff > 0 ? `+${midDiff}` : `${midDiff}`;

  console.log(`| ${tc.label.padEnd(16)} | ${tc.rit} | ${tc.nwea.padEnd(8)} | ${calculated.padEnd(8)} | ${diffStr.padStart(7)} |`);
}

console.log("\n======================================================================");
console.log("\n📌 結論：");
console.log("- 正數差距 = 我們計算的 percentile 比 NWEA 高");
console.log("- 負數差距 = 我們計算的 percentile 比 NWEA 低");
console.log("- ±5 以內通常可接受作為近似值");

/**
 * GradeBand Utility Functions
 *
 * Helper functions for parsing and displaying grade band information.
 * These are pure functions that can be used in both client and server components.
 */

/**
 * Parse grade_band string to array of grade numbers
 * "3-4" -> [3, 4]
 * "1" -> [1]
 * "5-6" -> [5, 6]
 */
export function parseGradeBand(gradeBand: string): number[] {
  if (!gradeBand) return [1, 2, 3, 4, 5, 6]; // Default to all grades

  if (gradeBand.includes("-")) {
    const parts = gradeBand.split("-").map(Number);
    const start = parts[0] ?? 1;
    const end = parts[1] ?? start;
    const grades: number[] = [];
    for (let i = start; i <= end; i++) {
      grades.push(i);
    }
    return grades;
  }

  return [Number(gradeBand)];
}

/**
 * Get display string for grade band
 * "3-4" -> "G3-4"
 * "1" -> "G1"
 */
export function getGradeBandDisplay(gradeBand: string): string {
  if (gradeBand.includes("-")) {
    return `G${gradeBand}`;
  }
  return `G${gradeBand}`;
}

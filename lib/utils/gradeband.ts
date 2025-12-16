/**
 * GradeBand Utility Functions
 *
 * Helper functions for parsing and displaying grade band information.
 * These are pure functions that can be used in both client and server components.
 */

import type { CourseType } from "@/types/gradebook-expectations";

// Valid course types
const VALID_COURSE_TYPES = ["LT", "IT", "KCFS"] as const;

/**
 * Validate and parse course type from user permissions
 * Returns the validated course type or a default value
 *
 * @param track - The track value from user permissions
 * @param defaultValue - Default value if validation fails (default: "LT")
 * @returns Validated CourseType
 */
export function parseCourseType(
  track: string | null | undefined,
  defaultValue: CourseType = "LT"
): CourseType {
  if (!track) return defaultValue;

  // Check if the track is a valid course type
  if (VALID_COURSE_TYPES.includes(track as CourseType)) {
    return track as CourseType;
  }

  console.warn(
    `[parseCourseType] Invalid course type: "${track}", using default: "${defaultValue}"`
  );
  return defaultValue;
}

/**
 * Check if a value is a valid course type
 */
export function isValidCourseType(value: unknown): value is CourseType {
  return typeof value === "string" && VALID_COURSE_TYPES.includes(value as CourseType);
}

/**
 * Get display name for course type
 */
export function getCourseTypeDisplay(courseType: CourseType): string {
  switch (courseType) {
    case "LT":
      return "LT (Local Teacher)";
    case "IT":
      return "IT (International Teacher)";
    case "KCFS":
      return "KCFS (Kang Chiao Future Skill)";
    default:
      return courseType;
  }
}

/**
 * Get short display name for course type
 */
export function getCourseTypeShort(courseType: CourseType): string {
  return courseType;
}

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

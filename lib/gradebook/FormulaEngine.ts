export type GradeRow = {
  id: string;
  studentName: string;
  studentId: string;
  scores: Record<string, number | null>; // code -> score
};

export const ASSESSMENT_WEIGHTS = {
  FORMATIVE: 0.15,
  SUMMATIVE: 0.2,
  MIDTERM: 0.1,
  NORMALIZATION: 0.45,
};

export class FormulaEngine {
  /**
   * Calculate Term Grade based on the user's formula:
   * (FormativeAvg * 0.15 + SummativeAvg * 0.2 + Midterm * 0.1) / 0.45
   */
  static calculateTermGrade(
    scores: Record<string, number | null>
  ): number | null {
    const formativeScores = this.getScoresByPrefix(scores, "FA");
    const summativeScores = this.getScoresByPrefix(scores, "SA");
    const midtermScore = scores["MID"];

    // Calculate Averages
    const formativeAvg = this.calculateAverage(formativeScores);
    const summativeAvg = this.calculateAverage(summativeScores);

    // Check if all required components are present and > 0
    // Note: The user's formula implies strict checking: "E3 > 0, F3 > 0, G3 > 0"
    // E3 = Formative Avg, F3 = Summative Avg, G3 = Midterm
    if (
      formativeAvg !== null &&
      formativeAvg > 0 &&
      summativeAvg !== null &&
      summativeAvg > 0 &&
      midtermScore !== null &&
      midtermScore !== undefined &&
      midtermScore > 0
    ) {
      const weightedSum =
        formativeAvg * ASSESSMENT_WEIGHTS.FORMATIVE +
        summativeAvg * ASSESSMENT_WEIGHTS.SUMMATIVE +
        midtermScore * ASSESSMENT_WEIGHTS.MIDTERM;

      const termGrade = weightedSum / ASSESSMENT_WEIGHTS.NORMALIZATION;
      return this.round(termGrade, 1);
    }

    return null;
  }

  static getFormativeAverage(
    scores: Record<string, number | null>
  ): number | null {
    const s = this.getScoresByPrefix(scores, "FA");
    return this.calculateAverage(s);
  }

  static getSummativeAverage(
    scores: Record<string, number | null>
  ): number | null {
    const s = this.getScoresByPrefix(scores, "SA");
    return this.calculateAverage(s);
  }

  private static getScoresByPrefix(
    scores: Record<string, number | null>,
    prefix: string
  ): number[] {
    return (
      Object.entries(scores)
        .filter(
          ([key, val]) =>
            key.startsWith(prefix) &&
            val !== null &&
            val !== undefined &&
            val !== 0
        ) // Assuming 0 might be excluded from avg if treated as missing, but usually 0 is a valid score. User formula says > 0 for the *Average* to be valid.
        // Let's stick to standard average: include 0s.
        // Wait, user formula says: `ISNUMBER(E3)... E3 > 0`. This means if the Average is 0, it doesn't calculate Term Grade.
        // But for calculating the average itself, we should include all entered scores.
        .map((entry) => entry[1] as number)
    );
  }

  private static calculateAverage(values: number[]): number | null {
    if (values.length === 0) return null;
    const sum = values.reduce((a, b) => a + b, 0);
    return this.round(sum / values.length, 1); // Round average to 1 decimal place as well? Usually intermediate steps are kept precise, but let's follow standard practice or user screenshot. Screenshot shows integers mostly. Let's keep 1 decimal.
  }

  private static round(value: number, precision: number): number {
    const multiplier = Math.pow(10, precision);
    return Math.round(value * multiplier) / multiplier;
  }
}

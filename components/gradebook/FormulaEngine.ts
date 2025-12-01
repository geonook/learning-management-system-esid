export interface GradeRow {
  id: string;
  studentName: string;
  // Dynamic values for assessments
  [key: string]: string | number | undefined;
}

export const FormulaEngine = {
  /**
   * Calculates the Term Grade based on the user-provided formula:
   * D3=IF(AND(ISNUMBER(E3), ISNUMBER(F3), ISNUMBER(G3), E3 > 0, F3 > 0, G3 > 0),
   *       ROUND((E3 * 0.15 + F3 * 0.2 + G3 * 0.1) / 0.45, 1), "")
   *
   * @param e Value for Column E (Weight: 0.15)
   * @param f Value for Column F (Weight: 0.20)
   * @param g Value for Column G (Weight: 0.10)
   * @returns The calculated grade rounded to 1 decimal place, or null if conditions aren't met.
   */
  calculateTermGrade: (
    e: number | string | undefined,
    f: number | string | undefined,
    g: number | string | undefined
  ): number | null => {
    const valE = Number(e);
    const valF = Number(f);
    const valG = Number(g);

    // Check if all inputs are valid numbers
    const isNumberE = !isNaN(valE) && e !== "" && e !== undefined && e !== null;
    const isNumberF = !isNaN(valF) && f !== "" && f !== undefined && f !== null;
    const isNumberG = !isNaN(valG) && g !== "" && g !== undefined && g !== null;

    // Check conditions: All must be numbers AND > 0
    if (
      isNumberE &&
      isNumberF &&
      isNumberG &&
      valE > 0 &&
      valF > 0 &&
      valG > 0
    ) {
      const weightedSum = valE * 0.15 + valF * 0.2 + valG * 0.1;
      const totalWeight = 0.45;
      const result = weightedSum / totalWeight;

      // Round to 1 decimal place
      return Math.round(result * 10) / 10;
    }

    return null;
  },
};

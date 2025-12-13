/**
 * XLSX Export utility for statistics data
 * Uses SheetJS (xlsx) library
 */

import * as XLSX from "xlsx";

export interface ExportColumn<T> {
  key: keyof T;
  header: string;
  width?: number;
  format?: (value: unknown) => string | number;
}

export interface ExportOptions {
  filename: string;
  sheetName?: string;
}

export interface ExportResult {
  success: boolean;
  filename?: string;
  error?: string;
}

// Track export state to prevent double-clicks
let isExporting = false;

/**
 * Export data to XLSX file with defensive checks
 *
 * @param data - Array of data objects
 * @param columns - Column definitions
 * @param options - Export options (filename, sheetName)
 * @returns ExportResult
 */
export function exportToXlsx<T extends object>(
  data: T[],
  columns: ExportColumn<T>[],
  options: ExportOptions
): ExportResult {
  // Defensive checks
  if (!data || data.length === 0) {
    return { success: false, error: "No data to export" };
  }

  if (!columns || columns.length === 0) {
    return { success: false, error: "No columns defined" };
  }

  if (isExporting) {
    return { success: false, error: "Export already in progress" };
  }

  try {
    isExporting = true;

    // Build header row
    const headers = columns.map((c) => c.header);

    // Build data rows
    const rows = data.map((row) =>
      columns.map((c) => {
        const value = (row as Record<string, unknown>)[c.key as string];
        if (c.format) {
          return c.format(value);
        }
        if (value === null || value === undefined) {
          return "";
        }
        return value;
      })
    );

    // Create worksheet
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

    // Set column widths if specified
    const colWidths = columns.map((c) => ({
      wch: c.width || Math.max(c.header.length, 12),
    }));
    ws["!cols"] = colWidths;

    // Create workbook
    const wb = XLSX.utils.book_new();
    const sheetName = options.sheetName || "Data";
    XLSX.utils.book_append_sheet(wb, ws, sheetName);

    // Generate filename with timestamp to avoid conflicts
    const timestamp = new Date().toISOString().split("T")[0];
    const baseFilename = options.filename.replace(/\.xlsx$/, "");
    const filename = `${baseFilename}-${timestamp}.xlsx`;

    // Trigger download
    XLSX.writeFile(wb, filename);

    return { success: true, filename };
  } catch (err) {
    console.error("XLSX export error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Export failed",
    };
  } finally {
    isExporting = false;
  }
}

/**
 * Check if export is currently in progress
 */
export function isExportInProgress(): boolean {
  return isExporting;
}

/**
 * Format number for export (handles null/undefined)
 */
export function formatNumber(value: unknown, decimals = 2): string | number {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "number") {
    return Number(value.toFixed(decimals));
  }
  return "";
}

/**
 * Format percentage for export
 */
export function formatPercentage(value: unknown): string {
  if (value === null || value === undefined) {
    return "";
  }
  if (typeof value === "number") {
    return `${(value * 100).toFixed(1)}%`;
  }
  return "";
}

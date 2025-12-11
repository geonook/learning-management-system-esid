/**
 * Clipboard utility for copying table data in Tab-separated format
 * Compatible with Google Sheets direct paste
 */

export interface ColumnDefinition<T> {
  key: keyof T;
  header: string;
  format?: (value: unknown) => string;
}

export interface CopyResult {
  success: boolean;
  error?: string;
  rowCount?: number;
}

/**
 * Format data as Tab-separated values (TSV) for Google Sheets compatibility
 */
export function formatAsTabSeparated<T extends object>(
  data: T[],
  columns: ColumnDefinition<T>[]
): string {
  // Header row
  const headers = columns.map((c) => c.header).join("\t");

  // Data rows
  const rows = data.map((row) =>
    columns
      .map((c) => {
        const value = (row as Record<string, unknown>)[c.key as string];
        if (c.format) {
          return c.format(value);
        }
        if (value === null || value === undefined) {
          return "";
        }
        // Handle numbers - keep precision but ensure string format
        if (typeof value === "number") {
          return value.toString();
        }
        // Escape any tab or newline characters in strings
        return String(value).replace(/[\t\n\r]/g, " ");
      })
      .join("\t")
  );

  return [headers, ...rows].join("\n");
}

/**
 * Fallback copy method for older browsers
 */
function fallbackCopy(text: string): CopyResult {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "-9999px";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  try {
    const successful = document.execCommand("copy");
    document.body.removeChild(textarea);
    if (successful) {
      return { success: true };
    }
    return { success: false, error: "execCommand copy failed" };
  } catch (err) {
    document.body.removeChild(textarea);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Unknown error",
    };
  }
}

/**
 * Copy table data to clipboard in Tab-separated format
 * Compatible with Google Sheets paste
 *
 * @param data - Array of data objects
 * @param columns - Column definitions with headers and formatters
 * @returns Promise<CopyResult>
 */
export async function copyTableData<T extends object>(
  data: T[],
  columns: ColumnDefinition<T>[]
): Promise<CopyResult> {
  // Validate input
  if (!data || data.length === 0) {
    return { success: false, error: "No data to copy" };
  }

  if (!columns || columns.length === 0) {
    return { success: false, error: "No columns defined" };
  }

  // Format data as TSV
  const text = formatAsTabSeparated(data, columns);

  // Check for modern clipboard API
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    try {
      await navigator.clipboard.writeText(text);
      return { success: true, rowCount: data.length };
    } catch (err) {
      // Fallback to execCommand
      console.warn("Clipboard API failed, using fallback:", err);
      const result = fallbackCopy(text);
      if (result.success) {
        return { ...result, rowCount: data.length };
      }
      return result;
    }
  }

  // Use fallback for browsers without clipboard API
  const result = fallbackCopy(text);
  if (result.success) {
    return { ...result, rowCount: data.length };
  }
  return result;
}

/**
 * Check if clipboard functionality is available
 */
export function isClipboardAvailable(): boolean {
  if (typeof window === "undefined") return false;
  return !!(navigator.clipboard || document.queryCommandSupported?.("copy"));
}

"use client";

import { useState } from "react";
import { Copy, Download, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { copyTableData, ColumnDefinition } from "@/lib/utils/clipboard";
import { exportToXlsx, ExportColumn, ExportOptions } from "@/lib/export/xlsx-export";
import { toast } from "sonner";

interface StatisticsActionButtonsProps<T extends object> {
  data: T[];
  loading: boolean;
  columns: ColumnDefinition<T>[] | ExportColumn<T>[];
  exportOptions: ExportOptions;
  showCopy?: boolean;
}

export function StatisticsActionButtons<T extends object>({
  data,
  loading,
  columns,
  exportOptions,
  showCopy = true,
}: StatisticsActionButtonsProps<T>) {
  const [copying, setCopying] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [copied, setCopied] = useState(false);

  const isDisabled = loading || !data || data.length === 0;

  const handleCopy = async () => {
    if (isDisabled || copying) return;

    setCopying(true);
    try {
      const result = await copyTableData(data, columns as ColumnDefinition<T>[]);
      if (result.success) {
        setCopied(true);
        toast.success(`Copied ${result.rowCount} rows to clipboard!`, {
          duration: 2000,
        });
        setTimeout(() => setCopied(false), 2000);
      } else {
        toast.error(result.error || "Failed to copy");
      }
    } catch (err) {
      toast.error("Copy failed. Please try again.");
      console.error("Copy error:", err);
    } finally {
      setCopying(false);
    }
  };

  const handleExport = async () => {
    if (isDisabled || exporting) return;

    setExporting(true);
    try {
      const result = exportToXlsx(data, columns as ExportColumn<T>[], exportOptions);
      if (result.success) {
        toast.success(`Exported: ${result.filename}`, { duration: 3000 });
      } else {
        toast.error(result.error || "Export failed");
      }
    } catch (err) {
      toast.error("Export failed. Please try again.");
      console.error("Export error:", err);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="flex gap-2">
      {/* Copy Button */}
      {showCopy && (
        <button
          onClick={handleCopy}
          disabled={isDisabled || copying}
          className={cn(
            "flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors",
            isDisabled
              ? "bg-surface-tertiary text-text-tertiary cursor-not-allowed border-border-subtle"
              : copied
              ? "bg-green-500/20 text-green-600 dark:text-green-400 border-green-500/30"
              : "bg-surface-secondary text-text-secondary hover:bg-surface-hover border-border-default"
          )}
          title={isDisabled ? "No data to copy" : "Copy to clipboard (Tab-separated for Google Sheets)"}
        >
          {copying ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : copied ? (
            <Check className="w-4 h-4" />
          ) : (
            <Copy className="w-4 h-4" />
          )}
          <span>{copying ? "Copying..." : copied ? "Copied!" : "Copy"}</span>
        </button>
      )}

      {/* Export Button */}
      <button
        onClick={handleExport}
        disabled={isDisabled || exporting}
        className={cn(
          "flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors",
          isDisabled
            ? "bg-surface-tertiary text-text-tertiary cursor-not-allowed border-border-subtle"
            : "bg-surface-secondary text-text-secondary hover:bg-surface-hover border-border-default"
        )}
        title={isDisabled ? "No data to export" : "Export to Excel (.xlsx)"}
      >
        {exporting ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <Download className="w-4 h-4" />
        )}
        <span>{exporting ? "Exporting..." : "Export"}</span>
      </button>
    </div>
  );
}

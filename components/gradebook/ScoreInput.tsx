"use client";

import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { UserX, MoreVertical, AlertTriangle } from "lucide-react";

export type ScoreInputValue = {
  value: number | null;
  isAbsent: boolean;
};

export type NavigationDirection = 'up' | 'down' | 'left' | 'right';

interface ScoreInputProps {
  value: number | null;
  isAbsent: boolean;
  onChange: (newValue: ScoreInputValue) => void;
  courseType: "LT" | "IT" | "KCFS";
  disabled?: boolean;
  className?: string;
  // Navigation props
  rowIndex?: number;
  colIndex?: number;
  onNavigate?: (direction: NavigationDirection, row: number, col: number) => void;
}

// Expose focus method to parent
export interface ScoreInputHandle {
  focus: () => void;
  select: () => void;
}

// Score color coding helper
function getScoreColor(
  score: number | null | undefined,
  isAbsent: boolean,
  courseType: "LT" | "IT" | "KCFS"
): string {
  if (isAbsent) return "text-orange-500 dark:text-orange-400";
  if (score === null || score === undefined)
    return "text-text-tertiary";

  if (courseType === "KCFS") {
    // KCFS: 0-5 scale
    if (score >= 4) return "text-emerald-600 dark:text-emerald-400";
    if (score >= 3) return "text-amber-600 dark:text-amber-500";
    return "text-red-600 dark:text-red-400";
  } else {
    // LT/IT: 0-100 scale
    if (score >= 80) return "text-emerald-600 dark:text-emerald-400";
    if (score >= 60) return "text-amber-600 dark:text-amber-500";
    return "text-red-600 dark:text-red-400";
  }
}

/**
 * ScoreInput - Universal score input component
 *
 * Supports:
 * - Numeric input (0-100 for LT/IT, 0-5 for KCFS)
 * - Absent selection via hover menu button
 * - Clear to null
 * - Keyboard navigation (Enter to move down, Arrow keys)
 */
export const ScoreInput = forwardRef<ScoreInputHandle, ScoreInputProps>(({
  value,
  isAbsent,
  onChange,
  courseType,
  disabled = false,
  className,
  rowIndex = 0,
  colIndex = 0,
  onNavigate,
}, ref) => {
  const [localValue, setLocalValue] = useState<string>(
    isAbsent ? "Absent" : value?.toString() ?? ""
  );
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [showZeroWarning, setShowZeroWarning] = useState(false);
  const [pendingNavigation, setPendingNavigation] = useState<NavigationDirection | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Expose focus/select methods to parent
  useImperativeHandle(ref, () => ({
    focus: () => {
      inputRef.current?.focus();
    },
    select: () => {
      inputRef.current?.select();
    },
  }));

  // Sync local value with props
  useEffect(() => {
    if (isAbsent) {
      setLocalValue("Absent");
    } else {
      setLocalValue(value?.toString() ?? "");
    }
  }, [value, isAbsent]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputVal = e.target.value;

    // Allow empty input
    if (inputVal === "") {
      setLocalValue("");
      return;
    }

    // Validate numeric input
    const numVal = parseFloat(inputVal);
    if (isNaN(numVal)) return;

    // Validate range based on course type
    if (courseType === "KCFS") {
      if (numVal < 0 || numVal > 5) return;
      // KCFS allows 0.5 increments - validate on blur
    } else {
      if (numVal < 0 || numVal > 100) return;
    }

    setLocalValue(inputVal);
  };

  // Core save logic - extracted to reuse
  const saveValue = (finalValue: number, navigateAfter?: NavigationDirection) => {
    if (finalValue !== value || isAbsent) {
      onChange({ value: finalValue, isAbsent: false });
    }
    setLocalValue(finalValue.toString());
    // Handle pending navigation after save
    if (navigateAfter) {
      onNavigate?.(navigateAfter, rowIndex, colIndex);
    }
  };

  const handleInputBlur = (skipZeroCheck = false) => {
    setIsFocused(false);

    if (localValue === "" || localValue === "Absent") {
      // Clear value (not absent)
      if (!isAbsent && value !== null) {
        onChange({ value: null, isAbsent: false });
      }
      return;
    }

    const numVal = parseFloat(localValue);
    if (isNaN(numVal)) {
      setLocalValue(value?.toString() ?? "");
      return;
    }

    // KCFS: Snap to 0.5 increments
    let finalValue = numVal;
    if (courseType === "KCFS") {
      finalValue = Math.round(numVal * 2) / 2; // Snap to 0.5
      finalValue = Math.max(0, Math.min(5, finalValue));
    } else {
      finalValue = Math.max(0, Math.min(100, numVal));
    }

    // Check for zero score warning (only for NEW zero values)
    if (finalValue === 0 && value !== 0 && !skipZeroCheck) {
      setShowZeroWarning(true);
      return; // Don't save yet, wait for confirmation
    }

    saveValue(finalValue);
  };

  // Handle confirm zero score
  const handleConfirmZero = () => {
    setShowZeroWarning(false);
    saveValue(0, pendingNavigation ?? undefined);
    setPendingNavigation(null);
  };

  // Handle cancel zero score
  const handleCancelZero = () => {
    setShowZeroWarning(false);
    setLocalValue(value?.toString() ?? "");
    setPendingNavigation(null);
    inputRef.current?.focus();
  };

  // Helper to check if current input would result in zero
  const wouldBeZero = (): boolean => {
    const numVal = parseFloat(localValue);
    if (isNaN(numVal)) return false;
    let finalValue = numVal;
    if (courseType === "KCFS") {
      finalValue = Math.round(numVal * 2) / 2;
    }
    return finalValue === 0 && value !== 0;
  };

  // Handle navigation with zero check
  const handleNavigationWithZeroCheck = (direction: NavigationDirection) => {
    if (wouldBeZero()) {
      setPendingNavigation(direction);
      setShowZeroWarning(true);
    } else {
      handleInputBlur();
      onNavigate?.(direction, rowIndex, colIndex);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Arrow key navigation
    if (e.key === "ArrowUp") {
      e.preventDefault();
      handleNavigationWithZeroCheck('up');
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      handleNavigationWithZeroCheck('down');
      return;
    }
    // Left/Right: only navigate if cursor is at boundary
    if (e.key === "ArrowLeft" && e.currentTarget.selectionStart === 0) {
      e.preventDefault();
      handleNavigationWithZeroCheck('left');
      return;
    }
    if (e.key === "ArrowRight" && e.currentTarget.selectionStart === e.currentTarget.value.length) {
      e.preventDefault();
      handleNavigationWithZeroCheck('right');
      return;
    }

    // Enter: save and move down
    if (e.key === "Enter") {
      e.preventDefault();
      handleNavigationWithZeroCheck('down');
      return;
    }

    // Tab: save and move down (override default horizontal behavior)
    if (e.key === "Tab") {
      e.preventDefault();
      const direction = e.shiftKey ? 'up' : 'down';
      handleNavigationWithZeroCheck(direction);
      return;
    }

    // Escape: cancel edit (also dismiss zero warning)
    if (e.key === "Escape") {
      if (showZeroWarning) {
        handleCancelZero();
      } else {
        setLocalValue(isAbsent ? "Absent" : value?.toString() ?? "");
        inputRef.current?.blur();
      }
    }
  };

  const handleSetAbsent = () => {
    onChange({ value: null, isAbsent: true });
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange({ value: null, isAbsent: false });
    setIsOpen(false);
    // Focus the input after clearing
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleFocus = () => {
    setIsFocused(true);
    // If absent, select all so user can type to replace
    if (isAbsent) {
      // Clear the absent state when user clicks to edit
      setLocalValue("");
    }
  };

  const displayValue = isAbsent ? "Absent" : localValue;
  const placeholder = courseType === "KCFS" ? "0-5" : "0-100";

  return (
    <div className={cn("relative w-full h-full group", className)}>
      <input
        ref={inputRef}
        type={isAbsent ? "text" : "number"}
        step={courseType === "KCFS" ? "0.5" : "1"}
        min={0}
        max={courseType === "KCFS" ? 5 : 100}
        className={cn(
          "w-full h-full px-2 py-2.5 text-center text-sm bg-transparent",
          "border-0 outline-none",
          "transition-colors duration-100",
          "hover:bg-gray-50 dark:hover:bg-slate-800/50",
          "focus:bg-blue-50 dark:focus:bg-blue-900/20",
          "focus:ring-1 focus:ring-inset focus:ring-blue-200 dark:focus:ring-blue-800",
          // Hide number spinner (conflicts with hover menu button)
          "[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
          (value !== null || isAbsent) && "font-medium",
          getScoreColor(value, isAbsent, courseType),
          isAbsent && "italic",
          disabled && "opacity-50 cursor-not-allowed",
          // Visual indicator for zero score
          value === 0 && "bg-amber-50 dark:bg-amber-900/20"
        )}
        placeholder={placeholder}
        value={displayValue}
        onChange={handleInputChange}
        onBlur={() => handleInputBlur()}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        disabled={disabled}
        readOnly={false}
      />

      {/* Zero score warning confirmation */}
      {showZeroWarning && (
        <div className={cn(
          "absolute top-full left-1/2 -translate-x-1/2 z-50 mt-1",
          "bg-amber-50 dark:bg-amber-900/80 border border-amber-300 dark:border-amber-600",
          "rounded-lg p-2.5 shadow-lg min-w-[140px]"
        )}>
          <div className="flex items-center gap-1.5 mb-2">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
            <p className="text-xs font-medium text-amber-700 dark:text-amber-300">
              確定是 0 分嗎？
            </p>
          </div>
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-2 text-xs flex-1 border-amber-300 dark:border-amber-600"
              onClick={handleCancelZero}
            >
              取消
            </Button>
            <Button
              size="sm"
              className="h-6 px-2 text-xs flex-1 bg-amber-500 hover:bg-amber-600 text-white"
              onClick={handleConfirmZero}
            >
              確認
            </Button>
          </div>
        </div>
      )}

      {/* Hover menu button - appears on hover or when cell has value/absent */}
      {!disabled && (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              className={cn(
                "absolute right-0.5 top-1/2 -translate-y-1/2",
                "w-5 h-5 rounded flex items-center justify-center",
                "transition-opacity duration-150",
                "hover:bg-gray-200 dark:hover:bg-slate-700",
                "text-gray-400 hover:text-gray-600 dark:hover:text-gray-300",
                // Show on hover, or always show if focused/open
                isFocused || isOpen ? "opacity-100" : "opacity-0 group-hover:opacity-100"
              )}
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(true);
              }}
              tabIndex={-1}
            >
              <MoreVertical className="w-3 h-3" />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-40 p-2" align="end" sideOffset={4}>
            <div className="flex flex-col gap-1">
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "justify-start text-orange-600 hover:text-orange-700 hover:bg-orange-50",
                  "dark:text-orange-400 dark:hover:text-orange-300 dark:hover:bg-orange-900/30",
                  isAbsent && "bg-orange-50 dark:bg-orange-900/30"
                )}
                onClick={handleSetAbsent}
              >
                <UserX className="w-4 h-4 mr-2" />
                Absent
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="justify-start text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                onClick={handleClear}
              >
                Clear
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
});

ScoreInput.displayName = "ScoreInput";

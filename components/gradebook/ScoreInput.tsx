"use client";

import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from "react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { UserX, MoreVertical } from "lucide-react";

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

  const handleInputBlur = () => {
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

    if (finalValue !== value || isAbsent) {
      onChange({ value: finalValue, isAbsent: false });
    }
    setLocalValue(finalValue.toString());
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // Arrow key navigation
    if (e.key === "ArrowUp") {
      e.preventDefault();
      handleInputBlur(); // Save first
      onNavigate?.('up', rowIndex, colIndex);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      handleInputBlur(); // Save first
      onNavigate?.('down', rowIndex, colIndex);
      return;
    }
    // Left/Right: only navigate if cursor is at boundary
    if (e.key === "ArrowLeft" && e.currentTarget.selectionStart === 0) {
      e.preventDefault();
      handleInputBlur();
      onNavigate?.('left', rowIndex, colIndex);
      return;
    }
    if (e.key === "ArrowRight" && e.currentTarget.selectionStart === e.currentTarget.value.length) {
      e.preventDefault();
      handleInputBlur();
      onNavigate?.('right', rowIndex, colIndex);
      return;
    }

    // Enter: save and move down
    if (e.key === "Enter") {
      e.preventDefault();
      handleInputBlur();
      onNavigate?.('down', rowIndex, colIndex);
      return;
    }

    // Tab: save and move down (override default horizontal behavior)
    if (e.key === "Tab") {
      e.preventDefault();
      handleInputBlur();
      if (e.shiftKey) {
        onNavigate?.('up', rowIndex, colIndex);
      } else {
        onNavigate?.('down', rowIndex, colIndex);
      }
      return;
    }

    // Escape: cancel edit
    if (e.key === "Escape") {
      setLocalValue(isAbsent ? "Absent" : value?.toString() ?? "");
      inputRef.current?.blur();
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
          (value !== null || isAbsent) && "font-medium",
          getScoreColor(value, isAbsent, courseType),
          isAbsent && "italic",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        placeholder={placeholder}
        value={displayValue}
        onChange={handleInputChange}
        onBlur={handleInputBlur}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        disabled={disabled}
        readOnly={false}
      />

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

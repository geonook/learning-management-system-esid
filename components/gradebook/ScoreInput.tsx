"use client";

import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { UserX } from "lucide-react";

export type ScoreInputValue = {
  value: number | null;
  isAbsent: boolean;
};

interface ScoreInputProps {
  value: number | null;
  isAbsent: boolean;
  onChange: (newValue: ScoreInputValue) => void;
  courseType: "LT" | "IT" | "KCFS";
  disabled?: boolean;
  className?: string;
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
 * - Absent selection via popover
 * - Clear to null
 */
export function ScoreInput({
  value,
  isAbsent,
  onChange,
  courseType,
  disabled = false,
  className,
}: ScoreInputProps) {
  const [localValue, setLocalValue] = useState<string>(
    isAbsent ? "Absent" : value?.toString() ?? ""
  );
  const [isOpen, setIsOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

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
    if (e.key === "Enter") {
      handleInputBlur();
      inputRef.current?.blur();
    }
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
  };

  const displayValue = isAbsent ? "Absent" : localValue;
  const placeholder = courseType === "KCFS" ? "0-5" : "0-100";

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div className={cn("relative w-full h-full", className)}>
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
              isAbsent && "cursor-pointer italic",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            placeholder={placeholder}
            value={displayValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            onFocus={(e) => {
              if (isAbsent) {
                e.preventDefault();
                setIsOpen(true);
              }
            }}
            disabled={disabled}
            readOnly={isAbsent}
          />
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-40 p-2" align="center">
        <div className="flex flex-col gap-1">
          <Button
            variant="ghost"
            size="sm"
            className={cn(
              "justify-start text-orange-600 hover:text-orange-700 hover:bg-orange-50",
              isAbsent && "bg-orange-50"
            )}
            onClick={handleSetAbsent}
          >
            <UserX className="w-4 h-4 mr-2" />
            Absent
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="justify-start text-gray-500 hover:text-gray-700"
            onClick={handleClear}
          >
            Clear
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

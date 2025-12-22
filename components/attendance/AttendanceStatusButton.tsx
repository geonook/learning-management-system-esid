"use client";

import { cn } from "@/lib/utils";
import type { AttendanceStatus } from "@/lib/api/attendance";

interface AttendanceStatusButtonProps {
  status: AttendanceStatus;
  isSelected: boolean;
  onClick: () => void;
  disabled?: boolean;
  size?: "sm" | "md";
}

const statusConfig: Record<
  AttendanceStatus,
  { label: string; selectedClass: string }
> = {
  P: {
    label: "P",
    selectedClass: "bg-green-500 text-white border-green-500",
  },
  L: {
    label: "L",
    selectedClass: "bg-yellow-500 text-white border-yellow-500",
  },
  A: {
    label: "A",
    selectedClass: "bg-red-500 text-white border-red-500",
  },
  S: {
    label: "S",
    selectedClass: "bg-blue-500 text-white border-blue-500",
  },
};

export function AttendanceStatusButton({
  status,
  isSelected,
  onClick,
  disabled = false,
  size = "md",
}: AttendanceStatusButtonProps) {
  const config = statusConfig[status];

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "font-semibold border-2 rounded-md transition-all",
        size === "sm" ? "w-8 h-8 text-xs" : "w-10 h-10 text-sm",
        isSelected
          ? config.selectedClass
          : "border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-400 dark:hover:border-gray-500",
        disabled && "opacity-50 cursor-not-allowed"
      )}
    >
      {config.label}
    </button>
  );
}

export function AttendanceStatusGroup({
  value,
  onChange,
  disabled = false,
  size = "md",
}: {
  value: AttendanceStatus | null;
  onChange: (status: AttendanceStatus) => void;
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  const statuses: AttendanceStatus[] = ["P", "L", "A", "S"];

  return (
    <div className="flex gap-1">
      {statuses.map((status) => (
        <AttendanceStatusButton
          key={status}
          status={status}
          isSelected={value === status}
          onClick={() => onChange(status)}
          disabled={disabled}
          size={size}
        />
      ))}
    </div>
  );
}

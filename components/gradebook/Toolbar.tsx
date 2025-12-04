"use client";

import React from "react";
import {
  Table,
  BarChart,
  Type,
  Shapes,
  Image as ImageIcon,
  Share,
  Settings,
  ChevronDown,
  Download,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Notion-style toolbar colors
const TOOLBAR_STYLES = {
  bg: "bg-white dark:bg-slate-900",
  border: "border-gray-100 dark:border-slate-800",
  text: "text-gray-600 dark:text-gray-300",
  textMuted: "text-gray-500 dark:text-gray-400",
  hover: "hover:bg-gray-50 dark:hover:bg-slate-800",
  active: "bg-gray-100 dark:bg-slate-800",
};

interface ToolbarButtonProps {
  Icon: React.ElementType;
  label: string;
  onClick?: () => void;
  active?: boolean;
}

function ToolbarButton({ Icon, label, onClick, active }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-all duration-100",
        TOOLBAR_STYLES.text,
        TOOLBAR_STYLES.hover,
        "active:scale-[0.98]",
        active && TOOLBAR_STYLES.active
      )}
    >
      <Icon size={16} />
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

export function Toolbar() {
  return (
    <div className={cn(
      "flex items-center justify-between px-4 py-2",
      TOOLBAR_STYLES.bg,
      "border-b",
      TOOLBAR_STYLES.border
    )}>
      <div className="flex items-center gap-1">
        {/* View Controls - Notion Style */}
        <div className="flex items-center gap-0.5 mr-2">
          <button className={cn(
            "flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors duration-100",
            "text-blue-600 dark:text-blue-400",
            "hover:bg-blue-50 dark:hover:bg-blue-900/20"
          )}>
            <span>View</span>
            <ChevronDown size={12} />
          </button>
          <button className={cn(
            "flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors duration-100",
            TOOLBAR_STYLES.textMuted,
            TOOLBAR_STYLES.hover
          )}>
            <Filter size={14} />
            <span>Filter</span>
          </button>
        </div>

        {/* Separator */}
        <div className="h-5 w-px bg-gray-200 dark:bg-slate-700 mx-2" />

        {/* Insert Objects */}
        <ToolbarButton Icon={Table} label="Table" />
        <ToolbarButton Icon={BarChart} label="Chart" />
        <ToolbarButton Icon={Type} label="Text" />
        <ToolbarButton Icon={Shapes} label="Shape" />
        <ToolbarButton Icon={ImageIcon} label="Media" />
      </div>

      <div className="flex items-center gap-2">
        {/* Separator */}
        <div className="h-5 w-px bg-gray-200 dark:bg-slate-700" />

        <button className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors duration-100",
          TOOLBAR_STYLES.textMuted,
          TOOLBAR_STYLES.hover
        )}>
          <Download size={14} />
          <span>Export</span>
        </button>

        <button className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-100",
          "bg-blue-600 text-white",
          "hover:bg-blue-700 dark:hover:bg-blue-500"
        )}>
          <Share size={14} />
          <span>Share</span>
        </button>

        <button className={cn(
          "p-1.5 rounded-md transition-colors duration-100",
          TOOLBAR_STYLES.textMuted,
          TOOLBAR_STYLES.hover
        )}>
          <Settings size={16} />
        </button>
      </div>
    </div>
  );
}

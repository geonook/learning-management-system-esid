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

// Notion + Apple unified design tokens
const TOOLBAR_STYLES = {
  bg: "bg-surface-elevated",
  border: "border-[rgb(var(--border-default))]",
  text: "text-text-primary",
  textMuted: "text-text-secondary",
  hover: "hover:bg-[rgb(var(--surface-hover))]",
  active: "bg-[rgb(var(--surface-active))]",
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
        "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md transition-all duration-normal ease-apple",
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
            "flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors duration-normal ease-apple",
            "text-accent-blue",
            "hover:bg-accent-blue/10"
          )}>
            <span>View</span>
            <ChevronDown size={12} />
          </button>
          <button className={cn(
            "flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors duration-normal ease-apple",
            TOOLBAR_STYLES.textMuted,
            TOOLBAR_STYLES.hover
          )}>
            <Filter size={14} />
            <span>Filter</span>
          </button>
        </div>

        {/* Separator */}
        <div className="h-5 w-px bg-[rgb(var(--border-default))] mx-2" />

        {/* Insert Objects */}
        <ToolbarButton Icon={Table} label="Table" />
        <ToolbarButton Icon={BarChart} label="Chart" />
        <ToolbarButton Icon={Type} label="Text" />
        <ToolbarButton Icon={Shapes} label="Shape" />
        <ToolbarButton Icon={ImageIcon} label="Media" />
      </div>

      <div className="flex items-center gap-2">
        {/* Separator */}
        <div className="h-5 w-px bg-[rgb(var(--border-default))]" />

        <button className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors duration-normal ease-apple",
          TOOLBAR_STYLES.textMuted,
          TOOLBAR_STYLES.hover
        )}>
          <Download size={14} />
          <span>Export</span>
        </button>

        <button className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors duration-normal ease-apple",
          "bg-accent-blue text-white",
          "hover:bg-accent-blue/90"
        )}>
          <Share size={14} />
          <span>Share</span>
        </button>

        <button className={cn(
          "p-1.5 rounded-md transition-colors duration-normal ease-apple",
          TOOLBAR_STYLES.textMuted,
          TOOLBAR_STYLES.hover
        )}>
          <Settings size={16} />
        </button>
      </div>
    </div>
  );
}

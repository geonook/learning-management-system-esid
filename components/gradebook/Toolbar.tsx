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
} from "lucide-react";
import { cn } from "@/lib/utils";

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
        "flex flex-col items-center justify-center space-y-1 px-3 py-1 rounded-md transition-all duration-150",
        "hover:bg-slate-100 dark:hover:bg-slate-700 hover:scale-105",
        "active:scale-95",
        active && "bg-slate-100 dark:bg-slate-700"
      )}
    >
      <div className="text-gray-700 dark:text-gray-300">
        <Icon size={20} />
      </div>
      <span className="text-[10px] font-medium text-gray-600 dark:text-gray-400">{label}</span>
    </button>
  );
}

export function Toolbar() {
  return (
    <div className="flex items-center justify-between px-4 py-2 bg-[#f3f3f3] border-b border-[#d1d1d1] shadow-sm">
      <div className="flex items-center space-x-2">
        {/* View Controls */}
        <div className="flex items-center space-x-1 mr-4">
          <button className="flex items-center space-x-1 px-2 py-1 rounded hover:bg-black/5 text-xs font-medium text-gray-700">
            <span className="text-blue-500">View</span>
            <ChevronDown size={12} className="text-blue-500" />
          </button>
          <button className="flex items-center space-x-1 px-2 py-1 rounded hover:bg-black/5 text-xs font-medium text-gray-700">
            <span className="text-blue-500">Zoom</span>
            <ChevronDown size={12} className="text-blue-500" />
          </button>
        </div>

        {/* Insert Objects */}
        <ToolbarButton Icon={Table} label="Table" />
        <ToolbarButton Icon={BarChart} label="Chart" />
        <ToolbarButton Icon={Type} label="Text" />
        <ToolbarButton Icon={Shapes} label="Shape" />
        <ToolbarButton Icon={ImageIcon} label="Media" />
      </div>

      <div className="flex items-center space-x-4">
        <div className="h-8 w-[1px] bg-gray-300" />
        <button className="flex items-center space-x-1 text-gray-700 hover:text-black">
          <Share size={18} />
          <span className="text-xs font-medium">Share</span>
        </button>
        <button className="flex items-center space-x-1 text-gray-700 hover:text-black">
          <Settings size={18} />
        </button>
      </div>
    </div>
  );
}

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
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  active?: boolean;
}

function ToolbarButton({ icon, label, onClick, active }: ToolbarButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center space-y-1 px-3 py-1 rounded-md transition-colors",
        "hover:bg-black/5 active:bg-black/10",
        active && "bg-black/10"
      )}
    >
      <div className="text-gray-700">{icon}</div>
      <span className="text-[10px] font-medium text-gray-600">{label}</span>
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
        <ToolbarButton icon={<Table size={20} />} label="Table" />
        <ToolbarButton icon={<BarChart size={20} />} label="Chart" />
        <ToolbarButton icon={<Type size={20} />} label="Text" />
        <ToolbarButton icon={<Shapes size={20} />} label="Shape" />
        <ToolbarButton icon={<ImageIcon size={20} />} label="Media" />
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

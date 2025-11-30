"use client";

import React from "react";
import { Folder, FileText, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FileSystemNode {
  id: string;
  name: string;
  type: "folder" | "file";
  icon?: React.ReactNode;
  children?: FileSystemNode[];
  path: string;
}

interface FinderItemProps {
  node: FileSystemNode;
  view: "icon" | "column";
  selected?: boolean;
  onSelect: (node: FileSystemNode) => void;
  onNavigate: (node: FileSystemNode) => void;
}

export function FinderItem({
  node,
  view,
  selected,
  onSelect,
  onNavigate,
}: FinderItemProps) {
  const Icon = node.icon || (node.type === "folder" ? Folder : FileText);

  if (view === "icon") {
    return (
      <div
        className={cn(
          "group flex flex-col items-center justify-center p-4 rounded-xl cursor-pointer transition-all duration-200",
          "hover:bg-white/10",
          selected && "bg-blue-500/20 ring-1 ring-blue-500/50"
        )}
        onClick={() => onSelect(node)}
        onDoubleClick={() => onNavigate(node)}
      >
        <div
          className={cn(
            "w-16 h-16 flex items-center justify-center text-blue-400 mb-2 transition-transform duration-200",
            "group-hover:scale-110",
            node.type === "file" && "text-gray-400"
          )}
        >
          {React.isValidElement(Icon) ? (
            Icon
          ) : (
            // @ts-expect-error - We know it's a component type if it's not an element
            <Icon size={64} strokeWidth={1} />
          )}
        </div>
        <span className="text-sm text-center font-medium text-white/90 truncate w-full px-2 select-none">
          {node.name}
        </span>
      </div>
    );
  }

  // Column View Item
  return (
    <div
      className={cn(
        "flex items-center justify-between px-3 py-2 cursor-pointer text-sm select-none",
        "hover:bg-white/5",
        selected && "bg-blue-600 text-white hover:bg-blue-600"
      )}
      onClick={() => {
        onSelect(node);
        if (node.type === "folder") {
          onNavigate(node);
        }
      }}
    >
      <div className="flex items-center gap-2">
        <div
          className={cn(
            "text-blue-400",
            selected && "text-white",
            node.type === "file" && "text-gray-400"
          )}
        >
          {React.isValidElement(Icon) ? (
            Icon
          ) : (
            // @ts-expect-error
            <Icon size={16} />
          )}
        </div>
        <span className="truncate">{node.name}</span>
      </div>
      {node.type === "folder" && (
        <ChevronRight
          size={14}
          className={cn("opacity-50", selected && "opacity-100")}
        />
      )}
    </div>
  );
}

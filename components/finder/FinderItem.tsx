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
          "group flex flex-col items-center justify-center p-4 rounded-xl cursor-pointer transition-all duration-normal ease-apple",
          "hover:bg-[rgb(var(--surface-hover))]",
          selected && "bg-accent-blue/20 ring-1 ring-accent-blue/50"
        )}
        onClick={() => onSelect(node)}
        onDoubleClick={() => onNavigate(node)}
      >
        <div
          className={cn(
            "w-16 h-16 flex items-center justify-center text-accent-blue mb-2 transition-transform duration-normal ease-apple",
            "group-hover:scale-110",
            node.type === "file" && "text-text-secondary"
          )}
        >
          {React.isValidElement(Icon) ? (
            Icon
          ) : (
            // @ts-expect-error: Icon is either a React component or an element, component case handled here
            <Icon size={64} strokeWidth={1} />
          )}
        </div>
        <span className="text-sm text-center font-medium text-text-primary truncate w-full px-2 select-none">
          {node.name}
        </span>
      </div>
    );
  }

  // Column View Item
  return (
    <div
      className={cn(
        "flex items-center justify-between px-3 py-2 cursor-pointer text-sm select-none transition-colors duration-fast ease-apple text-text-primary",
        "hover:bg-[rgb(var(--surface-hover))]",
        selected && "bg-accent-blue text-white hover:bg-accent-blue"
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
            "text-accent-blue",
            selected && "text-white",
            node.type === "file" && "text-text-secondary"
          )}
        >
          {React.isValidElement(Icon) ? (
            Icon
          ) : (
            // @ts-expect-error: Icon is either a React component or an element, component case handled here
            <Icon size={16} />
          )}
        </div>
        <span className="truncate">{node.name}</span>
      </div>
      {node.type === "folder" && (
        <ChevronRight
          size={14}
          className={cn("text-text-tertiary", selected && "text-white")}
        />
      )}
    </div>
  );
}

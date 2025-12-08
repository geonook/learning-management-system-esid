"use client";

import React from "react";
import { FinderItem, FileSystemNode } from "./FinderItem";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ColumnViewProps {
  items: FileSystemNode[];
  onSelect: (node: FileSystemNode) => void;
  onNavigate: (node: FileSystemNode) => void;
  selectedId?: string;
}

export function ColumnView({
  items,
  onSelect,
  onNavigate,
  selectedId,
}: ColumnViewProps) {
  return (
    <ScrollArea className="h-full border-r border-[rgb(var(--border-default))] min-w-[240px] max-w-[300px] bg-surface-tertiary dark:bg-black/20 backdrop-blur-sm">
      <div className="py-2">
        {items.map((node) => (
          <FinderItem
            key={node.id}
            node={node}
            view="column"
            selected={selectedId === node.id}
            onSelect={onSelect}
            onNavigate={onNavigate}
          />
        ))}
      </div>
    </ScrollArea>
  );
}

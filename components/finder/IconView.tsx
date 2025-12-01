"use client";

import React from "react";
import { FinderItem, FileSystemNode } from "./FinderItem";

interface IconViewProps {
  items: FileSystemNode[];
  onSelect: (node: FileSystemNode) => void;
  onNavigate: (node: FileSystemNode) => void;
  selectedId?: string;
}

export function IconView({
  items,
  onSelect,
  onNavigate,
  selectedId,
}: IconViewProps) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-4 p-4">
      {items.map((node) => (
        <FinderItem
          key={node.id}
          node={node}
          view="icon"
          selected={selectedId === node.id}
          onSelect={onSelect}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import {
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  Columns,
  Home,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { IconView } from "./IconView";
import { ColumnView } from "./ColumnView";
import { FileSystemNode } from "./FinderItem";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";

// Mock Data Generation
const generateMockData = (role: string): FileSystemNode => {
  if (role === "teacher") {
    return {
      id: "root",
      name: "My Classes",
      type: "folder",
      path: "/",
      children: [
        {
          id: "g101",
          name: "G101",
          type: "folder",
          path: "/G101",
          children: [
            {
              id: "students",
              name: "Students",
              type: "file",
              path: "/G101/students",
            },
            {
              id: "gradebook",
              name: "Gradebook",
              type: "file",
              path: "/G101/gradebook",
            },
          ],
        },
        {
          id: "g102",
          name: "G102",
          type: "folder",
          path: "/G102",
          children: [
            {
              id: "students",
              name: "Students",
              type: "file",
              path: "/G102/students",
            },
            {
              id: "gradebook",
              name: "Gradebook",
              type: "file",
              path: "/G102/gradebook",
            },
          ],
        },
      ],
    };
  }

  // Default to Office Member / Admin
  const grades = Array.from({ length: 6 }, (_, i) => {
    const grade = i + 1;
    return {
      id: `g${grade}`,
      name: `Grade ${grade}`,
      type: "folder" as const,
      path: `/G${grade}`,
      children: Array.from({ length: 4 }, (_, j) => ({
        id: `g${grade}0${j + 1}`,
        name: `G${grade}0${j + 1}`,
        type: "folder" as const,
        path: `/G${grade}/G${grade}0${j + 1}`,
        children: [
          {
            id: `s_${grade}${j}`,
            name: "Students",
            type: "file" as const,
            path: `/G${grade}/G${grade}0${j + 1}/students`,
          },
          {
            id: `g_${grade}${j}`,
            name: "Gradebook",
            type: "file" as const,
            path: `/G${grade}/G${grade}0${j + 1}/gradebook`,
          },
        ],
      })),
    };
  });

  return {
    id: "root",
    name: "All Classes",
    type: "folder",
    path: "/",
    children: grades,
  };
};

interface FinderProps {
  role?: string;
}

export function Finder({ role = "office" }: FinderProps) {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<"icon" | "column">("icon");
  const [currentPath, setCurrentPath] = useState<string>("/");
  const [history, setHistory] = useState<string[]>(["/"]);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [rootNode, setRootNode] = useState<FileSystemNode | null>(null);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);

  useEffect(() => {
    setRootNode(generateMockData(role));
  }, [role]);

  // Helper to find node by path
  const findNodeByPath = (
    root: FileSystemNode,
    path: string
  ): FileSystemNode | null => {
    if (root.path === path) return root;
    if (!root.children) return null;

    for (const child of root.children) {
      if (path === child.path) return child;
      if (path.startsWith(child.path)) {
        const found = findNodeByPath(child, path);
        if (found) return found;
      }
    }
    return null;
  };

  // Helper to get path segments for Column View
  const getPathSegments = (path: string): FileSystemNode[] => {
    if (!rootNode) return [];
    if (path === "/") return [rootNode];

    const segments: FileSystemNode[] = [rootNode];
    let current = rootNode;
    // Split path /G1/G101 -> ["", "G1", "G101"]
    const parts = path.split("/").filter(Boolean);

    for (const part of parts) {
      if (!current.children) break;
      const next = current.children.find(
        (c) => c.name === part || c.path.endsWith(`/${part}`)
      );
      if (next) {
        segments.push(next);
        current = next;
      }
    }
    return segments;
  };

  const currentNode = rootNode ? findNodeByPath(rootNode, currentPath) : null;

  const handleNavigate = (node: FileSystemNode) => {
    if (node.type === "file") {
      if (node.id === "gradebook" || node.name === "Gradebook") {
        // Extract class ID from path (e.g. /G101/gradebook -> G101)
        const pathParts = node.path.split("/");
        const classId = pathParts[pathParts.length - 2];
        router.push(`/gradebook?classId=${classId}&className=${classId}`);
      } else {
        console.log("Open file:", node.name);
      }
      return;
    }

    const newPath = node.path;
    if (newPath !== currentPath) {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(newPath);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      setCurrentPath(newPath);
    }
  };

  const handleBack = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setCurrentPath(history[historyIndex - 1] || "/");
    }
  };

  const handleForward = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setCurrentPath(history[historyIndex + 1] || "/");
    }
  };

  if (!rootNode) return <div className="text-white">Loading...</div>;

  return (
    <div className="flex flex-col h-full w-full bg-[#1e1e1e]/80 backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl overflow-hidden text-white">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/5 border-b border-white/10">
        <div className="flex items-center space-x-4">
          {/* Navigation Controls */}
          <div className="flex items-center space-x-1">
            <button
              onClick={handleBack}
              disabled={historyIndex === 0}
              className="p-1 rounded hover:bg-white/10 disabled:opacity-30"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={handleForward}
              disabled={historyIndex === history.length - 1}
              className="p-1 rounded hover:bg-white/10 disabled:opacity-30"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Path / Breadcrumbs */}
          <div className="flex items-center space-x-2 px-2 py-1 rounded bg-black/20 border border-white/5 text-sm min-w-[200px]">
            <Home size={14} className="text-gray-400" />
            <span className="text-gray-400">/</span>
            <span className="truncate">
              {currentPath === "/"
                ? "Root"
                : currentPath.substring(1).replace(/\//g, " / ")}
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          {/* View Toggle */}
          <div className="flex bg-black/20 rounded-lg p-0.5 border border-white/10">
            <button
              onClick={() => setViewMode("icon")}
              className={cn(
                "p-1.5 rounded-md transition-all",
                viewMode === "icon"
                  ? "bg-white/20 shadow-sm"
                  : "hover:bg-white/5"
              )}
            >
              <LayoutGrid size={16} />
            </button>
            <button
              onClick={() => setViewMode("column")}
              className={cn(
                "p-1.5 rounded-md transition-all",
                viewMode === "column"
                  ? "bg-white/20 shadow-sm"
                  : "hover:bg-white/5"
              )}
            >
              <Columns size={16} />
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <Search
              size={14}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
            <Input
              className="h-8 w-48 pl-8 bg-black/20 border-white/10 text-xs focus-visible:ring-white/20"
              placeholder="Search"
            />
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {viewMode === "icon" ? (
          <ScrollArea className="h-full">
            <IconView
              items={currentNode?.children || []}
              onSelect={(node) => setSelectedId(node.id)}
              onNavigate={handleNavigate}
              selectedId={selectedId}
            />
          </ScrollArea>
        ) : (
          <div className="flex h-full overflow-x-auto">
            {getPathSegments(currentPath).map((segment, index) => (
              <ColumnView
                key={segment.path}
                items={segment.children || []}
                onSelect={(node) => {
                  setSelectedId(node.id);
                  if (node.type === "folder") {
                    // In column view, selecting a folder also navigates to it (expands next column)
                    // But we want to keep the history clean, so maybe just set path?
                    // macOS Finder behavior: clicking a folder selects it AND shows its content in next column.
                    // Here we treat navigation as updating currentPath.
                    handleNavigate(node);
                  }
                }}
                onNavigate={handleNavigate}
                selectedId={
                  currentPath.startsWith(segment.path) &&
                  currentPath !== segment.path
                    ? currentPath.split("/")[index + 1] // Highlight the parent of current path
                    : selectedId
                }
              />
            ))}
            {/* Show children of current node if it has any */}
            {currentNode && currentNode.children && (
              <ColumnView
                items={currentNode.children}
                onSelect={(node) => setSelectedId(node.id)}
                onNavigate={handleNavigate}
                selectedId={selectedId}
              />
            )}
          </div>
        )}
      </div>

      {/* Footer / Status Bar */}
      <div className="h-6 bg-white/5 border-t border-white/10 flex items-center px-4 text-[10px] text-gray-400">
        {currentNode?.children?.length || 0} items
      </div>
    </div>
  );
}

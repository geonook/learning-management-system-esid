"use client";

import React from "react";
import { Window } from "@/components/os/Window";
import { Toolbar } from "@/components/gradebook/Toolbar";
import { Spreadsheet } from "@/components/gradebook/Spreadsheet";
import { useSearchParams } from "next/navigation";

export default function GradebookPage() {
  const searchParams = useSearchParams();
  const classId = searchParams?.get("classId") || "";
  const className = searchParams?.get("className") || "Gradebook";

  return (
    <div className="h-full w-full p-4 flex items-center justify-center">
      <Window
        title={`${className} - Gradebook`}
        className="w-[95%] h-[90%] max-w-7xl flex flex-col bg-white text-black"
        onClose={() => console.log("Close Gradebook")}
        onMinimize={() => console.log("Minimize Gradebook")}
        onMaximize={() => console.log("Maximize Gradebook")}
      >
        <Toolbar />
        <Spreadsheet />

        {/* Status Bar */}
        <div className="h-6 bg-[#f3f3f3] border-t border-[#d1d1d1] flex items-center px-4 text-[10px] text-gray-600 justify-between">
          <span>Ready</span>
          <span>Sum: 0</span>
        </div>
      </Window>
    </div>
  );
}

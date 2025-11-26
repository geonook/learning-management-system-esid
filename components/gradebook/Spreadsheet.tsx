"use client";

import React, { useState } from "react";
import { FormulaEngine, GradeRow } from "./FormulaEngine";
import { cn } from "@/lib/utils";

// Mock Initial Data
const INITIAL_DATA: GradeRow[] = [
  { id: "1", studentName: "Alice Chen", e: 85, f: 90, g: 95 },
  { id: "2", studentName: "Bob Lin", e: 70, f: 75, g: 80 },
  { id: "3", studentName: "Charlie Wang", e: 92, f: 88, g: 90 },
  { id: "4", studentName: "David Wu", e: "", f: "", g: "" }, // Empty test
  { id: "5", studentName: "Eva Zhang", e: 60, f: 55, g: 70 },
];

export function Spreadsheet() {
  const [data, setData] = useState<GradeRow[]>(INITIAL_DATA);
  const [selectedCell, setSelectedCell] = useState<{
    rowId: string;
    col: string;
  } | null>(null);

  const handleInputChange = (rowId: string, col: string, value: string) => {
    setData((prev) =>
      prev.map((row) => {
        if (row.id === rowId) {
          return { ...row, [col]: value };
        }
        return row;
      })
    );
  };

  // Calculate Term Grade (Column D) dynamically
  const getTermGrade = (row: GradeRow) => {
    return FormulaEngine.calculateTermGrade(row.e, row.f, row.g);
  };

  return (
    <div className="flex-1 overflow-auto bg-[#f0f0f0] p-8">
      {/* Canvas / Sheet Container */}
      <div className="bg-white shadow-sm border border-gray-300 rounded-sm overflow-hidden min-w-[800px]">
        {/* Header Row */}
        <div className="flex border-b border-gray-300 bg-[#f5f5f5]">
          <div className="w-12 border-r border-gray-300 p-2 text-center text-xs font-bold text-gray-500">
            #
          </div>
          <div className="w-48 border-r border-gray-300 p-2 text-sm font-bold text-gray-700">
            Student Name
          </div>
          <div className="w-32 border-r border-gray-300 p-2 text-sm font-bold text-gray-700 bg-blue-50">
            Term Grade (D)
          </div>
          <div className="w-32 border-r border-gray-300 p-2 text-sm font-bold text-gray-700">
            Assessment 1 (E) <br />
            <span className="text-[10px] font-normal text-gray-500">
              Weight: 15%
            </span>
          </div>
          <div className="w-32 border-r border-gray-300 p-2 text-sm font-bold text-gray-700">
            Assessment 2 (F) <br />
            <span className="text-[10px] font-normal text-gray-500">
              Weight: 20%
            </span>
          </div>
          <div className="w-32 border-r border-gray-300 p-2 text-sm font-bold text-gray-700">
            Assessment 3 (G) <br />
            <span className="text-[10px] font-normal text-gray-500">
              Weight: 10%
            </span>
          </div>
        </div>

        {/* Data Rows */}
        {data.map((row, index) => {
          const termGrade = getTermGrade(row);
          return (
            <div
              key={row.id}
              className="flex border-b border-gray-200 hover:bg-blue-50/30"
            >
              {/* Row Number */}
              <div className="w-12 border-r border-gray-300 bg-[#f9f9f9] p-2 text-center text-xs text-gray-500 flex items-center justify-center">
                {index + 1}
              </div>

              {/* Student Name */}
              <div className="w-48 border-r border-gray-200 p-0">
                <input
                  className="w-full h-full px-2 py-1.5 outline-none bg-transparent text-sm font-medium"
                  value={row.studentName}
                  readOnly
                />
              </div>

              {/* Term Grade (Calculated) */}
              <div className="w-32 border-r border-gray-200 p-0 bg-blue-50/50">
                <div
                  className={cn(
                    "w-full h-full px-2 py-1.5 text-sm font-bold flex items-center justify-end",
                    termGrade === null ? "text-gray-300" : "text-blue-600"
                  )}
                >
                  {termGrade !== null ? termGrade : "-"}
                </div>
              </div>

              {/* Input Columns */}
              {["e", "f", "g"].map((col) => (
                <div
                  key={col}
                  className="w-32 border-r border-gray-200 p-0 relative group"
                >
                  <input
                    type="number"
                    className={cn(
                      "w-full h-full px-2 py-1.5 outline-none text-sm text-right transition-colors",
                      "focus:bg-blue-100/50 focus:ring-2 focus:ring-inset focus:ring-blue-500",
                      selectedCell?.rowId === row.id &&
                        selectedCell?.col === col &&
                        "bg-blue-100/50"
                    )}
                    value={row[col] || ""}
                    onChange={(e) =>
                      handleInputChange(row.id, col, e.target.value)
                    }
                    onFocus={() => setSelectedCell({ rowId: row.id, col })}
                    onBlur={() => setSelectedCell(null)}
                    placeholder="-"
                  />
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

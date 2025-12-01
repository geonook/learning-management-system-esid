"use client";

import { useEffect, useState } from "react";

export function CalendarIconContent() {
  const [mounted, setMounted] = useState(false);
  const [date, setDate] = useState(new Date());

  useEffect(() => {
    setMounted(true);
    setDate(new Date());
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-full rounded-[16px] bg-white relative shadow-md border border-white/10 flex flex-col overflow-hidden">
        <div className="h-[28%] bg-[#FF3B30] flex items-center justify-center">
          <span className="text-[7px] font-bold text-white uppercase tracking-wider mt-[1px]">
            ...
          </span>
        </div>
        <div className="flex-1 flex items-center justify-center bg-white">
          <span className="text-xl font-light text-[#1D1D1F] -mt-1 font-sans"></span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full rounded-[16px] bg-white relative shadow-md border border-white/10 flex flex-col overflow-hidden">
      <div className="h-[28%] bg-[#FF3B30] flex items-center justify-center">
        <span className="text-[7px] font-bold text-white uppercase tracking-wider mt-[1px]">
          {date.toLocaleDateString("en-US", { month: "short" })}
        </span>
      </div>
      <div className="flex-1 flex items-center justify-center bg-white">
        <span className="text-xl font-light text-[#1D1D1F] -mt-1 font-sans">
          {date.getDate()}
        </span>
      </div>
    </div>
  );
}

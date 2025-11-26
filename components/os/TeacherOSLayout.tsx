"use client";

import React from "react";
import { Desktop } from "./Desktop";
import { MenuBar } from "./MenuBar";
import { Dock } from "./Dock";
import { Spotlight } from "./Spotlight";
import { Sidebar } from "./Sidebar";

interface TeacherOSLayoutProps {
  children: React.ReactNode;
}

export function TeacherOSLayout({ children }: TeacherOSLayoutProps) {
  return (
    <div className="h-screen w-screen overflow-hidden font-sans antialiased">
      <MenuBar />
      <Desktop>
        <Sidebar />
        <main className="ml-64 h-full overflow-y-auto pt-12 pb-24 px-6">
          {children}
        </main>
      </Desktop>
      <Dock />
      <Spotlight />
    </div>
  );
}

"use client";

import React from "react";
import { Desktop } from "./Desktop";
import { MenuBar } from "./MenuBar";
import { Dock } from "./Dock";

interface TeacherOSLayoutProps {
  children: React.ReactNode;
}

export function TeacherOSLayout({ children }: TeacherOSLayoutProps) {
  return (
    <div className="h-screen w-screen overflow-hidden font-sans antialiased">
      {/* <MenuBar /> */}
      <Desktop>{children}</Desktop>
      {/* <Dock /> */}
    </div>
  );
}

"use client";

import React from "react";
import { Desktop } from "./Desktop";
import { MenuBar } from "./MenuBar";
import { Spotlight } from "./Spotlight";
import { Sidebar } from "./Sidebar";
import { SidebarProvider, useSidebar } from "@/lib/sidebar-context";
import { cn } from "@/lib/utils";

interface TeacherOSLayoutProps {
  children: React.ReactNode;
}

function MainContent({ children }: { children: React.ReactNode }) {
  const { isCollapsed } = useSidebar();
  return (
    <main className={cn(
      "h-full overflow-y-auto pt-16 sm:pt-12 pb-6 px-3 sm:px-4 lg:px-6 transition-all duration-300 ease-apple",
      // Margin only on desktop (lg+) when sidebar is visible
      isCollapsed ? "lg:ml-16" : "lg:ml-64"
    )}>
      {children}
    </main>
  );
}

export function TeacherOSLayout({ children }: TeacherOSLayoutProps) {
  return (
    <SidebarProvider>
      <div className="h-screen w-screen overflow-hidden font-sans antialiased">
        <MenuBar />
        <Desktop>
          <Sidebar />
          <MainContent>{children}</MainContent>
        </Desktop>
        {/* Dock removed - functionality available in TeacherOS (Info Hub) */}
        <Spotlight />
      </div>
    </SidebarProvider>
  );
}

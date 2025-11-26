"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAppStore } from "@/lib/store";
import { useIsHydrated } from "@/lib/hooks/use-is-hydrated";
import Sidebar from "./sidebar";
import Header from "./header";

interface MainLayoutProps {
  children: React.ReactNode;
}

// Pages that don't need the main layout (auth pages, landing, etc.)
const noLayoutPages = [
  "/auth/login",
  "/auth/role-select",
  "/auth/signup",
  "/_not-found",
  "/teacheros-test",
];

export default function MainLayout({ children }: MainLayoutProps) {
  const pathname = usePathname();
  const isHydrated = useIsHydrated();
  const role = useAppStore((s) => s.role);

  // Mock role assignment for development - only after hydration
  useEffect(() => {
    if (isHydrated && !role && pathname && !noLayoutPages.includes(pathname)) {
      // In development, auto-assign admin role for CSV import testing
      // In production, this would redirect to login
      useAppStore.getState().setRole("admin");
    }
  }, [isHydrated, role, pathname]);

  // If it's an auth page or no-layout page, render without layout
  if (pathname && noLayoutPages.includes(pathname)) {
    return <>{children}</>;
  }

  // Show loading state during hydration to prevent mismatch
  if (!isHydrated) {
    return (
      <div className="flex h-screen bg-background items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <Header />

        {/* Page Content */}
        <main className="flex-1 overflow-auto p-6">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}

"use client";

import { Home, Search, ChevronDown, LogOut, User } from "lucide-react";
import { DateTimeDisplay } from "./DateTimeDisplay";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "@/lib/supabase/auth-context";
import { useRouter } from "next/navigation";

interface MenuBarProps {
  onOpenEvents?: () => void;
}

// TeacherOS (Info Hub) URL
const TEACHEROS_URL = process.env.NEXT_PUBLIC_INFOHUB_URL || "https://next14-landing.zeabur.app";

export function MenuBar({ onOpenEvents }: MenuBarProps) {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleBackToTeacherOS = () => {
    window.open(TEACHEROS_URL, "_blank", "noopener,noreferrer");
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/auth/login");
  };

  return (
    <div className="absolute top-0 left-0 right-0 h-8 bg-white/40 dark:bg-black/40 backdrop-blur-2xl border-b border-white/10 dark:border-white/5 flex items-center justify-between px-2 z-50 select-none">
      {/* Left Side: Back to TeacherOS & App Name */}
      <div className="flex items-center gap-3">
        {/* Back to TeacherOS Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBackToTeacherOS}
          className="h-6 px-2 hover:bg-white/20 dark:hover:bg-white/10 rounded text-[13px] font-medium text-slate-700 dark:text-slate-200 gap-1"
        >
          <Home className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">TeacherOS</span>
        </Button>

        {/* Divider */}
        <div className="h-4 w-px bg-slate-300 dark:bg-slate-600" />

        {/* App Name */}
        <span className="text-[13px] font-bold text-slate-800 dark:text-white">
          LMS
        </span>
      </div>

      {/* Right Side: Search, User Menu & Clock */}
      <div className="flex items-center gap-3 pr-2">
        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Search Icon */}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 hover:bg-white/20 dark:hover:bg-white/10 rounded text-slate-700 dark:text-slate-200"
          title="Search (Cmd+K)"
        >
          <Search className="w-4 h-4" />
        </Button>

        {/* User Dropdown Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 hover:bg-white/20 dark:hover:bg-white/10 rounded text-[13px] font-medium text-slate-700 dark:text-slate-200 gap-1"
              title={user?.user_metadata?.full_name || user?.email || "User"}
            >
              <User className="w-3.5 h-3.5" />
              <span className="hidden sm:inline max-w-[100px] truncate">
                {user?.user_metadata?.full_name || user?.email?.split("@")[0] || "User"}
              </span>
              <ChevronDown className="w-3 h-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5 text-sm text-slate-500 dark:text-slate-400">
              {user?.email || "No email"}
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleSignOut}
              className="text-red-600 dark:text-red-400 cursor-pointer"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Clock */}
        <DateTimeDisplay onViewAll={onOpenEvents} variant="macos" />
      </div>
    </div>
  );
}

"use client";

import { Home, Search, ChevronDown, LogOut, User } from "lucide-react";
import Image from "next/image";
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
    <div className="absolute top-0 left-0 right-0 h-8 bg-surface-primary/70 dark:bg-black/50 backdrop-blur-2xl border-b border-[rgb(var(--border-default))] flex items-center justify-between px-2 z-50 select-none">
      {/* Left Side: Back to TeacherOS & App Name */}
      <div className="flex items-center gap-3">
        {/* Back to TeacherOS Button */}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleBackToTeacherOS}
          className="h-6 px-2 hover:bg-[rgb(var(--surface-hover))] rounded text-[13px] font-medium text-text-primary gap-1 transition-colors duration-normal ease-apple"
        >
          <Home className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">TeacherOS</span>
        </Button>

        {/* Divider */}
        <div className="h-4 w-px bg-[rgb(var(--border-default))]" />

        {/* School Logo + App Name */}
        <div className="flex items-center gap-1.5">
          <Image
            src="/images/kcislk-logo.png"
            alt="KCISLK"
            width={18}
            height={18}
            className="object-contain"
          />
          <span className="text-[13px] font-bold text-text-primary">
            LMS
          </span>
        </div>
      </div>

      {/* Right Side: Search, User Menu & Clock */}
      <div className="flex items-center gap-3 pr-2">
        {/* Theme Toggle */}
        <ThemeToggle />

        {/* Search Icon */}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 hover:bg-[rgb(var(--surface-hover))] rounded text-text-primary transition-colors duration-normal ease-apple"
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
              className="h-6 px-2 hover:bg-[rgb(var(--surface-hover))] rounded text-[13px] font-medium text-text-primary gap-1 transition-colors duration-normal ease-apple"
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
            <div className="px-2 py-1.5 text-sm text-text-secondary">
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

"use client";

import React from "react";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutGrid,
  Folder,
  Calculator,
  Calendar,
  Settings,
  Users,
  BarChart2,
  BookOpen,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface DockItemProps {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
  isActive?: boolean;
}

function DockItem({ icon, label, onClick, isActive }: DockItemProps) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={onClick}
            className={cn(
              "group relative flex h-12 w-12 items-center justify-center rounded-2xl transition-all duration-200 hover:-translate-y-2 hover:scale-110",
              "bg-white/10 backdrop-blur-md border border-white/20 shadow-lg",
              isActive && "bg-white/30 border-white/40"
            )}
          >
            <div className="text-white drop-shadow-md">{icon}</div>
            {isActive && (
              <div className="absolute -bottom-2 h-1 w-1 rounded-full bg-white/80" />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="bg-black/50 text-white border-white/10 backdrop-blur-md"
        >
          <p>{label}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function Dock() {
  const router = useRouter();
  const pathname = usePathname();

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  const isActive = (path: string) => {
    if (path === "/dashboard" && pathname === "/dashboard") return true;
    if (path !== "/dashboard" && pathname?.startsWith(path)) return true;
    return false;
  };

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50">
      <div className="flex items-end space-x-2 rounded-3xl bg-white/20 px-4 py-3 shadow-2xl backdrop-blur-xl border border-white/20">
        <DockItem
          icon={<LayoutGrid size={24} />}
          label="Dashboard"
          onClick={() => handleNavigation("/dashboard")}
          isActive={isActive("/dashboard")}
        />
        <DockItem
          icon={<Folder size={24} />}
          label="Classes"
          onClick={() => handleNavigation("/finder")}
          isActive={isActive("/finder")}
        />
        <DockItem icon={<Users size={24} />} label="Students" />
        <DockItem icon={<Calculator size={24} />} label="Gradebook" />
        <DockItem icon={<BookOpen size={24} />} label="Logs" />
        <DockItem icon={<BarChart2 size={24} />} label="Analytics" />
        <DockItem icon={<Calendar size={24} />} label="Attendance" />
        <div className="h-10 w-[1px] bg-white/20 mx-2" />
        <DockItem icon={<Settings size={24} />} label="Settings" />
      </div>
    </div>
  );
}

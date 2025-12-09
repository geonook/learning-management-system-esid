"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  GraduationCap,
  CalendarCheck,
  Users,
  MessageSquare,
} from "lucide-react";

interface ClassContextTabsProps {
  classId: string;
}

export function ClassContextTabs({ classId }: ClassContextTabsProps) {
  const pathname = usePathname();
  const baseUrl = `/class/${classId}`;

  const tabs = [
    {
      href: baseUrl,
      label: "Overview",
      icon: <LayoutDashboard className="w-4 h-4" />,
      exact: true,
    },
    {
      href: `${baseUrl}/gradebook`,
      label: "Gradebook",
      icon: <GraduationCap className="w-4 h-4" />,
      exact: false,
    },
    {
      href: `${baseUrl}/attendance`,
      label: "Attendance",
      icon: <CalendarCheck className="w-4 h-4" />,
      exact: false,
    },
    {
      href: `${baseUrl}/students`,
      label: "Students",
      icon: <Users className="w-4 h-4" />,
      exact: false,
    },
    {
      href: `${baseUrl}/communications`,
      label: "Comms",
      icon: <MessageSquare className="w-4 h-4" />,
      exact: false,
    },
  ];

  return (
    <div className="flex items-center gap-1 border-b border-white/10 pb-2 mb-6">
      {tabs.map((tab) => {
        const isActive = tab.exact
          ? pathname === tab.href
          : pathname?.startsWith(tab.href) ?? false;

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all",
              isActive
                ? "bg-white/20 text-slate-900 dark:text-white shadow-sm"
                : "text-slate-600 dark:text-slate-400 hover:bg-white/10 hover:text-slate-900 dark:hover:text-white"
            )}
          >
            {tab.icon}
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

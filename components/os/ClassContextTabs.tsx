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
  Target,
  FileOutput,
} from "lucide-react";

interface ClassContextTabsProps {
  classId: string;
  grade?: number;
}

export function ClassContextTabs({ classId, grade }: ClassContextTabsProps) {
  const pathname = usePathname();
  const baseUrl = `/class/${classId}`;

  // MAP is only available for G3-G6
  const showMapTab = grade !== undefined && grade >= 3 && grade <= 6;

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
    // MAP tab only for G3-G6
    ...(showMapTab
      ? [
          {
            href: `${baseUrl}/map`,
            label: "MAP",
            icon: <Target className="w-4 h-4" />,
            exact: false,
          },
        ]
      : []),
    // iSchool Export tab (for LT teachers to export grades)
    {
      href: `${baseUrl}/ischool`,
      label: "iSchool",
      icon: <FileOutput className="w-4 h-4" />,
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

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/supabase/auth-context";
import { getClassesByTeacher, Class } from "@/lib/api/classes";
import { LayoutDashboard, Calendar, BookOpen } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function Sidebar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchClasses() {
      if (!user) return;
      try {
        // Assuming user.id is the teacher_id for now.
        // If not, we might need a profile lookup.
        const data = await getClassesByTeacher(user.id);
        setClasses(data);
      } catch (error) {
        console.error("Failed to fetch classes", error);
      } finally {
        setLoading(false);
      }
    }

    fetchClasses();
  }, [user]);

  return (
    <aside className="fixed left-0 top-8 bottom-0 w-64 bg-white/50 dark:bg-black/50 backdrop-blur-xl border-r border-white/20 dark:border-white/10 z-40 flex flex-col">
      {/* Section: Overview */}
      <div className="p-4">
        <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 px-2">
          Overview
        </h3>
        <nav className="space-y-1">
          <SidebarItem
            href="/dashboard"
            icon={<LayoutDashboard className="w-4 h-4" />}
            label="Dashboard"
            active={pathname === "/dashboard"}
          />
          <SidebarItem
            href="/schedule"
            icon={<Calendar className="w-4 h-4" />}
            label="My Schedule"
            active={pathname === "/schedule"}
          />
        </nav>
      </div>

      {/* Section: My Classes */}
      <div className="flex-1 overflow-y-auto p-4 pt-0">
        <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 px-2 mt-4">
          My Classes
        </h3>
        <nav className="space-y-1">
          {loading ? (
            <div className="space-y-1 px-2">
              <Skeleton className="h-9 w-full rounded-lg" />
              <Skeleton className="h-9 w-full rounded-lg" />
              <Skeleton className="h-9 w-full rounded-lg" />
            </div>
          ) : classes.length === 0 ? (
            <div className="px-2 text-sm text-slate-400">No classes found</div>
          ) : (
            classes.map((cls) => (
              <SidebarItem
                key={cls.id}
                href={`/class/${cls.id}`}
                icon={<BookOpen className="w-4 h-4" />}
                label={cls.name}
                active={pathname?.startsWith(`/class/${cls.id}`) ?? false}
              />
            ))
          )}
        </nav>
      </div>
    </aside>
  );
}

function SidebarItem({
  href,
  icon,
  label,
  active,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
        active
          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
          : "text-slate-700 dark:text-slate-200 hover:bg-white/20 dark:hover:bg-white/10"
      )}
    >
      {icon}
      <span className="truncate">{label}</span>
    </Link>
  );
}

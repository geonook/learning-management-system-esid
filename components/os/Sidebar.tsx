"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/supabase/auth-context";
import { getClassesByTeacher, getClassesByGradeBand, Class } from "@/lib/api/classes";
import {
  LayoutDashboard,
  Calendar,
  BookOpen,
  Users,
  School,
  Settings,
  Shield,
  GitCompare,
  GraduationCap,
  MessageSquare,
  BarChart3,
  Zap
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export function Sidebar() {
  const pathname = usePathname();
  const { user, userPermissions } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);

  const isAdmin = userPermissions?.role === 'admin';
  const isHead = userPermissions?.role === 'head';
  const isTeacher = userPermissions?.role === 'teacher';
  const isOfficeMember = userPermissions?.role === 'office_member';

  useEffect(() => {
    async function fetchClasses() {
      if (!user) return;
      try {
        let data: Class[] = [];

        // Head Teacher: Get all classes in their grade band
        if (isHead && userPermissions?.grade) {
          data = await getClassesByGradeBand(userPermissions.grade);
        }
        // Regular Teacher: Get classes they teach (via courses table)
        else if (isTeacher) {
          data = await getClassesByTeacher(user.id);
        }
        // Admin/Office: Could show all classes or none
        // For now, show none (they can use Browse pages)

        setClasses(data);
      } catch (error) {
        console.error("Failed to fetch classes", error);
      } finally {
        setLoading(false);
      }
    }

    fetchClasses();
  }, [user, isHead, isTeacher, userPermissions?.grade]);

  return (
    <aside className="fixed left-0 top-8 bottom-0 w-64 bg-white/50 dark:bg-black/50 backdrop-blur-xl border-r border-white/20 dark:border-white/10 z-40 flex flex-col overflow-hidden">
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto">
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

      {/* Section: Admin (only for admin role) */}
      {isAdmin && (
        <div className="p-4 pt-0">
          <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 px-2 mt-4">
            Administration
          </h3>
          <nav className="space-y-1">
            <SidebarItem
              href="/admin/users"
              icon={<Users className="w-4 h-4" />}
              label="User Management"
              active={pathname === "/admin/users"}
            />
            <SidebarItem
              href="/admin/classes"
              icon={<School className="w-4 h-4" />}
              label="Class Management"
              active={pathname === "/admin/classes"}
            />
            <SidebarItem
              href="/admin/roles"
              icon={<Shield className="w-4 h-4" />}
              label="Role Permissions"
              active={pathname === "/admin/roles"}
            />
            <SidebarItem
              href="/admin/settings"
              icon={<Settings className="w-4 h-4" />}
              label="System Settings"
              active={pathname === "/admin/settings"}
            />
          </nav>
        </div>
      )}

      {/* Section: Head Teacher (for head and admin roles) */}
      {(isAdmin || isHead) && (
        <div className="p-4 pt-0">
          <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 px-2 mt-4">
            Grade Management
          </h3>
          <nav className="space-y-1">
            <SidebarItem
              href="/head/overview"
              icon={<LayoutDashboard className="w-4 h-4" />}
              label="Grade Overview"
              active={pathname === "/head/overview"}
            />
            <SidebarItem
              href="/head/teachers"
              icon={<Users className="w-4 h-4" />}
              label="Teacher Progress"
              active={pathname === "/head/teachers"}
            />
            <SidebarItem
              href="/head/comparison"
              icon={<GitCompare className="w-4 h-4" />}
              label="Class Comparison"
              active={pathname === "/head/comparison"}
            />
          </nav>
        </div>
      )}

      {/* Section: Office Member Browse (for office_member and admin roles) */}
      {(isAdmin || isOfficeMember) && (
        <div className="p-4 pt-0">
          <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 px-2 mt-4">
            Browse Data
          </h3>
          <nav className="space-y-1">
            <SidebarItem
              href="/browse/classes"
              icon={<School className="w-4 h-4" />}
              label="All Classes"
              active={pathname === "/browse/classes"}
            />
            <SidebarItem
              href="/browse/teachers"
              icon={<Users className="w-4 h-4" />}
              label="All Teachers"
              active={pathname === "/browse/teachers"}
            />
            <SidebarItem
              href="/browse/students"
              icon={<GraduationCap className="w-4 h-4" />}
              label="All Students"
              active={pathname === "/browse/students"}
            />
          </nav>
        </div>
      )}

      {/* Section: Office Member Academic (for office_member and admin roles) */}
      {(isAdmin || isOfficeMember) && (
        <div className="p-4 pt-0">
          <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 px-2 mt-4">
            Academic
          </h3>
          <nav className="space-y-1">
            <SidebarItem
              href="/browse/gradebook"
              icon={<BookOpen className="w-4 h-4" />}
              label="Gradebook"
              active={pathname === "/browse/gradebook"}
            />
            <SidebarItem
              href="/browse/comms"
              icon={<MessageSquare className="w-4 h-4" />}
              label="Communications"
              active={pathname === "/browse/comms"}
            />
            <SidebarItem
              href="/browse/stats"
              icon={<BarChart3 className="w-4 h-4" />}
              label="Statistics"
              active={pathname === "/browse/stats"}
            />
          </nav>
        </div>
      )}

      {/* Section: Teacher Quick Actions (for teacher role) */}
      {isTeacher && (
        <div className="p-4 pt-0">
          <h3 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 px-2 mt-4">
            Quick Actions
          </h3>
          <nav className="space-y-1">
            <SidebarItem
              href="/scores/entry"
              icon={<Zap className="w-4 h-4" />}
              label="Quick Score Entry"
              active={pathname === "/scores/entry"}
            />
          </nav>
        </div>
      )}

      {/* Section: My Classes */}
      <div className="p-4 pt-0 pb-8">
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
      </div>{/* End scrollable content area */}
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
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150",
        active
          ? "bg-blue-500/10 text-blue-600 dark:text-blue-400"
          : "text-slate-700 dark:text-slate-200 hover:bg-white/20 dark:hover:bg-white/10 hover:translate-x-1"
      )}
    >
      {icon}
      <span className="truncate">{label}</span>
    </Link>
  );
}

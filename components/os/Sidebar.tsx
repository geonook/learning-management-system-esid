"use client";

import { useEffect, useState, useCallback } from "react";
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
  GraduationCap,
  MessageSquare,
  BarChart3,
  Zap,
  ChevronDown,
  Target
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

// Section IDs for localStorage persistence
type SectionId = 'overview' | 'admin' | 'grade' | 'browse' | 'academic' | 'quick' | 'classes';

// Default expanded state - Overview always expanded, others collapsed by default
const DEFAULT_EXPANDED: Record<SectionId, boolean> = {
  overview: true,
  admin: false,
  grade: false,
  browse: false,
  academic: false,
  quick: true,
  classes: true,
};

const STORAGE_KEY = 'lms-sidebar-sections';

export function Sidebar() {
  const pathname = usePathname();
  const { user, userPermissions } = useAuth();
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSections, setExpandedSections] = useState<Record<SectionId, boolean>>(DEFAULT_EXPANDED);
  const [isHydrated, setIsHydrated] = useState(false);
  // Track if office member has teaching assignments
  const [hasTeachingAssignments, setHasTeachingAssignments] = useState(false);

  const isAdmin = userPermissions?.role === 'admin';
  const isHead = userPermissions?.role === 'head';
  const isTeacher = userPermissions?.role === 'teacher';
  const isOfficeMember = userPermissions?.role === 'office_member';
  // Office member with courses should have teacher-like access to their classes
  const hasTeacherAccess = isTeacher || (isOfficeMember && hasTeachingAssignments);

  // Load saved section states from localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setExpandedSections({ ...DEFAULT_EXPANDED, ...parsed });
      }
    } catch {
      // Ignore errors, use defaults
    }
    setIsHydrated(true);
  }, []);

  // Toggle section and save to localStorage
  const toggleSection = useCallback((sectionId: SectionId) => {
    setExpandedSections(prev => {
      const newState = { ...prev, [sectionId]: !prev[sectionId] };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(newState));
      } catch {
        // Ignore storage errors
      }
      return newState;
    });
  }, []);

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
        // Office Member: Check if they have any teaching assignments
        else if (isOfficeMember) {
          // Office members might also be teachers (dual role)
          // Check if they have any courses assigned to them
          data = await getClassesByTeacher(user.id);
          if (data.length > 0) {
            setHasTeachingAssignments(true);
          }
        }
        // Admin: Could show all classes or none
        // For now, show none (they can use Browse pages)

        setClasses(data);
      } catch (error) {
        console.error("Failed to fetch classes", error);
      } finally {
        setLoading(false);
      }
    }

    fetchClasses();
  }, [user, isHead, isTeacher, isOfficeMember, userPermissions?.grade]);

  // Don't render content until hydrated to prevent flash
  const isExpanded = (sectionId: SectionId) => isHydrated ? expandedSections[sectionId] : DEFAULT_EXPANDED[sectionId];

  return (
    <aside className="fixed left-0 top-8 bottom-0 w-64 bg-surface-primary/80 dark:bg-black/60 backdrop-blur-xl border-r border-[rgb(var(--border-default))] z-40 flex flex-col overflow-hidden">
      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto py-2">
        {/* Section: Overview */}
        <SidebarSection
          title="Overview"
          sectionId="overview"
          isExpanded={isExpanded('overview')}
          onToggle={() => toggleSection('overview')}
        >
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
        </SidebarSection>

        {/* Section: Admin (only for admin role) */}
        {isAdmin && (
          <SidebarSection
            title="Administration"
            sectionId="admin"
            isExpanded={isExpanded('admin')}
            onToggle={() => toggleSection('admin')}
            itemCount={4}
          >
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
          </SidebarSection>
        )}

        {/* Section: Head Teacher (for head and admin roles) */}
        {(isAdmin || isHead) && (
          <SidebarSection
            title="Grade Management"
            sectionId="grade"
            isExpanded={isExpanded('grade')}
            onToggle={() => toggleSection('grade')}
            itemCount={4}
          >
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
              href="/head/gradeband"
              icon={<BarChart3 className="w-4 h-4" />}
              label="Statistics"
              active={pathname?.startsWith("/head/gradeband") ?? false}
            />
            <SidebarItem
              href="/head/expectations"
              icon={<Target className="w-4 h-4" />}
              label="Expectations"
              active={pathname === "/head/expectations"}
            />
          </SidebarSection>
        )}

        {/* Section: Office Member Browse (for office_member and admin roles) */}
        {(isAdmin || isOfficeMember) && (
          <SidebarSection
            title="Browse Data"
            sectionId="browse"
            isExpanded={isExpanded('browse')}
            onToggle={() => toggleSection('browse')}
            itemCount={3}
          >
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
              active={pathname === "/browse/teachers" || pathname?.startsWith("/teacher/")}
            />
            <SidebarItem
              href="/browse/students"
              icon={<GraduationCap className="w-4 h-4" />}
              label="All Students"
              active={pathname === "/browse/students" || pathname?.startsWith("/student/")}
            />
          </SidebarSection>
        )}

        {/* Section: Office Member Academic (for office_member and admin roles) */}
        {(isAdmin || isOfficeMember) && (
          <SidebarSection
            title="Academic"
            sectionId="academic"
            isExpanded={isExpanded('academic')}
            onToggle={() => toggleSection('academic')}
            itemCount={3}
          >
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
          </SidebarSection>
        )}

        {/* Section: Teacher Quick Actions (for teacher role or office member with courses) */}
        {hasTeacherAccess && (
          <SidebarSection
            title="Quick Actions"
            sectionId="quick"
            isExpanded={isExpanded('quick')}
            onToggle={() => toggleSection('quick')}
          >
            <SidebarItem
              href="/scores/entry"
              icon={<Zap className="w-4 h-4" />}
              label="Quick Score Entry"
              active={pathname === "/scores/entry"}
            />
          </SidebarSection>
        )}

        {/* Section: My Classes (for teachers, heads, and office members with courses) */}
        {(isHead || isTeacher || hasTeacherAccess || (loading && (isHead || isTeacher || isOfficeMember))) && (
          <SidebarSection
            title="My Classes"
            sectionId="classes"
            isExpanded={isExpanded('classes')}
            onToggle={() => toggleSection('classes')}
            itemCount={loading ? undefined : classes.length}
          >
            {loading ? (
              <div className="space-y-1">
                <Skeleton className="h-9 w-full rounded-lg" />
                <Skeleton className="h-9 w-full rounded-lg" />
                <Skeleton className="h-9 w-full rounded-lg" />
              </div>
            ) : classes.length === 0 ? (
              <div className="text-sm text-text-tertiary py-1">No classes assigned</div>
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
          </SidebarSection>
        )}
      </div>
    </aside>
  );
}

// Collapsible section component
function SidebarSection({
  title,
  sectionId,
  isExpanded,
  onToggle,
  itemCount,
  children,
}: {
  title: string;
  sectionId: string;
  isExpanded: boolean;
  onToggle: () => void;
  itemCount?: number;
  children: React.ReactNode;
}) {
  return (
    <div className="px-3 py-1">
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center justify-between px-2 py-1.5 rounded-lg",
          "text-xs font-semibold uppercase tracking-wider",
          "text-text-secondary",
          "hover:bg-[rgb(var(--surface-hover))]",
          "transition-colors duration-normal ease-apple",
          "focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/50"
        )}
        aria-expanded={isExpanded}
        aria-controls={`sidebar-section-${sectionId}`}
      >
        <span className="flex items-center gap-2">
          {title}
          {!isExpanded && itemCount !== undefined && itemCount > 0 && (
            <span className="text-[10px] font-normal normal-case text-text-tertiary">
              ({itemCount})
            </span>
          )}
        </span>
        <ChevronDown
          className={cn(
            "w-3.5 h-3.5 transition-transform duration-normal ease-apple",
            isExpanded ? "rotate-0" : "-rotate-90"
          )}
        />
      </button>
      <div
        id={`sidebar-section-${sectionId}`}
        className={cn(
          "overflow-hidden transition-all duration-normal ease-apple",
          isExpanded ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0"
        )}
      >
        <nav className="space-y-0.5 pt-1">
          {children}
        </nav>
      </div>
    </div>
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
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-normal ease-apple",
        active
          ? "bg-accent-blue/10 text-accent-blue"
          : "text-text-primary hover:bg-[rgb(var(--surface-hover))] hover:translate-x-1"
      )}
    >
      {icon}
      <span className="truncate">{label}</span>
    </Link>
  );
}

"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { useAppStore } from "@/lib/store"
import { useAuth } from "@/lib/supabase/auth-context"
import { 
  Home, 
  Users, 
  GraduationCap, 
  FileBarChart,
  CalendarDays,
  Settings,
  ChevronLeft,
  Menu,
  LogOut
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"

interface SidebarProps {
  className?: string
}

const sidebarItems = [
  {
    label: "Dashboard",
    href: "/dashboard", 
    icon: Home,
    roles: ["admin", "teacher", "head"]
  },
  {
    label: "Admin Panel",
    href: "/admin",
    icon: GraduationCap, 
    roles: ["admin"]
  },
  {
    label: "Assessment Titles",
    href: "/admin/assessment-titles",
    icon: FileBarChart,
    roles: ["admin", "head"]
  },
  {
    label: "Scores",
    href: "/scores",
    icon: FileBarChart,
    roles: ["admin", "teacher", "head"]
  },
  {
    label: "Students",
    href: "/students", 
    icon: Users,
    roles: ["admin", "teacher", "head"]
  },
  {
    label: "Attendance",
    href: "/attendance/today",
    icon: CalendarDays,
    roles: ["admin", "teacher", "head"],
    subItems: [
      { label: "Today", href: "/attendance/today" },
      { label: "Weekly", href: "/attendance/weekly" }
    ]
  },
  {
    label: "Reports",
    href: "/reports",
    icon: FileBarChart,
    roles: ["admin", "teacher", "head"]
  },
  {
    label: "Settings",
    href: "/admin/settings",
    icon: Settings,
    roles: ["admin", "teacher", "head"]
  }
]

export default function Sidebar({ className }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false)
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const pathname = usePathname()
  const role = useAppStore((s) => s.role)
  const { signOut } = useAuth()

  const filteredItems = sidebarItems.filter(item => 
    !role || item.roles.includes(role)
  )

  return (
    <div className={cn(
      "flex h-screen flex-col border-r bg-background transition-all duration-300",
      collapsed ? "w-16" : "w-64",
      className
    )}>
      {/* Header */}
      <div className="flex h-16 items-center border-b px-4">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-6 w-6 text-primary" />
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold">LMS ESID</span>
              <span className="text-xs text-muted-foreground">Learning Management</span>
            </div>
          )}
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="ml-auto h-8 w-8 p-0"
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      {/* Role Badge */}
      {!collapsed && role && (
        <div className="p-4 pb-2">
          <Badge variant="secondary" className="w-full justify-center capitalize">
            {role} Role
          </Badge>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 space-y-1 p-2">
        {filteredItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || (pathname?.startsWith(item.href + "/") ?? false)
          const hasSubItems = item.subItems && item.subItems.length > 0
          const isExpanded = expandedItem === item.href

          return (
            <div key={item.href}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-accent",
                  isActive && "bg-accent text-accent-foreground",
                  collapsed && "justify-center"
                )}
                onClick={() => {
                  if (hasSubItems) {
                    setExpandedItem(isExpanded ? null : item.href)
                  }
                }}
              >
                <Icon className="h-4 w-4" />
                {!collapsed && (
                  <>
                    <span className="flex-1">{item.label}</span>
                    {hasSubItems && (
                      <ChevronLeft className={cn(
                        "h-4 w-4 transition-transform",
                        isExpanded && "rotate-90"
                      )} />
                    )}
                  </>
                )}
              </Link>

              {/* Sub Items */}
              {hasSubItems && !collapsed && isExpanded && (
                <div className="ml-4 mt-1 space-y-1">
                  {item.subItems.map((subItem) => (
                    <Link
                      key={subItem.href}
                      href={subItem.href}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-1.5 text-xs transition-colors hover:bg-accent",
                        pathname === subItem.href && "bg-accent text-accent-foreground"
                      )}
                    >
                      <div className="h-1.5 w-1.5 rounded-full bg-current opacity-40" />
                      {subItem.label}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      <div className="border-t p-2">
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "w-full gap-3",
            collapsed ? "h-8 w-8 p-0" : "justify-start"
          )}
          onClick={async () => {
            try {
              await signOut()
              window.location.href = '/auth/login'
            } catch (error) {
              console.error('Logout error:', error)
            }
          }}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && "Logout"}
        </Button>
      </div>
    </div>
  )
}
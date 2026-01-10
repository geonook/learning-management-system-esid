"use client"

import { useState } from "react"
import { usePathname } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { useAppStore } from "@/lib/store"
import { useAuthReady } from "@/hooks/useAuthReady"
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Home,
  Users,
  GraduationCap,
  FileBarChart,
  CalendarDays,
  Settings,
  ChevronRight,
  Menu,
  LogOut,
  Clock,
  X,
} from "lucide-react"
import * as VisuallyHidden from "@radix-ui/react-visually-hidden"

interface MobileNavProps {
  className?: string
}

const sidebarItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: Home,
    roles: ["admin", "teacher", "head"],
  },
  {
    label: "Admin Panel",
    href: "/admin",
    icon: GraduationCap,
    roles: ["admin"],
  },
  {
    label: "Assessment Titles",
    href: "/admin/assessment-titles",
    icon: FileBarChart,
    roles: ["admin", "head"],
  },
  {
    label: "Period Lock",
    href: "/admin/periods",
    icon: Clock,
    roles: ["admin"],
  },
  {
    label: "Scores",
    href: "/scores",
    icon: FileBarChart,
    roles: ["admin", "teacher", "head"],
  },
  {
    label: "Students",
    href: "/students",
    icon: Users,
    roles: ["admin", "teacher", "head"],
  },
  {
    label: "Attendance",
    href: "/attendance/today",
    icon: CalendarDays,
    roles: ["admin", "teacher", "head"],
    subItems: [
      { label: "Today", href: "/attendance/today" },
      { label: "Weekly", href: "/attendance/weekly" },
    ],
  },
  {
    label: "Reports",
    href: "/reports",
    icon: FileBarChart,
    roles: ["admin", "teacher", "head"],
  },
  {
    label: "Settings",
    href: "/admin/settings",
    icon: Settings,
    roles: ["admin", "teacher", "head"],
  },
]

export function MobileNav({ className }: MobileNavProps) {
  const [open, setOpen] = useState(false)
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const pathname = usePathname()
  const role = useAppStore((s) => s.role)
  const { signOut } = useAuthReady()

  const filteredItems = sidebarItems.filter(
    (item) => !role || item.roles.includes(role)
  )

  const handleLinkClick = () => {
    setOpen(false)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("h-10 w-10 lg:hidden", className)}
          aria-label="Open navigation menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <VisuallyHidden.Root>
          <SheetTitle>Navigation Menu</SheetTitle>
        </VisuallyHidden.Root>

        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b px-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-primary" />
            <div className="flex flex-col">
              <span className="text-sm font-semibold">LMS ESID</span>
              <span className="text-xs text-muted-foreground">
                Learning Management
              </span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Role Badge */}
        {role && (
          <div className="p-4 pb-2">
            <Badge variant="secondary" className="w-full justify-center capitalize">
              {role} Role
            </Badge>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-2">
          {filteredItems.map((item) => {
            const Icon = item.icon
            const isActive =
              pathname === item.href ||
              (pathname?.startsWith(item.href + "/") ?? false)
            const hasSubItems = item.subItems && item.subItems.length > 0
            const isExpanded = expandedItem === item.href

            return (
              <div key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-3 text-sm transition-colors hover:bg-accent touch:min-h-[44px]",
                    isActive && "bg-accent text-accent-foreground"
                  )}
                  onClick={(e) => {
                    if (hasSubItems) {
                      e.preventDefault()
                      setExpandedItem(isExpanded ? null : item.href)
                    } else {
                      handleLinkClick()
                    }
                  }}
                >
                  <Icon className="h-5 w-5" />
                  <span className="flex-1">{item.label}</span>
                  {hasSubItems && (
                    <ChevronRight
                      className={cn(
                        "h-4 w-4 transition-transform",
                        isExpanded && "rotate-90"
                      )}
                    />
                  )}
                </Link>

                {/* Sub Items */}
                {hasSubItems && isExpanded && (
                  <div className="ml-4 mt-1 space-y-1">
                    {item.subItems.map((subItem) => (
                      <Link
                        key={subItem.href}
                        href={subItem.href}
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors hover:bg-accent touch:min-h-[44px]",
                          pathname === subItem.href &&
                            "bg-accent text-accent-foreground"
                        )}
                        onClick={handleLinkClick}
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
            size="lg"
            className="w-full justify-start gap-3 h-12"
            onClick={async () => {
              try {
                await signOut()
                window.location.href = "/auth/login"
              } catch (error) {
                console.error("Logout error:", error)
              }
            }}
          >
            <LogOut className="h-5 w-5" />
            Logout
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

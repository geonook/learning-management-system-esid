"use client"

import { usePathname } from "next/navigation"
import { Bell, Search, Sun, Moon, Laptop } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { useAppStore } from "@/lib/store"

// Page title mapping
const pageTitles: Record<string, string> = {
  "/": "Home",
  "/dashboard": "Teacher Dashboard", 
  "/admin": "Admin Dashboard",
  "/scores": "Grade Management",
  "/students": "Student Management",
  "/attendance/today": "Today's Attendance",
  "/attendance/weekly": "Weekly Attendance", 
  "/reports": "Reports & Analytics",
  "/settings": "System Settings",
  "/auth/login": "Login",
  "/auth/role-select": "Role Selection"
}

// Breadcrumb generation
function generateBreadcrumbs(pathname: string) {
  const segments = pathname.split("/").filter(Boolean)
  const breadcrumbs = [{ label: "Home", href: "/" }]
  
  let currentPath = ""
  segments.forEach((segment) => {
    currentPath += `/${segment}`
    const label = pageTitles[currentPath] || segment.charAt(0).toUpperCase() + segment.slice(1)
    breadcrumbs.push({ label, href: currentPath })
  })
  
  return breadcrumbs
}

export default function Header() {
  const pathname = usePathname()
  const { theme, setTheme } = useTheme()
  const { grade, klass, track, role } = useAppStore((s) => s.selections)
  const currentRole = useAppStore((s) => s.role)
  
  const pageTitle = pageTitles[pathname] || "Learning Management System"
  const breadcrumbs = generateBreadcrumbs(pathname)

  return (
    <header className="flex h-16 items-center justify-between border-b bg-background px-6">
      {/* Left Section - Title & Breadcrumbs */}
      <div className="flex flex-col">
        <h1 className="text-lg font-semibold">{pageTitle}</h1>
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          {breadcrumbs.map((crumb, index) => (
            <div key={crumb.href} className="flex items-center gap-1">
              {index > 0 && <span>/</span>}
              <span className={index === breadcrumbs.length - 1 ? "text-foreground" : ""}>
                {crumb.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Center Section - Context Info */}
      <div className="hidden md:flex items-center gap-2">
        {currentRole && (
          <Badge variant="outline" className="capitalize">
            {currentRole}
          </Badge>
        )}
        <Badge variant="secondary">
          Grade {grade} - {klass}
        </Badge>
        <Badge variant="secondary" className="capitalize">
          {track}
        </Badge>
      </div>

      {/* Right Section - Actions */}
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="hidden sm:flex relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search students, classes..."
            className="pl-9 w-64"
          />
        </div>

        {/* Notifications */}
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="h-4 w-4" />
          <Badge 
            variant="destructive" 
            className="absolute -right-1 -top-1 h-5 w-5 rounded-full p-0 text-xs"
          >
            3
          </Badge>
        </Button>

        {/* Theme Toggle */}
        <Select value={theme} onValueChange={setTheme}>
          <SelectTrigger className="w-[110px]">
            <SelectValue placeholder="Theme">
              {theme === "light" && <Sun className="h-4 w-4 mr-1" />}
              {theme === "dark" && <Moon className="h-4 w-4 mr-1" />}
              {theme === "system" && <Laptop className="h-4 w-4 mr-1" />}
              <span className="capitalize">{theme}</span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="light">
              <div className="flex items-center gap-2">
                <Sun className="h-4 w-4" />
                Light
              </div>
            </SelectItem>
            <SelectItem value="dark">
              <div className="flex items-center gap-2">
                <Moon className="h-4 w-4" />
                Dark
              </div>
            </SelectItem>
            <SelectItem value="system">
              <div className="flex items-center gap-2">
                <Laptop className="h-4 w-4" />
                System
              </div>
            </SelectItem>
          </SelectContent>
        </Select>

        {/* User Menu */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex flex-col text-right">
            <span className="text-sm font-medium">John Teacher</span>
            <span className="text-xs text-muted-foreground">john.teacher@esid.edu</span>
          </div>
          <div className="h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
            JT
          </div>
        </div>
      </div>
    </header>
  )
}
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { GraduationCap, Users, Shield, ArrowRight, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAppStore } from "@/lib/store"
import { useToast } from "@/hooks/use-toast"

const roles = [
  {
    id: "teacher" as const,
    title: "Teacher",
    description: "Manage your classes, students, and assessments",
    icon: GraduationCap,
    features: [
      "Grade entry and management", 
      "Attendance tracking",
      "Student progress monitoring",
      "Class-specific reports"
    ],
    color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    iconColor: "text-blue-600"
  },
  {
    id: "head" as const, 
    title: "Head of Department",
    description: "Oversee grade-level curriculum and teacher coordination",
    icon: Users,
    features: [
      "All teacher permissions",
      "Grade-level oversight", 
      "Assessment title customization",
      "Multi-class analytics"
    ],
    color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", 
    iconColor: "text-green-600"
  },
  {
    id: "admin" as const,
    title: "Administrator", 
    description: "Full system access and administrative controls",
    icon: Shield,
    features: [
      "Complete system access",
      "User management",
      "System-wide analytics", 
      "Data export and reporting"
    ],
    color: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    iconColor: "text-purple-600"
  }
]

export default function RoleSelectPage() {
  const [selectedRole, setSelectedRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  
  const router = useRouter()
  const setRole = useAppStore((s) => s.setRole)
  const { toast } = useToast()

  const handleRoleSelect = async () => {
    if (!selectedRole) return
    
    setLoading(true)
    
    // Mock role assignment - in real app, this would validate with Supabase
    setTimeout(() => {
      setRole(selectedRole as any)
      toast({
        title: "Role Selected",
        description: `Successfully logged in as ${selectedRole}`
      })
      
      // Redirect based on role
      const redirectPath = selectedRole === "admin" ? "/admin" : "/dashboard"
      router.push(redirectPath)
      setLoading(false)
    }, 1000)
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <div className="w-full max-w-4xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Select Your Role</h1>
          <p className="text-muted-foreground">
            Choose your role to access the appropriate features and permissions
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          {roles.map((role) => {
            const Icon = role.icon
            const isSelected = selectedRole === role.id
            
            return (
              <Card 
                key={role.id}
                className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                  isSelected ? "ring-2 ring-primary shadow-lg" : ""
                }`}
                onClick={() => setSelectedRole(role.id)}
              >
                <CardHeader className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className={`p-3 rounded-lg ${role.color.split(' ').slice(0, 2).join(' ')}`}>
                      <Icon className={`h-6 w-6 ${role.iconColor}`} />
                    </div>
                    {isSelected && (
                      <div className="h-6 w-6 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-4 w-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <CardTitle className="flex items-center gap-2">
                      {role.title}
                      <Badge className={role.color}>
                        {role.id.toUpperCase()}
                      </Badge>
                    </CardTitle>
                    <CardDescription>
                      {role.description}
                    </CardDescription>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm font-medium">Key Features:</p>
                    <ul className="space-y-1">
                      {role.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>

        {/* Continue Button */}
        <div className="flex justify-center">
          <Button
            onClick={handleRoleSelect}
            disabled={!selectedRole || loading}
            size="lg"
            className="min-w-32"
          >
            {loading ? (
              "Logging in..."
            ) : (
              <>
                Continue 
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>

        {/* Footer */}
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            Your role determines which features and data you can access.
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            Contact your administrator if you need a different role.
          </p>
        </div>
      </div>
    </div>
  )
}
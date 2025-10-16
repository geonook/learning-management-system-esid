"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { GraduationCap, Users, Shield, ArrowRight, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
    title: "Head Teacher",
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
  const [formData, setFormData] = useState({
    fullName: "",
    teacherType: "",
    grade: "",
    campus: ""
  })

  const router = useRouter()
  const { toast } = useToast()

  const handleRoleSelect = async () => {
    if (!selectedRole) {
      toast({
        title: "請選擇角色",
        description: "請先選擇一個角色以繼續",
        variant: "destructive"
      })
      return
    }

    // Validate full name
    if (!formData.fullName.trim()) {
      toast({
        title: "請輸入姓名",
        description: "姓名為必填欄位",
        variant: "destructive"
      })
      return
    }

    // Validate teacher-specific fields
    if (selectedRole === 'teacher' && !formData.teacherType) {
      toast({
        title: "請選擇教師類型",
        description: "Teacher 角色需要選擇教師類型 (LT/IT/KCFS)",
        variant: "destructive"
      })
      return
    }

    // Validate head-specific fields
    if (selectedRole === 'head') {
      if (!formData.grade) {
        toast({
          title: "請選擇年段",
          description: "Head Teacher 角色需要選擇年段",
          variant: "destructive"
        })
        return
      }
      if (!formData.campus) {
        toast({
          title: "請選擇校區",
          description: "Head Teacher 角色需要選擇校區",
          variant: "destructive"
        })
        return
      }
    }

    setLoading(true)

    try {
      // Call real API to create user
      const response = await fetch('/api/users/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fullName: formData.fullName.trim(),
          role: selectedRole,
          teacherType: selectedRole === 'teacher' ? formData.teacherType : undefined,
          grade: selectedRole === 'head' ? parseInt(formData.grade) : undefined,
          campus: selectedRole === 'head' ? formData.campus : undefined,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle error response
        toast({
          title: "註冊失敗",
          description: data.error || "無法建立使用者記錄，請重試",
          variant: "destructive"
        })
        setLoading(false)
        return
      }

      // Success
      toast({
        title: "註冊成功",
        description: "您的帳號已建立，等待管理員審核後即可使用",
      })

      // Redirect to pending page
      setTimeout(() => {
        router.push("/dashboard/pending")
      }, 1500)

    } catch (error: any) {
      console.error('User creation error:', error)
      toast({
        title: "系統錯誤",
        description: error.message || "發生未預期的錯誤，請重試",
        variant: "destructive"
      })
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <div className="w-full max-w-5xl space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold">Complete Your Profile</h1>
          <p className="text-muted-foreground">
            Select your role and provide additional information to access the system
          </p>
        </div>

        {/* Personal Information Form */}
        <Card>
          <CardHeader>
            <CardTitle>Personal Information</CardTitle>
            <CardDescription>This information will be used to identify you in the system</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                placeholder="Enter your full name"
                value={formData.fullName}
                onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                disabled={loading}
              />
            </div>
          </CardContent>
        </Card>

        {/* Role Cards */}
        <div>
          <Label className="text-base mb-3 block">Select Your Role *</Label>
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
                  onClick={() => !loading && setSelectedRole(role.id)}
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
        </div>

        {/* Role-Specific Fields */}
        {selectedRole === 'teacher' && (
          <Card>
            <CardHeader>
              <CardTitle>Teacher Information</CardTitle>
              <CardDescription>Additional information required for teacher role</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="teacherType">Teacher Type *</Label>
                <Select
                  value={formData.teacherType}
                  onValueChange={(value) => setFormData(prev => ({ ...prev, teacherType: value }))}
                  disabled={loading}
                >
                  <SelectTrigger id="teacherType">
                    <SelectValue placeholder="Select teacher type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="LT">LT - Local Teacher</SelectItem>
                    <SelectItem value="IT">IT - International Teacher</SelectItem>
                    <SelectItem value="KCFS">KCFS - Kang Chiao Future Skill</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )}

        {selectedRole === 'head' && (
          <Card>
            <CardHeader>
              <CardTitle>Head Teacher Information</CardTitle>
              <CardDescription>Additional information required for head teacher role</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="grade">Grade Level *</Label>
                  <Select
                    value={formData.grade}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, grade: value }))}
                    disabled={loading}
                  >
                    <SelectTrigger id="grade">
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">Grade 1</SelectItem>
                      <SelectItem value="2">Grade 2</SelectItem>
                      <SelectItem value="3">Grade 3</SelectItem>
                      <SelectItem value="4">Grade 4</SelectItem>
                      <SelectItem value="5">Grade 5</SelectItem>
                      <SelectItem value="6">Grade 6</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="campus">Campus *</Label>
                  <Select
                    value={formData.campus}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, campus: value }))}
                    disabled={loading}
                  >
                    <SelectTrigger id="campus">
                      <SelectValue placeholder="Select campus" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="local">Local Campus</SelectItem>
                      <SelectItem value="international">International Campus</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Continue Button */}
        <div className="flex justify-center">
          <Button
            onClick={handleRoleSelect}
            disabled={!selectedRole || loading}
            size="lg"
            className="min-w-40"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Account...
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </div>

        {/* Footer */}
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground">
            Your account will be pending approval by an administrator.
          </p>
          <p className="text-sm text-muted-foreground">
            You'll receive access once your account is activated.
          </p>
        </div>
      </div>
    </div>
  )
}

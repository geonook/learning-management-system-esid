"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { GraduationCap, Globe, Lightbulb, ArrowRight, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useToast } from "@/hooks/use-toast"

const teacherTypes = [
  {
    id: "LT" as const,
    title: "Local Teacher",
    icon: GraduationCap,
    color: "from-blue-500 to-blue-600",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    borderColor: "border-blue-200 dark:border-blue-800",
    hoverColor: "hover:border-blue-400 dark:hover:border-blue-600"
  },
  {
    id: "IT" as const,
    title: "International Teacher",
    icon: Globe,
    color: "from-green-500 to-green-600",
    bgColor: "bg-green-50 dark:bg-green-950/30",
    borderColor: "border-green-200 dark:border-green-800",
    hoverColor: "hover:border-green-400 dark:hover:border-green-600"
  },
  {
    id: "KCFS" as const,
    title: "KCFS Teacher",
    icon: Lightbulb,
    color: "from-purple-500 to-purple-600",
    bgColor: "bg-purple-50 dark:bg-purple-950/30",
    borderColor: "border-purple-200 dark:border-purple-800",
    hoverColor: "hover:border-purple-400 dark:hover:border-purple-600"
  }
]

export default function RoleSelectPage() {
  const [selectedType, setSelectedType] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const router = useRouter()
  const { toast } = useToast()

  const handleSubmit = async () => {
    if (!selectedType) {
      toast({
        title: "Please select a teacher type",
        description: "You must select a teacher type to continue",
        variant: "destructive"
      })
      return
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
          teacherType: selectedType,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Handle error response
        toast({
          title: "Registration Failed",
          description: data.error || "Unable to create user account. Please try again.",
          variant: "destructive"
        })
        setLoading(false)
        return
      }

      // Success
      toast({
        title: "Registration Successful",
        description: "Your account has been created and is pending admin approval.",
      })

      // Redirect to pending page
      setTimeout(() => {
        router.push("/dashboard/pending")
      }, 1500)

    } catch (error: any) {
      console.error('User creation error:', error)
      toast({
        title: "System Error",
        description: error.message || "An unexpected error occurred. Please try again.",
        variant: "destructive"
      })
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="w-full max-w-4xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-primary/80 mb-4">
            <GraduationCap className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-4xl font-bold tracking-tight">Complete Your Profile</h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            Select your teacher type to complete registration
          </p>
        </div>

        {/* Teacher Type Cards */}
        <div className="grid gap-6 md:grid-cols-3">
          {teacherTypes.map((type) => {
            const Icon = type.icon
            const isSelected = selectedType === type.id

            return (
              <Card
                key={type.id}
                className={`
                  relative cursor-pointer transition-all duration-300
                  border-2 ${type.borderColor} ${type.hoverColor}
                  ${isSelected
                    ? `ring-4 ring-primary/20 shadow-xl scale-105 ${type.bgColor}`
                    : 'hover:shadow-lg hover:scale-102'
                  }
                `}
                onClick={() => !loading && setSelectedType(type.id)}
              >
                <CardHeader className="space-y-4 p-6">
                  {/* Icon with gradient background */}
                  <div className="flex justify-center">
                    <div className={`
                      w-16 h-16 rounded-2xl bg-gradient-to-br ${type.color}
                      flex items-center justify-center shadow-lg
                      ${isSelected ? 'scale-110' : ''}
                      transition-transform duration-300
                    `}>
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                  </div>

                  {/* Title */}
                  <div className="text-center">
                    <CardTitle className="text-xl font-bold">
                      {type.title}
                    </CardTitle>
                  </div>

                  {/* Badge */}
                  <div className="flex justify-center">
                    <span className={`
                      inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold
                      bg-gradient-to-r ${type.color} text-white
                    `}>
                      {type.id}
                    </span>
                  </div>

                  {/* Selected Indicator */}
                  {isSelected && (
                    <div className="absolute top-3 right-3">
                      <div className="w-6 h-6 rounded-full bg-primary flex items-center justify-center shadow-md">
                        <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                    </div>
                  )}
                </CardHeader>
              </Card>
            )
          })}
        </div>

        {/* Continue Button */}
        <div className="flex flex-col items-center gap-6 pt-4">
          <Button
            onClick={handleSubmit}
            disabled={!selectedType || loading}
            size="lg"
            className="px-8 py-6 text-base font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Creating Account...
              </>
            ) : (
              <>
                Continue
                <ArrowRight className="ml-2 h-5 w-5" />
              </>
            )}
          </Button>

          {/* Footer */}
          <div className="text-center space-y-1">
            <p className="text-sm text-muted-foreground">
              Your account will be pending admin approval
            </p>
            <p className="text-xs text-muted-foreground/80">
              You will be able to access the system once your account is activated
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

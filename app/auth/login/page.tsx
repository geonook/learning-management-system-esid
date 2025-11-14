"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff, GraduationCap, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase/client"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { GoogleIcon } from "@/components/icons/google-icon"
import { SSOLoginButton } from "@/components/auth/SSOLoginButton"

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    rememberMe: false
  })

  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  // Handle SSO error messages from URL parameters
  useEffect(() => {
    const error = searchParams.get('error')
    const description = searchParams.get('description')

    if (error) {
      const errorMessages: Record<string, string> = {
        'viewer_access_denied': 'Viewer 角色無法存取 LMS 系統',
        'oauth_callback_failed': 'OAuth 回調處理失敗',
        'session_creation_failed': 'Session 建立失敗',
        'invalid_callback': '無效的回調參數',
        'missing_code_verifier': '缺少 PKCE 驗證參數',
        'access_denied': '使用者拒絕授權',
      }

      toast({
        title: 'SSO 登入失敗',
        description: errorMessages[error] || description || error,
        variant: 'destructive',
      })

      // Clear error parameters from URL
      router.replace('/auth/login')
    }
  }, [searchParams, toast, router])

  // Google OAuth login handler
  const handleGoogleLogin = async () => {
    setGoogleLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      })

      if (error) {
        toast({
          title: "Google 登入失敗",
          description: error.message,
          variant: "destructive"
        })
        setGoogleLoading(false)
      }
      // Note: If successful, browser will redirect to Google
      // No need to setGoogleLoading(false) as page will redirect
    } catch (error: any) {
      toast({
        title: "登入錯誤",
        description: error.message || "發生未預期的錯誤",
        variant: "destructive"
      })
      setGoogleLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      console.log('嘗試登入:', formData.email)
      
      // Add timeout to catch slow connections
      const loginPromise = supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })
      
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('登入請求超時（超過 10 秒）')), 10000)
      )
      
      const { data, error } = await Promise.race([loginPromise, timeoutPromise]) as any

      if (error) {
        console.error('登入錯誤:', error)
        toast({
          title: "登入失敗",
          description: error.message === 'Invalid login credentials' 
            ? '電子郵件或密碼錯誤，請檢查後重試'
            : error.message,
          variant: "destructive"
        })
        setLoading(false)
        return
      }

      if (data.user) {
        // Check if user exists in users table
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, role, full_name')
          .eq('id', data.user.id)
          .single()

        if (userError || !userData) {
          toast({
            title: "User Profile Not Found",
            description: "Please contact IT support to set up your profile.",
            variant: "destructive"
          })
          await supabase.auth.signOut()
          setLoading(false)
          return
        }

        console.log('登入成功:', userData)
        toast({
          title: "登入成功",
          description: `歡迎回來，${userData.full_name}！`
        })

        // Redirect to dashboard directly (skip role selection)
        router.push("/dashboard")
      }
    } catch (error: any) {
      console.error('登入例外錯誤:', error)
      toast({
        title: "登入錯誤",
        description: error.message || "發生未預期的錯誤，請重試。",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <div className="w-full max-w-md space-y-6">
        {/* Back Button */}
        <Button variant="ghost" size="sm" asChild>
          <Link href="/">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Home
          </Link>
        </Button>

        {/* Login Card */}
        <Card className="border-0 shadow-xl">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary">
              <GraduationCap className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <CardTitle className="text-2xl">Welcome Back</CardTitle>
              <CardDescription>
                Sign in to your LMS ESID account
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            {/* Info Hub SSO Login Button */}
            <SSOLoginButton
              disabled={googleLoading || loading}
            />

            {/* Divider */}
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  或
                </span>
              </div>
            </div>

            {/* Google Login Button */}
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleGoogleLogin}
              disabled={googleLoading || loading}
            >
              {googleLoading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  連接 Google...
                </>
              ) : (
                <>
                  <GoogleIcon className="mr-2 h-5 w-5" />
                  使用 Google 帳號登入
                </>
              )}
            </Button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  或使用電子郵件
                </span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Email Field */}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john.teacher@esid.edu"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  required
                />
              </div>

              {/* Password Field */}
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={formData.password}
                    onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                    className="pr-10"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Eye className="h-4 w-4 text-muted-foreground" />
                    )}
                  </Button>
                </div>
              </div>

              {/* Remember Me & Forgot Password */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="remember"
                    checked={formData.rememberMe}
                    onCheckedChange={(checked) => 
                      setFormData(prev => ({ ...prev, rememberMe: !!checked }))
                    }
                  />
                  <Label htmlFor="remember" className="text-sm">
                    Remember me
                  </Label>
                </div>
                <Button variant="link" className="px-0 text-sm">
                  Forgot password?
                </Button>
              </div>

              {/* Login Button */}
              <Button 
                type="submit" 
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    登入中...
                  </>
                ) : (
                  "登入"
                )}
              </Button>
            </form>

            {/* Demo Credentials */}
            <div className="mt-6 p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">Demo Credentials:</p>
              <div className="space-y-1 text-xs text-muted-foreground">
                <p><strong>Admin:</strong> admin@esid.edu / admin123</p>
                <p><strong>Teacher:</strong> teacher@esid.edu / teacher123</p> 
                <p><strong>Head:</strong> head@esid.edu / head123</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-sm text-muted-foreground">
          Need an account?{" "}
          <Button variant="link" className="px-0 text-sm">
            Contact IT Support
          </Button>
        </p>
      </div>
    </div>
  )
}
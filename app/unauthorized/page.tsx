"use client"

import Link from 'next/link'
import { ShieldX, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-destructive/10 via-background to-muted/20">
      <div className="w-full max-w-md space-y-6">
        <Card className="border-destructive/20">
          <CardHeader className="text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <ShieldX className="h-6 w-6 text-destructive" />
            </div>
            <CardTitle className="text-destructive">Access Denied</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              You don't have permission to access this page. Please contact your administrator if you believe this is an error.
            </p>
            <div className="space-y-2">
              <Button asChild className="w-full">
                <Link href="/dashboard">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Dashboard
                </Link>
              </Button>
              <Button variant="outline" asChild className="w-full">
                <Link href="/auth/login">
                  Login with Different Account
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
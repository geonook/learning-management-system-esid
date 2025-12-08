"use client"

import { Clock, Mail, Shield } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

export default function PendingApprovalPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-surface-secondary via-background to-surface-secondary">
      <div className="w-full max-w-2xl space-y-6">
        {/* Status Card */}
        <Card className="border-2 border-yellow-200 dark:border-yellow-900">
          <CardHeader className="text-center space-y-4">
            <div className="mx-auto h-16 w-16 rounded-full bg-yellow-100 dark:bg-yellow-950/50 flex items-center justify-center">
              <Clock className="h-8 w-8 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div>
              <CardTitle className="text-2xl">Account Pending Approval</CardTitle>
              <CardDescription className="mt-2">
                Your account has been created successfully
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Status Badge */}
            <div className="flex justify-center">
              <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/30 dark:text-yellow-400 dark:border-yellow-800 px-4 py-2 text-sm">
                <Clock className="h-3.5 w-3.5 mr-2" />
                Waiting for Admin Approval
              </Badge>
            </div>

            {/* Information */}
            <div className="space-y-4 pt-4 border-t">
              <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">
                What happens next?
              </h3>

              <div className="space-y-3">
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-surface-secondary flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-primary">1</span>
                  </div>
                  <div>
                    <p className="font-medium">Review in Progress</p>
                    <p className="text-sm text-muted-foreground">
                      An administrator will review your registration request
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-surface-secondary flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-primary">2</span>
                  </div>
                  <div>
                    <p className="font-medium">Account Activation</p>
                    <p className="text-sm text-muted-foreground">
                      Once approved, your account will be activated automatically
                    </p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full bg-surface-secondary flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-semibold text-primary">3</span>
                  </div>
                  <div>
                    <p className="font-medium">Full Access Granted</p>
                    <p className="text-sm text-muted-foreground">
                      You&apos;ll be able to log in and access all features based on your role
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="bg-surface-secondary rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <p className="text-sm font-medium">Need help?</p>
              </div>
              <p className="text-sm text-muted-foreground">
                If your account is not approved within 24-48 hours, please contact the system administrator or IT support team.
              </p>
              <p className="text-sm text-muted-foreground">
                Email: <span className="font-medium text-foreground">it-support@kcislk.ntpc.edu.tw</span>
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button asChild variant="outline" className="flex-1">
                <Link href="/auth/login">
                  Back to Login
                </Link>
              </Button>
              <Button asChild variant="default" className="flex-1">
                <Link href="mailto:it-support@kcislk.ntpc.edu.tw">
                  <Mail className="h-4 w-4 mr-2" />
                  Contact Support
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Additional Information */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Security & Privacy
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>
              • Your account information is secure and will only be reviewed by authorized administrators
            </p>
            <p>
              • All user registrations require approval to ensure system security
            </p>
            <p>
              • You can log in and check your approval status at any time
            </p>
          </CardContent>
        </Card>

        {/* Footer Note */}
        <p className="text-center text-xs text-muted-foreground">
          Kang Chiao International School Learning Management System
        </p>
      </div>
    </div>
  )
}

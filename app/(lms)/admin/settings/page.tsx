"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { Settings, Database, Bell, Lock, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

const settingsSections = [
  {
    icon: Database,
    title: "Database",
    description: "View database statistics and connection status",
    status: "Connected",
    statusColor: "green",
  },
  {
    icon: Bell,
    title: "Notifications",
    description: "Configure system notification settings",
    status: "Coming Soon",
    statusColor: "yellow",
  },
  {
    icon: Lock,
    title: "Security",
    description: "Manage authentication and session settings",
    status: "Coming Soon",
    statusColor: "yellow",
  },
  {
    icon: Globe,
    title: "SSO Integration",
    description: "Configure Info Hub SSO connection",
    status: "Partial",
    statusColor: "orange",
  },
];

export default function SystemSettingsPage() {
  return (
    <AuthGuard requiredRoles={["admin"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-surface-secondary rounded-lg">
            <Settings className="w-6 h-6 text-text-secondary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">System Settings</h1>
            <p className="text-sm text-text-secondary">Configure system-wide settings</p>
          </div>
        </div>

        {/* Settings Grid */}
        <div className="grid grid-cols-2 gap-4">
          {settingsSections.map((section) => (
            <div
              key={section.title}
              className="bg-surface-secondary rounded-xl border border-border-default p-6 hover:bg-surface-hover transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="p-2 bg-surface-tertiary rounded-lg">
                  <section.icon className="w-5 h-5 text-text-secondary" />
                </div>
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    section.statusColor === "green"
                      ? "bg-green-500/20 text-green-600 dark:text-green-400"
                      : section.statusColor === "yellow"
                      ? "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400"
                      : "bg-orange-500/20 text-orange-600 dark:text-orange-400"
                  }`}
                >
                  {section.status}
                </span>
              </div>
              <h3 className="text-lg font-medium text-text-primary mb-1">{section.title}</h3>
              <p className="text-sm text-text-tertiary mb-4">{section.description}</p>
              <Button
                variant="outline"
                size="sm"
                className="border-border-default text-text-secondary"
                disabled={section.status === "Coming Soon"}
              >
                Configure
              </Button>
            </div>
          ))}
        </div>

        {/* System Info */}
        <div className="bg-surface-secondary rounded-xl border border-border-default p-6">
          <h3 className="text-lg font-medium text-text-primary mb-4">System Information</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <div className="text-sm text-text-tertiary">Version</div>
              <div className="text-text-primary font-mono">1.0.0-staging</div>
            </div>
            <div>
              <div className="text-sm text-text-tertiary">Environment</div>
              <div className="text-text-primary font-mono">Staging</div>
            </div>
            <div>
              <div className="text-sm text-text-tertiary">Database</div>
              <div className="text-text-primary font-mono">Supabase Cloud</div>
            </div>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}

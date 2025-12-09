"use client";

import { AuthGuard } from "@/components/auth/auth-guard";
import { Shield, Check, X } from "lucide-react";

const roles = [
  {
    name: "Admin",
    description: "Full system access",
    color: "red",
    permissions: {
      "View all classes": true,
      "Manage users": true,
      "Manage classes": true,
      "View all scores": true,
      "Edit all scores": true,
      "System settings": true,
    },
  },
  {
    name: "Head Teacher",
    description: "Grade-level management",
    color: "orange",
    permissions: {
      "View all classes": true,
      "Manage users": false,
      "Manage classes": false,
      "View all scores": true,
      "Edit all scores": false,
      "System settings": false,
    },
  },
  {
    name: "Teacher",
    description: "Own classes only",
    color: "blue",
    permissions: {
      "View all classes": false,
      "Manage users": false,
      "Manage classes": false,
      "View all scores": false,
      "Edit all scores": false,
      "System settings": false,
    },
  },
  {
    name: "Office Member",
    description: "Read-only access",
    color: "green",
    permissions: {
      "View all classes": true,
      "Manage users": false,
      "Manage classes": false,
      "View all scores": true,
      "Edit all scores": false,
      "System settings": false,
    },
  },
];

export default function RolePermissionsPage() {
  return (
    <AuthGuard requiredRoles={["admin"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/20 dark:bg-amber-500/20 rounded-lg">
            <Shield className="w-6 h-6 text-amber-500 dark:text-amber-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text-primary">Role Permissions</h1>
            <p className="text-sm text-text-secondary">View and understand system role permissions</p>
          </div>
        </div>

        {/* Permissions Matrix */}
        <div className="bg-surface-secondary rounded-xl border border-border-default overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-default">
                <th className="text-left p-4 text-sm font-medium text-text-secondary">Permission</th>
                {roles.map((role) => (
                  <th key={role.name} className="text-center p-4 text-sm font-medium text-text-secondary">
                    <div className="flex flex-col items-center gap-1">
                      <span className={`px-2 py-1 bg-${role.color}-500/20 dark:bg-${role.color}-500/20 text-${role.color}-600 dark:text-${role.color}-400 text-xs rounded-full`}>
                        {role.name}
                      </span>
                      <span className="text-xs text-text-tertiary">{role.description}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Object.keys(roles[0]?.permissions ?? {}).map((permission) => (
                <tr key={permission} className="border-b border-border-subtle hover:bg-surface-hover">
                  <td className="p-4 text-text-primary">{permission}</td>
                  {roles.map((role) => (
                    <td key={`${role.name}-${permission}`} className="p-4 text-center">
                      {role.permissions[permission as keyof typeof role.permissions] ? (
                        <Check className="w-5 h-5 text-green-500 dark:text-green-400 mx-auto" />
                      ) : (
                        <X className="w-5 h-5 text-red-500/50 dark:text-red-400/50 mx-auto" />
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Info Box */}
        <div className="bg-blue-500/10 dark:bg-blue-500/10 border border-blue-500/20 dark:border-blue-500/20 rounded-xl p-4">
          <h3 className="text-blue-600 dark:text-blue-400 font-medium mb-2">About Role-Based Access Control</h3>
          <p className="text-text-secondary text-sm">
            LMS uses Row Level Security (RLS) to enforce permissions at the database level.
            Each role has specific access rights that cannot be bypassed through the application.
            Role changes require admin approval and take effect on the next login.
          </p>
        </div>
      </div>
    </AuthGuard>
  );
}

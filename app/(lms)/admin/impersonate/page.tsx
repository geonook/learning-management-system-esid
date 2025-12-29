"use client";

import { useState, useEffect, useCallback } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { useAuthReady } from "@/hooks/useAuthReady";
import { getUsers } from "@/lib/api/users";
import { createClient } from "@/lib/supabase/client";
import {
  Search,
  UserCog,
  ExternalLink,
  Shield,
  Clock,
  AlertTriangle,
} from "lucide-react";

type User = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  teacher_type: string | null;
  is_active: boolean;
};

type AuditLog = {
  id: string;
  admin_id: string;
  action: string;
  target_user_id: string;
  metadata: {
    admin_email: string;
    admin_name: string;
    target_email: string;
    target_name: string;
    target_role: string;
    timestamp: string;
  };
  created_at: string;
};

export default function ImpersonatePage() {
  const { isReady, userId } = useAuthReady();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [impersonating, setImpersonating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const usersData = await getUsers();
      setUsers(usersData);
      setFilteredUsers(usersData);

      // Fetch audit logs
      const supabase = createClient();
      const { data: session } = await supabase.auth.getSession();

      if (session?.session?.access_token) {
        const response = await fetch("/api/admin/impersonate", {
          headers: {
            Authorization: `Bearer ${session.session.access_token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setAuditLogs(data.logs || []);
        }
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setError("Failed to load users");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isReady) return;
    fetchData();
  }, [isReady, fetchData]);

  useEffect(() => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      setFilteredUsers(
        users.filter(
          (user) =>
            user.email.toLowerCase().includes(query) ||
            user.full_name?.toLowerCase().includes(query) ||
            user.role.toLowerCase().includes(query)
        )
      );
    } else {
      setFilteredUsers(users);
    }
  }, [searchQuery, users]);

  const handleImpersonate = async (targetUser: User) => {
    if (targetUser.id === userId) {
      setError("You cannot impersonate yourself");
      return;
    }

    try {
      setImpersonating(targetUser.id);
      setError(null);

      const supabase = createClient();
      const { data: session } = await supabase.auth.getSession();

      if (!session?.session?.access_token) {
        throw new Error("No active session");
      }

      const response = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify({
          targetUserId: targetUser.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to generate impersonation link");
      }

      // Open the magic link in a new tab
      window.open(data.url, "_blank");

      // Refresh audit logs
      fetchData();
    } catch (err) {
      console.error("Impersonation failed:", err);
      setError(err instanceof Error ? err.message : "Impersonation failed");
    } finally {
      setImpersonating(null);
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-red-500/20 text-red-400";
      case "head":
        return "bg-purple-500/20 text-purple-400";
      case "teacher":
        return "bg-blue-500/20 text-blue-400";
      case "office_member":
        return "bg-green-500/20 text-green-400";
      default:
        return "bg-gray-500/20 text-gray-400";
    }
  };

  return (
    <AuthGuard requiredRoles={["admin"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10">
            <UserCog className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-text-primary">
              User Impersonation
            </h1>
            <p className="text-sm text-text-secondary">
              Log in as another user for support and debugging purposes
            </p>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20">
          <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-400">
              Security Notice
            </p>
            <p className="text-sm text-text-secondary mt-1">
              All impersonation actions are logged and audited. Use this feature
              responsibly and only for legitimate support purposes.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* User List */}
          <div className="lg:col-span-2 bg-surface-secondary rounded-xl border border-border-default">
            <div className="p-4 border-b border-border-default">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
                <input
                  type="text"
                  placeholder="Search by name, email, or role..."
                  className="w-full pl-10 pr-4 py-2 bg-surface-tertiary border border-border-default rounded-lg text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-primary"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-accent-primary"></div>
              </div>
            ) : (
              <div className="divide-y divide-border-default max-h-[500px] overflow-y-auto">
                {filteredUsers.map((user) => (
                  <div
                    key={user.id}
                    className="flex items-center justify-between p-4 hover:bg-surface-tertiary transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-accent-primary/10 flex items-center justify-center">
                        <span className="text-accent-primary font-medium">
                          {user.full_name?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase() || "?"}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-text-primary">
                          {user.full_name || "No Name"}
                        </p>
                        <p className="text-xs text-text-tertiary">{user.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2 py-1 text-xs rounded-full ${getRoleBadgeColor(
                          user.role
                        )}`}
                      >
                        {user.role}
                      </span>
                      <button
                        onClick={() => handleImpersonate(user)}
                        disabled={impersonating === user.id || user.id === userId}
                        className={`flex items-center gap-1 px-3 py-1.5 text-xs rounded-lg transition-colors ${
                          user.id === userId
                            ? "bg-gray-500/20 text-gray-500 cursor-not-allowed"
                            : impersonating === user.id
                            ? "bg-accent-primary/50 text-white"
                            : "bg-accent-primary text-white hover:bg-accent-primary/80"
                        }`}
                      >
                        {impersonating === user.id ? (
                          <>
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                            <span>Generating...</span>
                          </>
                        ) : (
                          <>
                            <ExternalLink className="w-3 h-3" />
                            <span>Impersonate</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Audit Logs */}
          <div className="bg-surface-secondary rounded-xl border border-border-default">
            <div className="p-4 border-b border-border-default flex items-center gap-2">
              <Shield className="w-4 h-4 text-text-tertiary" />
              <h2 className="text-sm font-medium text-text-primary">
                Recent Impersonations
              </h2>
            </div>
            <div className="divide-y divide-border-default max-h-[400px] overflow-y-auto">
              {auditLogs.length === 0 ? (
                <div className="p-4 text-center text-text-tertiary text-sm">
                  No impersonation history
                </div>
              ) : (
                auditLogs.slice(0, 10).map((log) => (
                  <div key={log.id} className="p-3">
                    <div className="flex items-start gap-2">
                      <Clock className="w-4 h-4 text-text-tertiary mt-0.5" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-text-secondary truncate">
                          <span className="text-text-primary font-medium">
                            {log.metadata?.admin_name || "Admin"}
                          </span>{" "}
                          impersonated{" "}
                          <span className="text-accent-primary">
                            {log.metadata?.target_name || log.metadata?.target_email}
                          </span>
                        </p>
                        <p className="text-xs text-text-tertiary mt-0.5">
                          {new Date(log.created_at).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Info Panel */}
        <div className="bg-surface-secondary rounded-xl border border-border-default p-4">
          <h3 className="text-sm font-medium text-text-primary mb-2">
            How it works
          </h3>
          <ul className="text-sm text-text-secondary space-y-1">
            <li>
              1. Click &quot;Impersonate&quot; to generate a magic link for the selected user
            </li>
            <li>2. A new browser tab will open with the magic link</li>
            <li>3. You will be logged in as that user in the new tab</li>
            <li>
              4. Your original session remains active in this tab
            </li>
            <li>
              5. All impersonation actions are logged for security auditing
            </li>
          </ul>
        </div>
      </div>
    </AuthGuard>
  );
}

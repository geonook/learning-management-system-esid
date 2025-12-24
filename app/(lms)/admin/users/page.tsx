"use client";

import { useEffect, useState, useCallback } from "react";
import { AuthGuard } from "@/components/auth/auth-guard";
import { useAuth } from "@/lib/supabase/auth-context";
import {
  Users,
  Search,
  Pencil,
  Trash2,
  Check,
  X,
  ChevronDown,
  Loader2,
  RefreshCw
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  getUsers,
  updateUser,
  deleteUser,
  getUserStatistics,
  User,
  UserRole,
  TeacherType
} from "@/lib/api/users";

type FilterRole = UserRole | "all" | "office_member";

const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  admin: { bg: "bg-red-500/20", text: "text-red-400" },
  head: { bg: "bg-orange-500/20", text: "text-orange-400" },
  teacher: { bg: "bg-blue-500/20", text: "text-blue-400" },
  office_member: { bg: "bg-green-500/20", text: "text-green-400" },
  student: { bg: "bg-purple-500/20", text: "text-purple-400" },
};

const TEACHER_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  LT: { bg: "bg-cyan-500/20", text: "text-cyan-400" },
  IT: { bg: "bg-violet-500/20", text: "text-violet-400" },
  KCFS: { bg: "bg-amber-500/20", text: "text-amber-400" },
};

export default function UserManagementPage() {
  const { user } = useAuth();
  const userId = user?.id;
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRole, setFilterRole] = useState<FilterRole>("all");
  const [showRoleDropdown, setShowRoleDropdown] = useState(false);
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{
    role: string;
    teacher_type: TeacherType | null;
    grade: number | null;
    grade_band: string | null;
    track: string | null;
  } | null>(null);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState<{
    total: number;
    byRole: Record<string, number>;
    byTeacherType: Record<string, number>;
  } | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [usersData, statsData] = await Promise.all([
        getUsers(),
        getUserStatistics()
      ]);
      setUsers(usersData);
      setFilteredUsers(usersData);
      setStats(statsData);
    } catch (error) {
      console.error("Failed to fetch users:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Wait for user to be available
    if (!userId) {
      return;
    }
    fetchData();
  }, [userId, fetchData]);

  useEffect(() => {
    let result = users;

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (user) =>
          user.full_name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query)
      );
    }

    // Filter by role
    if (filterRole !== "all") {
      result = result.filter((user) => user.role === filterRole);
    }

    setFilteredUsers(result);
  }, [users, searchQuery, filterRole]);

  const handleStartEdit = (user: User) => {
    setEditingUser(user.id);
    setEditForm({
      role: user.role,
      teacher_type: user.teacher_type,
      grade: user.grade,
      grade_band: (user as { grade_band?: string | null }).grade_band || null,
      track: (user as { track?: string | null }).track || null
    });
  };

  const handleCancelEdit = () => {
    setEditingUser(null);
    setEditForm(null);
  };

  const handleSaveEdit = async (userId: string) => {
    if (!editForm) return;

    setSaving(true);
    try {
      // Enforce constraint: teacher_type must be NULL when role != 'teacher'
      const teacherType = editForm.role === 'teacher' ? editForm.teacher_type : null;

      await updateUser(userId, {
        role: editForm.role as UserRole,
        teacher_type: teacherType,
        grade: editForm.grade,
        grade_band: editForm.grade_band,
        track: editForm.track as "LT" | "IT" | "KCFS" | null
      });
      await fetchData();
      setEditingUser(null);
      setEditForm(null);
    } catch (error) {
      console.error("Failed to update user:", error);
      alert("Failed to update user. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (userId: string, userName: string) => {
    if (!confirm(`Are you sure you want to deactivate ${userName}? This action can be undone by an administrator.`)) {
      return;
    }

    try {
      await deleteUser(userId);
      await fetchData();
    } catch (error) {
      console.error("Failed to delete user:", error);
      alert("Failed to deactivate user. Please try again.");
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <AuthGuard requiredRoles={["admin"]}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-500/20 rounded-lg">
              <Users className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-text-primary">User Management</h1>
              <p className="text-sm text-text-secondary">
                Manage system users and their roles
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="border-border-default text-text-secondary hover:text-text-primary"
            onClick={fetchData}
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-5 gap-4">
            <div className="bg-surface-secondary rounded-xl border border-border-default p-4 shadow-sm">
              <div className="text-2xl font-bold text-text-primary">{stats.total}</div>
              <div className="text-xs text-text-tertiary">Total Users</div>
            </div>
            <div className="bg-surface-secondary rounded-xl border border-border-default p-4 shadow-sm">
              <div className="text-2xl font-bold text-red-500 dark:text-red-400">
                {stats.byRole.admin || 0}
              </div>
              <div className="text-xs text-text-tertiary">Admins</div>
            </div>
            <div className="bg-surface-secondary rounded-xl border border-border-default p-4 shadow-sm">
              <div className="text-2xl font-bold text-orange-500 dark:text-orange-400">
                {stats.byRole.head || 0}
              </div>
              <div className="text-xs text-text-tertiary">Head Teachers</div>
            </div>
            <div className="bg-surface-secondary rounded-xl border border-border-default p-4 shadow-sm">
              <div className="text-2xl font-bold text-blue-500 dark:text-blue-400">
                {stats.byRole.teacher || 0}
              </div>
              <div className="text-xs text-text-tertiary">Teachers</div>
            </div>
            <div className="bg-surface-secondary rounded-xl border border-border-default p-4 shadow-sm">
              <div className="flex gap-2 text-lg font-bold">
                <span className="text-cyan-500 dark:text-cyan-400">{stats.byTeacherType.LT || 0}</span>
                <span className="text-text-tertiary">/</span>
                <span className="text-violet-500 dark:text-violet-400">{stats.byTeacherType.IT || 0}</span>
                <span className="text-text-tertiary">/</span>
                <span className="text-amber-500 dark:text-amber-400">{stats.byTeacherType.KCFS || 0}</span>
              </div>
              <div className="text-xs text-text-tertiary">LT / IT / KCFS</div>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="flex gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-tertiary" />
            <Input
              placeholder="Search users by name or email..."
              className="pl-10 bg-surface-secondary border-border-default text-text-primary placeholder:text-text-tertiary"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="relative">
            <Button
              variant="outline"
              className="border-border-default text-text-secondary min-w-[150px] justify-between hover:text-text-primary"
              onClick={() => setShowRoleDropdown(!showRoleDropdown)}
            >
              {filterRole === "all" ? "All Roles" : filterRole.replace("_", " ")}
              <ChevronDown className="w-4 h-4 ml-2" />
            </Button>
            {showRoleDropdown && (
              <div className="absolute top-full mt-1 right-0 w-48 bg-surface-elevated border border-border-default rounded-lg shadow-lg z-50">
                {["all", "admin", "head", "teacher", "office_member"].map((role) => (
                  <button
                    key={role}
                    className="w-full px-4 py-2 text-left text-sm text-text-secondary hover:bg-surface-hover first:rounded-t-lg last:rounded-b-lg"
                    onClick={() => {
                      setFilterRole(role as FilterRole);
                      setShowRoleDropdown(false);
                    }}
                  >
                    {role === "all" ? "All Roles" : role.replace("_", " ")}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* User Table */}
        <div className="bg-surface-secondary rounded-xl border border-border-default overflow-hidden shadow-sm">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border-default">
                <th className="text-left p-4 text-sm font-medium text-text-secondary">
                  User
                </th>
                <th className="text-left p-4 text-sm font-medium text-text-secondary">
                  Email
                </th>
                <th className="text-left p-4 text-sm font-medium text-text-secondary">
                  Role
                </th>
                <th className="text-left p-4 text-sm font-medium text-text-secondary">
                  Teacher Type
                </th>
                <th className="text-left p-4 text-sm font-medium text-text-secondary">
                  Grade Band
                </th>
                <th className="text-right p-4 text-sm font-medium text-text-secondary">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-text-tertiary" />
                    <p className="text-text-tertiary mt-2">Loading users...</p>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-text-tertiary">
                    {searchQuery || filterRole !== "all"
                      ? "No users match your search criteria."
                      : "No users found in the system."}
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-border-subtle hover:bg-surface-hover"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center font-medium ${
                            ROLE_COLORS[user.role]?.bg || "bg-slate-500/20"
                          } ${ROLE_COLORS[user.role]?.text || "text-slate-400"}`}
                        >
                          {getInitials(user.full_name)}
                        </div>
                        <span className="text-text-primary">{user.full_name}</span>
                      </div>
                    </td>
                    <td className="p-4 text-text-secondary">{user.email}</td>
                    <td className="p-4">
                      {editingUser === user.id ? (
                        <select
                          className="bg-surface-tertiary border border-border-default rounded px-2 py-1 text-text-primary text-sm"
                          value={editForm?.role || ""}
                          onChange={(e) =>
                            setEditForm((prev) =>
                              prev ? { ...prev, role: e.target.value } : null
                            )
                          }
                        >
                          <option value="admin">admin</option>
                          <option value="head">head</option>
                          <option value="teacher">teacher</option>
                          <option value="office_member">office_member</option>
                        </select>
                      ) : (
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            ROLE_COLORS[user.role]?.bg || "bg-slate-500/20"
                          } ${ROLE_COLORS[user.role]?.text || "text-slate-400"}`}
                        >
                          {user.role}
                        </span>
                      )}
                    </td>
                    <td className="p-4">
                      {editingUser === user.id ? (
                        <select
                          className="bg-surface-tertiary border border-border-default rounded px-2 py-1 text-text-primary text-sm"
                          value={editForm?.teacher_type || ""}
                          onChange={(e) =>
                            setEditForm((prev) =>
                              prev
                                ? {
                                    ...prev,
                                    teacher_type: e.target.value as TeacherType || null
                                  }
                                : null
                            )
                          }
                        >
                          <option value="">None</option>
                          <option value="LT">LT</option>
                          <option value="IT">IT</option>
                          <option value="KCFS">KCFS</option>
                        </select>
                      ) : user.teacher_type ? (
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            TEACHER_TYPE_COLORS[user.teacher_type]?.bg ||
                            "bg-slate-500/20"
                          } ${
                            TEACHER_TYPE_COLORS[user.teacher_type]?.text ||
                            "text-slate-400"
                          }`}
                        >
                          {user.teacher_type}
                        </span>
                      ) : (
                        <span className="text-text-tertiary">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      {editingUser === user.id ? (
                        <select
                          className="bg-surface-tertiary border border-border-default rounded px-2 py-1 text-text-primary text-sm"
                          value={
                            editForm?.grade_band && editForm?.track
                              ? `${editForm.grade_band}|${editForm.track}`
                              : ""
                          }
                          onChange={(e) => {
                            const value = e.target.value;
                            if (!value) {
                              setEditForm((prev) =>
                                prev ? { ...prev, grade_band: null, track: null, grade: null } : null
                              );
                            } else {
                              const parts = value.split("|");
                              const gradeBand = parts[0] || null;
                              const track = parts[1] || null;
                              setEditForm((prev) =>
                                prev
                                  ? {
                                      ...prev,
                                      grade_band: gradeBand,
                                      track: track,
                                      // Set grade for backwards compatibility
                                      grade: gradeBand && !gradeBand.includes("-")
                                        ? parseInt(gradeBand)
                                        : null
                                    }
                                  : null
                              );
                            }
                          }}
                        >
                          <option value="">None</option>
                          <optgroup label="LT Head Teachers">
                            <option value="1|LT">G1 LT</option>
                            <option value="2|LT">G2 LT</option>
                            <option value="3-4|LT">G3-4 LT</option>
                            <option value="5-6|LT">G5-6 LT</option>
                          </optgroup>
                          <optgroup label="IT Head Teachers">
                            <option value="1-2|IT">G1-2 IT</option>
                            <option value="3-4|IT">G3-4 IT</option>
                            <option value="5-6|IT">G5-6 IT</option>
                          </optgroup>
                          <optgroup label="KCFS Head Teacher">
                            <option value="1-6|KCFS">G1-6 KCFS (All)</option>
                          </optgroup>
                        </select>
                      ) : (user as { grade_band?: string | null }).grade_band ? (
                        <span className="text-text-secondary">
                          G{(user as { grade_band?: string | null }).grade_band}
                          {(user as { track?: string | null }).track && (
                            <span className="ml-1 text-text-tertiary">
                              {(user as { track?: string | null }).track}
                            </span>
                          )}
                        </span>
                      ) : user.grade ? (
                        <span className="text-text-secondary">G{user.grade}</span>
                      ) : (
                        <span className="text-text-tertiary">-</span>
                      )}
                    </td>
                    <td className="p-4 text-right">
                      {editingUser === user.id ? (
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-green-400 hover:text-green-300 hover:bg-green-500/10"
                            onClick={() => handleSaveEdit(user.id)}
                            disabled={saving}
                          >
                            {saving ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <Check className="w-4 h-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            onClick={handleCancelEdit}
                            disabled={saving}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-text-tertiary hover:text-text-primary hover:bg-surface-hover"
                            onClick={() => handleStartEdit(user)}
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-text-tertiary hover:text-red-500 dark:hover:text-red-400 hover:bg-red-500/10"
                            onClick={() => handleDelete(user.id, user.full_name)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Info */}
        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4">
          <h3 className="text-blue-600 dark:text-blue-400 font-medium mb-2">User Management Notes</h3>
          <ul className="text-text-secondary text-sm space-y-1">
            <li>• Users are synced from Info Hub SSO when they first log in</li>
            <li>• Role changes take effect on the user&apos;s next login</li>
            <li>• Deleting a user marks them as inactive (soft delete)</li>
            <li>• Head Teachers need a grade assignment to manage their grade level</li>
          </ul>
        </div>
      </div>
    </AuthGuard>
  );
}

"use client";

import { useAuth } from "@/lib/supabase/auth-context";

/**
 * 標準 Auth 狀態 Hook
 *
 * 解決問題：
 * 1. 將 user object 轉為穩定的 userId primitive
 * 2. 提供簡單的 isReady 判斷
 * 3. 避免 useEffect 依賴 object 參照變化
 *
 * 使用方式：
 * ```typescript
 * const { userId, isReady, role } = useAuthReady();
 *
 * useEffect(() => {
 *   if (!isReady) return;
 *   // fetch data...
 * }, [userId]);
 * ```
 *
 * ⚠️ 重要：永遠使用這個 hook，不要直接使用 useAuth()
 *
 * ❌ 錯誤模式（會導致無限迴圈）：
 * ```typescript
 * const { user, loading } = useAuth();
 * useEffect(() => {
 *   if (loading || !user) return;
 *   fetchData();
 * }, [user]); // user 是物件，每次都是新參照
 * ```
 *
 * ✅ 正確模式：
 * ```typescript
 * const { userId, isReady } = useAuthReady();
 * useEffect(() => {
 *   if (!isReady) return;
 *   fetchData();
 * }, [userId]); // userId 是 primitive string，穩定
 * ```
 */
export function useAuthReady() {
  const { user, userPermissions, loading, signOut, refreshPermissions } = useAuth();

  // 提取穩定的 primitive 值
  const userId = user?.id ?? null;
  const role = userPermissions?.role ?? null;

  // 判斷是否準備好（用戶已登入且權限已載入）
  const isReady = !loading && !!userId && !!userPermissions;

  return {
    // Primitive 值（穩定，適合放入 useEffect 依賴）
    userId,
    role,

    // Boolean 判斷
    isReady,
    isLoading: loading,
    isAuthenticated: !!userId,

    // 完整權限物件（需要時使用）
    permissions: userPermissions,

    // 常用權限欄位（primitive 值）
    grade: userPermissions?.grade ?? null,
    track: userPermissions?.track ?? null,
    teacherType: userPermissions?.teacher_type ?? null,
    fullName: userPermissions?.full_name ?? null,

    // 原始 useAuth 的方法（透傳）
    signOut,
    refreshPermissions,
  };
}

import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, getQueryFn, queryClient, STALE_TIMES } from "@/lib/queryClient";
import type { User } from "@shared/schema";
import { AdminPermission, type AdminPermission as AdminPermissionType } from "@shared/types";

function getAdminPermissions(user: User | null): AdminPermissionType[] {
  if (!user) return [];
  if (user.role === "admin") {
    return [
      AdminPermission.DIRECTORY,
      AdminPermission.CONTENT,
      AdminPermission.DESIGN,
      AdminPermission.CRM,
    ];
  }

  if (user.role !== "editor" || !Array.isArray(user.adminPermissions)) {
    return [];
  }

  return user.adminPermissions.filter(
    (permission): permission is AdminPermissionType =>
      permission === AdminPermission.DIRECTORY ||
      permission === AdminPermission.CONTENT ||
      permission === AdminPermission.DESIGN ||
      permission === AdminPermission.CRM,
  );
}

export function useAuth() {
  const { data: user, isLoading } = useQuery<User | null>({
    queryKey: ["/api/auth/me"],
    queryFn: getQueryFn({ on401: "returnNull" }),
    staleTime: STALE_TIMES.SESSION,
    refetchOnWindowFocus: true,
  });

  const login = useMutation({
    mutationFn: async (credentials: { email: string; password: string }) => {
      const res = await apiRequest("POST", "/api/auth/login", credentials);
      return (await res.json()) as User;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/auth/me"], data);
    },
  });

  const register = useMutation({
    mutationFn: async (data: {
      firstName: string;
      lastName: string;
      email: string;
      password: string;
      role: string;
      specializations?: string[];
    }) => {
      const res = await apiRequest("POST", "/api/auth/register", data);
      return (await res.json()) as User;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/auth/me"], data);
    },
  });

  const logout = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/auth/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/auth/me"], null);
    },
  });

  return {
    user: user ?? null,
    isLoading,
    login,
    register,
    logout,
    isAdmin: user?.role === "admin",
    isEditor: user?.role === "editor",
    isTherapist: user?.role === "therapist",
    adminPermissions: getAdminPermissions(user ?? null),
    hasAdminPermission: (permission: AdminPermissionType) =>
      getAdminPermissions(user ?? null).includes(permission),
  };
}

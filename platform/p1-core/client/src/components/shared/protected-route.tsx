import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";
import { LoadingSpinner } from "./loading-spinner";
import type { AdminPermission } from "@shared/types";

interface ProtectedRouteProps {
  children: React.ReactNode;
  roles?: string[];
  adminPermissions?: AdminPermission[];
}

export function ProtectedRoute({ children, roles, adminPermissions }: ProtectedRouteProps) {
  const { user, isLoading, hasAdminPermission } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen" data-testid="loading-auth">
        <LoadingSpinner />
      </div>
    );
  }

  if (!user) {
    return <Redirect to="/admin/login" />;
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-screen gap-4"
        data-testid="forbidden-page"
      >
        <h1 className="text-2xl font-bold">403 - Forbidden</h1>
        <p className="text-muted-foreground">You do not have permission to access this page.</p>
      </div>
    );
  }

  if (adminPermissions && adminPermissions.length > 0) {
    const allowed =
      user.role === "admin" ||
      (user.role === "editor" &&
        adminPermissions.some((permission) => hasAdminPermission(permission)));
    if (!allowed) {
      return (
        <div
          className="flex flex-col items-center justify-center min-h-screen gap-4"
          data-testid="forbidden-page"
        >
          <h1 className="text-2xl font-bold">403 - Forbidden</h1>
          <p className="text-muted-foreground">You do not have permission to access this page.</p>
        </div>
      );
    }
  }

  return <>{children}</>;
}

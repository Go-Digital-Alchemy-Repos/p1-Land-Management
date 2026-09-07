import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";

export function useUnreadNotificationCount() {
  const { user } = useAuth();
  const { data } = useQuery<{ count: number }>({
    queryKey: ["/api/notifications/unread-count"],
    enabled: !!user,
    refetchInterval: 30000,
  });
  return data?.count ?? 0;
}

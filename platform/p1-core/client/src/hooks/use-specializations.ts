import { useQuery } from "@tanstack/react-query";
import { STALE_TIMES } from "@/lib/queryClient";

type Specialization = { id: number; name: string; sortOrder: number };

export function useSpecializations() {
  const { data, isLoading } = useQuery<Specialization[]>({
    queryKey: ["/api/specializations"],
    staleTime: STALE_TIMES.STATIC,
  });
  return { specializations: data ?? [], isLoading };
}

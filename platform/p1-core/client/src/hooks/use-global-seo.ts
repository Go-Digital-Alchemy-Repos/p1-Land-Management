import { STALE_TIMES } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import type { SeoSettings } from "@shared/schema";

export function useGlobalSeo() {
  return useQuery<SeoSettings>({
    queryKey: ["/api/seo/global"],
    staleTime: STALE_TIMES.CONTENT,
  });
}

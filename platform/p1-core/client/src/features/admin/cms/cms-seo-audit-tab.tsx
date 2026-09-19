import { STALE_TIMES } from "@/lib/queryClient";
import { useQuery } from "@tanstack/react-query";
import { SeoAuditPresentation, type AuditData } from "@/components/shared/seo-audit-presentation";
export function CmsSeoAuditTab() {
  const { data, isLoading, error } = useQuery<AuditData>({
    queryKey: ["/api/admin/cms/seo-audit"],
    staleTime: STALE_TIMES.OPERATIONAL,
  });
  return (
    <SeoAuditPresentation
      data={data}
      isLoading={isLoading}
      error={error}
      routes={{
        edit: (kind, item) =>
          kind === "page"
            ? `/admin/cms/pages/${item.id}`
            : kind === "post"
              ? `/admin/cms/blog/${item.id}`
              : `/admin/events/${item.id}`,
        preview: (kind, item) =>
          kind === "page"
            ? item.slug && item.status === "published"
              ? `/${item.slug}`
              : undefined
            : kind === "post"
              ? item.slug && item.isPublished
                ? `/insights/${item.slug}`
                : undefined
              : item.status !== "draft"
                ? `/events/${item.slug || item.id}`
                : undefined,
      }}
    />
  );
}

import { STALE_TIMES } from "@/lib/queryClient";
import { useMemo } from "react";
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import type { CmsPage, SeoSettings } from "@shared/schema";
import { Loader2 } from "lucide-react";
import { CmsPageView } from "@/features/public/cms-hybrid-page";

function CmsPreviewLoading() {
  return (
    <div
      className="min-h-screen flex items-center justify-center"
      data-testid="cms-preview-loading"
    >
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}

function CmsPreviewError() {
  return (
    <div
      className="min-h-screen flex items-center justify-center px-6 text-center"
      data-testid="cms-preview-error"
    >
      <div className="max-w-md space-y-3">
        <h1 className="text-2xl font-heading font-semibold">Preview unavailable</h1>
        <p className="text-muted-foreground">
          This preview link is invalid, expired, or no longer matches the latest saved version of
          the page.
        </p>
      </div>
    </div>
  );
}

export default function CmsPreviewPage() {
  const params = useParams<{ id: string }>();
  const token = useMemo(() => new URLSearchParams(window.location.search).get("token") ?? "", []);

  const {
    data: page,
    isLoading,
    isError,
  } = useQuery<CmsPage>({
    queryKey: ["/api/cms/pages/preview", params?.id, token],
    queryFn: async () => {
      const res = await fetch(
        `/api/cms/pages/preview/${params?.id}?token=${encodeURIComponent(token)}`,
        {
          credentials: "include",
        },
      );
      if (!res.ok) throw new Error("Preview unavailable");
      return res.json();
    },
    enabled: Boolean(params?.id && token),
    retry: false,
  });

  const { data: globalSeo } = useQuery<SeoSettings>({
    queryKey: ["/api/seo/global"],
    staleTime: STALE_TIMES.CONTENT,
  });

  if (!params?.id || !token) return <CmsPreviewError />;
  if (isLoading) return <CmsPreviewLoading />;
  if (isError || !page) return <CmsPreviewError />;

  return <CmsPageView page={page} globalSeo={globalSeo} previewLabel="Draft Preview Mode" />;
}

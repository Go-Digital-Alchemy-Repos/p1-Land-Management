import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrandingProvider } from "@/components/shared/branding-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { getQueryFn } from "@/lib/queryClient";
import { BuilderPreviewReceiver } from "./builder-preview-receiver";
import { createBuilderPreviewFetch } from "./preview-fetch";
import { createBuilderPreviewMessage, isBuilderPreviewOrigin } from "@shared/cms-builder/preview";

export function mountBuilderPreview(root: HTMLElement) {
  const parentOrigin =
    document.querySelector<HTMLMetaElement>('meta[name="p1-builder-preview-origin"]')?.content ||
    "";
  const channel = new URLSearchParams(window.location.hash.slice(1)).get("channel") || "";
  try {
    if (!isBuilderPreviewOrigin(parentOrigin) || window.parent === window) throw new Error();
    createBuilderPreviewMessage(channel, 0, []);
  } catch {
    root.textContent = "Open this preview from the Business Center editor.";
    return;
  }
  // This document has no App, setup guard, auth provider, consent manager or
  // tracking initialization. Restrict even explicit renderer fetch calls before
  // any component mounts. The override lasts only for this isolated document.
  window.fetch = createBuilderPreviewFetch(window.location.origin, window.fetch.bind(window));
  const client = new QueryClient({
    defaultOptions: {
      queries: {
        queryFn: getQueryFn({ on401: "throw" }),
        retry: false,
        refetchOnWindowFocus: false,
        staleTime: 60_000,
      },
    },
  });
  document.documentElement.classList.remove("admin-mode", "dark");
  document.title = "Website draft preview";
  createRoot(root).render(
    <QueryClientProvider client={client}>
      <BrandingProvider>
        <TooltipProvider>
          <BuilderPreviewReceiver parentOrigin={parentOrigin} channel={channel} />
        </TooltipProvider>
      </BrandingProvider>
    </QueryClientProvider>,
  );
}

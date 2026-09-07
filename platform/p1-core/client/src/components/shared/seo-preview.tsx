import { Globe, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SeoPreviewProps {
  title: string;
  description: string;
  url: string;
  ogImage?: string;
  siteName?: string;
  className?: string;
  source?: "page" | "post" | "global";
}

function TitleMeter({ value }: { value: string }) {
  const len = value.length;
  if (len === 0) return null;
  const status = len < 20 ? "short" : len <= 60 ? "ok" : len <= 70 ? "long" : "too-long";
  const colors = {
    short: "text-amber-500",
    ok: "text-emerald-600 dark:text-emerald-400",
    long: "text-amber-500",
    "too-long": "text-red-500",
  };
  const labels = {
    short: "too short",
    ok: "good length",
    long: "a bit long",
    "too-long": "too long — may be truncated",
  };
  return (
    <span className={`text-[10px] ${colors[status]}`}>
      {len}/60 — {labels[status]}
    </span>
  );
}

function DescMeter({ value }: { value: string }) {
  const len = value.length;
  if (len === 0) return null;
  const status = len < 70 ? "short" : len <= 160 ? "ok" : "too-long";
  const colors = {
    short: "text-amber-500",
    ok: "text-emerald-600 dark:text-emerald-400",
    "too-long": "text-red-500",
  };
  const labels = {
    short: "short — aim for 120–160 chars",
    ok: "good length",
    "too-long": "too long — will be truncated",
  };
  return (
    <span className={`text-[10px] ${colors[status]}`}>
      {len}/160 — {labels[status]}
    </span>
  );
}

export function SeoPreview({
  title,
  description,
  url,
  ogImage,
  siteName = "Core Platform",
  className,
  source,
}: SeoPreviewProps) {
  const hasTitle = title.trim().length > 0;
  const hasDescription = description.trim().length > 0;
  const hasImage = ogImage && ogImage.trim().length > 0;

  const displayTitle = hasTitle ? title : "(No title set)";
  const displayDesc = hasDescription ? description : "(No description set)";
  const truncatedDesc = displayDesc.length > 160 ? displayDesc.slice(0, 157) + "…" : displayDesc;
  const truncatedTitle = displayTitle.length > 60 ? displayTitle.slice(0, 57) + "…" : displayTitle;

  const missingFields = [
    !hasTitle && "SEO title",
    !hasDescription && "meta description",
    !hasImage && "social image",
  ].filter(Boolean);

  return (
    <div className={cn("space-y-3", className)}>
      {source && (
        <p className="text-[11px] text-muted-foreground">
          {source === "global"
            ? "Using global SEO defaults — add page-specific values above to override"
            : source === "page"
              ? "Preview based on page SEO fields"
              : "Preview based on post SEO fields"}
        </p>
      )}

      {missingFields.length > 0 && (
        <div className="flex items-start gap-2 rounded-md border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 text-xs text-amber-700 dark:text-amber-400">
          <AlertCircle className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          <span>
            Missing: <strong>{missingFields.join(", ")}</strong>. Fallbacks from the page title and
            global defaults will be used.
          </span>
        </div>
      )}

      <div className="rounded-lg border bg-white dark:bg-zinc-900 p-4 space-y-3 text-sm shadow-sm">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Google Search Preview
        </p>
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs text-muted-foreground truncate">{url}</span>
          </div>
          <p
            className={cn(
              "text-[15px] font-medium leading-snug",
              hasTitle ? "text-blue-600 dark:text-blue-400" : "text-muted-foreground italic",
            )}
          >
            {truncatedTitle}
          </p>
          <div className="flex items-center justify-between mt-0.5">
            <TitleMeter value={title} />
          </div>
          <p
            className={cn(
              "text-xs mt-1 leading-relaxed line-clamp-2",
              hasDescription ? "text-muted-foreground" : "text-muted-foreground italic",
            )}
          >
            {truncatedDesc}
          </p>
          <div className="flex items-center justify-between mt-0.5">
            <DescMeter value={description} />
          </div>
        </div>
      </div>

      <div className="rounded-lg border overflow-hidden bg-white dark:bg-zinc-900 shadow-sm">
        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-4 pt-3 pb-2">
          Social / OG Preview
        </p>
        {hasImage ? (
          <div className="aspect-[1200/630] bg-muted overflow-hidden">
            <img
              src={ogImage}
              alt="OG preview"
              className="w-full h-full object-cover"
              data-testid="img-seo-og-preview"
            />
          </div>
        ) : (
          <div className="aspect-[1200/630] bg-muted flex flex-col items-center justify-center gap-1 text-xs text-muted-foreground">
            <AlertCircle className="h-4 w-4 opacity-40" />
            <span>No social image set — global default will be used</span>
          </div>
        )}
        <div className="px-4 py-3 border-t">
          <p className="text-[11px] uppercase text-muted-foreground mb-0.5">{siteName}</p>
          <p
            className={cn(
              "text-sm font-medium leading-snug line-clamp-1",
              !hasTitle && "text-muted-foreground italic",
            )}
          >
            {truncatedTitle}
          </p>
          <p
            className={cn(
              "text-xs mt-0.5 line-clamp-2",
              !hasDescription ? "text-muted-foreground italic" : "text-muted-foreground",
            )}
          >
            {truncatedDesc}
          </p>
        </div>
      </div>
    </div>
  );
}

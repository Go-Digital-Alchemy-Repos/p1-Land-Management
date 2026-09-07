import { CheckCircle2, Circle, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type ContentType = "page" | "post" | "event";

interface SchemaCheck {
  type: string;
  label: string;
  applies: boolean;
  condition?: string;
  missingFields?: string[];
}

interface StructuredDataStatusProps {
  contentType: ContentType;
  fields: {
    hasTitle?: boolean;
    hasDescription?: boolean;
    hasImage?: boolean;
    hasAuthor?: boolean;
    hasDate?: boolean;
    hasLocation?: boolean;
    hasRecordingUrl?: boolean;
    hasFaqBlocks?: boolean;
    isPublished?: boolean;
    noindex?: boolean;
  };
  className?: string;
}

function buildChecks(
  contentType: ContentType,
  fields: StructuredDataStatusProps["fields"],
): SchemaCheck[] {
  const checks: SchemaCheck[] = [];

  checks.push({
    type: "Organization",
    label: "Organization",
    applies: true,
    missingFields: [],
  });

  checks.push({
    type: "WebSite",
    label: "WebSite",
    applies: true,
    missingFields: [],
  });

  const breadcrumbMissing: string[] = [];
  if (!fields.hasTitle) breadcrumbMissing.push("title");
  checks.push({
    type: "BreadcrumbList",
    label: "BreadcrumbList",
    applies: true,
    missingFields: breadcrumbMissing,
  });

  if (contentType === "post") {
    const missing: string[] = [];
    if (!fields.hasTitle) missing.push("title");
    if (!fields.hasDescription) missing.push("meta description");
    if (!fields.hasImage) missing.push("cover/OG image");
    if (!fields.hasAuthor) missing.push("author name");
    if (!fields.hasDate) missing.push("publish date");
    checks.push({
      type: "Article",
      label: "Article",
      applies: true,
      missingFields: missing,
    });
  }

  if (contentType === "event") {
    const missing: string[] = [];
    if (!fields.hasTitle) missing.push("title");
    if (!fields.hasDescription) missing.push("description");
    if (!fields.hasDate) missing.push("event date");
    checks.push({
      type: "Event",
      label: "Event",
      applies: true,
      missingFields: missing,
    });

    checks.push({
      type: "VideoObject",
      label: "VideoObject",
      applies: !!fields.hasRecordingUrl,
      condition: fields.hasRecordingUrl ? undefined : "Only emitted when a recording URL is set",
      missingFields: fields.hasRecordingUrl ? [] : [],
    });
  }

  if (contentType === "page") {
    checks.push({
      type: "FAQPage",
      label: "FAQPage",
      applies: !!fields.hasFaqBlocks,
      condition: fields.hasFaqBlocks
        ? undefined
        : "Only emitted when the page contains a FAQ block",
      missingFields: [],
    });
  }

  return checks;
}

function SchemaRow({ check }: { check: SchemaCheck }) {
  const hasIssues = (check.missingFields?.length ?? 0) > 0;
  const isConditionallyOff = !check.applies;

  return (
    <div className="flex items-start gap-2 py-1.5">
      <div className="mt-0.5 flex-shrink-0">
        {isConditionallyOff ? (
          <Circle className="h-3.5 w-3.5 text-muted-foreground/40" />
        ) : hasIssues ? (
          <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
        ) : (
          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
        )}
      </div>
      <div className="min-w-0">
        <span
          className={cn(
            "text-xs font-medium",
            isConditionallyOff ? "text-muted-foreground/60" : "text-foreground",
          )}
        >
          {check.label}
        </span>
        {check.condition && (
          <span className="text-[10px] text-muted-foreground ml-1.5">— {check.condition}</span>
        )}
        {hasIssues && !isConditionallyOff && (
          <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">
            Incomplete: missing {check.missingFields!.join(", ")}
          </p>
        )}
      </div>
    </div>
  );
}

export function StructuredDataStatus({
  contentType,
  fields,
  className,
}: StructuredDataStatusProps) {
  const checks = buildChecks(contentType, fields);
  const activeChecks = checks.filter((c) => c.applies);
  const hasIssues = activeChecks.some((c) => (c.missingFields?.length ?? 0) > 0);

  const noindexWarning = fields.noindex;
  const unpublishedWarning = contentType !== "event" && fields.isPublished === false;

  return (
    <div className={cn("rounded-lg border bg-muted/30 p-4", className)}>
      <div className="flex items-center gap-2 mb-3">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Structured Data (JSON-LD)
        </p>
        {!hasIssues && !noindexWarning ? (
          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-1.5 py-0.5 rounded">
            <CheckCircle2 className="h-2.5 w-2.5" />
            Ready
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded">
            <AlertCircle className="h-2.5 w-2.5" />
            Incomplete
          </span>
        )}
      </div>

      <div className="space-y-0.5">
        {checks.map((check) => (
          <SchemaRow key={check.type} check={check} />
        ))}
      </div>

      {noindexWarning && (
        <div className="mt-3 flex items-start gap-1.5 text-[10px] text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded px-2 py-1.5">
          <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
          <span>
            <strong>Noindex is on.</strong> Search engines won't crawl this content, and structured
            data won't contribute to rich results.
          </span>
        </div>
      )}

      {unpublishedWarning && (
        <div className="mt-3 flex items-start gap-1.5 text-[10px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/20 rounded px-2 py-1.5">
          <AlertCircle className="h-3 w-3 mt-0.5 flex-shrink-0" />
          <span>
            Content is not yet published. Structured data won't be active until published.
          </span>
        </div>
      )}
    </div>
  );
}

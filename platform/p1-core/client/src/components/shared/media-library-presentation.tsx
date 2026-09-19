import React, { type ReactNode } from "react";
import { Image, FileText, CheckCircle2, Circle } from "lucide-react";

export interface MediaDisplayAsset {
  id: string;
  originalName: string;
  url: string;
  mimeType: string;
  fileSize: number;
  title?: string | null;
  alt?: string | null;
  createdAt?: string | Date | null;
  assetKind?: "image" | "document";
  isInUse?: boolean;
  usageCount?: number;
  liveUsageCount?: number;
  usageRefs?: Array<{
    entityType: string;
    entityId: string;
    entityName: string;
    field: string;
    statusLabel: string;
    path?: string | null;
    isLive: boolean;
  }>;
}
export const mediaIsImage = (asset: MediaDisplayAsset) =>
  asset.assetKind === "image" || (!asset.assetKind && asset.mimeType.startsWith("image/"));
export function formatMediaBytes(bytes: number) {
  return bytes < 1024
    ? `${bytes} B`
    : bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(1)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
export const MEDIA_METADATA_FIELDS = [
  {
    key: "originalName",
    id: "media-original-name",
    label: "File Name",
    placeholder: "hero-image.webp",
    max: 255,
    rows: 0,
    wide: false,
    help: "Updates the library label without changing the current file URL.",
  },
  {
    key: "title",
    id: "media-title",
    label: "Title",
    placeholder: "Human-friendly media title",
    max: 255,
    rows: 0,
    wide: false,
  },
  {
    key: "alt",
    id: "media-alt",
    label: "Alt Text",
    placeholder: "Describe the image for accessibility and SEO",
    max: 255,
    rows: 0,
    wide: true,
  },
  {
    key: "caption",
    id: "media-caption",
    label: "Caption",
    placeholder: "Optional caption shown alongside the image",
    max: 500,
    rows: 2,
    wide: true,
  },
  {
    key: "description",
    id: "media-description",
    label: "Description",
    placeholder: "Internal notes or fuller editorial context",
    max: 2000,
    rows: 3,
    wide: true,
  },
  {
    key: "seoTitle",
    id: "media-seo-title",
    label: "SEO Title",
    placeholder: "Search-friendly image title",
    max: 255,
    rows: 0,
    wide: false,
  },
  {
    key: "ogTitle",
    id: "media-og-title",
    label: "Open Graph Title",
    placeholder: "Social sharing title",
    max: 255,
    rows: 0,
    wide: false,
  },
  {
    key: "seoDescription",
    id: "media-seo-description",
    label: "SEO Description",
    placeholder: "Short metadata description for search contexts",
    max: 320,
    rows: 3,
    wide: false,
  },
  {
    key: "ogDescription",
    id: "media-og-description",
    label: "Open Graph Description",
    placeholder: "Short description for social previews",
    max: 320,
    rows: 3,
    wide: false,
  },
] as const;
export type MediaMetadataField = (typeof MEDIA_METADATA_FIELDS)[number];

/** Original Media Library gallery, shared while hosts retain fetching/filter controls. */
export function MediaLibraryGallery({
  assets,
  visible,
  loading,
  filtered,
  filters,
  uploadButton,
  onOpen,
  source = (asset) => asset.url,
  acceptAsset,
  selectedIds = [],
  showTitle = true,
}: {
  assets: MediaDisplayAsset[];
  visible: MediaDisplayAsset[];
  loading: boolean;
  filtered: boolean;
  filters: ReactNode;
  uploadButton: ReactNode;
  onOpen: (id: string) => void;
  source?: (asset: MediaDisplayAsset) => string;
  acceptAsset?: (asset: MediaDisplayAsset) => boolean;
  selectedIds?: string[];
  showTitle?: boolean;
}) {
  return (
    <div className="media-library-gallery space-y-6">
      <div className="media-library-heading flex items-center justify-between flex-wrap gap-3">
        <div>
          {showTitle && (
            <h1 className="text-2xl font-heading font-semibold" data-testid="text-media-title">
              Media Library
            </h1>
          )}
          <p className="media-library-summary text-muted-foreground mt-1">
            {assets.length} media item{assets.length !== 1 ? "s" : ""} uploaded ·{" "}
            {assets.filter((a) => a.isInUse).length} live ·{" "}
            {assets.filter((a) => !a.isInUse && (a.usageCount || 0) > 0).length} draft-only ·{" "}
            {assets.filter((a) => !a.usageCount).length} unused ·{" "}
            {assets.filter((a) => !mediaIsImage(a)).length} documents
          </p>
        </div>
        {uploadButton}
      </div>
      {filters}
      {loading ? (
        <div
          className="media-retained-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4"
          aria-label="Loading media"
        >
          <span role="status" className="sr-only">
            Loading media…
          </span>
          {Array.from({ length: 10 }, (_, index) => (
            <div
              key={index}
              aria-hidden="true"
              className="media-loading-tile aspect-square rounded-xl bg-muted animate-pulse"
            />
          ))}
        </div>
      ) : visible.length === 0 ? (
        <div className="media-library-empty rounded-xl border py-14 text-center">
          <Image className="h-8 w-8 text-violet-400" aria-hidden="true" />
          <h2 className="text-lg font-semibold mb-2">
            {filtered ? "No media matches your filters" : "No media yet"}
          </h2>
          <p className="text-muted-foreground text-sm">
            {filtered
              ? "Try a different search term or adjust your filters."
              : "Upload your first image or document to get started."}
          </p>
          {!filtered && uploadButton}
        </div>
      ) : (
        <div className="media-grid media-retained-grid grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {visible.map((asset) => (
            <button
              type="button"
              key={asset.id}
              className={`media-asset-tile group relative aspect-square rounded-xl border bg-muted/20 overflow-hidden transition-all hover:border-violet-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-violet-400 ${selectedIds.includes(asset.id) ? "is-selected" : ""}`}
              onClick={() => onOpen(asset.id)}
              disabled={Boolean(acceptAsset && !acceptAsset(asset))}
              title={asset.originalName}
              aria-label={asset.originalName}
              aria-pressed={selectedIds.length ? selectedIds.includes(asset.id) : undefined}
              data-testid={`media-asset-${asset.id}`}
            >
              {mediaIsImage(asset) ? (
                <img
                  src={source(asset)}
                  alt={asset.alt ?? asset.originalName}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="media-document-tile flex h-full w-full flex-col items-center justify-center gap-3 bg-muted/40 p-4 text-center">
                  <FileText className="h-7 w-7 text-violet-500" aria-hidden="true" />
                  <p className="line-clamp-2 text-xs font-semibold">{asset.originalName}</p>
                  <p className="text-[11px] text-muted-foreground">{asset.mimeType}</p>
                </div>
              )}
              <span
                className="media-asset-usage absolute left-2 top-2 rounded-full bg-background/90 p-1 shadow-sm"
                title={
                  asset.isInUse
                    ? `In use on ${asset.liveUsageCount || 0} live pages`
                    : asset.usageCount
                      ? `Referenced ${asset.usageCount} times, but only in draft or private content`
                      : "Not currently referenced anywhere"
                }
              >
                {asset.isInUse ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-label="Live usage" />
                ) : (
                  <Circle
                    className="h-4 w-4 text-muted-foreground"
                    aria-label={asset.usageCount ? "Draft or private usage" : "Unused"}
                  />
                )}
              </span>
              <span className="media-asset-kind absolute right-2 top-2 rounded-full bg-background/90 px-2 py-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {mediaIsImage(asset) ? "image" : "document"}
              </span>
              <span className="media-asset-caption absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity">
                <span>{asset.originalName}</span>
                <small>
                  {formatMediaBytes(asset.fileSize)} ·{" "}
                  {asset.isInUse
                    ? `${asset.liveUsageCount || 0} live use`
                    : asset.usageCount
                      ? `${asset.usageCount} draft/private ref`
                      : "unused"}
                </small>
              </span>
              {acceptAsset && !acceptAsset(asset) && (
                <span className="media-unavailable">Unavailable for this field</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function MediaDetailsContent({
  asset,
  source = asset.url,
  renderField,
  toolbar,
  notices,
  copyButton,
  extraActions,
  Title = "h2",
  Description = "p",
}: {
  asset: MediaDisplayAsset;
  source?: string;
  renderField: (field: MediaMetadataField) => ReactNode;
  toolbar: ReactNode;
  notices?: ReactNode;
  copyButton: ReactNode;
  extraActions?: ReactNode;
  Title?: React.ElementType;
  Description?: React.ElementType;
}) {
  const renderFields = (fields: readonly MediaMetadataField[]) => (
    <div className="media-metadata-grid grid gap-4 md:grid-cols-2">
      {fields.map((field) => (
        <div
          key={field.key}
          className={`media-metadata-field space-y-1.5 ${field.wide ? "media-field-wide md:col-span-2" : ""}`}
        >
          <label className="text-sm font-medium leading-none" htmlFor={field.id}>
            {field.label}
          </label>
          {renderField(field)}
          {"help" in field && (
            <p className="media-field-help text-xs text-muted-foreground">{field.help}</p>
          )}
        </div>
      ))}
    </div>
  );
  return (
    <div className="media-details-content flex flex-1 min-h-0 flex-col">
      <header className="media-details-header px-6 pt-6 pb-4 border-b">
        <Title className="truncate">{asset.originalName}</Title>
        <Description className="text-sm text-muted-foreground">
          {formatMediaBytes(asset.fileSize)} · {asset.mimeType}
          {asset.createdAt && Number.isFinite(new Date(asset.createdAt).getTime())
            ? ` · Uploaded ${new Date(asset.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`
            : ""}
        </Description>
      </header>
      <div className="media-details-scroll flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {notices}
        {mediaIsImage(asset) ? (
          <img
            className="media-detail-image w-full rounded-lg border object-cover max-h-[420px]"
            src={source}
            alt={asset.alt ?? asset.originalName}
            data-testid="img-asset-preview"
          />
        ) : (
          <div className="media-detail-document flex min-h-64 w-full flex-col items-center justify-center gap-4 rounded-lg border bg-muted/20 p-8 text-center">
            <FileText className="h-8 w-8 text-violet-500" aria-hidden="true" />
            <p>{asset.originalName}</p>
            <p>{asset.mimeType}</p>
          </div>
        )}
        <div className="media-url-row flex items-center gap-2 p-2.5 rounded-lg bg-muted/40 text-xs font-mono break-all">
          <span className="flex-1 text-muted-foreground line-clamp-2">{asset.url}</span>
          {copyButton}
        </div>
        {extraActions}
        <section
          aria-label="Known usage"
          className="media-usage-panel rounded-xl border p-4 space-y-3 bg-muted/10"
        >
          <div className="media-usage-badges flex flex-wrap items-center gap-2">
            <span
              className={`media-usage-state ${asset.isInUse ? "is-live" : asset.usageCount ? "is-draft" : "is-unused"}`}
            >
              {asset.isInUse ? <CheckCircle2 aria-hidden="true" /> : <Circle aria-hidden="true" />}
              {asset.isInUse
                ? "In use on the live site"
                : asset.usageCount
                  ? "Used only in draft or private content"
                  : "Not referenced anywhere"}
            </span>
            <span>{asset.liveUsageCount || 0} live uses</span>
            <span>{asset.usageCount || 0} total references</span>
          </div>
          {(asset.usageRefs?.length || 0) > 0 ? (
            <div className="media-usage-refs max-h-48 space-y-2 overflow-y-auto pr-1">
              {asset.usageRefs!.map((reference, index) => (
                <div
                  key={`${reference.entityType}-${reference.entityId}-${reference.field}-${index}`}
                  className="media-usage-reference rounded-lg border bg-background px-3 py-2 text-sm"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium">{reference.entityName}</span>
                    <span className="text-xs text-muted-foreground">{reference.field}</span>
                    <span
                      className={`media-reference-status ${reference.isLive ? "is-live" : "is-draft"}`}
                    >
                      {reference.statusLabel}
                    </span>
                  </div>
                  {reference.path && (
                    <p className="text-xs text-muted-foreground">{reference.path}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No page, post, event, or global SEO references were found for this media item.
            </p>
          )}
          <p className="text-xs text-muted-foreground">
            Usage is a discovery aid; external links and unsaved edits may not be listed.
          </p>
        </section>
        {renderFields(MEDIA_METADATA_FIELDS.slice(0, 5))}
        <section className="media-seo-panel rounded-xl border p-4 space-y-4 bg-muted/10">
          <div>
            <h3 className="text-sm font-semibold">SEO &amp; Social Metadata</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Use these fields when an image needs its own editorial metadata for search previews or
              social sharing workflows.
            </p>
          </div>
          {renderFields(MEDIA_METADATA_FIELDS.slice(5))}
        </section>
        <div className="media-details-toolbar flex justify-between items-center pt-1 gap-2 flex-wrap">
          {toolbar}
        </div>
      </div>
    </div>
  );
}

export function MediaUploadContent({
  children,
  Title = "h2",
  Description = "p",
}: {
  children: ReactNode;
  Title?: React.ElementType;
  Description?: React.ElementType;
}) {
  return (
    <div className="media-upload-content">
      <header>
        <Title>Upload Media</Title>
        <Description>
          Upload images, PDFs, and common business documents to your media library. Max 10 MB.
        </Description>
      </header>
      {children}
    </div>
  );
}

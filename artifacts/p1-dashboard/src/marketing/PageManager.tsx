import { lazy, Suspense, useEffect, useState } from "react";
import {
  listMarketingPages,
  getMarketingPage,
  getMarketingPageBuilder,
  createMarketingPage,
  duplicateMarketingPage,
  getMarketingPageRelationships,
  listMarketingPageRevisions,
  getMarketingPagePreviewLink,
} from "@workspace/api-client-react/dashboard";
import type {
  MarketingPage,
  MarketingPageInput,
  MarketingPageBuilder,
  MarketingPageRelationships,
  MarketingPageRevision,
  MarketingSection,
} from "../../../../lib/api-client-react/src/dashboard/models";
import { NativePageBuilder } from "./NativePageBuilder";
import {
  PageEditorPresentation,
  PageListPresentation,
} from "../../../../platform/p1-core/client/src/components/shared/cms-page-presentation";
import { analyzeCmsPageQuality } from "../../../../platform/p1-core/client/src/lib/cms-page-quality";
import { SeoPreview } from "../../../../platform/p1-core/client/src/components/shared/seo-preview";
import { StructuredDataStatus } from "../../../../platform/p1-core/client/src/components/shared/structured-data-status";
import type { BlockInstance } from "../../../../platform/p1-core/shared/cms-builder/block-registry";
import { MediaLibrary } from "./MediaLibrary";

import { BuilderPreview } from "./BuilderPreview";
import { customFetch } from "../../../../lib/api-client-react/src/custom-fetch";
import { pageLeaseTransport, usePageReservation } from "./usePageReservation";
import { useCmsUnsavedChanges } from "./useCmsUnsavedChanges";
import "./section-manager.css";

const PageTemplatePicker = lazy(() => import("./PageTemplatePicker"));

type Access = {
  canPreviewData?: (
    kind: "forms" | "blog" | "galleries" | "team" | "events" | "careers" | "branding" | "social",
  ) => boolean;
  canUseMedia: boolean;
  canUseSections: boolean;
  canUseMenus: boolean;
};
const blank: MarketingPageInput = {
  title: "",
  slug: "",
  pageType: "custom",
  template: "full-width",
  status: "draft",
  content: { blocks: [] },
};
const message = (error: unknown) =>
  (error as { data?: { error?: string; message?: string } }).data?.error ||
  (error as { data?: { message?: string } }).data?.message ||
  (error as Error).message ||
  "Page request failed";
function input(page: MarketingPage): MarketingPageInput {
  const {
    title,
    slug,
    pageType,
    template,
    status,
    sidebarId,
    content,
    seoTitle,
    seoDescription,
    seoKeywords,
    ogImageUrl,
    canonicalUrl,
    noindex,
  } = page;
  return {
    title,
    slug,
    pageType,
    template,
    status,
    sidebarId,
    content,
    seoTitle,
    seoDescription,
    seoKeywords,
    ogImageUrl,
    canonicalUrl,
    noindex,
  };
}
function object(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
function editableBlocks(content: unknown): MarketingSection["blocks"] | null {
  if (content == null || (object(content) && Object.keys(content).length === 0))
    return [];
  if (
    object(content) &&
    Array.isArray(content.blocks) &&
    content.blocks.every(
      (block) =>
        object(block) &&
        typeof block.id === "string" &&
        block.id.length > 0 &&
        typeof block.type === "string" &&
        block.type.length > 0 &&
        object(block.props),
    ) &&
    new Set(
      content.blocks.map((block) => (block as Record<string, unknown>).id),
    ).size === content.blocks.length
  )
    return content.blocks;
  return null;
}

function Editor({
  id,
  onClose,
  onCreated,
  ...access
}: Access & {
  id: string;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [draft, setDraft] = useState<MarketingPageInput | null>(
    id === "new" ? blank : null,
  );
  const [saved, setSaved] = useState<MarketingPageInput | null>(
    id === "new" ? blank : null,
  );
  const [page, setPage] = useState<MarketingPage | null>(null);
  const [catalog, setCatalog] = useState<MarketingPageBuilder | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(false);
  const [templates, setTemplates] = useState(false);
  const [chooseImage, setChooseImage] = useState(false);
  const [schedule, setSchedule] = useState("");
  const [relations, setRelations] = useState<MarketingPageRelationships | null>(
    null,
  );
  const [revisions, setRevisions] = useState<MarketingPageRevision[] | null>(
    null,
  );
  const lock = usePageReservation(id === "new" ? null : id);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  useCmsUnsavedChanges(dirty);
  function accept(row: MarketingPage) {
    setPage(row);
    setDraft(input(row));
    setSaved(input(row));
    setRevisions(null);
    setRelations(null);
  }
  useEffect(() => {
    const controller = new AbortController();
    Promise.all([
      id === "new"
        ? Promise.resolve(null)
        : getMarketingPage(id, { signal: controller.signal }),
      getMarketingPageBuilder({ signal: controller.signal }),
    ])
      .then(([row, definitions]) => {
        if (!controller.signal.aborted) {
          if (row) accept(row);
          setCatalog(definitions);
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(message(error));
      });
    return () => controller.abort();
  }, [id]);
  useEffect(() => {
    if (id === "new" || !page) return;
    const controller = new AbortController();
    Promise.all([
      getMarketingPageRelationships(id, { signal: controller.signal }),
      listMarketingPageRevisions(id, { signal: controller.signal }),
    ])
      .then(([references, history]) => {
        if (!controller.signal.aborted) {
          setRelations(references);
          setRevisions(history);
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(message(error));
      });
    return () => controller.abort();
  }, [id, page?.updatedAt]);
  function close() {
    if (!dirty || confirm("Discard unsaved page changes?")) onClose();
  }
  async function action(operation: () => Promise<void>, write = true) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (write && id !== "new") await lock.verify();
      await operation();
    } catch (error) {
      setError(message(error));
    } finally {
      setBusy(false);
    }
  }
  async function pageWrite<T = MarketingPage>(
    suffix: string,
    method = "POST",
    extra: Record<string, unknown> = {},
    force = false,
  ): Promise<T> {
    const conditions = await lock.preconditions(
      (page as MarketingPage & { version: number })?.version,
    );
    return customFetch<T>(
      `/api/v1/marketing/cms/pages/${encodeURIComponent(id)}${suffix}${force ? "?force=true" : ""}`,
      {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...extra, ...conditions }),
      },
    );
  }
  async function remove(kind: "delete" | "unpublish") {
    const references = await getMarketingPageRelationships(id);
    setRelations(references);
    const count = references.menuReferences.length;
    const force =
      count > 0 || (kind === "delete" && page?.status === "published");
    const detail = count
      ? ` ${count} navigation links still reference this page: ${references.menuReferences.map((item) => `${item.menuName}: ${item.itemLabel}`).join(", ")}. Those links will remain unless separately removed.`
      : "";
    if (
      !confirm(
        `${kind === "delete" ? "Delete this page and its revision history" : "Move this page to draft"}?${detail}${page?.status === "published" ? " This affects published CMS content." : ""}`,
      )
    )
      return;
    if (kind === "delete") {
      await pageWrite("", "DELETE", {}, force);
      onClose();
    } else {
      accept(await pageWrite("/unpublish", "POST", {}, force));
      setNotice("Page moved to draft.");
    }
  }
  if (!draft || !catalog)
    return (
      <section>
        {error ? (
          <p role="alert">{error}</p>
        ) : (
          <p role="status">Loading CMS page…</p>
        )}
        <button onClick={close}>Back to CMS pages</button>
      </section>
    );
  const blocks = editableBlocks(draft.content);
  const disabled = busy || !lock.owned;
  const savedActionsDisabled = disabled || dirty;
  async function save() {
    if (disabled) return;
    if (!draft!.title.trim() || !draft!.slug.trim()) {
      setError("Page title and slug are required.");
      return;
    }
    if (
      page?.status === "published" &&
      !confirm("Save these changes to the published CMS page now?")
    )
      return;
    await action(async () => {
      const row =
        id === "new"
          ? await createMarketingPage(draft!)
          : await pageWrite(
              "",
              "PUT",
              draft! as unknown as Record<string, unknown>,
            );
      accept(row);
      setNotice("Page saved.");
      if (id === "new") onCreated(row.id);
    });
  }
  async function draftPreview(copy: boolean) {
    await action(async () => {
      const result = await getMarketingPagePreviewLink(id);
      if (copy) {
        await navigator.clipboard.writeText(result.previewUrl);
        setNotice("Draft preview link copied.");
      } else window.open(result.previewUrl, "_blank", "noopener,noreferrer");
    }, false);
  }
  const previewActions = (
    <div className="cms-page-preview-actions">
      <button
        type="button"
        disabled={busy || id === "new"}
        onClick={() => void draftPreview(false)}
      >
        Open Draft Preview
      </button>
      <button
        type="button"
        disabled={busy || id === "new"}
        onClick={() => void draftPreview(true)}
      >
        Copy Draft Preview Link
      </button>
    </div>
  );
  const qualityIssues = (() => {
    try {
      if (blocks === null) throw Error("Unsupported content structure");
      return analyzeCmsPageQuality({
        title: draft.title,
        slug: draft.slug,
        status: draft.status || "draft",
        template: draft.template || "full-width",
        sidebarId: draft.sidebarId,
        seoTitle: draft.seoTitle,
        seoDescription: draft.seoDescription,
        ogImageUrl: draft.ogImageUrl,
        noindex: !!draft.noindex,
        blocks: (blocks || []) as unknown as BlockInstance[],
      });
    } catch {
      return [
        {
          id: "unsupported-page-content",
          severity: "error" as const,
          tab: "builder" as const,
          title: "Retained content needs review",
          description:
            "The saved content cannot be fully inspected by this builder. Metadata edits preserve it unchanged; review the original content before publication.",
        },
      ];
    }
  })();

  return (
    <PageEditorPresentation
      title={draft.title || "Create Page"}
      lastSaved={page?.updatedAt}
      status={page?.status || "draft"}
      scheduledAt={page?.scheduledAt}
      dirty={dirty}
      busy={busy}
      saveDisabled={disabled}
      onBack={close}
      onSave={() => void save()}
      banners={
        <>
          {error && <p role="alert">{error}</p>}
          {notice && <p role="status">{notice}</p>}
          <p>
            Generic CMS content. Primary P1 website pages are managed in
            Marketing → Website.
          </p>
          <p>
            Status: {page?.status || "draft"}
            {page?.scheduledAt
              ? ` · Scheduled ${new Date(page.scheduledAt).toLocaleString()}`
              : ""}
          </p>
          {page?.status === "published" && (
            <p>
              Saving changes or restoring a revision updates this published CMS
              page immediately.
            </p>
          )}
          {page?.status === "scheduled" && (
            <p>
              Saved changes will be used when this page publishes at its
              scheduled time.
            </p>
          )}
          {!lock.owned && (
            <aside>
              <p>
                {lock.error ||
                  `Page reserved${lock.holder ? ` by ${lock.holder}` : ""}. Your draft is retained.`}
              </p>
              <button onClick={() => void lock.acquire()}>
                Check reservation
              </button>
            </aside>
          )}
        </>
      }
      actions={
        <>
          {previewActions}
          <button
            type="button"
            disabled={disabled}
            onClick={() => setTemplates((value) => !value)}
          >
            Templates
          </button>
          <button
            type="button"
            disabled={busy || !dirty}
            onClick={() => {
              if (confirm("Discard unsaved page changes?")) setDraft(saved);
            }}
          >
            Discard changes
          </button>
        </>
      }
      settings={
        <section className="cms-page-card">
          <h2>Page Details</h2>
          <fieldset className="cms-page-card-body" disabled={disabled}>
            <label>
              Page title
              <input
                required
                value={draft.title}
                onChange={(event) =>
                  setDraft({ ...draft, title: event.target.value })
                }
              />
            </label>
            <label>
              Page slug
              <input
                required
                value={draft.slug}
                onChange={(event) =>
                  setDraft({ ...draft, slug: event.target.value })
                }
              />
            </label>
            <label>
              Page type
              <select
                aria-label="Page type"
                value={draft.pageType}
                onChange={(event) =>
                  setDraft({
                    ...draft,
                    pageType: event.target
                      .value as MarketingPageInput["pageType"],
                  })
                }
              >
                {["home", "about", "contact", "landing", "custom"].map(
                  (value) => (
                    <option key={value}>{value}</option>
                  ),
                )}
              </select>
            </label>
            <label>
              Page layout
              <select
                aria-label="Page layout"
                value={draft.template}
                onChange={(event) =>
                  setDraft({ ...draft, template: event.target.value })
                }
              >
                {draft.template &&
                  !["full-width", "with-sidebar"].includes(draft.template) && (
                    <option>{draft.template}</option>
                  )}
                <option value="full-width">Full width</option>
                <option value="with-sidebar">With sidebar</option>
              </select>
            </label>
            {draft.template === "with-sidebar" && (
              <label>
                Page sidebar
                <select
                  aria-label="Page sidebar"
                  value={draft.sidebarId || ""}
                  onChange={(event) =>
                    setDraft({
                      ...draft,
                      sidebarId: event.target.value || null,
                    })
                  }
                >
                  <option value="">Default sidebar</option>
                  {draft.sidebarId &&
                    !catalog.sidebars.some(
                      (row) => row.id === draft.sidebarId,
                    ) && (
                      <option value={draft.sidebarId}>
                        Saved sidebar ({draft.sidebarId})
                      </option>
                    )}
                  {catalog.sidebars.map((row) => (
                    <option key={row.id} value={row.id}>
                      {row.name}
                      {row.isDefault ? " (default)" : ""}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </fieldset>
        </section>
      }
      references={
        <>
          {page && (
            <section
              className="section-manager"
              aria-label="Saved page actions"
            >
              <h3>Saved page actions</h3>
              {dirty && (
                <p>Save or discard your edits before using these actions.</p>
              )}
              <div className="section-actions">
                <button
                  disabled={savedActionsDisabled}
                  onClick={() =>
                    void action(async () => {
                      const row = await duplicateMarketingPage(id);
                      onCreated(row.id);
                    })
                  }
                >
                  Duplicate page
                </button>
                <button
                  disabled={savedActionsDisabled || page.status === "published"}
                  onClick={() => {
                    if (confirm("Publish this saved CMS page now?"))
                      void action(async () => {
                        accept(await pageWrite("/publish"));
                        setNotice("Page published.");
                      });
                  }}
                >
                  Publish page
                </button>
                <button
                  disabled={savedActionsDisabled || page.status === "draft"}
                  onClick={() => void action(() => remove("unpublish"))}
                >
                  Move to draft
                </button>
                <button
                  disabled={savedActionsDisabled}
                  onClick={() => void action(() => remove("delete"))}
                >
                  Delete page
                </button>
                <button
                  disabled={savedActionsDisabled || page.status !== "draft"}
                  onClick={() => {
                    if (confirm("Archive this saved draft page?"))
                      void action(async () => {
                        accept(
                          await pageWrite("", "PUT", { status: "archived" }),
                        );
                        setNotice("Page archived.");
                      });
                  }}
                >
                  Archive draft
                </button>
              </div>
              <label>
                Publish at (your local time)
                <input
                  type="datetime-local"
                  disabled={savedActionsDisabled}
                  value={schedule}
                  onChange={(event) => setSchedule(event.target.value)}
                />
              </label>
              <button
                disabled={savedActionsDisabled || !schedule}
                onClick={() => {
                  const date = new Date(schedule);
                  if (!Number.isFinite(date.getTime()) || date <= new Date()) {
                    setError("Choose a future publication time.");
                    return;
                  }
                  if (
                    confirm(
                      `Schedule this saved page for ${date.toLocaleString()}?${page.status === "published" ? " It will move out of published status until that time." : ""}`,
                    )
                  )
                    void action(async () => {
                      accept(
                        await pageWrite("/schedule", "POST", {
                          scheduledAt: date.toISOString(),
                        }),
                      );
                      setNotice("Page scheduled.");
                    });
                }}
              >
                Schedule publication
              </button>
              <div className="section-actions">
                <button
                  disabled={busy}
                  onClick={() =>
                    void action(
                      async () =>
                        setRelations(await getMarketingPageRelationships(id)),
                      false,
                    )
                  }
                >
                  Review menu links
                </button>
                <button
                  disabled={busy}
                  onClick={() =>
                    void action(
                      async () =>
                        setRevisions(await listMarketingPageRevisions(id)),
                      false,
                    )
                  }
                >
                  View revisions
                </button>
              </div>
              {relations && (
                <section aria-label="Page menu links">
                  <h4>Menu links ({relations.menuReferences.length})</h4>
                  {relations.menuReferences.map((item) => (
                    <p key={`${item.menuId}:${item.itemId}`}>
                      {item.menuName} → {item.itemLabel} ({item.itemUrl})
                    </p>
                  ))}
                  {access.canUseMenus &&
                    relations.menuReferences.length > 0 && (
                      <button
                        disabled={savedActionsDisabled}
                        onClick={() => {
                          if (
                            confirm(
                              "Remove all navigation menu links to this page?",
                            )
                          )
                            void action(async () => {
                              const result = await pageWrite<{
                                itemsRemoved: number;
                              }>("/relationships/remove-menu-items");
                              setRelations(
                                await getMarketingPageRelationships(id),
                              );
                              setNotice(
                                `${result.itemsRemoved} menu links removed.`,
                              );
                            });
                        }}
                      >
                        Remove menu links
                      </button>
                    )}
                </section>
              )}
              {revisions && (
                <section aria-label="Page revisions">
                  <h4>Revision history</h4>
                  <p>
                    Restore changes title and content only. Current publication
                    status, SEO, layout and sidebar remain.
                  </p>
                  {!revisions.length && <p>No revisions yet.</p>}
                  {revisions.map((revision) => (
                    <article className="section-block" key={revision.id}>
                      <h5>{revision.title}</h5>
                      <p>
                        {revision.changeNote} ·{" "}
                        {revision.createdAt
                          ? new Date(revision.createdAt).toLocaleString()
                          : "Date unavailable"}{" "}
                        · {revision.status}
                      </p>
                      <button
                        disabled={savedActionsDisabled}
                        onClick={() => {
                          if (
                            confirm(
                              `Restore title and content from this revision?${page.status === "published" ? " This updates the published CMS page immediately." : ""}`,
                            )
                          )
                            void action(async () => {
                              accept(
                                await pageWrite(
                                  `/revisions/${encodeURIComponent(revision.id)}/restore`,
                                ),
                              );
                              setNotice("Revision restored.");
                            });
                        }}
                      >
                        Restore revision
                      </button>
                    </article>
                  ))}
                </section>
              )}
            </section>
          )}
        </>
      }
      seo={
        <>
          <section className="cms-page-card">
            <h2>Search Engine</h2>
            <fieldset className="cms-page-card-body" disabled={disabled}>
              {(
                [
                  ["seoTitle", "SEO title"],
                  ["seoDescription", "SEO description"],
                  ["seoKeywords", "SEO keywords"],
                  ["ogImageUrl", "Social image URL"],
                  ["canonicalUrl", "Canonical URL"],
                ] as const
              ).map(([key, label]) => (
                <label key={key}>
                  {label}
                  <input
                    value={draft[key] || ""}
                    onChange={(event) =>
                      setDraft({ ...draft, [key]: event.target.value })
                    }
                  />
                </label>
              ))}
              <label className="section-check">
                <input
                  type="checkbox"
                  checked={draft.noindex === true}
                  onChange={(event) =>
                    setDraft({ ...draft, noindex: event.target.checked })
                  }
                />
                Exclude this page from search indexing
              </label>
            </fieldset>
          </section>
          <section className="cms-page-card">
            <h2>Social / Open Graph</h2>
            <div className="cms-page-card-body">
              <p>
                Recommended: 1200 × 630 px. Shown when the page is shared on
                social media. Falls back to global default OG image.
              </p>
              {draft.ogImageUrl && (
                <img
                  alt="Open Graph preview"
                  className="cms-page-og-preview"
                  src={draft.ogImageUrl}
                />
              )}{" "}
              {access.canUseMedia && (
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => setChooseImage((v) => !v)}
                >
                  {chooseImage
                    ? "Close image library"
                    : "Choose Open Graph image"}
                </button>
              )}
              {chooseImage && access.canUseMedia && (
                <MediaLibrary
                  acceptAsset={(asset) => asset.mimeType.startsWith("image/")}
                  onSelect={(asset) => {
                    setDraft({ ...draft, ogImageUrl: asset.url });
                    setChooseImage(false);
                  }}
                />
              )}
            </div>
          </section>
          <SeoPreview
            title={draft.seoTitle || draft.title}
            description={draft.seoDescription || ""}
            url={`https://www.p1landmanagement.com/${draft.slug}`}
            ogImage={draft.ogImageUrl || ""}
            source="page"
            siteName="P1 Land & Property Management"
          />
          <StructuredDataStatus
            contentType="page"
            fields={{
              hasTitle: !!(draft.seoTitle || draft.title),
              hasDescription: !!draft.seoDescription,
              hasImage: !!draft.ogImageUrl,
              noindex: !!draft.noindex,
              isPublished: page?.status === "published",
              hasFaqBlocks: blocks?.some((block) => block.type === "faq"),
            }}
          />
        </>
      }
      builder={
        <>
          {blocks !== null && (
            <button
              type="button"
              aria-expanded={preview}
              onClick={() => setPreview((v) => !v)}
            >
              {preview ? "Close preview" : "Preview page"}
            </button>
          )}
          {preview && blocks && (
            <BuilderPreview
              previewUrl={catalog.previewUrl}
              blocks={blocks}
              label="page"
            />
          )}
          {blocks ? (
            <NativePageBuilder
              blocks={blocks}
              catalog={catalog}
              disabled={disabled}
              canUseMedia={access.canUseMedia}
              canUseSections={access.canUseSections}
              canPreviewData={access.canPreviewData}
              onNotice={setNotice}
              onChange={(next: MarketingSection["blocks"]) =>
                setDraft({
                  ...draft,
                  content: {
                    ...(object(draft.content) ? draft.content : {}),
                    blocks: next,
                  },
                })
              }
            />
          ) : (
            <p>
              This page contains a legacy content format. Metadata edits
              preserve it unchanged; block conversion is not available here yet.
            </p>
          )}
        </>
      }
      templates={
        <fieldset disabled={disabled} className="cms-page-templates">
          {blocks !== null && (
            <>
              <button
                type="button"
                aria-expanded={templates}
                onClick={() => setTemplates((value) => !value)}
              >
                {templates ? "Close page starters" : "Choose page starter"}
              </button>
              {templates && (
                <Suspense
                  fallback={<p role="status">Loading page starters…</p>}
                >
                  <PageTemplatePicker
                    onCreateLanding={(next, title) => {
                      if (
                        blocks.length &&
                        !confirm(
                          "Replace current content with this landing page draft?",
                        )
                      )
                        return;
                      setDraft({
                        ...draft,
                        title,
                        pageType: "landing",
                        slug:
                          draft.slug ||
                          title
                            .toLowerCase()
                            .trim()
                            .replace(/[^a-z0-9]+/g, "-")
                            .replace(/^-|-$/g, ""),
                        content: {
                          ...(object(draft.content) ? draft.content : {}),
                          blocks: next,
                        },
                      });
                      setTemplates(false);
                      setNotice(
                        "Landing page generated. Verify example content before saving or publishing.",
                      );
                    }}
                    onClose={() => setTemplates(false)}
                    previewUrl={catalog.previewUrl}
                    disabled={disabled}
                    onSelect={(next, name) => {
                      if (
                        blocks.length &&
                        !confirm(
                          "Replace the current content blocks with this starter? Unsaved block changes will be replaced. Page details and SEO settings will remain.",
                        )
                      )
                        return;
                      setDraft({
                        ...draft,
                        content: {
                          ...(object(draft.content) ? draft.content : {}),
                          blocks: next,
                        },
                      });
                      setTemplates(false);
                      setNotice(
                        `Applied ${name} to the unsaved draft. Replace example content and verify claims and links before saving or publishing.`,
                      );
                    }}
                  />
                </Suspense>
              )}
            </>
          )}
        </fieldset>
      }
      previewActions={previewActions}
      qualityIssues={qualityIssues}
    />
  );
}

// Opaque CMS IDs are varchar keys; do not assume every retained record is UUID-only.
export function readPageIntent(search: string): {
  id: string | null;
  error: string;
} {
  const values = new URLSearchParams(search).getAll("page");
  if (!values.length) return { id: null, error: "" };
  if (values.length !== 1 || !/^[A-Za-z0-9_-]{1,200}$/.test(values[0]))
    return {
      id: null,
      error: "Invalid page editor link. Choose a record from the list.",
    };
  return { id: values[0], error: "" };
}

export default function PageManager(access: Access) {
  const [initialIntent] = useState(() => readPageIntent(location.search));
  const [intentError, setIntentError] = useState(initialIntent.error);
  const [rows, setRows] = useState<MarketingPage[] | null>(null);
  const [editing, setEditing] = useState<string | null>(initialIntent.id);
  const [listBusy, setListBusy] = useState(false);
  const [locks, setLocks] = useState<
    Record<string, { name: string; owned: boolean }>
  >({});
  useEffect(() => {
    if (editing) return;
    const controller = new AbortController();
    async function refreshLocks() {
      try {
        const active = await customFetch<
          Array<{ resourceId: string; lock: { lockedByName: string } }>
        >("/api/v1/marketing/cms/editor-locks/resource/cms_page", {
          signal: controller.signal,
        });
        const details=active.map(entry=>[entry.resourceId,{name:entry.lock.lockedByName,owned:false}] as const);
        if (!controller.signal.aborted) setLocks(Object.fromEntries(details));
      } catch (error) {
        if (!controller.signal.aborted) setError(message(error));
      }
    }
    void refreshLocks();
    const timer = setInterval(() => void refreshLocks(), 15000);
    return () => {
      controller.abort();
      clearInterval(timer);
    };
  }, [editing]);
  async function listAction(
    id: string,
    kind: "duplicate" | "publish" | "unpublish" | "delete",
  ) {
    if (listBusy) return;
    setListBusy(true);
    setError("");
    const editorInstanceId = crypto.randomUUID();
    let leaseId: string | null = null;
    try {
      const reservation = await pageLeaseTransport("acquire", id, {
        editorInstanceId,
      });
      if (!reservation.ownedByCurrentEditor || !reservation.lock)
        throw Error(
          "Another editor instance holds this page. Your changes are retained.",
        );
      leaseId = reservation.lock.id;
      const expectedVersion = (
        rows?.find((row) => row.id === id) as
          | (MarketingPage & { version: number })
          | undefined
      )?.version;
      if (!Number.isInteger(expectedVersion))
        throw Error("Reload the page list to obtain the saved version.");
      const mutate = (suffix: string, method = "POST", force = false) =>
        customFetch(
          `/api/v1/marketing/cms/pages/${encodeURIComponent(id)}${suffix}${force ? "?force=true" : ""}`,
          {
            method,
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              expectedVersion,
              editorInstanceId,
              leaseId,
            }),
          },
        );
      if (kind === "duplicate") {
        const copy = await duplicateMarketingPage(id);
        select(copy.id);
        return;
      }
      if (kind === "publish") {
        if (!confirm("Publish this saved CMS page now?")) return;
        await mutate("/publish");
      } else {
        const references = await getMarketingPageRelationships(id);
        const page = rows?.find((row) => row.id === id);
        const force =
          references.menuReferences.length > 0 ||
          (kind === "delete" && page?.status === "published");
        const warning = references.menuReferences.length
          ? ` Navigation references remain: ${references.menuReferences.map((item) => `${item.menuName}: ${item.itemLabel}`).join(", ")}.`
          : "";
        if (
          !confirm(
            `${kind === "delete" ? "Delete this page and its revision history" : "Move this page to draft"}?${warning}`,
          )
        )
          return;
        if (kind === "delete") await mutate("", "DELETE", force);
        else await mutate("/unpublish", "POST", force);
      }
      setRows(await listMarketingPages());
    } catch (error) {
      setError(message(error));
    } finally {
      if (leaseId)
        await pageLeaseTransport("release", id, {
          editorInstanceId,
          leaseId,
        }).catch(() => {});
      setListBusy(false);
    }
  }
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    if (editing) return;
    const controller = new AbortController();
    setError("");
    listMarketingPages({ signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) setRows(result);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(message(error));
      });
    return () => controller.abort();
  }, [editing]);
  const select = (id: string | null) => {
    if (id !== null && !/^[A-Za-z0-9_-]{1,200}$/.test(id)) {
      setIntentError(
        "Invalid page editor link. Choose a record from the list.",
      );
      return;
    }
    const url = new URL(location.href);
    if (id) url.searchParams.set("page", id);
    else url.searchParams.delete("page");
    history.replaceState(
      history.state,
      "",
      url.pathname + url.search + url.hash,
    );
    setIntentError("");
    setEditing(id);
  };
  if (editing)
    return (
      <Editor
        key={editing}
        id={editing}
        onClose={() => select(null)}
        onCreated={select}
        {...access}
      />
    );
  return (
    <PageListPresentation
      pages={(rows || []).filter(
        (row) =>
          (!status || row.status === status) &&
          `${row.title} ${row.slug}`
            .toLowerCase()
            .includes(search.trim().toLowerCase()),
      )}
      loading={!rows && !error}
      error={intentError || error}
      onNew={() => select("new")}
      onEdit={select}
      onAction={(id, kind) => void listAction(id, kind)}
      busy={listBusy}
      locks={locks}
      filters={
        <div className="cms-page-filters">
          {" "}
          <label>
            Find CMS pages
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <label>
            Filter page status
            <select
              aria-label="Filter page status"
              value={status}
              onChange={(event) => setStatus(event.target.value)}
            >
              <option value="">All statuses</option>
              {["draft", "published", "scheduled", "archived"].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </select>
          </label>
        </div>
      }
    />
  );
}

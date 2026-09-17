import { useEffect, useState } from "react";
import {
  listMarketingPages,
  getMarketingPage,
  getMarketingPageBuilder,
  createMarketingPage,
  updateMarketingPage,
  duplicateMarketingPage,
  publishMarketingPage,
  scheduleMarketingPage,
  unpublishMarketingPage,
  deleteMarketingPage,
  getMarketingPageRelationships,
  removeMarketingPageMenuItems,
  listMarketingPageRevisions,
  restoreMarketingPageRevision,
} from "@workspace/api-client-react/dashboard";
import type {
  MarketingPage,
  MarketingPageInput,
  MarketingPageBuilder,
  MarketingPageRelationships,
  MarketingPageRevision,
  MarketingSection,
} from "../../../../lib/api-client-react/src/dashboard/models";
import { CmsBlockEditor } from "./CmsBlockEditor";
import { BuilderPreview } from "./BuilderPreview";
import { usePageReservation } from "./usePageReservation";
import { useCmsUnsavedChanges } from "./useCmsUnsavedChanges";
import "./section-manager.css";

type Access = {
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
    content.blocks.every(object)
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
  function close() {
    if (!dirty || confirm("Discard unsaved page changes?")) onClose();
  }
  async function action(operation: () => Promise<void>, write = true) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      if (write) await lock.verify();
      await operation();
    } catch (error) {
      setError(message(error));
    } finally {
      setBusy(false);
    }
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
      await deleteMarketingPage(id, { force });
      onClose();
    } else {
      accept(await unpublishMarketingPage(id, { force }));
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
  return (
    <section className="section-manager">
      <button disabled={busy} onClick={close}>
        Back to CMS pages
      </button>
      <h2>{id === "new" ? "New CMS page" : page?.title}</h2>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <p>
        Generic CMS content. Primary P1 website pages are managed in Marketing →
        Website.
      </p>
      <p>
        Status: {page?.status || "draft"}
        {page?.scheduledAt
          ? ` · Scheduled ${new Date(page.scheduledAt).toLocaleString()}`
          : ""}
      </p>
      {page?.status === "published" && (
        <p>
          Saving changes or restoring a revision updates this published CMS page
          immediately.
        </p>
      )}
      {page?.status === "scheduled" && (
        <p>
          Saved changes will be used when this page publishes at its scheduled
          time.
        </p>
      )}
      {!lock.owned && (
        <aside>
          <p>
            {lock.error ||
              `Page reserved${lock.holder ? ` by ${lock.holder}` : ""}. Your draft is retained.`}
          </p>
          <button onClick={() => void lock.acquire()}>Check reservation</button>
        </aside>
      )}
      <button
        type="button"
        disabled={blocks === null}
        aria-expanded={preview}
        onClick={() => setPreview((value) => !value)}
      >
        {preview ? "Close preview" : "Preview page"}
      </button>
      {preview && blocks && (
        <BuilderPreview
          previewUrl={catalog.previewUrl}
          blocks={blocks}
          label="page"
        />
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (
            page?.status === "published" &&
            !confirm("Save these changes to the published CMS page now?")
          )
            return;
          void action(async () => {
            const row =
              id === "new"
                ? await createMarketingPage(draft)
                : await updateMarketingPage(id, draft);
            accept(row);
            setNotice("Page saved.");
            if (id === "new") onCreated(row.id);
          });
        }}
      >
        <fieldset disabled={disabled}>
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
                  setDraft({ ...draft, sidebarId: event.target.value || null })
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
          <details>
            <summary>Search and sharing metadata</summary>
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
          </details>
          {blocks ? (
            <CmsBlockEditor
              blocks={blocks}
              catalog={catalog}
              disabled={disabled}
              canUseMedia={access.canUseMedia}
              canUseSections={access.canUseSections}
              onNotice={setNotice}
              onChange={(next) =>
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
          <button type="submit">
            {page?.status === "published"
              ? "Save published changes"
              : "Save page"}
          </button>
          <button
            type="button"
            disabled={!dirty}
            onClick={() => {
              if (confirm("Discard unsaved page changes?")) setDraft(saved);
            }}
          >
            Discard changes
          </button>
        </fieldset>
      </form>
      {page && (
        <section className="section-manager" aria-label="Saved page actions">
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
                    accept(await publishMarketingPage(id));
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
                      await updateMarketingPage(id, { status: "archived" }),
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
                    await scheduleMarketingPage(id, {
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
              {access.canUseMenus && relations.menuReferences.length > 0 && (
                <button
                  disabled={savedActionsDisabled}
                  onClick={() => {
                    if (
                      confirm("Remove all navigation menu links to this page?")
                    )
                      void action(async () => {
                        const result = await removeMarketingPageMenuItems(id);
                        setRelations(await getMarketingPageRelationships(id));
                        setNotice(`${result.itemsRemoved} menu links removed.`);
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
                            await restoreMarketingPageRevision(id, revision.id),
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
    </section>
  );
}

export default function PageManager(access: Access) {
  const [rows, setRows] = useState<MarketingPage[] | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
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
  if (editing)
    return (
      <Editor
        key={editing}
        id={editing}
        onClose={() => setEditing(null)}
        onCreated={setEditing}
        {...access}
      />
    );
  return (
    <section className="section-manager">
      <p>
        Generic CMS pages and publication history. Use Website for primary P1
        site content.
      </p>
      {error && <p role="alert">{error}</p>}
      {!rows && !error && <p role="status">Loading CMS pages…</p>}
      <button onClick={() => setEditing("new")}>New CMS page</button>
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
      {rows
        ?.filter(
          (row) =>
            (!status || row.status === status) &&
            `${row.title} ${row.slug}`
              .toLowerCase()
              .includes(search.trim().toLowerCase()),
        )
        .map((row) => (
          <article className="section-block" key={row.id}>
            <h2>{row.title}</h2>
            <p>
              /{row.slug} · {row.status} · {row.pageType}
            </p>
            <button onClick={() => setEditing(row.id)}>Edit {row.title}</button>
          </article>
        ))}
    </section>
  );
}

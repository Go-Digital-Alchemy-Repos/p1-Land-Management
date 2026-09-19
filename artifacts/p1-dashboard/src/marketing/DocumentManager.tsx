import { DocumentWorkspacePresentation } from "../../../../platform/p1-core/client/src/components/shared/document-workspace-presentation";
import React, {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  BookOpen,
  Download,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import {
  getWebsiteDocuments,
  createWebsiteDocument,
  saveWebsiteDocument,
  deleteWebsiteDocument,
  syncWebsiteDocuments,
} from "@workspace/api-client-react/dashboard";
import type {
  WebsiteDocument,
  WebsiteDocumentCollection,
  WebsiteDocumentInput,
} from "../../../../lib/api-client-react/src/dashboard/models";
import {
  markdownToHtml,
  extractMarkdownHeadings,
  docSlugFromMarkdownPath,
} from "../../../../platform/p1-core/shared/document-markdown";
import { useDocumentReservation } from "./useDocumentReservation";
import { useCmsUnsavedChanges } from "./useCmsUnsavedChanges";
import "./document-manager.css";

type Draft = {
  id: string | null;
  version: string;
  fields: WebsiteDocumentInput;
  baseline: string;
};
const blank: WebsiteDocumentInput = {
  title: "",
  slug: "",
  category: "Reference",
  content: "",
  sortOrder: 0,
  isPublished: false,
};
function editable(doc: WebsiteDocument): WebsiteDocumentInput {
  return {
    title: doc.title,
    slug: doc.slug,
    category: doc.category,
    content: doc.content,
    sortOrder: doc.sortOrder ?? 0,
    isPublished: doc.isPublished ?? false,
  };
}
export default function DocumentManager() {
  const [collection, setCollection] =
    useState<WebsiteDocumentCollection | null>(null);
  const [selected, setSelected] = useState(
    () => new URLSearchParams(location.search).get("doc") || "",
  );
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null),
    [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false),
    [blocked, setBlocked] = useState(false);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const live = useRef(true),
    gate = useRef(false),
    request = useRef<AbortController | null>(null);
  const editorDialog = useRef<HTMLDialogElement>(null);
  const editorOpen = draft !== null;
  useEffect(() => {
    if (!editorOpen) return;
    const opener =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    const dialog = editorDialog.current;
    dialog?.showModal();
    return () => {
      dialog?.close();
      if (opener?.isConnected) opener.focus();
    };
  }, [editorOpen]);
  const reservation = useDocumentReservation(draft?.id ?? null);
  const dirty = Boolean(
    draft && JSON.stringify(draft.fields) !== draft.baseline,
  );
  useCmsUnsavedChanges(
    dirty || blocked,
    "Leave developer resources? Download your draft first if you need to keep unsaved changes.",
  );
  function options() {
    request.current = new AbortController();
    return {
      signal: AbortSignal.any([
        request.current.signal,
        AbortSignal.timeout(30000),
      ]),
    };
  }
  async function load() {
    if (gate.current) return;
    gate.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await getWebsiteDocuments(options());
      if (live.current) {
        setCollection(result);
        if (!draft) setBlocked(false);
      }
    } catch {
      if (live.current)
        setError(
          "Could not load saved documents. Your draft is retained; retry when the connection is available.",
        );
    } finally {
      gate.current = false;
      if (live.current) setBusy(false);
    }
  }
  useEffect(() => {
    live.current = true;
    void load();
    return () => {
      live.current = false;
      request.current?.abort();
    };
  }, []);
  const docs = collection?.docs ?? [];
  const current = docs.find((doc) => doc.slug === selected);
  const shown = docs.filter(
    (doc) =>
      (!category || doc.category === category) &&
      `${doc.title} ${doc.category} ${doc.content}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  function select(slug: string) {
    if (
      busy ||
      (dirty &&
        !window.confirm("Discard your unsaved draft and open this document?"))
    )
      return;
    setDraft(null);
    setBlocked(false);
    setPreview(false);
    setSelected(slug);
    setError("");
    setNotice("");
    const url = new URL(location.href);
    url.searchParams.set("doc", slug);
    url.hash = "";
    history.replaceState(null, "", url.pathname + url.search);
  }
  function edit(doc?: WebsiteDocument) {
    if (
      busy ||
      (dirty &&
        !window.confirm(
          "Discard your current draft? Download it first if you need to retain it.",
        ))
    )
      return;
    const fields = doc ? editable(doc) : { ...blank };
    setDraft({
      id: doc?.id ?? null,
      version: doc?.version ?? "",
      fields,
      baseline: JSON.stringify(fields),
    });
    setBlocked(false);
    setPreview(false);
    setError("");
    setNotice("");
  }
  function patch(update: Partial<WebsiteDocumentInput>) {
    setDraft((value) =>
      value ? { ...value, fields: { ...value.fields, ...update } } : value,
    );
  }
  function downloadDraft() {
    if (!draft) return;
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(draft.fields, null, 2)], {
        type: "application/json",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `${draft.fields.slug || "document"}-draft.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!draft || gate.current || blocked || !reservation.owned) return;
    gate.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await reservation.verify();
      const saved = draft.id
        ? await saveWebsiteDocument(
            draft.id,
            { document: draft.fields, expectedVersion: draft.version },
            options(),
          )
        : await createWebsiteDocument(draft.fields, options());
      if (!live.current) return;
      const fields = editable(saved);
      setDraft({
        ...draft,
        id: saved.id,
        version: saved.version,
        fields,
        baseline: JSON.stringify(fields),
      });
      setSelected(saved.slug);
      setNotice("Document saved.");
      const url = new URL(location.href);
      url.searchParams.set("doc", saved.slug);
      url.hash = "";
      history.replaceState(null, "", url.pathname + url.search);
      // Refresh the collection version before allowing a repository sync.
      const next = await getWebsiteDocuments(options());
      if (live.current) setCollection(next);
    } catch {
      if (live.current) {
        setBlocked(true);
        setError(
          "Save was not confirmed or the saved document changed. Your draft is retained. Download it, reload saved documents, and compare before editing again. Do not repeat an uncertain save.",
        );
      }
    } finally {
      gate.current = false;
      if (live.current) setBusy(false);
    }
  }
  async function remove() {
    if (
      !current ||
      gate.current ||
      draft ||
      !window.confirm(
        `Permanently delete “${current.title}”? This cannot be undone here.`,
      )
    )
      return;
    gate.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await deleteWebsiteDocument(
        current.id,
        { expectedVersion: current.version },
        options(),
      );
      const next = await getWebsiteDocuments(options());
      if (live.current) {
        setCollection(next);
        setSelected("");
        setNotice("Document deleted.");
      }
    } catch {
      if (live.current) {
        setBlocked(true);
        setError(
          "Deletion was not confirmed. Reload saved documents before another change.",
        );
      }
    } finally {
      gate.current = false;
      if (live.current) setBusy(false);
    }
  }
  async function sync() {
    if (
      !collection ||
      draft ||
      blocked ||
      gate.current ||
      !window.confirm(
        "Refresh repository documentation? Matching system documents will be overwritten with the deployed repository content. Custom documents and existing publication choices are retained.",
      )
    )
      return;
    gate.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await syncWebsiteDocuments(
        { expectedVersion: collection.version },
        options(),
      );
      if (live.current) {
        setCollection(result);
        setNotice(
          `Repository documentation refreshed: ${result.created} created, ${result.updated} updated.`,
        );
      }
    } catch {
      if (live.current) {
        setBlocked(true);
        setError(
          "Refresh was not confirmed or the collection changed. Reload saved documents before retrying.",
        );
      }
    } finally {
      gate.current = false;
      if (live.current) setBusy(false);
    }
  }
  const content = draft?.fields.content ?? current?.content ?? "";
  const html = useMemo(
    () =>
      markdownToHtml(content, {
        resolveLink: (href) => {
          const slug = href.startsWith("/admin/docs/")
            ? href.slice("/admin/docs/".length).split("#")[0]
            : docSlugFromMarkdownPath(href);
          if (!slug || !docs.some((doc) => doc.slug === slug)) return null;
          return {
            href: `/marketing/system/documents?doc=${encodeURIComponent(slug)}`,
            docSlug: slug,
          };
        },
      }),
    [content, collection],
  );
  const savedHtml = useMemo(
    () =>
      markdownToHtml(current?.content || "", {
        resolveLink: (href) => {
          const slug = href.startsWith("/admin/docs/")
            ? href.slice("/admin/docs/".length).split("#")[0]
            : docSlugFromMarkdownPath(href);
          return slug && docs.some((doc) => doc.slug === slug)
            ? {
                href: `/marketing/system/documents?doc=${encodeURIComponent(slug)}`,
                docSlug: slug,
              }
            : null;
        },
      }),
    [current?.content, collection],
  );
  function onMarkdownClick(event: React.MouseEvent<HTMLDivElement>) {
    const target =
      event.target instanceof Element
        ? event.target.closest("a[data-doc-slug]")
        : null;
    const slug = target?.getAttribute("data-doc-slug");
    if (slug) {
      event.preventDefault();
      select(slug);
    }
  }
  function closeEditor() {
    if (gate.current || busy) return;
    if (dirty && !window.confirm("Discard your unsaved draft?")) return;
    setDraft(null);
    setBlocked(false);
    void load();
  }
  return (
    <article className="document-manager">
      <header className="page-hero">
        <div>
          <p className="eyebrow">WEBSITE SYSTEM</p>
          <div className="doc-heading">
            <BookOpen size={28} aria-hidden="true" />
            <h1>Developer resources</h1>
          </div>
          <p>
            Private website documentation, operating guides and technical
            references.
          </p>
        </div>
      </header>
      <div className="doc-toolbar">
        <button disabled={busy} onClick={() => void load()}>
          <RefreshCw size={16} /> Reload saved documents
        </button>
        <button disabled={busy || !collection} onClick={() => edit()}>
          <Plus size={16} /> New document
        </button>
        <button
          disabled={busy || !collection || Boolean(draft) || blocked}
          onClick={() => void sync()}
        >
          Refresh repository docs
        </button>
      </div>
      {error && (
        <p role="alert" className="doc-message">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {busy && <p role="status">Working…</p>}
      {blocked && !draft && (
        <button disabled={busy} onClick={() => void load()}>
          Reload before continuing
        </button>
      )}
      <DocumentWorkspacePresentation
        documents={docs}
        visibleDocuments={shown}
        selected={current}
        category={category || null}
        query={query}
        onQuery={setQuery}
        onCategory={(value) => setCategory(value || "")}
        onSelect={(doc) => select(doc.slug)}
        disabled={busy}
        headings={extractMarkdownHeadings(current?.content || "")}
        actions={
          <>
            <button disabled={busy || blocked} onClick={() => edit(current)}>
              Edit document
            </button>
            <button disabled={busy || blocked} onClick={() => void remove()}>
              <Trash2 size={16} /> Delete
            </button>
          </>
        }
        empty={
          collection
            ? selected
              ? "This document is not available. Select one from the library."
              : "Select a document or create a new one."
            : busy
              ? "Loading document library…"
              : "Document library unavailable. Reload saved documents to try again."
        }
        reader={
          <div
            className="doc-markdown"
            onClick={onMarkdownClick}
            dangerouslySetInnerHTML={{ __html: savedHtml }}
          />
        }
      />
      {draft && (
        <dialog
          ref={editorDialog}
          className="doc-editor-sheet"
          aria-labelledby="doc-editor-title"
          onCancel={(event) => {
            event.preventDefault();
            closeEditor();
          }}
        >
          {error && (
            <p role="alert" className="doc-message">
              {error}
            </p>
          )}
          {notice && <p role="status">{notice}</p>}
          {busy && <p role="status">Working…</p>}
          <form onSubmit={save}>
            <h2 id="doc-editor-title">
              {draft.id ? "Edit document" : "New document"}
            </h2>
            {draft.id && !reservation.owned && (
              <p role="alert">
                {reservation.error ||
                  (reservation.holder
                    ? `${reservation.holder} is editing this document.`
                    : "Waiting for an edit reservation.")}{" "}
                Your draft stays here.{" "}
                <button
                  type="button"
                  onClick={() => void reservation.acquire()}
                >
                  Retry reservation
                </button>
              </p>
            )}
            <fieldset disabled={busy}>
              <div className="doc-fields">
                <label>
                  Title
                  <input
                    required
                    maxLength={255}
                    value={draft.fields.title}
                    onChange={(e) => patch({ title: e.target.value })}
                  />
                </label>
                <label>
                  Slug
                  <input
                    required
                    pattern="[a-z0-9]+(-[a-z0-9]+)*"
                    maxLength={160}
                    value={draft.fields.slug}
                    onChange={(e) => patch({ slug: e.target.value })}
                  />
                </label>
                <label>
                  Category
                  <input
                    required
                    maxLength={120}
                    value={draft.fields.category}
                    onChange={(e) => patch({ category: e.target.value })}
                  />
                </label>
                <label>
                  Sort order
                  <input
                    type="number"
                    required
                    min={-100000}
                    max={100000}
                    step={1}
                    value={draft.fields.sortOrder}
                    onChange={(e) =>
                      patch({ sortOrder: Number(e.target.value) })
                    }
                  />
                </label>
              </div>
              <label className="doc-published">
                <input
                  type="checkbox"
                  checked={draft.fields.isPublished}
                  onChange={(e) => patch({ isPublished: e.target.checked })}
                />{" "}
                Published in the private documentation library
              </label>
              <label>
                Markdown content
                <textarea
                  rows={20}
                  maxLength={500000}
                  value={draft.fields.content}
                  onChange={(e) => patch({ content: e.target.value })}
                />
              </label>
              <div className="doc-toolbar">
                <button type="submit" disabled={blocked || !reservation.owned}>
                  <Save size={16} /> Save document
                </button>
                <button
                  type="button"
                  onClick={() => setPreview(!preview)}
                  aria-expanded={preview}
                >
                  {preview ? "Hide" : "Show"} preview
                </button>
                <button type="button" onClick={() => void load()}>
                  Reload saved documents
                </button>
                <button type="button" onClick={downloadDraft}>
                  <Download size={16} /> Download draft
                </button>
                <button type="button" onClick={closeEditor}>
                  Close editor
                </button>
              </div>
            </fieldset>
          </form>
          {preview && (
            <div
              className="doc-markdown doc-editor-preview"
              onClick={onMarkdownClick}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )}
        </dialog>
      )}
    </article>
  );
}

import {
  StructuredWebsiteEditorPresentation,
  type StructuredWebsitePrimitives,
} from "../../../../platform/p1-core/client/src/components/shared/structured-website-editor-presentation";
import { formPrimitives } from "./forms-primitives";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  listWebsiteContent,
  getWebsiteContent,
  getWebsiteContentRevisions,
  saveWebsiteContentDraft,
  publishWebsiteContent,
  restoreWebsiteContentRevision,
} from "@workspace/api-client-react/dashboard";
import type {
  WebsiteContent,
  WebsiteContentEntry,
  WebsiteContentRevision,
} from "../../../../lib/api-client-react/src/dashboard/models";
import { useCmsUnsavedChanges } from "./useCmsUnsavedChanges";
import "./website-editor.css";
import { MediaLibrary } from "./MediaLibrary";

function message(error: unknown) {
  const payload = (error as { data?: { message?: string; error?: string } })
    .data;
  return (
    payload?.message ||
    payload?.error ||
    (error as Error).message ||
    "Website request failed"
  );
}
function pathParts(path: string) {
  const parts = path.split(".");
  if (
    parts.some(
      (part) =>
        !part || ["__proto__", "constructor", "prototype"].includes(part),
    )
  )
    throw Error("Unsupported content field");
  return parts;
}
function valueAt(content: Record<string, unknown>, path: string) {
  let value: unknown = content;
  for (const part of pathParts(path)) {
    if (!value || typeof value !== "object" || Array.isArray(value)) return "";
    value = (value as Record<string, unknown>)[part];
  }
  return typeof value === "string" ? value : "";
}
function setValue(
  content: Record<string, unknown>,
  path: string,
  value: string,
) {
  const next = structuredClone(content),
    parts = pathParts(path);
  let cursor = next;
  for (const part of parts.slice(0, -1)) {
    const child = cursor[part];
    cursor[part] =
      child && typeof child === "object" && !Array.isArray(child) ? child : {};
    cursor = cursor[part] as Record<string, unknown>;
  }
  cursor[parts[parts.length - 1]] = value;
  return next;
}
function Preview({
  data,
  content,
}: {
  data: WebsiteContent;
  content: Record<string, unknown>;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const url = useMemo(() => {
    try {
      const value = new URL(data.previewUrl);
      return value.protocol === "https:" &&
        !value.username &&
        !value.password &&
        value.searchParams.has("cmsPreview")
        ? value
        : null;
    } catch {
      return null;
    }
  }, [data.previewUrl]);
  const payload = useMemo(
    () => ({
      type: "core-platform:client-site-preview",
      protocolVersion: "1.0",
      clientStackId: data.stackId,
      routeId: data.route.id,
      componentKey: data.component.key,
      revision: data.draftRevision,
      content,
    }),
    [data, content],
  );
  const send = useCallback(() => {
    if (url) frame.current?.contentWindow?.postMessage(payload, url.origin);
  }, [payload, url]);
  useEffect(send, [send]);
  useEffect(() => {
    const ready = (event: MessageEvent) => {
      const value = event.data;
      if (
        url &&
        event.origin === url.origin &&
        event.source === frame.current?.contentWindow &&
        value?.type === "core-platform:client-site-preview-ready" &&
        value.protocolVersion === "1.0" &&
        value.clientStackId === data.stackId &&
        value.routeId === data.route.id &&
        value.componentKey === data.component.key
      )
        send();
    };
    window.addEventListener("message", ready);
    return () => window.removeEventListener("message", ready);
  }, [data, send, url]);
  if (!url)
    return <p role="alert">A secure website preview URL is unavailable.</p>;
  return (
    <iframe
      ref={frame}
      src={url.href}
      title="P1 website preview"
      sandbox="allow-same-origin allow-scripts"
      onLoad={send}
    />
  );
}

function ContentEditor({
  entry,
  canUseMedia,
  canUseBlog,
}: {
  entry: WebsiteContentEntry;
  canUseMedia: boolean;
  canUseBlog: boolean;
}) {
  const [imageField, setImageField] = useState<string | null>(null);
  const picker = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (imageField) picker.current?.showModal();
    else picker.current?.close();
  }, [imageField]);
  const [data, setData] = useState<WebsiteContent | null>(null),
    [content, setContent] = useState<Record<string, unknown>>({}),
    [revisions, setRevisions] = useState<WebsiteContentRevision[]>([]);
  const [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [search, setSearch] = useState("");
  const abort = useRef(new AbortController()),
    alive = useRef(true);
  const dirty = Boolean(
    data && JSON.stringify(data.draftContent) !== JSON.stringify(content),
  );
  useCmsUnsavedChanges(dirty);
  const history = async () => {
    const rows = await getWebsiteContentRevisions(
      entry.routeId,
      entry.componentKey,
      { signal: abort.current.signal },
    );
    if (alive.current) setRevisions(rows);
  };
  const load = async () => {
    const [next, rows] = await Promise.all([
      getWebsiteContent(entry.routeId, entry.componentKey, {
        signal: abort.current.signal,
      }),
      getWebsiteContentRevisions(entry.routeId, entry.componentKey, {
        signal: abort.current.signal,
      }),
    ]);
    if (alive.current) {
      setData(next);
      setContent(next.draftContent);
      setRevisions(rows);
    }
  };
  useEffect(() => {
    alive.current = true;
    abort.current = new AbortController();
    void load()
      .catch((e) => {
        if (alive.current) setError(message(e));
      })
      .finally(() => {
        if (alive.current) setLoading(false);
      });
    return () => {
      alive.current = false;
      abort.current.abort();
    };
  }, []);
  const working = useRef(false);
  const perform = async (work: () => Promise<void>, mutation = true) => {
    if (working.current || (mutation && data?.ownedBlog)) return;
    working.current = true;
    setBusy(true);
    setImageField(null);
    setError("");
    setNotice("");
    try {
      await work();
    } catch (e) {
      if (alive.current) setError(message(e));
    } finally {
      working.current = false;
      if (alive.current) setBusy(false);
    }
  };
  const apply = async (next: WebsiteContent, text: string) => {
    if (alive.current) {
      setData(next);
      setContent(next.draftContent);
      setNotice(text);
      await history();
    }
  };
  if (loading)
    return (
      <section>
        <h1>Website Content</h1>
        <p role="status">Loading website editor…</p>
      </section>
    );
  const reload = () => {
    if (
      !dirty ||
      window.confirm("Discard local edits and reload the latest revision?")
    )
      void perform(load, false);
  };
  return (
    <section
      className="website-content-editor"
      aria-label="Website content editor"
    >
      <dialog
        ref={picker}
        className="media-picker"
        onCancel={() => setImageField(null)}
        aria-label="Choose website image"
      >
        <button type="button" onClick={() => setImageField(null)}>
          Close image picker
        </button>
        {imageField && canUseMedia && (
          <MediaLibrary
            acceptAsset={(asset) => {
              if (
                !asset.mimeType.startsWith("image/") ||
                /[\\\s\u0000-\u001f\u007f]/.test(asset.url)
              )
                return false;
              if (/^\/(?!\/)/.test(asset.url)) return true;
              try {
                const url = new URL(asset.url);
                const field = data?.component.fields.find(
                  (f) => f.path === imageField,
                );
                return (
                  url.protocol === "https:" &&
                  !url.username &&
                  !url.password &&
                  url.origin === "https://www.p1landmanagement.com" &&
                  (field?.allowedImageOrigins === undefined ||
                    field.allowedImageOrigins.includes(url.origin))
                );
              } catch {
                return false;
              }
            }}
            onSelect={(asset) => {
              setContent(setValue(content, imageField, asset.url));
              setImageField(null);
            }}
          />
        )}
      </dialog>
      {data ? (
        <StructuredWebsiteEditorPresentation
          ui={formPrimitives as unknown as StructuredWebsitePrimitives}
          draftRevision={data.draftRevision}
          publishedRevision={data.publishedRevision}
          dirty={dirty}
          context={
            <p className="text-sm text-muted-foreground">
              {entry.label} · {entry.path}
            </p>
          }
          alerts={
            <>
              {error && (
                <p role="alert">{error} Your unsaved content is retained.</p>
              )}
              {notice && <p role="status">{notice}</p>}
              {data.ownedBlog && (
                <p role="status">
                  This article is managed in Blog. These Website fields and
                  revisions are archived and no longer affect the article.{" "}
                  {canUseBlog && (
                    <a
                      href={`/marketing/content/blog?post=${encodeURIComponent(data.ownedBlog.postId)}`}
                    >
                      Open Blog editor
                    </a>
                  )}
                </p>
              )}
            </>
          }
          toolbar={
            <button disabled={busy} onClick={reload}>
              Reload latest revision
            </button>
          }
          fields={data.component.fields.filter((field) =>
            `${field.label} ${field.path}`
              .toLowerCase()
              .includes(search.toLowerCase()),
          )}
          revisions={revisions}
          valueAt={(path) => valueAt(content, path)}
          onChange={(path, value) => {
            if (!data.ownedBlog) setContent(setValue(content, path, value));
          }}
          fieldTools={
            <label>
              Find a field
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Title, image, link…"
              />
            </label>
          }
          fieldAction={(field) =>
            field.type === "image" && canUseMedia && !data.ownedBlog ? (
              <button type="button" onClick={() => setImageField(field.path)}>
                Choose image for {field.label}
              </button>
            ) : null
          }
          busy={busy || !!data.ownedBlog}
          saveDisabled={!dirty && data.draftRevision > 0}
          publishDisabled={
            dirty ||
            data.draftRevision === 0 ||
            data.publishedRevision === data.draftRevision
          }
          onSave={() =>
            void perform(async () =>
              apply(
                await saveWebsiteContentDraft(
                  entry.routeId,
                  entry.componentKey,
                  { content, expectedRevision: data.draftRevision },
                  { signal: abort.current.signal },
                ),
                "Draft saved. Publish when it is ready for the website.",
              ),
            )
          }
          onPublish={() => {
            if (
              window.confirm("Publish this saved revision to the P1 website?")
            )
              void perform(async () =>
                apply(
                  await publishWebsiteContent(
                    entry.routeId,
                    entry.componentKey,
                    { expectedRevision: data.draftRevision },
                    { signal: abort.current.signal },
                  ),
                  "Website content published.",
                ),
              );
          }}
          onRestore={(revision) => {
            if (
              !dirty ||
              window.confirm(
                "Discard local changes and restore this revision as a draft?",
              )
            )
              void perform(async () =>
                apply(
                  await restoreWebsiteContentRevision(
                    entry.routeId,
                    entry.componentKey,
                    revision,
                    { expectedRevision: data.draftRevision },
                    { signal: abort.current.signal },
                  ),
                  "Revision restored as a new draft. The published website is unchanged.",
                ),
              );
          }}
          preview={
            <>
              <p className="text-sm text-muted-foreground">
                {data.ownedBlog
                  ? "This preview shows the Blog-managed article; archived Website fields do not change it."
                  : "Draft changes appear here. Publishing is a separate action."}
              </p>
              <Preview data={data} content={content} />
            </>
          }
        />
      ) : (
        <>
          <h1>Website Content</h1>
          {error && <p role="alert">{error}</p>}
          <button disabled={busy} onClick={reload}>
            Reload latest revision
          </button>
        </>
      )}
    </section>
  );
}

export default function WebsiteEditor({
  canUseMedia = false,
  canUseBlog = false,
}: {
  canUseMedia?: boolean;
  canUseBlog?: boolean;
}) {
  const [entries, setEntries] = useState<WebsiteContentEntry[]>([]),
    [selected, setSelected] = useState<WebsiteContentEntry | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [search, setSearch] = useState("");
  useEffect(() => {
    const abort = new AbortController();
    listWebsiteContent({ signal: abort.signal })
      .then((rows) => {
        if (abort.signal.aborted) return;
        setEntries(rows);
        const query = new URLSearchParams(location.search);
        setSelected(
          rows.find(
            (row) =>
              row.routeId === query.get("routeId") &&
              row.componentKey === query.get("componentKey"),
          ) || null,
        );
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError(message(e));
      })
      .finally(() => {
        if (!abort.signal.aborted) setLoading(false);
      });
    return () => abort.abort();
  }, []);
  const select = (entry: WebsiteContentEntry | null) => {
    if (
      !window.dispatchEvent(
        new Event("p1:before-navigation", { cancelable: true }),
      )
    )
      return;
    setSelected(entry);
    const url = new URL(location.href);
    if (entry) {
      url.searchParams.set("routeId", entry.routeId);
      url.searchParams.set("componentKey", entry.componentKey);
    } else {
      url.searchParams.delete("routeId");
      url.searchParams.delete("componentKey");
    }
    history.replaceState(null, "", url.pathname + url.search);
  };
  return (
    <div className="website-editor structured-website-presentation">
      {!selected && <h1>Website Content</h1>}
      <p className="muted">
        Edit P1 page content, page SEO, shared navigation and business details.
        Drafts and published revisions remain separate.
      </p>
      {error && <p role="alert">{error}</p>}
      {loading ? (
        <p role="status">Loading website content…</p>
      ) : selected ? (
        <>
          <button onClick={() => select(null)}>All website content</button>
          <ContentEditor
            key={`${selected.routeId}:${selected.componentKey}`}
            entry={selected}
            canUseMedia={canUseMedia}
            canUseBlog={canUseBlog}
          />
        </>
      ) : (
        <>
          <label>
            Find website content
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <div className="website-content-list">
            {entries
              .filter((row) =>
                `${row.path} ${row.label}`
                  .toLowerCase()
                  .includes(search.toLowerCase()),
              )
              .map((row) => (
                <button
                  key={`${row.routeId}:${row.componentKey}`}
                  onClick={() => select(row)}
                >
                  <strong>{row.label}</strong>
                  <span>{row.path}</span>
                </button>
              ))}
          </div>
        </>
      )}
    </div>
  );
}

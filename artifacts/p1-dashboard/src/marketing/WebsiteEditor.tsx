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

function ContentEditor({ entry }: { entry: WebsiteContentEntry }) {
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
  const perform = async (work: () => Promise<void>) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work();
    } catch (e) {
      if (alive.current) setError(message(e));
    } finally {
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
  if (loading) return <p role="status">Loading website editor…</p>;
  return (
    <section
      className="website-content-editor"
      aria-label="Website content editor"
    >
      {error && <p role="alert">{error} Your unsaved content is retained.</p>}
      {notice && <p role="status">{notice}</p>}
      <button
        disabled={busy}
        onClick={() => {
          if (
            !dirty ||
            window.confirm(
              "Discard local edits and reload the latest revision?",
            )
          )
            void perform(load);
        }}
      >
        Reload latest revision
      </button>
      {data && (
        <>
          <header>
            <h2>{entry.label}</h2>
            <p>
              Draft r{data.draftRevision} · Published{" "}
              {data.publishedRevision === null
                ? "never"
                : `r${data.publishedRevision}`}
              {dirty ? " · Unsaved changes" : ""}
            </p>
          </header>
          <div className="website-editor-columns">
            <div>
              <form
                onSubmit={(event) => {
                  event.preventDefault();
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
                  );
                }}
              >
                <fieldset disabled={busy}>
                  <legend>Editable content</legend>
                  <label>
                    Find a field
                    <input
                      type="search"
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Title, image, link…"
                    />
                  </label>
                  {data.component.fields
                    .filter((field) =>
                      `${field.label} ${field.path}`
                        .toLowerCase()
                        .includes(search.toLowerCase()),
                    )
                    .map((field) => {
                      const value = valueAt(content, field.path),
                        id = `website-field-${field.path.replaceAll(".", "-")}`;
                      const common = {
                        id,
                        value,
                        maxLength: field.maxLength,
                        required: field.required,
                        onChange: (
                          event: React.ChangeEvent<
                            HTMLInputElement | HTMLTextAreaElement
                          >,
                        ) =>
                          setContent(
                            setValue(content, field.path, event.target.value),
                          ),
                      };
                      return (
                        <div className="website-field" key={field.path}>
                          <label htmlFor={id}>{field.label}</label>
                          {field.type === "textarea" ? (
                            <textarea {...common} rows={4} />
                          ) : (
                            <input {...common} />
                          )}
                          {field.maxLength && (
                            <small>
                              {value.length}/{field.maxLength}
                            </small>
                          )}
                        </div>
                      );
                    })}
                  <div className="website-editor-actions">
                    <button
                      type="submit"
                      disabled={!dirty && data.draftRevision > 0}
                    >
                      Save draft
                    </button>
                    <button
                      type="button"
                      disabled={
                        dirty ||
                        data.draftRevision === 0 ||
                        data.publishedRevision === data.draftRevision
                      }
                      onClick={() => {
                        if (
                          window.confirm(
                            "Publish this saved revision to the P1 website?",
                          )
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
                    >
                      Publish
                    </button>
                  </div>
                </fieldset>
              </form>
              <section
                className="website-revisions"
                aria-label="Revision history"
              >
                <h3>Revision history</h3>
                {!revisions.length && <p>No saved revisions yet.</p>}
                {revisions.map((row) => (
                  <div key={row.id}>
                    <span>
                      r{row.revision} · {row.kind}
                    </span>
                    <button
                      disabled={busy}
                      onClick={() => {
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
                                row.revision,
                                { expectedRevision: data.draftRevision },
                                { signal: abort.current.signal },
                              ),
                              "Revision restored as a new draft. The published website is unchanged.",
                            ),
                          );
                      }}
                    >
                      Restore r{row.revision}
                    </button>
                  </div>
                ))}
              </section>
            </div>
            <section className="website-preview" aria-label="Live preview">
              <h3>Live preview</h3>
              <p className="muted">
                Draft changes appear here. Publishing is a separate action.
              </p>
              <Preview data={data} content={content} />
            </section>
          </div>
        </>
      )}
    </section>
  );
}
export default function WebsiteEditor() {
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
    <div className="website-editor">
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

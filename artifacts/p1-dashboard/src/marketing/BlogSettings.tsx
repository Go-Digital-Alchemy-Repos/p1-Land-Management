import { useEffect, useRef, useState } from "react";
import {
  listMarketingBlogTaxonomies,
  createMarketingBlogTaxonomy,
  updateMarketingBlogTaxonomy,
  deleteMarketingBlogTaxonomy,
  getMarketingBlogCommentSettings,
  saveMarketingBlogCommentSettings,
  listMarketingBlogComments,
  updateMarketingBlogComment,
  setMarketingBlogCommentStatus,
  deleteMarketingBlogComment,
} from "@workspace/api-client-react/dashboard";
import type {
  MarketingBlogTaxonomy,
  MarketingBlogTaxonomyInput,
  MarketingBlogComment,
  MarketingBlogCommentSettings,
} from "../../../../lib/api-client-react/src/dashboard/models";
import { useCmsUnsavedChanges } from "./useCmsUnsavedChanges";
import { FolderTree, Tag, MessageSquare, ShieldCheck } from "lucide-react";

// A pending write must finish before a tab/filter can unmount its result.
function usePendingNavigation(busy: boolean) {
  useEffect(() => {
    if (!busy) return;
    const block = (event: Event) => {
      event.preventDefault();
      if (event.type === "beforeunload")
        (event as BeforeUnloadEvent).returnValue = "";
    };
    window.addEventListener("p1:before-navigation", block);
    window.addEventListener("beforeunload", block);
    return () => {
      window.removeEventListener("p1:before-navigation", block);
      window.removeEventListener("beforeunload", block);
    };
  }, [busy]);
}
function taxonomyInput(
  row: MarketingBlogTaxonomyInput,
): MarketingBlogTaxonomyInput {
  return {
    name: row.name,
    slug: row.slug ?? "",
    type: row.type,
    parentId: row.parentId ?? null,
    sortOrder: row.sortOrder ?? 0,
  };
}
function categoryPath(
  row: MarketingBlogTaxonomy,
  rows: MarketingBlogTaxonomy[],
) {
  const names = [row.name],
    seen = new Set([row.id]);
  let parent = row.parentId;
  while (parent && !seen.has(parent)) {
    seen.add(parent);
    const item = rows.find((r) => r.id === parent);
    if (!item) break;
    names.unshift(item.name);
    parent = item.parentId;
  }
  return names.join(" / ");
}
const message = (e: unknown) =>
  (e as { data?: { message?: string } }).data?.message ||
  (e as Error).message ||
  "Request failed";
const fresh: MarketingBlogTaxonomyInput = {
  name: "",
  slug: "",
  type: "category",
  parentId: null,
  sortOrder: 0,
};
export function BlogTaxonomies() {
  const [rows, setRows] = useState<MarketingBlogTaxonomy[]>([]),
    [draft, setDraft] = useState(fresh),
    [saved, setSaved] = useState(fresh),
    [id, setId] = useState<string | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [version, setVersion] = useState(0);
  const [loaded, setLoaded] = useState(false),
    [loading, setLoading] = useState(true),
    [uncertain, setUncertain] = useState(false),
    [reviewed, setReviewed] = useState(false);
  const gate = useRef(false);
  usePendingNavigation(busy);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  useCmsUnsavedChanges(dirty || uncertain);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    listMarketingBlogTaxonomies({ signal: controller.signal })
      .then((next) => {
        if (!controller.signal.aborted) {
          setRows(next);
          setLoaded(true);
          setReviewed(true);
          setError("");
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) {
          setLoaded(false);
          setError(message(e));
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [version]);
  function choose(row?: MarketingBlogTaxonomy) {
    if (gate.current || !loaded || (uncertain && !row)) return;
    if (dirty && !confirm("Discard taxonomy changes?")) return;
    const next = row
      ? {
          name: row.name,
          slug: row.slug,
          type: row.type,
          parentId: row.parentId,
          sortOrder: row.sortOrder,
        }
      : fresh;
    setId(row?.id || null);
    setDraft(next);
    setSaved(next);
    setError("");
    setUncertain(false);
  }
  function allowedParent(row: MarketingBlogTaxonomy) {
    const visited = new Set<string>();
    let current: MarketingBlogTaxonomy | undefined = row;
    while (current) {
      if (current.id === id || visited.has(current.id)) return false;
      visited.add(current.id);
      current = rows.find((r) => r.id === current?.parentId);
    }
    return row.type === "category";
  }
  return (
    <section>
      <h2>Categories and tags</h2>
      {error && <p role="alert">{error}</p>}
      <button
        disabled={busy || !loaded || loading || uncertain}
        onClick={() => choose()}
      >
        New category or tag
      </button>
      <button
        disabled={busy || loading}
        onClick={() => setVersion((v) => v + 1)}
      >
        Reload taxonomies
      </button>
      {loading && <p role="status">Loading taxonomies…</p>}
      {uncertain && (
        <aside role="alert">
          The create could not be confirmed. Your draft is retained. Reload the
          list and inspect it before creating again; select a saved item if the
          request succeeded.
          <button
            disabled={!reviewed || !loaded || busy}
            onClick={() => {
              if (
                confirm(
                  "I reviewed the reloaded list and confirmed this taxonomy was not created. Allow another create?",
                )
              )
                setUncertain(false);
            }}
          >
            I checked the list; allow another create
          </button>
        </aside>
      )}
      <div className="blog-list">
        {(["category", "tag"] as const).map((type) => (
          <article key={type}>
            <h3>
              {type === "category" ? (
                <FolderTree size={18} color="#8b5cf6" aria-hidden="true" />
              ) : (
                <Tag size={18} color="#8b5cf6" aria-hidden="true" />
              )}{" "}
              {type === "category" ? "Categories" : "Tags"}
            </h3>
            <p>
              {type === "category"
                ? "Create top-level categories and subcategories for your blog posts."
                : "Manage reusable tags that editors can assign across multiple posts."}
            </p>
            {loaded && !rows.some((row) => row.type === type) && (
              <p>No {type === "category" ? "categories" : "tags"} yet.</p>
            )}
            {rows
              .filter((row) => row.type === type)
              .map((row) => (
                <article key={row.id}>
                  <h4>
                    {type === "category" ? categoryPath(row, rows) : row.name}
                  </h4>
                  <p>
                    {row.parentId ? "Subcategory · " : ""}
                    {row.type} · /{row.slug}
                  </p>
                  <button
                    disabled={busy || !loaded || loading}
                    onClick={() => choose(row)}
                  >
                    Edit {row.name}
                  </button>
                </article>
              ))}
          </article>
        ))}
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (gate.current || !loaded || loading || uncertain) return;
          gate.current = true;
          setBusy(true);
          setError("");
          try {
            const payload = {
              ...draft,
              parentId: draft.type === "category" ? draft.parentId : null,
            };
            const result = id
              ? await updateMarketingBlogTaxonomy(id, payload)
              : await createMarketingBlogTaxonomy(payload);
            setId(result.id);
            setDraft(taxonomyInput(result));
            setSaved(taxonomyInput(result));
            setVersion((v) => v + 1);
          } catch (e) {
            if (!id) {
              setUncertain(true);
              setReviewed(false);
            }
            setError(message(e));
          } finally {
            gate.current = false;
            setBusy(false);
          }
        }}
      >
        <fieldset disabled={busy || !loaded || loading || uncertain}>
          <legend>{id ? "Edit taxonomy" : "New taxonomy"}</legend>
          <label>
            Name
            <input
              required
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </label>
          <label>
            Slug
            <input
              value={draft.slug || ""}
              onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
            />
          </label>
          <label>
            Type
            <select
              value={draft.type}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  type: e.target.value as "category" | "tag",
                  parentId: null,
                })
              }
            >
              <option value="category">Category</option>
              <option value="tag">Tag</option>
            </select>
          </label>
          {draft.type === "category" && (
            <label>
              Parent category
              <select
                aria-label="Parent category"
                value={draft.parentId || ""}
                onChange={(e) =>
                  setDraft({ ...draft, parentId: e.target.value || null })
                }
              >
                <option value="">None</option>
                {rows.filter(allowedParent).map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
            </label>
          )}
          <label>
            Sort order
            <input
              type="number"
              step="1"
              value={draft.sortOrder || 0}
              onChange={(e) =>
                setDraft({ ...draft, sortOrder: Number(e.target.value) })
              }
            />
          </label>
          <button type="submit">Save taxonomy</button>
          {id && (
            <button
              type="button"
              onClick={async () => {
                if (gate.current) return;
                if (
                  !confirm(
                    "Delete this taxonomy option? Child categories become top-level. Legacy post references are updated; immutable publication snapshots retain their labels until explicitly edited.",
                  )
                )
                  return;
                gate.current = true;
                setBusy(true);
                try {
                  await deleteMarketingBlogTaxonomy(id);
                  setId(null);
                  setDraft(fresh);
                  setSaved(fresh);
                  setVersion((v) => v + 1);
                } catch (e) {
                  setError(message(e));
                } finally {
                  gate.current = false;
                  setBusy(false);
                }
              }}
            >
              Delete taxonomy
            </button>
          )}
        </fieldset>
      </form>
    </section>
  );
}
const labels: Record<string, string> = {
  commentsEnabled: "Enable comments",
  allowGuestComments: "Allow guest comments",
  allowLinksInComments: "Allow links in comments",
  requireApproval: "Require approval",
  enableSpamProtection: "Enable spam protection",
  enableHoneypot: "Enable honeypot",
  enableRateLimit: "Enable rate limit",
};
export function BlogCommentSettings() {
  const [draft, setDraft] = useState<MarketingBlogCommentSettings | null>(null),
    [saved, setSaved] = useState<MarketingBlogCommentSettings | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  const gate = useRef(false);
  usePendingNavigation(busy);
  useCmsUnsavedChanges(JSON.stringify(draft) !== JSON.stringify(saved));
  useEffect(() => {
    const c = new AbortController();
    setError("");
    getMarketingBlogCommentSettings({ signal: c.signal })
      .then((r) => {
        if (c.signal.aborted) return;
        setDraft(r.settings);
        setSaved(r.settings);
      })
      .catch((e) => {
        if (!c.signal.aborted) setError(message(e));
      });
    return () => c.abort();
  }, [reload]);
  return (
    <section>
      <h2>
        <MessageSquare size={18} color="#8b5cf6" aria-hidden="true" /> Comment
        settings
      </h2>
      <p>
        Configure participation and moderation rules. These settings do not add
        a comment interface to the P1 public website.
      </p>
      {!draft && (
        <button disabled={busy} onClick={() => setReload((v) => v + 1)}>
          Retry loading settings
        </button>
      )}
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {draft ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (gate.current) return;
            gate.current = true;
            setBusy(true);
            setError("");
            setNotice("");
            try {
              const next = await saveMarketingBlogCommentSettings(draft);
              setDraft(next);
              setSaved(next);
              setNotice("Comment settings saved.");
            } catch (e) {
              setError(message(e));
            } finally {
              gate.current = false;
              setBusy(false);
            }
          }}
        >
          <fieldset disabled={busy}>
            {[
              {
                title: "Comment availability",
                description: "Set the comment service availability.",
                keys: ["commentsEnabled"],
              },
              {
                title: "Participation Rules",
                description:
                  "Decide who can post and how visible comments become.",
                keys: [
                  "allowGuestComments",
                  "requireApproval",
                  "allowLinksInComments",
                ],
              },
              {
                title: "Spam Protection",
                description:
                  "Use practical safeguards for unwanted submissions.",
                keys: [
                  "enableSpamProtection",
                  "enableHoneypot",
                  "enableRateLimit",
                ],
              },
            ].map((group) => (
              <fieldset key={group.title}>
                <legend>{group.title}</legend>
                <p>{group.description}</p>
                {group.keys.map((key) => (
                  <label key={key}>
                    <input
                      type="checkbox"
                      checked={Boolean(
                        draft[key as keyof MarketingBlogCommentSettings],
                      )}
                      onChange={(e) =>
                        setDraft({ ...draft, [key]: e.target.checked })
                      }
                    />
                    {labels[key]}
                  </label>
                ))}
              </fieldset>
            ))}
            <label>
              Seconds between comments
              <input
                required
                type="number"
                min="10"
                max="86400"
                step="1"
                value={draft.rateLimitSeconds}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    rateLimitSeconds: Number(e.target.value),
                  })
                }
              />
            </label>
            <label>
              Maximum links per comment
              <input
                required
                type="number"
                min="0"
                max="20"
                step="1"
                value={draft.maxLinksPerComment}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    maxLinksPerComment: Number(e.target.value),
                  })
                }
              />
            </label>
            <button>Save comment settings</button>
          </fieldset>
        </form>
      ) : (
        !error && <p role="status">Loading settings…</p>
      )}
    </section>
  );
}
function CommentCard({
  row,
  onChanged,
}: {
  row: MarketingBlogComment;
  onChanged: (next: MarketingBlogComment | null) => void;
}) {
  const [body, setBody] = useState(row.body),
    [note, setNote] = useState(row.moderationNote || ""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const gate = useRef(false);
  usePendingNavigation(busy);
  useCmsUnsavedChanges(
    body !== row.body || note !== (row.moderationNote || ""),
  );
  async function run(action: () => Promise<MarketingBlogComment | null>) {
    if (gate.current) return;
    gate.current = true;
    setBusy(true);
    setError("");
    try {
      const next = await action();
      if (next) {
        setBody(next.body);
        setNote(next.moderationNote || "");
      }
      onChanged(next);
    } catch (e) {
      setError(message(e));
    } finally {
      gate.current = false;
      setBusy(false);
    }
  }
  return (
    <article>
      <h3>{row.postTitle || "Blog comment"}</h3>
      <p>
        {row.authorName} {row.authorEmail ? `(${row.authorEmail})` : ""} ·{" "}
        {row.status}
      </p>
      {row.createdAt && (
        <p>{new Date(row.createdAt).toLocaleString("en-US")}</p>
      )}
      {error && <p role="alert">{error}</p>}
      <fieldset disabled={busy}>
        <label>
          Comment body
          <textarea value={body} onChange={(e) => setBody(e.target.value)} />
        </label>
        <label>
          Moderation note
          <textarea value={note} onChange={(e) => setNote(e.target.value)} />
        </label>
        <button
          disabled={!body.trim()}
          onClick={() =>
            run(() =>
              updateMarketingBlogComment(row.id, {
                body,
                moderationNote: note,
              }),
            )
          }
        >
          Save comment
        </button>
        {(["pending", "approved", "rejected", "spam"] as const).map(
          (status) => (
            <button
              key={status}
              disabled={status === row.status}
              onClick={() => {
                if (body !== row.body) {
                  setError(
                    "Save the edited comment before changing its status.",
                  );
                  return;
                }
                void run(() =>
                  setMarketingBlogCommentStatus(row.id, {
                    status,
                    moderationNote: note,
                  }),
                );
              }}
            >
              {status}
            </button>
          ),
        )}
        <button
          onClick={() => {
            if (confirm("Permanently delete this comment?"))
              void run(async () => {
                await deleteMarketingBlogComment(row.id);
                return null;
              });
          }}
        >
          Delete comment
        </button>
      </fieldset>
    </article>
  );
}
export function BlogComments() {
  const [rows, setRows] = useState<MarketingBlogComment[]>([]),
    [error, setError] = useState(""),
    [status, setStatus] = useState("all"),
    [loading, setLoading] = useState(true),
    [revision, setRevision] = useState(0),
    [counts, setCounts] = useState<Record<string, number> | null>(null),
    [countRevision, setCountRevision] = useState(0);
  useEffect(() => {
    const c = new AbortController();
    setLoading(true);
    setError("");
    listMarketingBlogComments(
      status === "all" ? undefined : { status: status as "pending" },
      { signal: c.signal },
    )
      .then((next) => {
        if (!c.signal.aborted) setRows(next);
      })
      .catch((e) => {
        if (!c.signal.aborted) setError(message(e));
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => c.abort();
  }, [status, revision]);
  useEffect(() => {
    const c = new AbortController();
    setCounts(null);
    getMarketingBlogCommentSettings({ signal: c.signal })
      .then((r) => {
        if (!c.signal.aborted) setCounts(r.statusCounts);
      })
      .catch(() => {
        if (!c.signal.aborted) setCounts(null);
      });
    return () => c.abort();
  }, [status, revision, countRevision]);
  return (
    <section>
      <h2>
        <ShieldCheck size={18} color="#8b5cf6" aria-hidden="true" /> Comment
        moderation
      </h2>
      <p>
        Review pending comments, approve good ones, and keep spam out of public
        posts.
      </p>
      <button
        onClick={() => {
          if (
            window.dispatchEvent(
              new Event("p1:before-navigation", { cancelable: true }),
            )
          )
            setRevision((v) => v + 1);
        }}
      >
        Reload comments
      </button>
      <label>
        Comment status
        <select
          value={status}
          onChange={(e) => {
            if (
              window.dispatchEvent(
                new Event("p1:before-navigation", { cancelable: true }),
              )
            )
              setStatus(e.target.value);
          }}
        >
          {["all", "pending", "approved", "rejected", "spam"].map((s) => (
            <option key={s} value={s}>
              {s}
              {counts && s !== "all" ? ` (${counts[s] ?? 0})` : ""}
            </option>
          ))}
        </select>
      </label>
      {error && <p role="alert">{error}</p>}
      {loading ? (
        <p role="status">Loading comments…</p>
      ) : error ? null : (
        <div className="blog-list">
          {rows.map((row) => (
            <CommentCard
              key={row.id}
              row={row}
              onChanged={(next) => {
                setCounts(null);
                setCountRevision((v) => v + 1);
                setRows((current) =>
                  current.flatMap((item) =>
                    item.id !== row.id
                      ? [item]
                      : next && (status === "all" || next.status === status)
                        ? [{ ...item, ...next }]
                        : [],
                  ),
                );
              }}
            />
          ))}
          {!rows.length && <p>No comments match this status.</p>}
        </div>
      )}
    </section>
  );
}

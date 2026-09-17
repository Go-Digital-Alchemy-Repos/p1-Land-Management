import { useEffect, useState } from "react";
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
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  useCmsUnsavedChanges(dirty);
  useEffect(() => {
    const controller = new AbortController();
    listMarketingBlogTaxonomies({ signal: controller.signal })
      .then(setRows)
      .catch((e) => {
        if (!controller.signal.aborted) setError(message(e));
      });
    return () => controller.abort();
  }, [version]);
  function choose(row?: MarketingBlogTaxonomy) {
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
      <button disabled={busy} onClick={() => choose()}>
        New category or tag
      </button>
      <div className="blog-list">
        {rows.map((row) => (
          <article key={row.id}>
            <h3>{row.name}</h3>
            <p>
              {row.type} · {row.slug}
            </p>
            <button disabled={busy} onClick={() => choose(row)}>
              Edit {row.name}
            </button>
          </article>
        ))}
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
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
            setDraft(result);
            setSaved(result);
            setVersion((v) => v + 1);
          } catch (e) {
            setError(message(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset disabled={busy}>
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
                if (
                  !confirm(
                    "Delete this taxonomy? It will be removed from posts, and child categories will become top-level categories.",
                  )
                )
                  return;
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
  useCmsUnsavedChanges(JSON.stringify(draft) !== JSON.stringify(saved));
  useEffect(() => {
    const c = new AbortController();
    getMarketingBlogCommentSettings({ signal: c.signal })
      .then((r) => {
        setDraft(r.settings);
        setSaved(r.settings);
      })
      .catch((e) => {
        if (!c.signal.aborted) setError(message(e));
      });
    return () => c.abort();
  }, []);
  return (
    <section>
      <h2>Comment settings</h2>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {draft ? (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
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
              setBusy(false);
            }
          }}
        >
          <fieldset disabled={busy}>
            {Object.entries(labels).map(([key, label]) => (
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
                {label}
              </label>
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
  useCmsUnsavedChanges(
    body !== row.body || note !== (row.moderationNote || ""),
  );
  async function run(action: () => Promise<MarketingBlogComment | null>) {
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
    [loading, setLoading] = useState(true);
  useEffect(() => {
    const c = new AbortController();
    setLoading(true);
    setError("");
    listMarketingBlogComments(
      status === "all" ? undefined : { status: status as "pending" },
      { signal: c.signal },
    )
      .then(setRows)
      .catch((e) => {
        if (!c.signal.aborted) setError(message(e));
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => c.abort();
  }, [status]);
  return (
    <section>
      <h2>Comment moderation</h2>
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
            <option key={s}>{s}</option>
          ))}
        </select>
      </label>
      {error && <p role="alert">{error}</p>}
      {loading ? (
        <p role="status">Loading comments…</p>
      ) : (
        <div className="blog-list">
          {rows.map((row) => (
            <CommentCard
              key={row.id}
              row={row}
              onChanged={(next) =>
                setRows((current) =>
                  current.flatMap((item) =>
                    item.id !== row.id
                      ? [item]
                      : next && (status === "all" || next.status === status)
                        ? [{ ...item, ...next }]
                        : [],
                  ),
                )
              }
            />
          ))}
          {!rows.length && <p>No comments match this status.</p>}
        </div>
      )}
    </section>
  );
}

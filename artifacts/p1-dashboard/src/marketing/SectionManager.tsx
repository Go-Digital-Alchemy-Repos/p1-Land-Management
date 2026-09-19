import { CmsBlockEditor } from "./CmsBlockEditor";
import { BuilderPreview } from "./BuilderPreview";
import { useEffect, useState } from "react";
import {
  listMarketingSections,
  getMarketingSection,
  createMarketingSection,
  updateMarketingSection,
  deleteMarketingSection,
  getMarketingSectionBuilder,
  refreshMarketingSectionStarters,
} from "@workspace/api-client-react/dashboard";
import type {
  MarketingSection,
  MarketingSectionInput,
  MarketingSectionBuilder,
} from "../../../../lib/api-client-react/src/dashboard/models";
import { useSectionReservation } from "./useSectionReservation";
import { useCmsUnsavedChanges } from "./useCmsUnsavedChanges";
import "./section-manager.css";
const blank: MarketingSectionInput = {
  name: "",
  description: "",
  category: "general",
  thumbnailUrl: "",
  blocks: [],
};
const message = (e: unknown) =>
  (e as { data?: { error?: string; message?: string } }).data?.error ||
  (e as { data?: { message?: string } }).data?.message ||
  (e as Error).message ||
  "Section request failed";
function input(row: MarketingSection): MarketingSectionInput {
  return {
    name: row.name,
    description: row.description || "",
    category: row.category || "general",
    thumbnailUrl: row.thumbnailUrl || "",
    blocks: row.blocks,
  };
}
function Editor({
  id,
  onClose,
  onCreated,
  canUseMedia,
}: {
  id: string;
  onClose: () => void;
  onCreated: (id: string) => void;
  canUseMedia: boolean;
}) {
  const [draft, setDraft] = useState<MarketingSectionInput | null>(
      id === "new" ? blank : null,
    ),
    [saved, setSaved] = useState<MarketingSectionInput | null>(
      id === "new" ? blank : null,
    ),
    [catalog, setCatalog] = useState<MarketingSectionBuilder | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [showPreview, setShowPreview] = useState(false);
  const lock = useSectionReservation(id === "new" ? null : id);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  useCmsUnsavedChanges(dirty);
  useEffect(() => {
    const c = new AbortController();
    Promise.all([
      id === "new"
        ? Promise.resolve(null)
        : getMarketingSection(id, { signal: c.signal }),
      getMarketingSectionBuilder({ signal: c.signal }),
    ])
      .then(([row, defs]) => {
        if (c.signal.aborted) return;
        setCatalog(defs);
        if (row) {
          setDraft(input(row));
          setSaved(input(row));
        }
      })
      .catch((e) => {
        if (!c.signal.aborted) setError(message(e));
      });
    return () => c.abort();
  }, [id]);
  const close = () => {
    if (!dirty || confirm("Discard unsaved section changes?")) onClose();
  };
  if (!draft || !catalog)
    return (
      <section>
        {error ? (
          <p role="alert">{error}</p>
        ) : (
          <p role="status">Loading section editor…</p>
        )}
        <button onClick={close}>Back to sections</button>
      </section>
    );
  const blocks = draft.blocks || [];
  return (
    <section className="section-manager">
      <button disabled={busy} onClick={close}>
        Back to sections
      </button>
      <h2>{id === "new" ? "New section" : draft.name}</h2>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {!lock.owned && (
        <aside>
          <p>
            {lock.error ||
              `Section reserved${lock.holder ? ` by ${lock.holder}` : ""}. Your draft is retained.`}
          </p>
          <button onClick={() => void lock.acquire()}>Check reservation</button>
        </aside>
      )}
      <button
        type="button"
        aria-expanded={showPreview}
        onClick={() => setShowPreview((value) => !value)}
      >
        {showPreview ? "Close preview" : "Preview section"}
      </button>
      {showPreview && (
        <BuilderPreview previewUrl={catalog.previewUrl} blocks={blocks} />
      )}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await lock.verify();
            const row =
              id === "new"
                ? await createMarketingSection(draft)
                : await updateMarketingSection(id, draft);
            setDraft(input(row));
            setSaved(input(row));
            setNotice("Section saved.");
            if (id === "new") onCreated(row.id);
          } catch (e) {
            setError(message(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        <fieldset disabled={busy || !lock.owned}>
          <label>
            Section name
            <input
              required
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            />
          </label>
          <label>
            Description
            <textarea
              value={draft.description || ""}
              onChange={(e) =>
                setDraft({ ...draft, description: e.target.value })
              }
            />
          </label>
          <label>
            Category
            <input
              list="section-categories"
              value={draft.category || ""}
              onChange={(e) => setDraft({ ...draft, category: e.target.value })}
            />
            <datalist id="section-categories">
              {[
                "general",
                "hero",
                "cta",
                "testimonials",
                "faq",
                "features",
                "content",
                "team",
              ].map((value) => (
                <option key={value}>{value}</option>
              ))}
            </datalist>
          </label>
          <label>
            Thumbnail URL
            <input
              value={draft.thumbnailUrl || ""}
              onChange={(e) =>
                setDraft({ ...draft, thumbnailUrl: e.target.value })
              }
            />
          </label>
          <CmsBlockEditor
            blocks={blocks}
            onChange={(blocks) => setDraft({ ...draft, blocks })}
            catalog={catalog}
            canUseMedia={canUseMedia}
            disabled={busy || !lock.owned}
            onNotice={setNotice}
          />
          <button type="submit">Save section</button>
        </fieldset>
      </form>
      {id !== "new" && (
        <button
          disabled={busy || !lock.owned}
          onClick={async () => {
            if (
              !confirm(
                "Delete this reusable section? Existing copies in pages are retained.",
              )
            )
              return;
            setBusy(true);
            try {
              await lock.verify();
              await deleteMarketingSection(id);
              onClose();
            } catch (e) {
              setError(message(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          Delete section
        </button>
      )}
    </section>
  );
}
// Opaque CMS IDs are varchar keys; do not assume every retained record is UUID-only.
export function readSectionIntent(search: string): { id: string | null; error: string } {
  const values = new URLSearchParams(search).getAll("section");
  if (!values.length) return { id: null, error: "" };
  if (values.length !== 1 || !/^[A-Za-z0-9_-]{1,200}$/.test(values[0]))
    return { id: null, error: "Invalid section editor link. Choose a record from the list." };
  return { id: values[0], error: "" };
}

export default function SectionManager({
  canUseMedia,
}: {
  canUseMedia: boolean;
}) {
  const [initialIntent] = useState(() => readSectionIntent(location.search));
  const [intentError, setIntentError] = useState(initialIntent.error);
  const [rows, setRows] = useState<MarketingSection[]>([]),
    [editing, setEditing] = useState<string | null>(initialIntent.id),
    [search, setSearch] = useState(""),
    [category, setCategory] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [version, setVersion] = useState(0);
  useEffect(() => {
    if (editing) return;
    const c = new AbortController();
    listMarketingSections({ signal: c.signal })
      .then(setRows)
      .catch((e) => {
        if (!c.signal.aborted) setError(message(e));
      });
    return () => c.abort();
  }, [editing, version]);
  const select = (id: string | null) => {
    if (id !== null && !/^[A-Za-z0-9_-]{1,200}$/.test(id)) {
      setIntentError("Invalid section editor link. Choose a record from the list.");
      return;
    }
    const url = new URL(location.href);
    if (id) url.searchParams.set("section", id);
    else url.searchParams.delete("section");
    history.replaceState(history.state, "", url.pathname + url.search + url.hash);
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
        canUseMedia={canUseMedia}
      />
    );
  return (
    <section className="section-manager">
      <p>
        Reusable content blocks for CMS pages. Saving a section does not publish
        a page.
      </p>
      {intentError && <p role="alert">{intentError}</p>}
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <button disabled={busy} onClick={() => select("new")}>
        New section
      </button>
      <button
        disabled={busy}
        onClick={async () => {
          if (
            !confirm(
              "Refresh the starter library? This overwrites starter sections and removes outdated starter records. Custom sections remain.",
            )
          )
            return;
          setBusy(true);
          setError("");
          try {
            const result = await refreshMarketingSectionStarters();
            setNotice(
              `${result.created} created, ${result.updated} refreshed, ${result.deleted} removed.`,
            );
            setVersion((v) => v + 1);
          } catch (e) {
            setError(message(e));
          } finally {
            setBusy(false);
          }
        }}
      >
        Refresh starter library
      </button>
      <label>
        Search sections
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      <label>
        Category
        <select
          aria-label="Filter section category"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          <option value="">All</option>
          {[...new Set(rows.map((row) => row.category || "general"))].map(
            (value) => (
              <option key={value}>{value}</option>
            ),
          )}
        </select>
      </label>
      {rows
        .filter(
          (row) =>
            (!category || (row.category || "general") === category) &&
            `${row.name} ${row.description}`
              .toLowerCase()
              .includes(search.toLowerCase()),
        )
        .map((row) => (
          <article className="section-block" key={row.id}>
            <h2>{row.name}</h2>
            <p>{row.description}</p>
            <p>
              {row.category} · {row.blocks.length} blocks
            </p>
            <button disabled={busy} onClick={() => select(row.id)}>
              Edit {row.name}
            </button>
          </article>
        ))}
    </section>
  );
}

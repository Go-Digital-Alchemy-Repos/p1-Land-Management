import { Save } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { BuilderPreviewKind } from "./builder-preview-data";
import type { SectionPrimitives } from "../../../../platform/p1-core/client/src/components/shared/cms-section-list-presentation";
import { NativePageBuilder } from "./NativePageBuilder";
import { BuilderPreview } from "./BuilderPreview";
import { builderPrimitives } from "./builder-primitives";
import { SectionListPresentation } from "../../../../platform/p1-core/client/src/components/shared/cms-section-list-presentation";
import { SectionEditorPresentation } from "../../../../platform/p1-core/client/src/components/shared/cms-section-editor-presentation";
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
import "./sections-presentation.css";
import "./section-manager.css";
type Access = {
  canUseMedia: boolean;
  canPreviewData?: (kind: BuilderPreviewKind) => boolean;
};
const ui = {
  ...builderPrimitives,
  Skeleton: ({ className }: { className?: string }) => (
    <div className={`animate-pulse bg-muted ${className || ""}`} />
  ),
};
const CATEGORIES = [
  "general",
  "hero",
  "cta",
  "testimonials",
  "faq",
  "features",
  "content",
  "team",
];
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
export function editableSectionBlocks(
  blocks: unknown,
): blocks is NonNullable<MarketingSectionInput["blocks"]> {
  if (!Array.isArray(blocks)) return false;
  const ids = new Set();
  return blocks.every((block) => {
    if (
      !block ||
      typeof block !== "object" ||
      typeof block.id !== "string" ||
      !block.id ||
      ids.has(block.id) ||
      typeof block.type !== "string" ||
      !block.type ||
      !block.props ||
      typeof block.props !== "object" ||
      Array.isArray(block.props)
    )
      return false;
    ids.add(block.id);
    return true;
  });
}
function Editor({
  id,
  onClose,
  onCreated,
  canUseMedia,
  canPreviewData,
}: Access & {
  id: string;
  onClose: () => void;
  onCreated: (id: string) => void;
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
  const saving = useRef(false);
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
    if (!busy && (!dirty || confirm("Discard unsaved section changes?")))
      onClose();
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
  const blocks = draft.blocks ?? [];
  const editable = editableSectionBlocks(blocks);
  const disabled = busy || !lock.owned;
  const save = async () => {
    if (saving.current || disabled) return;
    if (!draft.name.trim()) {
      setError("Name is required");
      return;
    }
    saving.current = true;
    setBusy(true);
    setError("");
    setNotice("");
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
      saving.current = false;
      setBusy(false);
    }
  };
  const saveControl = (position: "top" | "bottom") => (
    <div className="section-save">
      <span role="status">
        {busy ? "Saving…" : dirty ? "Unsaved changes" : notice ? "Saved" : ""}
      </span>
      <ui.Button
        disabled={disabled}
        onClick={() => void save()}
        data-testid={
          position === "top"
            ? "button-save-section"
            : "button-save-section-bottom"
        }
      >
        <Save className="mr-2 h-4 w-4" />
        {busy ? "Saving…" : "Save Section"}
      </ui.Button>
    </div>
  );
  const details = (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="section-field">
          Name
          <input
            placeholder="e.g. Homepage Hero"
            required
            value={draft.name}
            data-testid="input-section-name"
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
          />
        </label>
        <label className="section-field">
          Category
          <select
            value={draft.category || "general"}
            data-testid="select-section-category"
            onChange={(e) => setDraft({ ...draft, category: e.target.value })}
          >
            {Array.from(
              new Set([...CATEGORIES, draft.category || "general"]),
            ).map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="section-field">
        Description{" "}
        <span className="text-muted-foreground font-normal">(optional)</span>
        <textarea
          placeholder="Brief description of when to use this section…"
          rows={2}
          value={draft.description || ""}
          data-testid="input-section-description"
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
        />
      </label>
      <details>
        <summary>Additional section settings</summary>
        <label className="section-field">
          Thumbnail URL
          <input
            value={draft.thumbnailUrl || ""}
            onChange={(e) =>
              setDraft({ ...draft, thumbnailUrl: e.target.value })
            }
          />
        </label>
      </details>
    </div>
  );
  return (
    <section className="cms-section-presentation">
      <SectionEditorPresentation
        isNew={id === "new"}
        name={draft.name}
        onBack={close}
        disabled={disabled}
        navigationDisabled={busy}
        ui={ui as unknown as SectionPrimitives}
        saveControl={saveControl}
        details={details}
        banner={
          <>
            {error && <p role="alert">{error}</p>}
            {notice && <p role="status">{notice}</p>}
            {!lock.owned && (
              <aside role="status">
                <p>
                  {lock.error ||
                    `Section reserved${lock.holder ? ` by ${lock.holder}` : ""}. Your draft is retained.`}
                </p>
                <button disabled={busy} onClick={() => void lock.acquire()}>
                  Check reservation
                </button>
              </aside>
            )}
          </>
        }
        builder={
          editable ? (
            <NativePageBuilder
              blocks={blocks}
              onChange={(blocks) => setDraft({ ...draft, blocks })}
              catalog={catalog}
              canUseMedia={canUseMedia}
              canUseSections
              canPreviewData={canPreviewData}
              disabled={disabled}
              onNotice={setNotice}
            />
          ) : (
            <p role="status">
              This section contains an unsupported block shape. Its original
              content is preserved; only section details can be edited.
            </p>
          )
        }
        extraActions={
          <>
            <div className="section-actions">
              <button
                type="button"
                disabled={!editable}
                aria-expanded={showPreview}
                onClick={() => setShowPreview((v) => !v)}
              >
                {showPreview ? "Close preview" : "Preview section"}
              </button>
              {id !== "new" && (
                <button
                  disabled={disabled}
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
            </div>
            {showPreview && editable && (
              <BuilderPreview previewUrl={catalog.previewUrl} blocks={blocks} />
            )}
          </>
        }
      />
      <div
        className="section-mobile-actions"
        role="toolbar"
        aria-label="Editor actions"
      >
        <ui.Button
          disabled={disabled}
          onClick={() => void save()}
          data-testid="button-save-section-mobile"
        >
          Save Section
        </ui.Button>
      </div>
    </section>
  );
}
function DeleteSectionDialog({
  id,
  name,
  onClose,
  onDeleted,
}: {
  id: string;
  name: string;
  onClose: () => void;
  onDeleted: () => void;
}) {
  const lock = useSectionReservation(id);
  const ref = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  useEffect(() => ref.current?.showModal(), []);
  return (
    <dialog
      className="cms-section-presentation section-delete-dialog"
      ref={ref}
      aria-labelledby="delete-section-title"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onClose();
      }}
    >
      <h2 id="delete-section-title">Delete this reusable section?</h2>
      <p>
        This removes the saved section template “{name}”. Pages that already
        inserted this section are not affected — their blocks remain unchanged.
      </p>
      {error && <p role="alert">{error}</p>}
      {!lock.owned && (
        <p role="status">{lock.error || "Checking section reservation…"}</p>
      )}
      <div className="section-actions">
        <button disabled={busy} onClick={onClose}>
          Cancel
        </button>
        <button
          disabled={busy || !lock.owned}
          data-testid="button-confirm-delete-section"
          onClick={async () => {
            setBusy(true);
            setError("");
            try {
              await lock.verify();
              await deleteMarketingSection(id);
              onDeleted();
            } catch (e) {
              setError(message(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Deleting…" : "Delete Section"}
        </button>
      </div>
    </dialog>
  );
}
// Opaque CMS IDs are varchar keys; do not assume every retained record is UUID-only.
export function readSectionIntent(search: string): {
  id: string | null;
  error: string;
} {
  const values = new URLSearchParams(search).getAll("section");
  if (!values.length) return { id: null, error: "" };
  if (values.length !== 1 || !/^[A-Za-z0-9_-]{1,200}$/.test(values[0]))
    return {
      id: null,
      error: "Invalid section editor link. Choose a record from the list.",
    };
  return { id: values[0], error: "" };
}

export default function SectionManager({
  canUseMedia,
  canPreviewData,
}: Access) {
  const [initialIntent] = useState(() => readSectionIntent(location.search));
  const [intentError, setIntentError] = useState(initialIntent.error);
  const [rows, setRows] = useState<MarketingSection[]>([]),
    [editing, setEditing] = useState<string | null>(initialIntent.id),
    [search, setSearch] = useState(""),
    [category, setCategory] = useState("all"),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true),
    [version, setVersion] = useState(0),
    [deletingId, setDeletingId] = useState<string | null>(null);
  useEffect(() => {
    if (editing) return;
    const c = new AbortController();
    setLoading(true);
    setError("");
    listMarketingSections({ signal: c.signal })
      .then((data) => {
        if (!c.signal.aborted) setRows(data);
      })
      .catch((e) => {
        if (!c.signal.aborted) setError(message(e));
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => c.abort();
  }, [editing, version]);
  const select = (id: string | null) => {
    if (id !== null && !/^[A-Za-z0-9_-]{1,200}$/.test(id)) {
      setIntentError(
        "Invalid section editor link. Choose a record from the list.",
      );
      return;
    }
    const url = new URL(location.href);
    if (id) url.searchParams.set("section", id);
    else url.searchParams.delete("section");
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
        canUseMedia={canUseMedia}
        canPreviewData={canPreviewData}
      />
    );
  return (
    <section className="cms-section-presentation">
      {intentError && <p role="alert">{intentError}</p>}
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <SectionListPresentation
        sections={rows}
        isLoading={loading}
        search={search}
        setSearch={setSearch}
        categoryFilter={category}
        setCategoryFilter={setCategory}
        restoring={busy}
        busy={busy || !!deletingId}
        onEdit={select}
        onDelete={setDeletingId}
        ui={ui as unknown as SectionPrimitives}
        formatDate={(date) =>
          new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }).format(new Date(date))
        }
        onRestore={() => {
          if (
            !confirm(
              "Refresh the starter library? This overwrites starter sections and removes outdated starter records. Custom sections remain.",
            )
          )
            return;
          setBusy(true);
          setError("");
          void refreshMarketingSectionStarters()
            .then((result) => {
              setNotice(
                `${result.created} created, ${result.updated} refreshed, ${result.deleted} removed.`,
              );
              setVersion((v) => v + 1);
            })
            .catch((e) => setError(message(e)))
            .finally(() => setBusy(false));
        }}
      />
      {deletingId && (
        <DeleteSectionDialog
          id={deletingId}
          name={rows.find((row) => row.id === deletingId)?.name || "Section"}
          onClose={() => setDeletingId(null)}
          onDeleted={() => {
            setDeletingId(null);
            setNotice("Section deleted.");
            setVersion((v) => v + 1);
          }}
        />
      )}
    </section>
  );
}

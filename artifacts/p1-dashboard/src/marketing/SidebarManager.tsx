import { SidebarListPresentation } from "../../../../platform/p1-core/client/src/components/shared/sidebar-list-presentation";
import { SidebarEditorPresentation } from "../../../../platform/p1-core/client/src/components/shared/sidebar-editor-presentation";
import type { SidebarWidget } from "../../../../platform/p1-core/shared/schema/cms-sidebars";
import { sidebarPrimitives } from "./sidebar-primitives";
import { useEffect, useState, useRef } from "react";
import {
  listMarketingSidebars,
  getMarketingSidebar,
  createMarketingSidebar,
  updateMarketingSidebar,
  deleteMarketingSidebar,
  getMarketingSidebarReferences,
} from "@workspace/api-client-react/dashboard";
import type {
  MarketingSidebar,
  MarketingSidebarInput,
  MarketingSidebarWidget,
  MarketingSidebarReferences,
} from "../../../../lib/api-client-react/src/dashboard/models";
import { useCmsUnsavedChanges } from "./useCmsUnsavedChanges";
import { useSidebarReservation } from "./useSidebarReservation";
import "./sidebar-manager.css";
const labels: Record<MarketingSidebarWidget["type"], string> = {
  "recent-posts": "Recent Blog posts",
  newsletter: "Newsletter signup",
  form: "Form",
  callout: "Callout / CTA",
  search: "Search",
  categories: "Categories",
  "tag-cloud": "Tag cloud",
  "custom-html": "Custom HTML",
};
function newWidget(
  type: MarketingSidebarWidget["type"],
): MarketingSidebarWidget {
  return {
    id: crypto.randomUUID(),
    type,
    title: labels[type],
    settings:
      type === "recent-posts"
        ? { limit: 5 }
        : type === "newsletter"
          ? {
              description: "",
              buttonText: "Sign Up",
              formSlug: "newsletter-signup",
            }
          : type === "form"
            ? { formSlug: "contact-form", description: "", buttonText: "" }
            : type === "callout"
              ? { body: "", buttonText: "", buttonUrl: "" }
              : type === "custom-html"
                ? { html: "" }
                : {},
  };
}
const blank: MarketingSidebarInput = {
  name: "",
  description: "",
  isDefault: false,
  widgets: [],
};
const message = (e: unknown) =>
  (e as { data?: { error?: string } }).data?.error ||
  (e as Error).message ||
  "Request failed";
function SidebarEditor({
  id,
  onClose,
  onCreated,
}: {
  id: string;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [draft, setDraft] = useState<MarketingSidebarInput | null>(
      id === "new" ? blank : null,
    ),
    [saved, setSaved] = useState<MarketingSidebarInput | null>(
      id === "new" ? blank : null,
    ),
    [forms, setForms] = useState<MarketingSidebarReferences["forms"]>([]),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const lock = useSidebarReservation(id === "new" ? null : id);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  useCmsUnsavedChanges(dirty);
  useEffect(() => {
    const c = new AbortController();
    Promise.all([
      id === "new"
        ? Promise.resolve(null)
        : getMarketingSidebar(id, { signal: c.signal }),
      getMarketingSidebarReferences({ signal: c.signal }),
    ])
      .then(([row, refs]) => {
        if (c.signal.aborted) return;
        if (row) {
          const value = {
            name: row.name,
            description: row.description,
            isDefault: Boolean(row.isDefault),
            widgets: row.widgets || [],
          };
          setDraft(value);
          setSaved(value);
        }
        setForms(refs.forms);
      })
      .catch((e) => {
        if (!c.signal.aborted) setError(message(e));
      });
    return () => c.abort();
  }, [id]);
  function close() {
    if (!dirty || confirm("Discard unsaved sidebar changes?")) onClose();
  }
  if (!draft)
    return (
      <section>
        {error ? (
          <p role="alert">{error}</p>
        ) : (
          <p role="status">Loading sidebar…</p>
        )}
        <button onClick={close}>Back to sidebars</button>
      </section>
    );
  function widgetChange(index: number, next: MarketingSidebarWidget) {
    setDraft((current) =>
      current
        ? {
            ...current,
            widgets: current.widgets.map((w, i) => (i === index ? next : w)),
          }
        : current,
    );
  }
  function move(index: number, direction: number) {
    setDraft((current) => {
      if (!current) return current;
      const widgets = [...current.widgets],
        target = index + direction;
      if (target < 0 || target >= widgets.length) return current;
      [widgets[index], widgets[target]] = [widgets[target], widgets[index]];
      return { ...current, widgets };
    });
  }
  async function save() {
    if (!draft || busy || !lock.owned) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await lock.verify();
      const result =
        id === "new"
          ? await createMarketingSidebar(draft)
          : await updateMarketingSidebar(id, draft);
      setDraft(result);
      setSaved(result);
      setNotice("Sidebar saved.");
      if (id === "new") onCreated(result.id);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="sidebar-editor sidebar-presentation">
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <form
        ref={formRef}
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <SidebarEditorPresentation
          ui={sidebarPrimitives}
          isNew={id === "new"}
          name={draft.name}
          description={draft.description || ""}
          isDefault={draft.isDefault}
          widgets={draft.widgets as SidebarWidget[]}
          forms={forms}
          busy={busy}
          readOnly={!lock.owned}
          preserveSettingsOnTypeChange
          defaultHelp="The default is used where no specific sidebar is selected. Saving a new default replaces the previous default."
          setName={(name) => setDraft({ ...draft, name })}
          setDescription={(description) => setDraft({ ...draft, description })}
          setIsDefault={(isDefault) => setDraft({ ...draft, isDefault })}
          onSave={() => formRef.current?.requestSubmit()}
          onClose={close}
          updateWidget={(widgetId, updates) => {
            if (busy || !lock.owned) return;
            const index = draft.widgets.findIndex(
              (widget) => widget.id === widgetId,
            );
            if (index >= 0)
              widgetChange(index, {
                ...draft.widgets[index],
                ...updates,
              } as MarketingSidebarWidget);
          }}
          moveWidget={(widgetId, direction) => {
            if (!busy && lock.owned)
              move(
                draft.widgets.findIndex((widget) => widget.id === widgetId),
                direction,
              );
          }}
          addWidget={(type) => {
            if (!busy && lock.owned)
              setDraft({
                ...draft,
                widgets: [...draft.widgets, newWidget(type)],
              });
          }}
          onRemoveWidget={(widgetId) => {
            if (
              !busy &&
              lock.owned &&
              confirm("Remove this widget from the sidebar draft?")
            )
              setDraft({
                ...draft,
                widgets: draft.widgets.filter(
                  (widget) => widget.id !== widgetId,
                ),
              });
          }}
          reservation={
            !lock.owned ? (
              <aside>
                <p>
                  {lock.error ||
                    `This sidebar is reserved${lock.holder ? ` by ${lock.holder}` : ""}. Your changes remain here.`}
                </p>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void lock.acquire()}
                >
                  Check reservation
                </button>
              </aside>
            ) : null
          }
        />
      </form>

      {id !== "new" && (
        <button
          disabled={busy || !lock.owned}
          onClick={async () => {
            if (
              !confirm(
                "Delete this sidebar? Content that references it may fall back to the default sidebar.",
              )
            )
              return;
            setBusy(true);
            setError("");
            try {
              await lock.verify();
              await deleteMarketingSidebar(id);
              onClose();
            } catch (e) {
              setError(message(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          Delete sidebar
        </button>
      )}
    </section>
  );
}
export default function SidebarManager() {
  const [rows, setRows] = useState<MarketingSidebar[]>([]),
    [editing, setEditing] = useState<string | null>(null),
    [search, setSearch] = useState(""),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  useEffect(() => {
    if (editing) return;
    const c = new AbortController();
    setLoading(true);
    setError("");
    listMarketingSidebars({ signal: c.signal })
      .then(setRows)
      .catch((e) => {
        if (!c.signal.aborted) setError(message(e));
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => c.abort();
  }, [editing]);
  if (editing)
    return (
      <SidebarEditor
        key={editing}
        id={editing}
        onClose={() => setEditing(null)}
        onCreated={setEditing}
      />
    );
  return (
    <section className="sidebar-manager sidebar-presentation">
      {error && <p role="alert">{error}</p>}
      <SidebarListPresentation
        ui={sidebarPrimitives}
        sidebars={rows.filter((row) =>
          `${row.name} ${row.description}`
            .toLowerCase()
            .includes(search.toLowerCase()),
        )}
        isLoading={loading}
        onCreate={() => setEditing("new")}
        onEdit={setEditing}
        tools={
          <label>
            Search sidebars
            <input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
        }
      />
    </section>
  );
}

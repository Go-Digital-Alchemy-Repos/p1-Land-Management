import { useEffect, useState } from "react";
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
function formEligible(
  form: MarketingSidebarReferences["forms"][number],
  type: MarketingSidebarWidget["type"],
) {
  return type === "newsletter"
    ? form.kind === "newsletter" || form.slug === "newsletter-signup"
    : form.kind !== "application";
}
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
    [busy, setBusy] = useState(false),
    [type, setType] = useState<MarketingSidebarWidget["type"]>("recent-posts");
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
  return (
    <section className="sidebar-editor">
      <button disabled={busy} onClick={close}>
        Back to sidebars
      </button>
      <h2>{id === "new" ? "New sidebar" : draft.name}</h2>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {!lock.owned && (
        <aside>
          <p>
            {lock.error ||
              `This sidebar is reserved${lock.holder ? ` by ${lock.holder}` : ""}. Your changes remain here.`}
          </p>
          <button onClick={() => void lock.acquire()}>Check reservation</button>
        </aside>
      )}
      <form
        onSubmit={async (e) => {
          e.preventDefault();
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
        }}
      >
        <fieldset disabled={busy || !lock.owned}>
          <label>
            Sidebar name
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
          <label className="sidebar-check">
            <input
              type="checkbox"
              checked={draft.isDefault}
              onChange={(e) =>
                setDraft({ ...draft, isDefault: e.target.checked })
              }
            />
            Default sidebar
          </label>
          <p>
            The default is used where no specific sidebar is selected. Saving a
            new default replaces the previous default.
          </p>
          <div className="sidebar-widgets">
            {draft.widgets.map((widget, index) => (
              <article key={widget.id}>
                <h3>
                  {index + 1}. {labels[widget.type]}
                </h3>
                <div className="sidebar-actions">
                  <button
                    type="button"
                    disabled={index === 0}
                    aria-label={`Move widget ${index + 1} up`}
                    onClick={() => move(index, -1)}
                  >
                    Move up
                  </button>
                  <button
                    type="button"
                    disabled={index === draft.widgets.length - 1}
                    aria-label={`Move widget ${index + 1} down`}
                    onClick={() => move(index, 1)}
                  >
                    Move down
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove widget ${index + 1}`}
                    onClick={() => {
                      if (confirm("Remove this widget from the sidebar draft?"))
                        setDraft({
                          ...draft,
                          widgets: draft.widgets.filter((_, i) => i !== index),
                        });
                    }}
                  >
                    Remove
                  </button>
                </div>
                <label>
                  Widget title
                  <input
                    value={widget.title}
                    onChange={(e) =>
                      widgetChange(index, { ...widget, title: e.target.value })
                    }
                  />
                </label>
                <label>
                  Widget type
                  <select
                    aria-label={`Widget ${index + 1} type`}
                    value={widget.type}
                    onChange={(e) => {
                      const type = e.target
                        .value as MarketingSidebarWidget["type"];
                      widgetChange(index, { ...widget, type });
                    }}
                  >
                    {Object.entries(labels).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                {widget.type === "recent-posts" && (
                  <label>
                    Number of posts
                    <input
                      type="number"
                      required
                      min={1}
                      max={10}
                      step={1}
                      value={String(widget.settings.limit ?? 5)}
                      onChange={(e) =>
                        widgetChange(index, {
                          ...widget,
                          settings: {
                            ...widget.settings,
                            limit: Number(e.target.value),
                          },
                        })
                      }
                    />
                  </label>
                )}
                {(widget.type === "form" || widget.type === "newsletter") && (
                  <label>
                    Assigned form
                    <select
                      aria-label={`Widget ${index + 1} assigned form`}
                      value={String(widget.settings.formSlug || "")}
                      onChange={(e) =>
                        widgetChange(index, {
                          ...widget,
                          settings: {
                            ...widget.settings,
                            formSlug: e.target.value,
                          },
                        })
                      }
                    >
                      <option value="">Choose a form</option>
                      {forms
                        .filter((f) => formEligible(f, widget.type))
                        .map((f) => (
                          <option key={f.id} value={f.slug}>
                            {f.name}
                          </option>
                        ))}
                      {Boolean(widget.settings.formSlug) &&
                        !forms.some(
                          (f) =>
                            f.slug === widget.settings.formSlug &&
                            formEligible(f, widget.type),
                        ) && (
                          <option value={String(widget.settings.formSlug)}>
                            Saved form: {String(widget.settings.formSlug)}
                          </option>
                        )}
                    </select>
                  </label>
                )}
                {(widget.type === "form" || widget.type === "newsletter"
                  ? ["description", "buttonText"]
                  : widget.type === "callout"
                    ? ["body", "buttonText", "buttonUrl"]
                    : widget.type === "custom-html"
                      ? ["html"]
                      : []
                ).map((key) => (
                  <label key={key}>
                    {
                      (
                        {
                          description: "Widget description",
                          buttonText: "Button text",
                          body: "Body",
                          buttonUrl: "Button URL",
                          html: "HTML",
                        } as Record<string, string>
                      )[key]
                    }
                    {["description", "body", "html"].includes(key) ? (
                      <textarea
                        rows={key === "html" ? 7 : 3}
                        value={String(widget.settings[key] ?? "")}
                        onChange={(e) =>
                          widgetChange(index, {
                            ...widget,
                            settings: {
                              ...widget.settings,
                              [key]: e.target.value,
                            },
                          })
                        }
                      />
                    ) : (
                      <input
                        value={String(widget.settings[key] ?? "")}
                        onChange={(e) =>
                          widgetChange(index, {
                            ...widget,
                            settings: {
                              ...widget.settings,
                              [key]: e.target.value,
                            },
                          })
                        }
                      />
                    )}
                  </label>
                ))}
              </article>
            ))}
          </div>
          <label>
            Add widget type
            <select
              aria-label="Add widget type"
              value={type}
              onChange={(e) =>
                setType(e.target.value as MarketingSidebarWidget["type"])
              }
            >
              {Object.entries(labels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            onClick={() =>
              setDraft({
                ...draft,
                widgets: [...draft.widgets, newWidget(type)],
              })
            }
          >
            Add widget
          </button>
          <button type="submit">Save sidebar</button>
        </fieldset>
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
    <section className="sidebar-manager">
      <p>
        Reusable widget sidebars for website content. Assign them from the
        relevant page or Blog editor.
      </p>
      {error && <p role="alert">{error}</p>}
      <button onClick={() => setEditing("new")}>New sidebar</button>
      <label>
        Search sidebars
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </label>
      {loading ? (
        <p role="status">Loading sidebars…</p>
      ) : (
        <div className="sidebar-widgets">
          {rows
            .filter((r) =>
              `${r.name} ${r.description}`
                .toLowerCase()
                .includes(search.toLowerCase()),
            )
            .map((row) => (
              <article key={row.id}>
                <h2>{row.name}</h2>
                <p>{row.description}</p>
                <p>
                  {row.widgets?.length || 0} widgets
                  {row.isDefault ? " · Default" : ""}
                </p>
                <button onClick={() => setEditing(row.id)}>
                  Edit {row.name}
                </button>
              </article>
            ))}
          {!rows.length && <p>No sidebars yet.</p>}
        </div>
      )}
    </section>
  );
}

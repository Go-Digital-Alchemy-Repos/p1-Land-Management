import { customFetch } from "../../../../lib/api-client-react/src/custom-fetch";
import { useEffect, useRef, useState } from "react";
import {
  listWebsiteMenus,
  getWebsiteMenuReferences,
  getWebsiteMenu,
  createWebsiteMenu,
  acquireWebsiteMenuReservation,
  heartbeatWebsiteMenuReservation,
  releaseWebsiteMenuReservation,
} from "@workspace/api-client-react/dashboard";
import type {
  WebsiteMenuItem,
  WebsiteMenuInput,
  WebsiteMenuReferences,
  WebsiteEditorReservation,
} from "../../../../lib/api-client-react/src/dashboard/models";
import "./cms-menus.css";

type Item = WebsiteMenuItem;
type Menu = WebsiteMenuInput & { id?: string; version?: number };
type References = WebsiteMenuReferences;
type Lock = WebsiteEditorReservation;
const locations: Record<string, string> = {
  main_navigation: "Main Navigation",
  p1_footer_services: "P1 Footer Services",
  p1_footer_service_areas: "P1 Footer Service Areas",
  p1_footer_company: "P1 Footer Company",
  footer_platform: "Footer Platform Column",
  footer_professionals: "Footer Professionals Column",
  footer_resources: "Footer Resources Column",
  footer_company: "Footer Company Column",
  footer_legal: "Footer Legal Links",
  header: "Header (Legacy)",
  footer: "Footer (Legacy)",
  unassigned: "Unassigned",
};
const blankItem = (): Item => ({
  id: crypto.randomUUID(),
  label: "New link",
  url: "/",
  openInNewTab: false,
  action: "custom-link",
  children: [],
});
const pagePath = (slug: string) => "/" + slug.replace(/^\/+|\/+$/g, "");
function move(items: Item[], from: number, to: number) {
  const next = [...items];
  next.splice(to, 0, next.splice(from, 1)[0]);
  return next;
}

function Items({
  items,
  change,
  references,
  depth = 1,
  promote,
}: {
  items: Item[];
  change: (items: Item[]) => void;
  references: References;
  depth?: number;
  promote?: (item: Item) => void;
}) {
  return (
    <div className="cms-menu-items">
      {items.map((item, index) => {
        const update = (values: Partial<Item>) =>
          change(
            items.map((row) =>
              row.id === item.id ? { ...row, ...values } : row,
            ),
          );
        const page = references.pages.find((row) => row.id === item.pageId);
        return (
          <section
            className="cms-menu-item"
            key={item.id}
            aria-label={`Menu item ${item.label}`}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              event.stopPropagation();
              const from = items.findIndex(
                (row) =>
                  row.id === event.dataTransfer.getData("text/p1-menu-item"),
              );
              if (from >= 0) change(move(items, from, index));
            }}
          >
            <header>
              <strong>{item.label || "Untitled link"}</strong>
              <div className="cms-menu-actions">
                <button
                  type="button"
                  draggable
                  aria-label={`Drag ${item.label} to reorder`}
                  onDragStart={(event) => {
                    event.stopPropagation();
                    event.dataTransfer.setData("text/p1-menu-item", item.id);
                  }}
                >
                  ⠿
                </button>
                <button
                  type="button"
                  aria-label={`Move ${item.label} up`}
                  disabled={index === 0}
                  onClick={() => change(move(items, index, index - 1))}
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={`Move ${item.label} down`}
                  disabled={index === items.length - 1}
                  onClick={() => change(move(items, index, index + 1))}
                >
                  ↓
                </button>
                {depth > 1 && promote && (
                  <button type="button" onClick={() => promote(item)}>
                    Move to top level
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    if (
                      window.confirm(
                        `Remove ${item.label} and its nested links?`,
                      )
                    )
                      change(items.filter((row) => row.id !== item.id));
                  }}
                >
                  Remove
                </button>
              </div>
            </header>
            <div className="cms-menu-fields">
              <label>
                Link type
                <select
                  aria-label="Link type"
                  value={
                    item.action ||
                    (item.pageId ? "internal-link" : "custom-link")
                  }
                  onChange={(event) =>
                    update({
                      action: event.target.value as Item["action"],
                      pageId: null,
                      formSlug: null,
                      labelSource: "custom",
                      modalTitle: null,
                      modalDescription: null,
                      openInNewTab: false,
                      url: event.target.value === "form-modal" ? "#" : item.url,
                    })
                  }
                >
                  <option value="internal-link">Website page</option>
                  <option value="custom-link">Custom link</option>
                  <option value="form-modal">
                    Form popup (not supported on the P1 public website)
                  </option>
                </select>
              </label>
              <label>
                Label
                <input
                  required
                  value={item.label}
                  onChange={(event) =>
                    update({ label: event.target.value, labelSource: "custom" })
                  }
                />
              </label>
              {(item.action === "internal-link" ||
                (!item.action && item.pageId)) && (
                <>
                  <label>
                    Website page
                    <select
                      aria-label="Website page"
                      value={item.pageId || ""}
                      onChange={(event) => {
                        const p = references.pages.find(
                          (row) => row.id === event.target.value,
                        );
                        if (p)
                          update({
                            pageId: p.id,
                            label: p.title,
                            labelSource: "page",
                            url: pagePath(p.slug),
                            openInNewTab: false,
                          });
                      }}
                    >
                      <option value="">Choose a page</option>
                      {item.pageId && !page && (
                        <option value={item.pageId}>Missing page</option>
                      )}
                      {references.pages.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title} · {p.status}
                        </option>
                      ))}
                    </select>
                  </label>
                  {page && (
                    <button
                      type="button"
                      onClick={() =>
                        update({
                          label: page.title,
                          labelSource: "page",
                          url: pagePath(page.slug),
                        })
                      }
                    >
                      Use page title
                    </button>
                  )}
                  {item.pageId && !page && (
                    <p role="status">The linked page is no longer available.</p>
                  )}
                  {page && page.status !== "published" && (
                    <p role="status">This page is not published.</p>
                  )}
                  <p className="muted">
                    {item.labelSource === "page"
                      ? "Label follows the page title."
                      : "Custom label."}{" "}
                    {item.url}
                  </p>
                </>
              )}
              {item.action !== "form-modal" &&
                item.action !== "internal-link" &&
                !item.pageId && (
                  <>
                    <label>
                      URL
                      <input
                        required
                        value={item.url}
                        onChange={(event) =>
                          update({ url: event.target.value })
                        }
                      />
                    </label>
                    <label className="cms-menu-check">
                      <input
                        type="checkbox"
                        checked={item.openInNewTab}
                        onChange={(event) =>
                          update({ openInNewTab: event.target.checked })
                        }
                      />
                      Open in new tab
                    </label>
                  </>
                )}
              {item.action === "form-modal" && (
                <>
                  <label>
                    Form
                    <select
                      aria-label="Form"
                      required
                      value={item.formSlug || ""}
                      onChange={(event) => {
                        const f = references.forms.find(
                          (row) => row.slug === event.target.value,
                        );
                        update({
                          formSlug: event.target.value,
                          url: "#",
                          modalTitle: item.modalTitle || f?.name || null,
                        });
                      }}
                    >
                      <option value="">Choose a form</option>
                      {item.formSlug &&
                        !references.forms.some(
                          (f) => f.slug === item.formSlug,
                        ) && (
                          <option value={item.formSlug}>
                            Missing form: {item.formSlug}
                          </option>
                        )}
                      {references.forms.map((f) => (
                        <option key={f.id} value={f.slug}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Popup title
                    <input
                      value={item.modalTitle || ""}
                      onChange={(event) =>
                        update({ modalTitle: event.target.value })
                      }
                    />
                  </label>
                  <label>
                    Popup description
                    <textarea
                      value={item.modalDescription || ""}
                      onChange={(event) =>
                        update({ modalDescription: event.target.value })
                      }
                    />
                  </label>
                </>
              )}
            </div>
            <Items
              items={item.children || []}
              change={(children) => update({ children })}
              references={references}
              depth={depth + 1}
              promote={promote}
            />
            {depth < 3 && (
              <button
                type="button"
                onClick={() =>
                  update({ children: [...(item.children || []), blankItem()] })
                }
              >
                Add nested link
              </button>
            )}
          </section>
        );
      })}
    </div>
  );
}
function removeItem(items: Item[], id: string): Item[] {
  return items
    .filter((item) => item.id !== id)
    .map((item) => ({
      ...item,
      children: removeItem(item.children || [], id),
    }));
}

export default function CmsMenus() {
  const [menus, setMenus] = useState<Menu[]>([]),
    [references, setReferences] = useState<References>({
      pages: [],
      forms: [],
    });
  const [draft, setDraft] = useState<Menu | null>(null),
    [baseline, setBaseline] = useState("");
  const [lock, setLock] = useState<Lock | null>(null),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false);
  const alive = useRef(true),
    controller = useRef(new AbortController());
  const dirty = Boolean(draft && JSON.stringify(draft) !== baseline);
  const locked = Boolean(draft?.id && !lock?.ownedByCurrentUser);
  const readAll = async () => {
    const [next, refs] = await Promise.all([
      listWebsiteMenus({ signal: controller.current.signal }),
      getWebsiteMenuReferences({ signal: controller.current.signal }),
    ]);
    if (alive.current) {
      setMenus(next);
      setReferences(refs);
    }
  };
  useEffect(() => {
    alive.current = true;
    controller.current = new AbortController();
    void readAll()
      .catch((e) => {
        if (alive.current) setError(e.message);
      })
      .finally(() => {
        if (alive.current) setLoading(false);
      });
    return () => {
      alive.current = false;
      controller.current.abort();
    };
  }, []);
  useEffect(() => {
    if (!dirty) return;
    const savedPath = location.pathname;
    const unload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    const navigate = (event: Event) => {
      if (!window.confirm("Discard your unsaved website menu changes?")) {
        event.preventDefault();
        history.replaceState(null, "", savedPath);
      }
    };
    window.addEventListener("beforeunload", unload);
    window.addEventListener("p1:before-navigation", navigate);
    return () => {
      window.removeEventListener("beforeunload", unload);
      window.removeEventListener("p1:before-navigation", navigate);
    };
  }, [dirty]);
  useEffect(() => {
    const id = draft?.id;
    if (!id) {
      setLock(null);
      return;
    }
    let active = true;
    const signal = new AbortController();
    setLock(null);
    const action = async (name: string) => {
      try {
        const next = await (
          name === "acquire"
            ? acquireWebsiteMenuReservation
            : heartbeatWebsiteMenuReservation
        )(id, { signal: signal.signal });
        if (active) setLock(next);
      } catch (e) {
        if (active) {
          setLock(null);
          setError((e as Error).message);
        }
      }
    };
    void action("acquire");
    const timer = setInterval(() => void action("heartbeat"), 30000);
    return () => {
      active = false;
      signal.abort();
      clearInterval(timer);
      void releaseWebsiteMenuReservation(id, { keepalive: true }).catch(
        () => {},
      );
    };
  }, [draft?.id]);
  const perform = async (work: () => Promise<void>) => {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work();
    } catch (e) {
      if (alive.current) setError((e as Error).message);
    } finally {
      if (alive.current) setBusy(false);
    }
  };
  const discard = () =>
    !dirty || window.confirm("Discard your unsaved website menu changes?");
  const edit = (menu: Menu) => {
    if (!discard()) return;
    void perform(async () => {
      const fresh = await getWebsiteMenu(menu.id!, {
        signal: controller.current.signal,
      });
      if (alive.current) {
        setDraft(fresh);
        setBaseline(JSON.stringify(fresh));
      }
    });
  };
  const save = () =>
    perform(async () => {
      if (!draft) return;
      if (draft.id) {
        const current = await heartbeatWebsiteMenuReservation(draft.id, {
          signal: controller.current.signal,
        });
        setLock(current);
        if (!current.ownedByCurrentUser)
          throw Error(
            "Another editor holds this menu. Your unsaved changes are retained.",
          );
      }
      const other = menus.find(
        (menu) => menu.location === draft.location && menu.id !== draft.id,
      );
      if (
        draft.location !== "unassigned" &&
        other &&
        !window.confirm(
          `Assigning this location will replace ${other.name}. Continue?`,
        )
      )
        return;
      const payload = {
        name: draft.name,
        location: draft.location,
        items: draft.items,
      };
      const next = await (draft.id
        ? customFetch<Menu>(
            `/api/v1/marketing/cms/menus/${encodeURIComponent(draft.id)}`,
            {
              method: "PUT",
              signal: controller.current.signal,
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...payload,
                expectedVersion: draft.version,
              }),
            },
          )
        : createWebsiteMenu(payload, { signal: controller.current.signal }));
      if (alive.current) {
        setDraft(next);
        setBaseline(JSON.stringify(next));
        setNotice(
          "Website menu saved. Assigned P1 menus appear publicly within 30 seconds; there is no separate publish step.",
        );
        await readAll();
      }
    });
  return (
    <div className="cms-menus">
      <header>
        <div>
          <h2>Website menus</h2>
          <p className="muted">
            Manage CMS navigation, footer links and form popups. P1 website
            navigation is managed in the Website editor.
          </p>
        </div>
        <button
          disabled={busy}
          onClick={() => {
            if (discard()) {
              const next = { name: "", location: "unassigned", items: [] };
              setDraft(next);
              setBaseline("");
              setError("");
            }
          }}
        >
          Create menu
        </button>
      </header>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {loading ? (
        <p role="status">Loading website menus…</p>
      ) : (
        <div className="cms-menu-list">
          {menus.map((menu) => (
            <article key={menu.id}>
              <strong>{menu.name}</strong>
              <span>
                {locations[menu.location] || menu.location} ·{" "}
                {menu.items.length} top-level links
              </span>
              <div>
                <button disabled={busy} onClick={() => edit(menu)}>
                  Edit {menu.name}
                </button>
                <button
                  disabled={busy}
                  onClick={() => {
                    if (
                      window.confirm(
                        `Delete ${menu.name}? This removes this CMS menu.`,
                      )
                    )
                      void perform(async () => {
                        await customFetch(
                          `/api/v1/marketing/cms/menus/${encodeURIComponent(menu.id!)}`,
                          {
                            method: "DELETE",
                            signal: controller.current.signal,
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              expectedVersion: menu.version,
                            }),
                          },
                        );
                        if (draft?.id === menu.id) {
                          setDraft(null);
                          setBaseline("");
                        }
                        await readAll();
                      });
                  }}
                >
                  Delete
                </button>
              </div>
            </article>
          ))}
          {!menus.length && <p>No website menus yet.</p>}
        </div>
      )}
      {draft && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
          className="cms-menu-editor"
        >
          <header>
            <h3>
              {draft.id ? `Edit ${draft.name}` : "Create website menu"}
              {dirty ? " · Unsaved" : ""}
            </h3>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (discard()) setDraft(null);
              }}
            >
              Close editor
            </button>
          </header>
          {locked && (
            <p role="status">
              {lock?.lock
                ? `${lock.lock.lockedByName} is editing this menu.`
                : "Waiting for editing access."}{" "}
              <button
                type="button"
                onClick={() =>
                  void perform(async () =>
                    setLock(
                      await acquireWebsiteMenuReservation(draft.id!, {
                        signal: controller.current.signal,
                      }),
                    ),
                  )
                }
              >
                Check editing access
              </button>
            </p>
          )}
          <fieldset disabled={busy || locked}>
            <div className="cms-menu-fields">
              <label>
                Menu name
                <input
                  required
                  value={draft.name}
                  onChange={(event) =>
                    setDraft({ ...draft, name: event.target.value })
                  }
                />
              </label>
              <label>
                Website location
                <select
                  aria-label="Website location"
                  value={draft.location}
                  onChange={(event) =>
                    setDraft({ ...draft, location: event.target.value })
                  }
                >
                  {Object.entries(locations).map(([id, label]) => (
                    <option key={id} value={id}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <Items
              items={draft.items}
              references={references}
              change={(items) => setDraft({ ...draft, items })}
              promote={(item) =>
                setDraft({
                  ...draft,
                  items: [...removeItem(draft.items, item.id), item],
                })
              }
            />
            <button
              type="button"
              onClick={() =>
                setDraft({ ...draft, items: [...draft.items, blankItem()] })
              }
            >
              Add link
            </button>
            <footer>
              <button type="submit" disabled={!dirty}>
                {busy ? "Saving…" : "Save website menu"}
              </button>
            </footer>
          </fieldset>
        </form>
      )}
    </div>
  );
}

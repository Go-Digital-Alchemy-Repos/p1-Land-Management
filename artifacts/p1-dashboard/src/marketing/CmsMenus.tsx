import { MenuCardPresentation } from "../../../../platform/p1-core/client/src/components/shared/menu-card-presentation";
import { MenuLocationsPresentation } from "../../../../platform/p1-core/client/src/components/shared/menu-locations-presentation";
import {
  MenuItemEditor,
  MenuPresentationContext,
} from "../../../../platform/p1-core/client/src/components/shared/menu-item-presentation";
import {
  indentMenuItem,
  outdentMenuItem,
  reorderMenuItems,
} from "../../../../platform/p1-core/client/src/components/shared/menu-tree-operations";
import type { MenuItem as MenuTreeItem } from "../../../../platform/p1-core/shared/schema/cms-menus";
import { menuPrimitives } from "./menu-primitives";
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
import { CmsPausedBanner, CMS_PAUSED_SHORT, useCmsEditingPaused } from "./useCmsEditingStatus";

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
  promote,
}: {
  items: Item[];
  change: (items: Item[]) => void;
  references: References;
  promote?: (item: Item) => void;
}) {
  const shared = items as unknown as MenuTreeItem[];
  return (
    <MenuPresentationContext.Provider value={menuPrimitives}>
      <div className="menu-presentation space-y-2">
        {shared.map((item, index) => (
          <MenuItemEditor
            key={item.id}
            item={item}
            pages={references.pages}
            forms={references.forms}
            depth={1}
            index={index}
            totalSiblings={shared.length}
            onUpdate={(id, values) =>
              change(
                items.map((row) =>
                  row.id === id ? ({ ...row, ...values } as Item) : row,
                ),
              )
            }
            onDelete={(id) => change(items.filter((row) => row.id !== id))}
            onMoveUp={(id) => {
              const n = items.findIndex((row) => row.id === id);
              if (n > 0) change(move(items, n, n - 1));
            }}
            onMoveDown={(id) => {
              const n = items.findIndex((row) => row.id === id);
              if (n >= 0 && n < items.length - 1) change(move(items, n, n + 1));
            }}
            onReorder={(active, over) =>
              change(reorderMenuItems(shared, active, over) as Item[])
            }
            onIndent={(id) => change(indentMenuItem(shared, id) as Item[])}
            onOutdent={(id) => change(outdentMenuItem(shared, id) as Item[])}
            onPromoteToRoot={(id) => {
              const find = (rows: Item[]): Item | undefined => {
                for (const row of rows) {
                  if (row.id === id) return row;
                  const child = find(row.children || []);
                  if (child) return child;
                }
                return undefined;
              };
              const row = find(items);
              if (row) promote?.(row);
            }}
          />
        ))}
      </div>
    </MenuPresentationContext.Provider>
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
  const cmsPaused = useCmsEditingPaused();
  const [menus, setMenus] = useState<Menu[]>([]),
    [references, setReferences] = useState<References>({
      pages: [],
      forms: [],
    });
  const [draft, setDraft] = useState<Menu | null>(null),
    [baseline, setBaseline] = useState("");
  const [lock, setLock] = useState<Lock | null>(null),
    [error, setError] = useState(""),
    [loadError, setLoadError] = useState(""),
    [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false);
  const [createUnconfirmed, setCreateUnconfirmed] = useState(false),
    [recoveryLoaded, setRecoveryLoaded] = useState(false);
  const actionGate = useRef(false);
  const alive = useRef(true),
    controller = useRef(new AbortController());
  const dirty = Boolean(draft && JSON.stringify(draft) !== baseline);
  const locked = Boolean(draft?.id && !lock?.ownedByCurrentUser);
  const readAll = async () => {
    try {
      const [next, refs] = await Promise.all([
        listWebsiteMenus({ signal: controller.current.signal }),
        getWebsiteMenuReferences({ signal: controller.current.signal }),
      ]);
      if (alive.current) {
        setMenus(next);
        setReferences(refs);
        setLoadError("");
      }
    } catch (cause) {
      if (alive.current) setLoadError("Could not load saved website menus. Retry before making changes.");
      throw cause;
    }
  };
  const reloadMenus = async () => {
    setLoading(true);
    setLoadError("");
    try {
      await readAll();
    } catch {
      // readAll sets the actionable load state without implying an empty menu list.
    } finally {
      if (alive.current) setLoading(false);
    }
  };
  useEffect(() => {
    alive.current = true;
    controller.current = new AbortController();
    void reloadMenus();
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
    if (actionGate.current) return;
    actionGate.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work();
    } catch (e) {
      if (alive.current) setError((e as Error).message);
    } finally {
      actionGate.current = false;
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
    cmsPaused ? Promise.resolve() : perform(async () => {
      if (!draft || (!draft.id && createUnconfirmed)) return;
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
        : createWebsiteMenu(payload, {
            signal: controller.current.signal,
          }).catch((error) => {
            if (alive.current) {
              setCreateUnconfirmed(true);
              setRecoveryLoaded(false);
            }
            throw error;
          }));
      if (alive.current) {
        setDraft(next);
        setBaseline(JSON.stringify(next));
        setNotice("Menu saved.");
        await readAll();
      }
    });
  return (
    <div className="cms-menus">
      <CmsPausedBanner paused={cmsPaused} />
      {!draft && (
        <header>
          <div>
            <h1>Navigation Menus</h1>
            <p className="muted">
              Saving a menu assigned to Main Navigation or a P1 Footer location publishes its links, usually within 30 seconds. An empty assigned menu hides those links; an unassigned location keeps the existing website navigation. Other locations are retained but are not rendered by this website.
            </p>
          </div>
          <button
            disabled={cmsPaused || busy || loading || Boolean(loadError) || createUnconfirmed}
            aria-disabled={cmsPaused}
            title={cmsPaused ? CMS_PAUSED_SHORT : undefined}
            onClick={() => {
              if (!createUnconfirmed && discard()) {
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
      )}
      {!draft && !loading && !loadError && (
        <div className="menu-presentation">
          <MenuLocationsPresentation
            description="Saving a menu assigned to Main Navigation or a P1 Footer location publishes its links, usually within 30 seconds. An empty assigned menu hides those links; an unassigned location keeps the existing website navigation. Other locations are retained but are not rendered by this website."
            locations={Object.entries(locations)
              .filter(
                ([id]) => !["header", "footer", "unassigned"].includes(id),
              )
              .map(([value, label]) => ({ value, label }))}
            menus={menus}
            disabled={busy || createUnconfirmed}
            onManage={(location, id) => {
              const menu = menus.find((m) => m.id === id);
              if (menu) edit(menu);
              else if (!cmsPaused && !createUnconfirmed && discard()) {
                setDraft({ name: locations[location], location, items: [] });
                setBaseline("");
                setError("");
              }
            }}
          />
        </div>
      )}
      {createUnconfirmed && (
        <section role="alert" className="menu-create-recovery">
          <p>
            The menu creation could not be confirmed. Your draft is retained.
            Reload the saved menus and inspect the list before creating another
            menu; the first request may have succeeded.
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() =>
              void perform(async () => {
                await readAll();
                if (alive.current) setRecoveryLoaded(true);
              })
            }
          >
            Reload saved menus
          </button>
          {recoveryLoaded && (
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (
                  window.confirm(
                    "I have reviewed the reloaded menus and want to send a new create request. The earlier request may already have created a menu. Continue?",
                  )
                ) {
                  setCreateUnconfirmed(false);
                  setRecoveryLoaded(false);
                }
              }}
            >
              I reviewed the menus — allow a new create request
            </button>
          )}
        </section>
      )}
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {(!draft || createUnconfirmed) &&
        (loading ? (
          <p role="status">Loading website menus…</p>
        ) : loadError ? (
          <section className="menu-create-recovery" role="alert">
            <p>{loadError}</p>
            <button type="button" onClick={() => void reloadMenus()}>Retry menu directory</button>
          </section>
        ) : (
          <div className="menu-presentation grid gap-4">
            {menus.map((menu) => (
              <MenuCardPresentation
                key={menu.id}
                id={menu.id}
                name={menu.name}
                locationLabel={locations[menu.location] || menu.location}
                items={menu.items as MenuTreeItem[]}
                disabled={busy}
                deleteDisabledReason={cmsPaused ? CMS_PAUSED_SHORT : undefined}
                editLabel={`Edit ${menu.name}`}
                onEdit={() => edit(menu)}
                onDelete={() => {
                  if (cmsPaused) return;
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
              />
            ))}
            {!menus.length && <p>No website menus yet.</p>}
          </div>
        ))}
      {draft && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
          className="cms-menu-editor"
        >
          <p className="muted">Saving a menu assigned to Main Navigation or a P1 Footer location publishes its links, usually within 30 seconds. An empty assigned menu hides those links; an unassigned location keeps the existing website navigation. Other locations are retained but are not rendered by this website.</p>
          <header>
            <h1>
              {draft.id ? `Edit ${draft.name}` : "Create website menu"}
              {dirty ? " · Unsaved" : ""}
            </h1>
            <div className="cms-menu-actions">
              <button
                type="submit"
                disabled={
                  cmsPaused || busy || locked || !dirty || (!draft.id && createUnconfirmed)
                }
                aria-disabled={cmsPaused}
                title={cmsPaused ? CMS_PAUSED_SHORT : undefined}
              >
                {busy ? "Saving…" : "Save website menu"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  if (discard()) setDraft(null);
                }}
              >
                Close editor
              </button>
            </div>
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
          <fieldset disabled={cmsPaused || busy || locked}>
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
              change={(items) => {
                if (!busy && !locked) setDraft({ ...draft, items });
              }}
              promote={(item) =>
                !busy &&
                !locked &&
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
          </fieldset>
        </form>
      )}
    </div>
  );
}

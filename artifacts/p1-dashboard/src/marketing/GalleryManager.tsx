import { useEffect, useRef, useState } from "react";
import {
  listMarketingGalleries,
  getMarketingGallery,
  createMarketingGallery,
  updateMarketingGallery,
  deleteMarketingGallery,
  duplicateMarketingGallery,
  publishMarketingGallery,
  unpublishMarketingGallery,
} from "@workspace/api-client-react/dashboard";
import type {
  MarketingGallery,
  MarketingGalleryInput,
  MarketingGallerySettings,
  MarketingGalleryItem,
  ListMarketingGalleriesParams,
} from "../../../../lib/api-client-react/src/dashboard/models";
import { MediaLibrary } from "./MediaLibrary";
import { useCmsUnsavedChanges } from "./useCmsUnsavedChanges";
import "./gallery-manager.css";
const defaults: MarketingGallerySettings = {
  columnsDesktop: 3,
  columnsTablet: 2,
  columnsMobile: 1,
  spacing: "md",
  imageRatio: "4/3",
  cropMode: "cover",
  borderRadius: "md",
  transitionEffect: "none",
  arrowIconColor: "#ffffff",
  arrowBackgroundColor: "#6b7280",
  showTitle: true,
  showCaptions: true,
  captionPosition: "below",
  lightbox: true,
  hoverEffect: "zoom",
  maxImages: 0,
  customClassName: "",
};
const blank: MarketingGalleryInput = {
  title: "",
  slug: "",
  description: "",
  status: "draft",
  layout: "grid",
  settings: defaults,
  items: [],
};
const choices: Partial<Record<keyof MarketingGallerySettings, string[]>> = {
  spacing: ["none", "sm", "md", "lg"],
  imageRatio: ["auto", "1/1", "4/3", "3/2", "16/9"],
  cropMode: ["cover", "contain"],
  borderRadius: ["none", "sm", "md", "lg"],
  transitionEffect: ["none", "fade", "slide", "zoom"],
  captionPosition: ["below", "overlay"],
  hoverEffect: ["none", "zoom", "fade"],
};
const settingLabels: Record<keyof MarketingGallerySettings, string> = {
  columnsDesktop: "Desktop columns",
  columnsTablet: "Tablet columns",
  columnsMobile: "Mobile columns",
  maxImages: "Maximum images (0 for all)",
  spacing: "Spacing",
  imageRatio: "Image ratio",
  cropMode: "Crop mode",
  borderRadius: "Border radius",
  transitionEffect: "Transition effect",
  captionPosition: "Caption position",
  hoverEffect: "Hover effect",
  showTitle: "Show image titles",
  showCaptions: "Show captions",
  lightbox: "Enable lightbox",
  arrowIconColor: "Arrow icon color",
  arrowBackgroundColor: "Arrow background color",
  customClassName: "Custom CSS class",
};
const message = (e: unknown) =>
  (e as { data?: { message?: string; error?: string } }).data?.message ||
  (e as { data?: { error?: string } }).data?.error ||
  (e as Error).message ||
  "Gallery request failed";
function input(row: MarketingGallery): MarketingGalleryInput {
  return {
    title: row.title,
    slug: row.slug,
    description: row.description,
    status: row.status,
    layout: row.layout,
    settings: { ...defaults, ...row.settings },
    items: row.items || [],
  };
}
function imageUrl(value: string) {
  return value.startsWith("/") && !value.startsWith("//")
    ? `https://www.p1landmanagement.com${value}`
    : value;
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
  const [draft, setDraft] = useState<MarketingGalleryInput | null>(
      id === "new" ? blank : null,
    ),
    [saved, setSaved] = useState<MarketingGalleryInput | null>(
      id === "new" ? blank : null,
    ),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [picker, setPicker] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(saved);
  useCmsUnsavedChanges(dirty);
  useEffect(() => {
    if (id === "new") return;
    const c = new AbortController();
    getMarketingGallery(id, { signal: c.signal })
      .then((row) => {
        if (!c.signal.aborted) {
          setDraft(input(row));
          setSaved(input(row));
        }
      })
      .catch((e) => {
        if (!c.signal.aborted) setError(message(e));
      });
    return () => c.abort();
  }, [id]);
  useEffect(() => {
    if (picker) dialog.current?.showModal();
    else dialog.current?.close();
  }, [picker]);
  function close() {
    if (!dirty || confirm("Discard unsaved gallery changes?")) onClose();
  }
  async function run(action: () => Promise<MarketingGallery>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const row = await action();
      setDraft(input(row));
      setSaved(input(row));
      setNotice("Gallery saved.");
      if (row.id !== id) onCreated(row.id);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  if (!draft)
    return (
      <section>
        {error ? (
          <p role="alert">{error}</p>
        ) : (
          <p role="status">Loading gallery…</p>
        )}
        <button onClick={close}>Back to galleries</button>
      </section>
    );
  function item(index: number, next: MarketingGalleryItem) {
    setDraft((current) =>
      current
        ? {
            ...current,
            items: current.items.map((row, i) => (i === index ? next : row)),
          }
        : current,
    );
  }
  function move(index: number, offset: number) {
    const rows = [...draft!.items],
      target = index + offset;
    if (target < 0 || target >= rows.length) return;
    [rows[index], rows[target]] = [rows[target], rows[index]];
    setDraft({ ...draft!, items: rows });
  }
  function setting(key: keyof MarketingGallerySettings, value: unknown) {
    setDraft({ ...draft!, settings: { ...draft!.settings, [key]: value } });
  }
  return (
    <section className="gallery-manager">
      <button disabled={busy} onClick={close}>
        Back to galleries
      </button>
      <h2>{id === "new" ? "New gallery" : draft.title}</h2>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (
            draft.status === "published" &&
            !confirm("Save and publish these gallery changes?")
          )
            return;
          const payload = {
            ...draft,
            items: draft.items.map((row, index) => ({
              ...row,
              sortOrder: index,
            })),
          };
          void run(() =>
            id === "new"
              ? createMarketingGallery(payload)
              : updateMarketingGallery(id, payload),
          );
        }}
      >
        <fieldset disabled={busy}>
          <label>
            Gallery title
            <input
              required
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          </label>
          <label>
            Slug
            <input
              required
              value={draft.slug}
              onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
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
            Status
            <select
              aria-label="Gallery status"
              value={draft.status}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  status: e.target.value as MarketingGalleryInput["status"],
                })
              }
            >
              {["draft", "published", "archived"].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          <label>
            Layout
            <select
              aria-label="Gallery layout"
              value={draft.layout}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  layout: e.target.value as MarketingGalleryInput["layout"],
                })
              }
            >
              {["grid", "masonry", "carousel", "slider", "featured"].map(
                (v) => (
                  <option key={v}>{v}</option>
                ),
              )}
            </select>
          </label>
          <details>
            <summary>Display settings</summary>
            <div className="gallery-settings">
              {(
                Object.keys(defaults) as (keyof MarketingGallerySettings)[]
              ).map((key) => (
                <label
                  key={key}
                  className={
                    typeof defaults[key] === "boolean"
                      ? "gallery-check"
                      : undefined
                  }
                >
                  {settingLabels[key]}
                  {choices[key] ? (
                    <select
                      aria-label={settingLabels[key]}
                      value={String(draft.settings[key] ?? defaults[key])}
                      onChange={(e) => setting(key, e.target.value)}
                    >
                      {choices[key]!.map((value) => (
                        <option key={value}>{value}</option>
                      ))}
                    </select>
                  ) : typeof defaults[key] === "boolean" ? (
                    <input
                      type="checkbox"
                      checked={Boolean(draft.settings[key])}
                      onChange={(e) => setting(key, e.target.checked)}
                    />
                  ) : typeof defaults[key] === "number" ? (
                    <input
                      required
                      type="number"
                      step={1}
                      min={key === "maxImages" ? 0 : 1}
                      max={
                        key === "columnsDesktop"
                          ? 6
                          : key === "columnsTablet"
                            ? 4
                            : key === "columnsMobile"
                              ? 2
                              : 200
                      }
                      value={Number(draft.settings[key] ?? defaults[key])}
                      onChange={(e) => setting(key, Number(e.target.value))}
                    />
                  ) : (
                    <input
                      maxLength={key === "customClassName" ? 120 : 32}
                      value={String(draft.settings[key] ?? "")}
                      onChange={(e) => setting(key, e.target.value)}
                    />
                  )}
                </label>
              ))}
            </div>
          </details>
          <h3>Images</h3>
          <div className="gallery-items">
            {draft.items.map((row, index) => (
              <article key={row.id || index}>
                <h4>Image {index + 1}</h4>
                {row.imageUrl && (
                  <img
                    alt={row.alt || ""}
                    src={imageUrl(row.imageUrl)}
                    loading="lazy"
                  />
                )}
                <div className="gallery-actions">
                  <button
                    type="button"
                    disabled={index === 0}
                    aria-label={`Move image ${index + 1} up`}
                    onClick={() => move(index, -1)}
                  >
                    Move up
                  </button>
                  <button
                    type="button"
                    disabled={index === draft.items.length - 1}
                    aria-label={`Move image ${index + 1} down`}
                    onClick={() => move(index, 1)}
                  >
                    Move down
                  </button>
                  <button
                    type="button"
                    aria-label={`Remove image ${index + 1}`}
                    onClick={() => {
                      if (confirm("Remove this image from the gallery draft?"))
                        setDraft({
                          ...draft,
                          items: draft.items.filter((_, i) => i !== index),
                        });
                    }}
                  >
                    Remove
                  </button>
                </div>
                {(
                  [
                    "imageUrl",
                    "alt",
                    "title",
                    "caption",
                    "linkUrl",
                    "ctaText",
                  ] as const
                ).map((key) => (
                  <label key={key}>
                    {
                      {
                        imageUrl: "Image URL",
                        alt: "Alt text",
                        title: "Image title",
                        caption: "Caption",
                        linkUrl: "Link URL",
                        ctaText: "CTA text",
                      }[key]
                    }
                    <input
                      required={key === "imageUrl"}
                      value={row[key] || ""}
                      onChange={(e) =>
                        item(index, {
                          ...row,
                          [key]: e.target.value,
                          ...(key === "imageUrl" ? { mediaId: null } : {}),
                        })
                      }
                    />
                  </label>
                ))}
                <label>
                  Tags (comma separated)
                  <input
                    value={(row.tags || []).join(", ")}
                    onChange={(e) =>
                      item(index, {
                        ...row,
                        tags: e.target.value.split(",").map((v) => v.trim()),
                      })
                    }
                  />
                </label>
              </article>
            ))}
          </div>
          <div className="gallery-actions">
            <button
              type="button"
              onClick={() =>
                setDraft({
                  ...draft,
                  items: [
                    ...draft.items,
                    {
                      id: crypto.randomUUID(),
                      imageUrl: "",
                      alt: "",
                      tags: [],
                    },
                  ],
                })
              }
            >
              Add image URL
            </button>
            {canUseMedia && (
              <button type="button" onClick={() => setPicker(true)}>
                Choose from Media
              </button>
            )}
          </div>
          <button>Save gallery</button>
        </fieldset>
      </form>
      {id !== "new" && (
        <div className="gallery-actions">
          <button
            disabled={busy || dirty}
            onClick={() => void run(() => duplicateMarketingGallery(id))}
          >
            Duplicate saved gallery
          </button>
          <button
            disabled={busy || dirty || draft.status === "published"}
            onClick={() => {
              if (confirm("Publish this saved gallery?"))
                void run(() => publishMarketingGallery(id));
            }}
          >
            Publish saved gallery
          </button>
          <button
            disabled={busy || dirty || draft.status !== "published"}
            onClick={() => {
              if (confirm("Unpublish this gallery?"))
                void run(() => unpublishMarketingGallery(id));
            }}
          >
            Unpublish gallery
          </button>
          <button
            disabled={busy}
            onClick={async () => {
              if (
                !confirm(
                  "Delete this gallery and its gallery items? Media files are retained.",
                )
              )
                return;
              setBusy(true);
              try {
                await deleteMarketingGallery(id);
                onClose();
              } catch (e) {
                setError(message(e));
              } finally {
                setBusy(false);
              }
            }}
          >
            Delete gallery
          </button>
        </div>
      )}
      {dirty && id !== "new" && (
        <p>Save changes before duplicating or using publication actions.</p>
      )}
      {canUseMedia && (
        <dialog ref={dialog} onCancel={() => setPicker(false)}>
          <button onClick={() => setPicker(false)}>Close Media picker</button>
          {picker && (
            <MediaLibrary
              acceptAsset={(asset) => asset.mimeType.startsWith("image/")}
              onSelect={(asset) => {
                setDraft((current) =>
                  current
                    ? {
                        ...current,
                        items: [
                          ...current.items,
                          {
                            id: crypto.randomUUID(),
                            imageUrl: asset.url,
                            mediaId: asset.id,
                            alt: asset.alt,
                            title: asset.title,
                            caption: asset.caption,
                          },
                        ],
                      }
                    : current,
                );
                setPicker(false);
              }}
            />
          )}
        </dialog>
      )}
    </section>
  );
}
export default function GalleryManager({
  canUseMedia,
}: {
  canUseMedia: boolean;
}) {
  const [rows, setRows] = useState<MarketingGallery[]>([]),
    [editing, setEditing] = useState<string | null>(null),
    [filters, setFilters] = useState<ListMarketingGalleriesParams>({
      sort: "updated",
    }),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false);
  useEffect(() => {
    if (editing) return;
    const c = new AbortController();
    setLoading(true);
    setError("");
    listMarketingGalleries(filters, { signal: c.signal })
      .then(setRows)
      .catch((e) => {
        if (!c.signal.aborted) setError(message(e));
      })
      .finally(() => {
        if (!c.signal.aborted) setLoading(false);
      });
    return () => c.abort();
  }, [editing, filters]);
  if (editing)
    return (
      <Editor
        key={editing}
        id={editing}
        onClose={() => setEditing(null)}
        onCreated={setEditing}
        canUseMedia={canUseMedia}
      />
    );
  return (
    <section className="gallery-manager">
      <p>
        Create reusable image galleries for website content and Blog gallery
        shortcodes.
      </p>
      {error && <p role="alert">{error}</p>}
      <button onClick={() => setEditing("new")}>New gallery</button>
      <div className="gallery-settings">
        <label>
          Search galleries
          <input
            type="search"
            value={filters.search || ""}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </label>
        <label>
          Status
          <select
            aria-label="Filter gallery status"
            value={filters.status || ""}
            onChange={(e) =>
              setFilters({
                ...filters,
                status:
                  (e.target.value as ListMarketingGalleriesParams["status"]) ||
                  undefined,
              })
            }
          >
            <option value="">All</option>
            {["draft", "published", "archived"].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          Sort
          <select
            aria-label="Sort galleries"
            value={filters.sort}
            onChange={(e) =>
              setFilters({
                ...filters,
                sort: e.target.value as ListMarketingGalleriesParams["sort"],
              })
            }
          >
            {["updated", "created", "title"].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
      </div>
      {loading ? (
        <p role="status">Loading galleries…</p>
      ) : (
        <div className="gallery-items">
          {rows.map((row) => (
            <article key={row.id}>
              <h2>{row.title}</h2>
              <p>
                {row.status} · {row.imageCount} images · {row.layout}
              </p>
              <code>{`[gallery id="${row.id}"]`}</code>
              <button onClick={() => setEditing(row.id)}>
                Edit {row.title}
              </button>
            </article>
          ))}
          {!rows.length && <p>No galleries match these filters.</p>}
        </div>
      )}
    </section>
  );
}

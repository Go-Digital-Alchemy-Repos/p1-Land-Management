import { CmsUploadDropzone } from "../../../../platform/p1-core/client/src/components/shared/cms-upload-dropzone";
import { GalleryListPresentation } from "../../../../platform/p1-core/client/src/components/shared/cms-gallery-list-presentation";
import { CmsPausedBanner, CMS_PAUSED_SHORT, useCmsEditingPaused } from "./useCmsEditingStatus";
import React from "react";
import {
  GalleryEditorPresentation,
  type GalleryPrimitives,
  type GalleryDraft,
} from "../../../../platform/p1-core/client/src/components/shared/cms-gallery-editor-presentation";
import { galleryPrimitives, GalleryImageInput } from "./gallery-primitives";
import { formPrimitives, FormsMediaProvider } from "./forms-primitives";
import { useEffect, useRef, useState } from "react";
import {
  uploadMarketingMedia,
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
import { GalleryPreview } from "./GalleryPreview";
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
function Editor({
  id,
  onClose,
  onCreated,
  canUseMedia,
  cmsPaused,
}: {
  id: string;
  onClose: () => void;
  onCreated: (id: string) => void;
  canUseMedia: boolean;
  cmsPaused: boolean;
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
  const uploadInput = useRef<HTMLInputElement>(null);
  const uploadFiles = async (files: File[]) => {
    if (!canUseMedia || busy || !files.length) return;
    const signal = uploads.current.signal;
    setBusy(true);
    setError("");
    try {
      for (const file of files) {
        if (
          !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(
            file.type,
          )
        )
          throw Error(`${file.name}: choose PNG, JPEG, WebP or GIF.`);
        if (file.size > 10 * 1024 * 1024)
          throw Error(`${file.name} exceeds 10 MB.`);
        const asset = await uploadMarketingMedia({ file }, { signal });
        if (signal.aborted) break;
        setDraft((current) =>
          current
            ? {
                ...current,
                items: [
                  ...current.items,
                  {
                    id: crypto.randomUUID(),
                    mediaId: asset.id,
                    imageUrl: asset.url,
                    alt: asset.alt,
                    title: asset.title,
                    caption: asset.caption,
                  },
                ],
              }
            : current,
        );
      }
    } catch (e) {
      setError(
        `${message(e)} Earlier successful uploads remain in Media and this draft.`,
      );
    } finally {
      setBusy(false);
    }
  };
  const uploads = useRef(new AbortController());
  useEffect(() => {
    const controller = new AbortController();
    uploads.current = controller;
    return () => controller.abort();
  }, []);
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
    if (busy) setPicker(false);
  }, [busy]);
  useEffect(() => {
    if (picker) dialog.current?.showModal();
    else dialog.current?.close();
  }, [picker]);
  function close() {
    if (!dirty || confirm("Discard unsaved gallery changes?")) onClose();
  }
  async function run(action: () => Promise<MarketingGallery>) {
    if (cmsPaused) return;
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
  return (
    <section className="gallery-manager">
      <CmsPausedBanner paused={cmsPaused} />
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <FormsMediaProvider canUseMedia={canUseMedia}>
        <GalleryEditorPresentation
          draft={draft as GalleryDraft}
          setDraft={(update) => {
            if (!busy)
              setDraft((current) =>
                current
                  ? (update(current as GalleryDraft) as MarketingGalleryInput)
                  : current,
              );
          }}
          isNew={id === "new"}
          busy={busy}
          mutationDisabledReason={cmsPaused ? CMS_PAUSED_SHORT : undefined}
          canUseMedia={canUseMedia}
          onBack={close}
          onSave={() => {
            if (cmsPaused || busy || !draft.title.trim()) return;
            if (draft.items.some((item) => !item.imageUrl.trim())) {
              setError(
                "Add an image URL or remove the empty image before saving.",
              );
              return;
            }
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
          confirmRemoveItem={() =>
            confirm("Remove this image from the gallery draft?")
          }
          onChooseMedia={() => setPicker(true)}
          primitives={galleryPrimitives as unknown as GalleryPrimitives}
          uploadControl={
            <fieldset disabled={busy}>
              {canUseMedia && (
                <input
                  ref={uploadInput}
                  type="file"
                  multiple
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  hidden
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    e.target.value = "";
                    void uploadFiles(files);
                  }}
                />
              )}
              {canUseMedia && (
                <CmsUploadDropzone
                  Button={galleryPrimitives.Button}
                  multiple
                  label="Gallery images"
                  disabled={busy || !canUseMedia}
                  isUploading={busy}
                  showLibraryButton
                  onChooseLibrary={() => {
                    if (canUseMedia && !busy) setPicker(true);
                  }}
                  onBrowse={() => uploadInput.current?.click()}
                  onFiles={uploadFiles}
                />
              )}
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
            </fieldset>
          }
          mediaPicker={null}
          renderImageInput={(index, row) => (
            <GalleryImageInput
              label={`Gallery image ${index + 1}`}
              value={row.imageUrl}
              canUseMedia={canUseMedia}
              onChange={(url, mediaId) =>
                item(index, {
                  ...draft.items[index],
                  imageUrl: url,
                  mediaId: mediaId ?? null,
                })
              }
            />
          )}
          renderPreview={(gallery) => (
            <GalleryPreview gallery={gallery as MarketingGalleryInput} />
          )}
        />
      </FormsMediaProvider>
      {id !== "new" && (
        <div className="gallery-actions">
          <button
            disabled={cmsPaused || busy || dirty}
            aria-disabled={cmsPaused}
            title={cmsPaused ? CMS_PAUSED_SHORT : undefined}
            onClick={() => void run(() => duplicateMarketingGallery(id))}
          >
            Duplicate saved gallery
          </button>
          <button
            disabled={cmsPaused || busy || dirty || draft.status === "published"}
            aria-disabled={cmsPaused}
            title={cmsPaused ? CMS_PAUSED_SHORT : undefined}
            onClick={() => {
              if (confirm("Publish this saved gallery?"))
                void run(() => publishMarketingGallery(id));
            }}
          >
            Publish saved gallery
          </button>
          <button
            disabled={cmsPaused || busy || dirty || draft.status !== "published"}
            aria-disabled={cmsPaused}
            title={cmsPaused ? CMS_PAUSED_SHORT : undefined}
            onClick={() => {
              if (confirm("Unpublish this gallery?"))
                void run(() => unpublishMarketingGallery(id));
            }}
          >
            Unpublish gallery
          </button>
          <button
            disabled={cmsPaused || busy}
            aria-disabled={cmsPaused}
            title={cmsPaused ? CMS_PAUSED_SHORT : undefined}
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
// Opaque CMS IDs are varchar keys; do not assume every retained record is UUID-only.
export function readGalleryIntent(search: string): {
  id: string | null;
  error: string;
} {
  const values = new URLSearchParams(search).getAll("gallery");
  if (!values.length) return { id: null, error: "" };
  if (values.length !== 1 || !/^[A-Za-z0-9_-]{1,200}$/.test(values[0]))
    return {
      id: null,
      error: "Invalid gallery editor link. Choose a record from the list.",
    };
  return { id: values[0], error: "" };
}

export default function GalleryManager({
  canUseMedia,
}: {
  canUseMedia: boolean;
}) {
  const cmsPaused = useCmsEditingPaused();
  const [initialIntent] = useState(() => readGalleryIntent(location.search));
  const [intentError, setIntentError] = useState(initialIntent.error);
  const [rows, setRows] = useState<MarketingGallery[]>([]),
    [editing, setEditing] = useState<string | null>(initialIntent.id),
    [filters, setFilters] = useState<ListMarketingGalleriesParams>({
      sort: "updated",
    }),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(false),
    [listBusy, setListBusy] = useState(false),
    [refresh, setRefresh] = useState(0);
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
  }, [editing, filters, refresh]);
  const select = (id: string | null) => {
    if (id !== null && !/^[A-Za-z0-9_-]{1,200}$/.test(id)) {
      setIntentError(
        "Invalid gallery editor link. Choose a record from the list.",
      );
      return;
    }
    const url = new URL(location.href);
    if (id) url.searchParams.set("gallery", id);
    else url.searchParams.delete("gallery");
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
        cmsPaused={cmsPaused}
      />
    );
  return (
    <section className="gallery-manager">
      <CmsPausedBanner paused={cmsPaused} />
      {intentError && <p role="alert">{intentError}</p>}
      {error && <p role="alert">{error}</p>}
      <GalleryListPresentation
        galleries={rows}
        isLoading={loading}
        busy={listBusy}
        mutationDisabledReason={cmsPaused ? CMS_PAUSED_SHORT : undefined}
        search={filters.search || ""}
        setSearch={(search) => setFilters({ ...filters, search })}
        status={filters.status || "all"}
        setStatus={(status) =>
          setFilters({
            ...filters,
            status:
              status === "all"
                ? undefined
                : (status as ListMarketingGalleriesParams["status"]),
          })
        }
        sort={filters.sort || "updated"}
        setSort={(sort) =>
          setFilters({
            ...filters,
            sort: sort as ListMarketingGalleriesParams["sort"],
          })
        }
        onSelect={select}
        onAction={async (id, action) => {
          if (listBusy || cmsPaused) return;
          if (
            action !== "duplicate" &&
            !confirm(
              `${action === "delete" ? "Delete this gallery and its items? Media files are retained." : action === "publish" ? "Publish this saved gallery?" : "Unpublish this gallery?"}`,
            )
          )
            return;
          setListBusy(true);
          setError("");
          try {
            if (action === "delete") await deleteMarketingGallery(id);
            else if (action === "duplicate") {
              const copy = await duplicateMarketingGallery(id);
              select(copy.id);
            } else if (action === "publish") await publishMarketingGallery(id);
            else await unpublishMarketingGallery(id);
            setRefresh((v) => v + 1);
          } catch (error) {
            setError(message(error));
          } finally {
            setListBusy(false);
          }
        }}
        primitives={
          {
            ...galleryPrimitives,
            Skeleton: ({ className }: { className?: string }) => (
              <div className={className} role="status">
                Loading galleries…
              </div>
            ),
          } as unknown as GalleryPrimitives
        }
      />
    </section>
  );
}

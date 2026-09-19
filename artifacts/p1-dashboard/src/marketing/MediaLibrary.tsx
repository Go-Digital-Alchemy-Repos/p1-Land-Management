import {
  MediaLibraryGallery,
  MediaDetailsContent,
  MediaUploadContent,
  mediaIsImage,
} from "../../../../platform/p1-core/client/src/components/shared/media-library-presentation";
import { ImageCropperEditor } from "../../../../platform/p1-core/client/src/components/shared/image-cropper-editor";
import { Upload, Crop, Copy, Save, Trash2 } from "lucide-react";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  listMarketingMedia,
  uploadMarketingMedia,
  updateMarketingMedia,
  deleteMarketingMedia,
  getMarketingMediaSource,
  getGetMarketingMediaSourceUrl,
  replaceMarketingMedia,
} from "@workspace/api-client-react/dashboard";
import type {
  MarketingMedia,
  MarketingMediaMetadata,
} from "../../../../lib/api-client-react/src/dashboard/models";
import { useCmsUnsavedChanges } from "./useCmsUnsavedChanges";
import "./media-library.css";
const fields = [
  ["originalName", "File name", 255],
  ["title", "Title", 255],
  ["alt", "Alternative text", 255],
  ["caption", "Caption", 500],
  ["description", "Description", 2000],
  ["seoTitle", "SEO title", 255],
  ["seoDescription", "SEO description", 320],
  ["ogTitle", "Social title", 255],
  ["ogDescription", "Social description", 320],
] as const;
function errorText(e: unknown) {
  const data = (e as { data?: { error?: string; message?: string } }).data;
  return (
    data?.error ||
    data?.message ||
    (e as Error).message ||
    "Media request failed"
  );
}
function metadata(asset: MarketingMedia): MarketingMediaMetadata {
  return Object.fromEntries(fields.map(([key]) => [key, asset[key] || ""]));
}
const isImage = mediaIsImage;
const source = (asset: MarketingMedia) =>
  getGetMarketingMediaSourceUrl(asset.id);

function ImageCrop({
  asset,
  onSave,
  onCancel,
}: {
  asset: MarketingMedia;
  onSave: (file: File) => Promise<void>;
  onCancel: () => void;
}) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
    const controller = new AbortController();
    let objectUrl = "";
    getMarketingMediaSource(asset.id, { signal: controller.signal })
      .then((blob) => {
        if (!controller.signal.aborted) {
          objectUrl = URL.createObjectURL(blob);
          setUrl(objectUrl);
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted) setError(errorText(e));
      });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [asset.id]);
  return (
    <dialog
      ref={dialog}
      className="media-crop-modal"
      aria-label="Crop Image"
      onCancel={(e) => {
        e.preventDefault();
        if (!busy) onCancel();
      }}
    >
      {error && <p role="alert">{error}</p>}
      <ImageCropperEditor
        imageSrc={url || null}
        fileName={asset.originalName}
        title="Crop Image"
        applyLabel="Save crop"
        outputMimeType="image/webp"
        useWebWorker={false}
        showCoordinates
        onProcessingChange={setBusy}
        onCancel={onCancel}
        onConfirm={async (file) => {
          if (
            window.confirm(
              "Replace this image everywhere it is used? Existing pages may need a refresh.",
            )
          )
            await onSave(file);
        }}
      />
    </dialog>
  );
}

function MediaDetails({
  asset,
  onClose,
  onChanged,
}: {
  asset: MarketingMedia;
  onClose: () => void;
  onChanged: () => Promise<void>;
}) {
  const [imageVersion, setImageVersion] = useState(0);
  const [values, setValues] = useState(() => metadata(asset)),
    [saved, setSaved] = useState(() => metadata(asset)),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [crop, setCrop] = useState(false);
  const abort = useRef(new AbortController());
  useEffect(() => {
    const controller = new AbortController();
    abort.current = controller;
    return () => controller.abort();
  }, []);
  const dirty = JSON.stringify(values) !== JSON.stringify(saved);
  useCmsUnsavedChanges(dirty);
  async function action(work: () => Promise<void>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work();
    } catch (e) {
      if (!abort.current.signal.aborted) setError(errorText(e));
    } finally {
      if (!abort.current.signal.aborted) setBusy(false);
    }
  }
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
  }, []);
  const close = () => {
    if (
      !busy &&
      !crop &&
      (!dirty || window.confirm("Discard unsaved media metadata?"))
    )
      onClose();
  };
  const copy = () =>
    void navigator.clipboard
      .writeText(asset.url)
      .then(() => setNotice("URL copied."))
      .catch(() => setError("Copy failed. Select the URL above to copy it."));
  return (
    <dialog
      ref={dialog}
      className="media-details-modal"
      aria-label="Media details"
      onCancel={(e) => {
        e.preventDefault();
        close();
      }}
    >
      <button
        type="button"
        className="media-close"
        disabled={busy || crop}
        onClick={close}
        aria-label="Back to media"
      >
        ×
      </button>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void action(async () => {
            const updated = await updateMarketingMedia(asset.id, values, {
              signal: abort.current.signal,
            });
            setValues(metadata(updated));
            setSaved(metadata(updated));
            setNotice("Metadata saved.");
            await onChanged();
          });
        }}
      >
        <MediaDetailsContent
          asset={asset}
          source={`${source(asset)}?v=${imageVersion}`}
          notices={
            <>
              {error && <p role="alert">{error}</p>}
              {notice && <p role="status">{notice}</p>}
            </>
          }
          copyButton={
            <button type="button" onClick={copy}>
              <Copy aria-hidden="true" />
              Copy URL
            </button>
          }
          extraActions={
            <a href={source(asset)} download>
              Download original
            </a>
          }
          renderField={(field) => {
            const common = {
              id: field.id,
              value: values[field.key] || "",
              maxLength: field.max,
              placeholder: field.placeholder,
              disabled: busy || crop,
              onChange: (
                e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
              ) => setValues({ ...values, [field.key]: e.target.value }),
            };
            return field.rows ? (
              <textarea {...common} rows={field.rows} />
            ) : (
              <input {...common} required={field.key === "originalName"} />
            );
          }}
          toolbar={
            <>
              <div>
                {isImage(asset) && (
                  <button
                    type="button"
                    disabled={busy || dirty || crop}
                    onClick={() => setCrop(true)}
                  >
                    <Crop aria-hidden="true" />
                    Crop Image
                  </button>
                )}
                <button type="button" onClick={copy}>
                  <Copy aria-hidden="true" />
                  Copy URL
                </button>
                <button type="submit" disabled={!dirty || busy || crop}>
                  <Save aria-hidden="true" />
                  {busy ? "Saving…" : "Save Details"}
                </button>
              </div>
              <button
                type="button"
                disabled={busy || crop}
                onClick={() => {
                  if (
                    window.confirm(
                      `Delete ${asset.originalName}? This permanently removes the file and can break existing references (${asset.usageCount || 0} known).`,
                    )
                  )
                    void action(async () => {
                      await deleteMarketingMedia(asset.id, {
                        signal: abort.current.signal,
                      });
                      await onChanged();
                      onClose();
                    });
                }}
              >
                <Trash2 aria-hidden="true" />
                Delete
              </button>
            </>
          }
        />
      </form>
      {crop && (
        <ImageCrop
          asset={asset}
          onCancel={() => setCrop(false)}
          onSave={async (file) => {
            await replaceMarketingMedia(
              asset.id,
              { file },
              { signal: abort.current.signal },
            );
            setCrop(false);
            setImageVersion((v) => v + 1);
            await onChanged();
            setNotice("Image replaced. Existing pages may need a refresh.");
          }}
        />
      )}
    </dialog>
  );
}

export function MediaLibrary({
  onSelect,
  acceptAsset,
}: {
  onSelect?: (asset: MarketingMedia) => void;
  acceptAsset?: (asset: MarketingMedia) => boolean;
}) {
  const [assets, setAssets] = useState<MarketingMedia[]>([]),
    [selected, setSelected] = useState<string | null>(null),
    [search, setSearch] = useState(""),
    [type, setType] = useState("all"),
    [usage, setUsage] = useState("all"),
    [sort, setSort] = useState("newest"),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [loading, setLoading] = useState(true);
  const abort = useRef(new AbortController());
  const load = async () => {
    const rows = await listMarketingMedia({ signal: abort.current.signal });
    if (!abort.current.signal.aborted) setAssets(rows);
  };
  useEffect(() => {
    abort.current = new AbortController();
    void load()
      .catch((e) => {
        if (!abort.current.signal.aborted) setError(errorText(e));
      })
      .finally(() => setLoading(false));
    return () => abort.current.abort();
  }, []);
  const visible = useMemo(
    () =>
      assets
        .filter((a) =>
          [a.originalName, a.title, a.alt, a.caption, a.description].some((v) =>
            v?.toLowerCase().includes(search.toLowerCase()),
          ),
        )
        .filter(
          (a) =>
            type === "all" || (type === "images" ? isImage(a) : !isImage(a)),
        )
        .filter(
          (a) =>
            usage === "all" ||
            (usage === "live"
              ? a.isInUse
              : usage === "draft"
                ? !a.isInUse && (a.usageCount || 0) > 0
                : !a.usageCount),
        )
        .sort((a, b) => {
          const name = a.originalName.localeCompare(b.originalName),
            size = a.fileSize - b.fileSize,
            used =
              (a.liveUsageCount || 0) - (b.liveUsageCount || 0) ||
              (a.usageCount || 0) - (b.usageCount || 0),
            date =
              Date.parse(a.createdAt || "1970-01-01") -
              Date.parse(b.createdAt || "1970-01-01");
          return sort === "name"
            ? name
            : sort === "name-desc"
              ? -name
              : sort === "largest"
                ? -size
                : sort === "smallest"
                  ? size
                  : sort === "most-used"
                    ? -used
                    : sort === "least-used"
                      ? used
                      : sort === "oldest"
                        ? date
                        : -date;
        }),
    [assets, search, type, usage, sort],
  );
  const chosen = assets.find((a) => a.id === selected);
  const [uploadOpen, setUploadOpen] = useState(false);
  const uploadDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (uploadOpen) uploadDialog.current?.showModal();
  }, [uploadOpen]);
  return (
    <div className="media-library">
      {error && <p role="alert">{error}</p>}
      <MediaLibraryGallery
        assets={assets}
        visible={visible}
        loading={loading}
        filtered={Boolean(search || type !== "all" || usage !== "all")}
        source={(asset) => getGetMarketingMediaSourceUrl(asset.id)}
        acceptAsset={
          acceptAsset
            ? (asset) => acceptAsset(asset as MarketingMedia)
            : undefined
        }
        onOpen={(id) => {
          const asset = assets.find((a) => a.id === id);
          if (asset) {
            if (onSelect) onSelect(asset);
            else setSelected(id);
          }
        }}
        uploadButton={
          <button type="button" onClick={() => setUploadOpen(true)}>
            <Upload aria-hidden="true" />
            Upload File
          </button>
        }
        filters={
          <div className="media-filters">
            <label>
              Search media
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </label>
            <label>
              Type
              <select
                aria-label="Type"
                value={type}
                onChange={(e) => setType(e.target.value)}
              >
                <option value="all">All types</option>
                <option value="images">Images</option>
                <option value="documents">Documents</option>
              </select>
            </label>
            <label>
              Usage
              <select
                aria-label="Usage"
                value={usage}
                onChange={(e) => setUsage(e.target.value)}
              >
                <option value="all">All usage</option>
                <option value="live">Live references</option>
                <option value="draft">Draft / private only</option>
                <option value="unused">No known references</option>
              </select>
            </label>
            <label>
              Sort
              <select
                aria-label="Sort"
                value={sort}
                onChange={(e) => setSort(e.target.value)}
              >
                {[
                  ["newest", "Newest"],
                  ["oldest", "Oldest"],
                  ["name", "Name A–Z"],
                  ["name-desc", "Name Z–A"],
                  ["largest", "Largest"],
                  ["smallest", "Smallest"],
                  ["most-used", "Most used"],
                  ["least-used", "Least used"],
                ].map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        }
      />
      {chosen && !onSelect && (
        <MediaDetails
          key={chosen.id}
          asset={chosen}
          onClose={() => setSelected(null)}
          onChanged={load}
        />
      )}
      {uploadOpen && (
        <dialog
          ref={uploadDialog}
          className="media-upload-modal"
          aria-label="Upload Media"
          onCancel={(e) => {
            e.preventDefault();
            if (!busy) setUploadOpen(false);
          }}
        >
          <button
            type="button"
            className="media-close"
            aria-label="Close upload"
            disabled={busy}
            onClick={() => setUploadOpen(false)}
          >
            ×
          </button>
          <MediaUploadContent>
            {error && <p role="alert">{error}</p>}{" "}
            <label
              className="media-upload"
              role="button"
              aria-disabled={busy}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (!busy && e.dataTransfer.files.length) {
                  const input =
                    e.currentTarget.querySelector<HTMLInputElement>("input");
                  if (input) {
                    input.files = e.dataTransfer.files;
                    input.dispatchEvent(new Event("change", { bubbles: true }));
                  }
                }
              }}
              tabIndex={busy ? -1 : 0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.currentTarget
                    .querySelector<HTMLInputElement>("input")
                    ?.click();
                }
              }}
            >
              <Upload aria-hidden="true" />
              Click to upload or drag and drop
              <small>Images, PDFs, and common documents · Max 10 MB each</small>
              <input
                type="file"
                hidden
                aria-label="Upload files"
                multiple
                disabled={busy}
                onChange={async (e) => {
                  const files = Array.from(e.target.files || []);
                  e.target.value = "";
                  setBusy(true);
                  setError("");
                  try {
                    for (const file of files) {
                      if (file.size > 10 * 1024 * 1024)
                        throw Error(
                          `${file.name} exceeds 10 MB. Earlier successful uploads are retained.`,
                        );
                      await uploadMarketingMedia(
                        { file },
                        { signal: abort.current.signal },
                      );
                    }
                  } catch (err) {
                    setError(errorText(err));
                  } finally {
                    try {
                      await load();
                    } catch (err) {
                      setError(errorText(err));
                    }
                    setBusy(false);
                  }
                }}
              />
            </label>
            {busy && <p role="status">Uploading…</p>}
          </MediaUploadContent>
        </dialog>
      )}
    </div>
  );
}
export default MediaLibrary;

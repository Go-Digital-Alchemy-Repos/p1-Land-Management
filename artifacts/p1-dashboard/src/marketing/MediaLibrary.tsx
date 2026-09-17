import { useEffect, useMemo, useRef, useState } from "react";
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
const isImage = (asset: MarketingMedia) =>
  ["image/png", "image/jpeg", "image/webp", "image/gif"].includes(
    asset.mimeType,
  );
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
  const [url, setUrl] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [rect, setRect] = useState({ x: 5, y: 5, width: 90, height: 90 });
  const image = useRef<HTMLImageElement>(null),
    start = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const abort = new AbortController();
    let objectUrl = "";
    getMarketingMediaSource(asset.id, { signal: abort.signal })
      .then((blob) => {
        if (!abort.signal.aborted) {
          objectUrl = URL.createObjectURL(blob);
          setUrl(objectUrl);
        }
      })
      .catch((e) => {
        if (!abort.signal.aborted) setError(errorText(e));
      });
    return () => {
      abort.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [asset.id]);
  async function crop() {
    if (!image.current) return;
    setBusy(true);
    setError("");
    try {
      const img = image.current;
      const width = Math.round((img.naturalWidth * rect.width) / 100),
        height = Math.round((img.naturalHeight * rect.height) / 100);
      if (
        width < 1 ||
        height < 1 ||
        rect.x + rect.width > 100 ||
        rect.y + rect.height > 100
      )
        throw Error("Choose a crop within the image.");
      const ratio = Math.min(1, 1200 / Math.max(width, height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw Error("Image editing is unavailable");
      ctx.drawImage(
        img,
        (img.naturalWidth * rect.x) / 100,
        (img.naturalHeight * rect.y) / 100,
        width,
        height,
        0,
        0,
        canvas.width,
        canvas.height,
      );
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(Error("Unable to crop image"))),
          "image/webp",
          0.9,
        ),
      );
      await onSave(new File([blob], "crop.webp", { type: "image/webp" }));
    } catch (e) {
      setError(errorText(e));
    } finally {
      setBusy(false);
    }
  }
  const point = (e: React.PointerEvent) => {
    const box = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(100, ((e.clientX - box.left) / box.width) * 100)),
      y: Math.max(0, Math.min(100, ((e.clientY - box.top) / box.height) * 100)),
    };
  };
  return (
    <section aria-label="Crop image" className="media-crop">
      <h3>Crop image</h3>
      <p>
        Drag a rectangle or enter percentages. Saving replaces this image
        wherever it is used. Animated images become a still image.
      </p>
      {error && <p role="alert">{error}</p>}
      {url && (
        <div
          className="media-crop-stage"
          onPointerDown={(e) => {
            if (busy) return;
            start.current = point(e);
            e.currentTarget.setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!start.current) return;
            const end = point(e);
            setRect({
              x: Math.min(start.current.x, end.x),
              y: Math.min(start.current.y, end.y),
              width: Math.abs(end.x - start.current.x),
              height: Math.abs(end.y - start.current.y),
            });
          }}
          onPointerUp={() => {
            start.current = null;
          }}
          onPointerCancel={() => {
            start.current = null;
          }}
        >
          <img ref={image} src={url} alt="Image to crop" draggable={false} />
          <span
            style={{
              left: `${rect.x}%`,
              top: `${rect.y}%`,
              width: `${rect.width}%`,
              height: `${rect.height}%`,
            }}
          />
        </div>
      )}
      <fieldset disabled={busy}>
        {(["x", "y", "width", "height"] as const).map((key) => (
          <label key={key}>
            Crop {key} (%)
            <input
              type="number"
              min={key === "x" || key === "y" ? 0 : 1}
              max={100}
              step="0.1"
              value={Math.round(rect[key] * 10) / 10}
              onChange={(e) =>
                setRect({ ...rect, [key]: Number(e.target.value) })
              }
            />
          </label>
        ))}
        <button
          type="button"
          disabled={!url}
          onClick={() => {
            if (
              window.confirm(
                "Replace this image with the crop everywhere it is used?",
              )
            )
              void crop();
          }}
        >
          Save crop
        </button>
        <button type="button" onClick={onCancel}>
          Cancel crop
        </button>
      </fieldset>
    </section>
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
  return (
    <section className="media-details" aria-label="Media details">
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          if (!dirty || window.confirm("Discard unsaved media metadata?"))
            onClose();
        }}
      >
        Back to media
      </button>
      <h2>{asset.title || asset.originalName}</h2>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {isImage(asset) && (
        <img
          key={imageVersion}
          className="media-detail-image"
          src={source(asset)}
          alt={asset.alt || ""}
        />
      )}
      <p>
        {asset.mimeType} · {(asset.fileSize / 1024).toFixed(1)} KB
      </p>
      <label>
        Asset URL
        <input readOnly value={asset.url} />
      </label>
      <a href={source(asset)} download>
        Download original
      </a>
      <button
        type="button"
        onClick={() =>
          void navigator.clipboard
            .writeText(asset.url)
            .then(() => setNotice("URL copied."))
            .catch(() =>
              setError("Copy failed. Select the URL above to copy it."),
            )
        }
      >
        Copy URL
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
        <fieldset disabled={busy || crop}>
          <legend>Metadata</legend>
          {fields.map(([key, label, max]) => (
            <label key={key}>
              {label}
              {max > 255 ? (
                <textarea
                  value={values[key] || ""}
                  maxLength={max}
                  onChange={(e) =>
                    setValues({ ...values, [key]: e.target.value })
                  }
                />
              ) : (
                <input
                  required={key === "originalName"}
                  value={values[key] || ""}
                  maxLength={max}
                  onChange={(e) =>
                    setValues({ ...values, [key]: e.target.value })
                  }
                />
              )}
            </label>
          ))}
          <button type="submit" disabled={!dirty}>
            Save metadata
          </button>
        </fieldset>
      </form>
      <section>
        <h3>Known usage</h3>
        <p>
          {asset.liveUsageCount || 0} live references · {asset.usageCount || 0}{" "}
          total references. Usage is a discovery aid; external links and unsaved
          edits may not be listed.
        </p>
        {asset.usageRefs?.map((ref, i) => (
          <p key={i}>
            {ref.entityName} · {ref.field} · {ref.statusLabel}
          </p>
        ))}
      </section>
      {crop ? (
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
            setImageVersion((value) => value + 1);
            await onChanged();
            setNotice("Image replaced. Existing pages may need a refresh.");
          }}
        />
      ) : (
        isImage(asset) && (
          <button
            type="button"
            disabled={busy || dirty}
            onClick={() => setCrop(true)}
          >
            Crop image
          </button>
        )
      )}
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
        Delete media
      </button>
    </section>
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
  if (chosen && !onSelect)
    return (
      <MediaDetails
        key={chosen.id}
        asset={chosen}
        onClose={() => setSelected(null)}
        onChanged={load}
      />
    );
  return (
    <div className="media-library">
      <p>Website images and documents. File uploads are limited to 10 MB.</p>
      {error && <p role="alert">{error}</p>}
      <label className="media-upload">
        Upload files
        <input
          type="file"
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
      {loading ? (
        <p role="status">Loading media…</p>
      ) : (
        <>
          <p>
            {visible.length} of {assets.length} assets
          </p>
          <div className="media-grid">
            {visible.map((asset) => (
              <button
                type="button"
                key={asset.id}
                disabled={Boolean(acceptAsset && !acceptAsset(asset))}
                onClick={() =>
                  onSelect ? onSelect(asset) : setSelected(asset.id)
                }
              >
                {isImage(asset) ? (
                  <img
                    loading="lazy"
                    src={source(asset)}
                    alt={asset.alt || ""}
                  />
                ) : (
                  <span className="media-document">Document</span>
                )}
                <strong>{asset.title || asset.originalName}</strong>
                <span>{asset.originalName}</span>
                <small>
                  {asset.liveUsageCount || 0} live · {asset.usageCount || 0}{" "}
                  known references
                </small>
                {acceptAsset && !acceptAsset(asset) && (
                  <small>Unavailable for this field</small>
                )}
              </button>
            ))}
          </div>
          {!visible.length && <p>No media matches these filters.</p>}
        </>
      )}
    </div>
  );
}
export default MediaLibrary;

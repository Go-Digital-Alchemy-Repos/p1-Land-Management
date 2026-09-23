import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { ImagePlus, Images, X } from "lucide-react";
import "./property-photos.css";

type Photo = { id: string; name: string; description: string | null; created_at: string };
const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);
const contentUrl = (id: string) => `/api/v1/files/${encodeURIComponent(id)}/content`;

async function responseError(response: Response) {
  const data = await response.json().catch(() => ({}));
  return new Error(data.error || data.message || "The photo could not be saved. Please try again.");
}

export function PropertyPhotos({ propertyId, canUpload }: { propertyId: string; canUpload: boolean }) {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [selected, setSelected] = useState<Photo | null>(null);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [detailError, setDetailError] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);

  const load = useCallback(async (signal?: AbortSignal) => {
    const response = await fetch(`/api/v1/properties/${encodeURIComponent(propertyId)}/photos`, { credentials: "same-origin", signal });
    if (!response.ok) throw await responseError(response);
    const next = await response.json();
    if (!signal?.aborted) setPhotos(next);
  }, [propertyId]);

  useEffect(() => {
    const controller = new AbortController();
    setPhotos([]);
    setSelected(null);
    setLoading(true);
    setError("");
    void load(controller.signal).catch((reason) => { if (!controller.signal.aborted) setError((reason as Error).message); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => { controller.abort(); };
  }, [load]);

  useEffect(() => {
    if (selected && !dialog.current?.open) dialog.current?.showModal();
    if (!selected && dialog.current?.open) dialog.current.close();
  }, [selected]);

  function open(photo: Photo) {
    setDescription(photo.description || "");
    setDetailError("");
    setSelected(photo);
  }

  async function upload(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    if (files.some((file) => !imageTypes.has(file.type) || file.size > 15 * 1024 * 1024 || !file.size)) {
      setError("Choose JPEG, PNG, or WebP photos under 15 MiB each.");
      return;
    }
    setUploading(true);
    setError("");
    try {
      for (const file of files) {
        const response = await fetch(`/api/v1/properties/${encodeURIComponent(propertyId)}/photos/${crypto.randomUUID()}`, {
          method: "POST",
          credentials: "same-origin",
          headers: { "Content-Type": file.type, "x-p1-file-name": file.name },
          body: file,
        });
        if (!response.ok) throw await responseError(response);
      }
      await load();
    } catch (reason) {
      setError((reason as Error).message);
      void load().catch(() => {});
    } finally {
      setUploading(false);
    }
  }

  async function saveDescription(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected) return;
    setSaving(true);
    setDetailError("");
    try {
      const response = await fetch(`/api/v1/properties/${encodeURIComponent(propertyId)}/photos/${encodeURIComponent(selected.id)}`, {
        method: "PATCH",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ description: description.trim() || null }),
      });
      if (!response.ok) throw await responseError(response);
      const updated = { ...selected, description: description.trim() || null };
      setSelected(updated);
      setPhotos((current) => current.map((photo) => photo.id === updated.id ? updated : photo));
    } catch (reason) {
      setDetailError((reason as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return <section className="data-surface property-photos" aria-labelledby="property-photos-title">
    <header className="data-surface-header">
      <div><h2 id="property-photos-title">Property Photos</h2><p>Site views and features to recognize before arriving.</p></div>
      {canUpload && <><input ref={input} className="property-photos-input" type="file" accept="image/jpeg,image/png,image/webp" multiple tabIndex={-1} aria-hidden="true" onChange={(event) => void upload(event)} disabled={uploading} /><button type="button" className="text-action" onClick={() => input.current?.click()} disabled={uploading}><ImagePlus size={17} aria-hidden="true" />{uploading ? "Uploading…" : "Add photos"}</button></>}
    </header>
    <div className="data-surface-body">
      {error && <div className="property-photos-feedback" role="alert">{error}<button type="button" onClick={() => { setError(""); void load().catch((reason) => setError((reason as Error).message)); }}>Reload gallery</button></div>}
      {loading ? <p className="property-photos-status" role="status">Loading property photos…</p>
        : photos.length ? <div className="property-photos-grid">{photos.map((photo) => <button key={photo.id} type="button" className="property-photo-card" onClick={() => open(photo)} aria-label={`View ${photo.description || photo.name}`}><img src={contentUrl(photo.id)} alt="" loading="lazy" /><span><strong>{photo.name}</strong>{photo.description && <small>{photo.description}</small>}</span></button>)}</div>
        : !error && <div className="atlas-empty"><Images size={28} aria-hidden="true" /><h3>No property photos yet</h3><p>{canUpload ? "Add a site view or a photo of a feature crews should recognize." : "Site photos will appear here when staff add them."}</p></div>}
    </div>
    <dialog ref={dialog} className="property-photo-dialog" aria-label={selected ? `Property photo: ${selected.name}` : "Property photo"} onClose={() => setSelected(null)}>
      {selected && <><button type="button" className="property-photo-close" aria-label="Close photo" onClick={() => dialog.current?.close()}><X size={22} aria-hidden="true" /></button><img src={contentUrl(selected.id)} alt={selected.description || selected.name} /><div className="property-photo-detail"><h3>{selected.name}</h3>{canUpload ? <form onSubmit={(event) => void saveDescription(event)}><label htmlFor="property-photo-description">Description or site feature</label><textarea id="property-photo-description" value={description} maxLength={500} rows={3} onChange={(event) => setDescription(event.target.value)} placeholder="What should the crew recognize in this photo?" /><div className="property-photo-detail-actions"><small>{description.length}/500</small><button type="submit" className="primary" disabled={saving || description.trim() === (selected.description || "")}>{saving ? "Saving…" : "Save description"}</button></div>{detailError && <p role="alert" className="error">{detailError}</p>}</form> : selected.description ? <p>{selected.description}</p> : <p className="muted">No description added.</p>}</div></>}
    </dialog>
  </section>;
}

import { useEffect, useRef, useState } from "react";
import { avatarCrop } from "./avatar-crop";

export function AvatarCropper({ file, onCancel, onSave }: {
  file: File; onCancel: () => void; onSave: (file: File) => Promise<void>;
}) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [x, setX] = useState(50);
  const [y, setY] = useState(50);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const heading = useRef<HTMLHeadingElement>(null);
  const saving = useRef(false);
  const drag = useRef<{ x: number; y: number; left: number; top: number } | null>(null);
  useEffect(() => {
    heading.current?.focus();
    const url = URL.createObjectURL(file);
    const photo = new Image();
    let active = true;
    photo.onload = () => {
      if (!active) return;
      if (!photo.naturalWidth || !photo.naturalHeight || photo.naturalWidth * photo.naturalHeight > 16_000_000) {
        setError("Choose an image with no more than 16 megapixels."); return;
      }
      setImage(photo);
    };
    photo.onerror = () => { if (active) setError("This image could not be opened. Choose another photo."); };
    photo.src = url;
    return () => { active = false; URL.revokeObjectURL(url); };
  }, [file]);
  const crop = image ? avatarCrop(image.naturalWidth, image.naturalHeight, zoom, x, y) : null;
  async function save() {
    if (!image || !crop || saving.current) return;
    saving.current = true; setBusy(true); setError("");
    try {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = Math.min(512, Math.floor(crop.size));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Photo editing is unavailable in this browser.");
      context.imageSmoothingQuality = "high";
      context.drawImage(image, crop.left, crop.top, crop.size, crop.size, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob(
        value => value ? resolve(value) : reject(new Error("Unable to prepare the cropped photo.")), "image/webp", .92));
      await onSave(new File([blob], "profile-photo.webp", { type: blob.type }));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Unable to save photo. Your crop is retained."); }
    finally { saving.current = false; setBusy(false); }
  }
  return <section className="avatar-cropper panel" aria-labelledby="avatar-crop-title">
    <h2 ref={heading} tabIndex={-1} id="avatar-crop-title">Adjust your photo</h2>
    <p className="muted">Drag the photo or use the sliders to choose your crop. Only the circle appears in your avatar.</p>
    {error && <p className="error" role="alert">{error}</p>}
    <div className="avatar-crop-layout">
      <div className="avatar-crop-preview" aria-label="Circular profile photo preview"
        onPointerDown={event => {
          if (!crop || busy) return;
          event.currentTarget.setPointerCapture(event.pointerId);
          drag.current = { x: event.clientX, y: event.clientY, left: x, top: y };
        }}
        onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}
        onPointerMove={event => {
          if (!drag.current || !image || !crop || busy) return;
          const scale = event.currentTarget.getBoundingClientRect().width / crop.size;
          const horizontal = (image.naturalWidth - crop.size) * scale;
          const vertical = (image.naturalHeight - crop.size) * scale;
          if (horizontal > 0) setX(Math.max(0, Math.min(100, drag.current.left - (event.clientX - drag.current.x) / horizontal * 100)));
          if (vertical > 0) setY(Math.max(0, Math.min(100, drag.current.top - (event.clientY - drag.current.y) / vertical * 100)));
        }}>
        {image && crop ? <img src={image.src} alt="" draggable={false} style={{
          width: `${image.naturalWidth / crop.size * 100}%`, height: `${image.naturalHeight / crop.size * 100}%`,
          left: `${-crop.left / crop.size * 100}%`, top: `${-crop.top / crop.size * 100}%`,
        }} /> : <span>Loading photo…</span>}
      </div>
      <div className="avatar-crop-controls">
        <label>Zoom <output>{zoom.toFixed(1)}×</output><input aria-label="Zoom" type="range" min="1" max="4" step="0.05" value={zoom} disabled={!image || busy} onChange={e => setZoom(Number(e.target.value))} /></label>
        <label>Horizontal position<input type="range" min="0" max="100" step="1" value={x} disabled={!image || busy} onChange={e => setX(Number(e.target.value))} /></label>
        <label>Vertical position<input type="range" min="0" max="100" step="1" value={y} disabled={!image || busy} onChange={e => setY(Number(e.target.value))} /></label>
        <div className="avatar-crop-actions">
          <button type="button" disabled={busy} onClick={() => { setZoom(1); setX(50); setY(50); }}>Reset crop</button>
          <button type="button" disabled={busy} onClick={onCancel}>Cancel</button>
          <button type="button" className="primary" disabled={!image || busy} onClick={() => void save()}>{busy ? "Saving photo…" : "Save photo"}</button>
        </div>
      </div>
    </div>
  </section>;
}

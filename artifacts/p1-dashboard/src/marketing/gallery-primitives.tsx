import React, { createContext, useContext, useEffect, useRef } from "react";
import { builderPrimitives } from "./builder-primitives";
const Close = createContext(() => {});
function Dialog({ open, onOpenChange, children }: any) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (open) ref.current?.showModal();
  }, [open]);
  return open ? (
    <Close.Provider value={() => onOpenChange(false)}>
      <dialog
        ref={ref}
        className="cms-gallery-presentation cms-gallery-dialog"
        onCancel={(event) => {
          event.preventDefault();
          onOpenChange(false);
        }}
      >
        {children}
      </dialog>
    </Close.Provider>
  ) : null;
}
function DialogContent({ children, ...props }: any) {
  const close = useContext(Close);
  return (
    <div {...props}>
      <button
        type="button"
        onClick={close}
        aria-label="Close gallery preview"
        className="cms-gallery-close"
      >
        ×
      </button>
      {children}
    </div>
  );
}
export const galleryPrimitives = {
  ...builderPrimitives,
  Dialog,
  DialogContent,
  DialogDescription: ({ children, ...props }: any) => (
    <p {...props}>{children}</p>
  ),
  CardHeader: ({ children, className = "", ...props }: any) => (
    <div {...props} className={`forms-card-header ${className}`}>
      {children}
    </div>
  ),
  CardContent: ({ children, className = "", ...props }: any) => (
    <div {...props} className={`forms-card-content ${className}`}>
      {children}
    </div>
  ),
};
import { useState } from "react";
import { MediaLibrary } from "./MediaLibrary";
export function GalleryImageInput({
  value,
  label,
  onChange,
  canUseMedia,
}: {
  value: string;
  label: string;
  onChange: (url: string, mediaId?: string | null) => void;
  canUseMedia: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="space-y-2">
      {value && (
        <img
          alt={label}
          src={
            value.startsWith("/") && !value.startsWith("//")
              ? `https://www.p1landmanagement.com${value}`
              : value
          }
          style={{ maxWidth: "100%", maxHeight: 220, objectFit: "contain" }}
        />
      )}
      <input
        aria-label={`${label} URL`}
        value={value}
        onChange={(e) => onChange(e.target.value, null)}
      />
      {canUseMedia && (
        <button type="button" onClick={() => setOpen(true)}>
          Choose or upload image
        </button>
      )}
      {open && (
        <section aria-label="Choose gallery image">
          <button type="button" onClick={() => setOpen(false)}>
            Close Media picker
          </button>
          <MediaLibrary
            acceptAsset={(asset) => asset.mimeType.startsWith("image/")}
            onSelect={(asset) => {
              onChange(asset.url, asset.id);
              setOpen(false);
            }}
          />
        </section>
      )}
    </div>
  );
}

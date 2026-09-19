import { useRef, useState } from "react";
import { ImageIcon, Library, RefreshCw, UploadCloud, X } from "lucide-react";
import { validWebsiteIdentityValue } from "../../../../platform/p1-core/shared/website-identity";

/** Dashboard adapter for the retained image upload/replace/library/remove affordances. */
export function BrandingMediaInput({
  settingKey,
  title,
  value,
  disabled,
  canUseMedia,
  onUpload,
  onLibrary,
  onChange,
}: {
  settingKey: "frontend_logo_url" | "favicon_url";
  title: string;
  value: string;
  disabled: boolean;
  canUseMedia: boolean;
  onUpload: (file: File) => void;
  onLibrary: () => void;
  onChange: (url: string) => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const usable = value && validWebsiteIdentityValue(settingKey, value);
  return (
    <div
      className="branding-media-input"
      data-testid={`branding-media-${settingKey}`}
    >
      {value ? (
        <div className="branding-media-selected">
          {usable ? (
            <img
              src={value}
              alt={`${title} media preview`}
              referrerPolicy="no-referrer"
            />
          ) : (
            <p>Existing image address</p>
          )}
          <div className="branding-media-actions">
            <button
              type="button"
              disabled={disabled}
              onClick={() => fileInput.current?.click()}
            >
              <RefreshCw aria-hidden="true" />
              Replace
            </button>
            {canUseMedia && (
              <button type="button" disabled={disabled} onClick={onLibrary}>
                <Library aria-hidden="true" />
                Library
              </button>
            )}
            <button
              type="button"
              disabled={disabled}
              aria-label={`Remove ${title}`}
              onClick={() => onChange("")}
            >
              <X aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : (
        <div
          className={`branding-dropzone ${dragging ? "is-dragging" : ""}`}
          data-disabled={disabled}
          onDragOver={(event) => {
            event.preventDefault();
            if (!disabled) setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            const file = event.dataTransfer.files[0];
            if (!disabled && file) onUpload(file);
          }}
        >
          <div
            className="branding-upload-target"
            role="button"
            tabIndex={disabled ? -1 : 0}
            aria-disabled={disabled}
            aria-label={`Upload ${title}`}
            onClick={() => !disabled && fileInput.current?.click()}
            onKeyDown={(event) => {
              if (!disabled && (event.key === "Enter" || event.key === " ")) {
                event.preventDefault();
                fileInput.current?.click();
              }
            }}
          >
            <ImageIcon className="branding-dropzone-icon" aria-hidden="true" />
            <p>
              Drop image here or <span>browse</span>
            </p>
            <p className="branding-help">PNG, JPG, WebP, GIF · Max 10 MB</p>
          </div>
          {canUseMedia && (
            <button type="button" disabled={disabled} onClick={onLibrary}>
              <Library aria-hidden="true" />
              Pick from library
            </button>
          )}
        </div>
      )}
      <input
        ref={fileInput}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        disabled={disabled}
        hidden
        aria-label={`Upload ${title === "Frontend Logo" ? "logo" : "favicon"}`}
        data-testid={`branding-media-${settingKey}-file-input`}
        onChange={(event) => {
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) onUpload(file);
        }}
      />
      <p className="branding-help">
        <UploadCloud aria-hidden="true" />
        Upload or choose an existing image from the shared Media Library.
      </p>
      <details className="branding-image-url">
        <summary>Image URL</summary>
        <label htmlFor={settingKey}>
          {title === "Frontend Logo" ? "Website logo URL" : "Favicon URL"}
        </label>
        <input
          id={settingKey}
          value={value}
          disabled={disabled}
          inputMode="url"
          autoComplete="off"
          onChange={(event) => onChange(event.target.value)}
        />
      </details>
    </div>
  );
}

import { useRef, useState, useEffect } from "react";
import { uploadMarketingMedia } from "@workspace/api-client-react/dashboard";
import { CmsUploadDropzone } from "../../../../platform/p1-core/client/src/components/shared/cms-upload-dropzone";
import { builderPrimitives } from "./builder-primitives";
/** Media transport stays in the dashboard; the dropzone is retained Core presentation. */
export function BlogImageInput({
  label,
  value,
  disabled,
  canUseMedia,
  onChange,
  onLibrary,
  onBusy,
}: {
  label: string;
  value: string;
  disabled: boolean;
  canUseMedia: boolean;
  onChange: (url: string) => void;
  onLibrary: () => void;
  onBusy: (busy: boolean) => void;
}) {
  const file = useRef<HTMLInputElement>(null),
    controller = useRef<AbortController | null>(null);
  const [error, setError] = useState(""),
    [uploading, setUploading] = useState(false);
  useEffect(() => () => controller.current?.abort(), []);
  async function upload(files: File[]) {
    if (disabled || !canUseMedia || controller.current) return;
    const selected = files[0];
    if (!selected) return;
    if (
      !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(
        selected.type,
      ) ||
      selected.size > 10 * 1024 * 1024
    ) {
      setError("Choose a PNG, JPEG, WebP or GIF image up to 10 MB.");
      return;
    }
    const request = new AbortController();
    controller.current = request;
    setUploading(true);
    onBusy(true);
    setError("");
    try {
      const asset = await uploadMarketingMedia(
        { file: selected },
        { signal: request.signal },
      );
      if (!request.signal.aborted) onChange(asset.url);
    } catch (error) {
      if (!request.signal.aborted)
        setError((error as Error).message || "Image upload failed.");
    } finally {
      if (!request.signal.aborted) {
        controller.current = null;
        setUploading(false);
        onBusy(false);
      }
    }
  }
  return (
    <div className="blog-image-input">
      {value && (
        <img
          className="blog-cover-preview"
          src={
            value.startsWith("/") && !value.startsWith("//")
              ? `https://www.p1landmanagement.com${value}`
              : value
          }
          alt={`${label} preview`}
        />
      )}
      {canUseMedia && (
        <CmsUploadDropzone
          Button={builderPrimitives.Button}
          label={label}
          disabled={disabled}
          isUploading={uploading}
          onBrowse={() => file.current?.click()}
          onFiles={(files) => void upload(files)}
          onChooseLibrary={onLibrary}
        />
      )}
      <input
        ref={file}
        hidden
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={(event) => {
          void upload(Array.from(event.target.files || []));
          event.target.value = "";
        }}
      />
      {error && <p role="alert">{error}</p>}
      {value && (
        <button
          type="button"
          disabled={disabled || uploading}
          onClick={() => onChange("")}
        >
          Remove {label.toLowerCase()}
        </button>
      )}
    </div>
  );
}

import { Loader2, RefreshCw, Save } from "lucide-react";
import {
  BrandingEditor,
  BrandingImageEditor,
  normalizeBrandingUrl,
} from "../../../../platform/p1-core/client/src/components/shared/branding-editor";
import { BrandingMediaInput } from "./BrandingMediaInput";
import "./website-identity.css";
import {
  WEBSITE_IDENTITY_FIELDS,
  validWebsiteIdentityValue,
} from "../../../../platform/p1-core/shared/website-identity";
import { lazy, Suspense, useEffect, useRef, useState } from "react";
import {
  uploadWebsiteIdentityAsset,
  getWebsiteIdentity,
  saveWebsiteIdentity,
} from "@workspace/api-client-react/dashboard";
import { useCmsUnsavedChanges } from "./useCmsUnsavedChanges";
type Snapshot = Awaited<ReturnType<typeof getWebsiteIdentity>>;
type Settings = Snapshot["settings"];
const MediaLibrary = lazy(() =>
  import("./MediaLibrary").then((module) => ({ default: module.MediaLibrary })),
);
export default function WebsiteIdentity({
  canUseMedia = false,
}: {
  canUseMedia?: boolean;
}) {
  const [mediaField, setMediaField] = useState<
    "frontend_logo_url" | "favicon_url" | null
  >(null);
  const mediaDialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    if (mediaField && canUseMedia) mediaDialog.current?.showModal();
    else mediaDialog.current?.close();
  }, [mediaField, canUseMedia]);
  const [saved, setSaved] = useState<Snapshot | null>(null),
    [values, setValues] = useState<Settings | null>(null),
    [busy, setBusy] = useState(false),
    [blocked, setBlocked] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const alive = useRef(true),
    gate = useRef(false),
    controller = useRef<AbortController | null>(null);
  const dirty = Boolean(
    saved &&
    values &&
    JSON.stringify(saved.settings) !== JSON.stringify(values),
  );
  useCmsUnsavedChanges(
    dirty || blocked,
    "Leave branding settings? Unsaved or unconfirmed changes may remain. Reload saved branding settings before editing again.",
  );
  function options() {
    controller.current = new AbortController();
    return {
      signal: AbortSignal.any([
        controller.current.signal,
        AbortSignal.timeout(30000),
      ]),
    };
  }
  async function load(discard = false) {
    if (gate.current) return;
    if (
      discard &&
      dirty &&
      !window.confirm(
        "Discard your selections and reload saved branding settings?",
      )
    )
      return;
    gate.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await getWebsiteIdentity(options());
      if (alive.current) {
        setSaved(result);
        setValues(result.settings);
        setBlocked(false);
      }
    } catch {
      if (alive.current) {
        setBlocked(true);
        setError(
          "Could not load branding settings. Your selections are retained. Try reloading saved branding settings.",
        );
      }
    } finally {
      gate.current = false;
      if (alive.current) setBusy(false);
    }
  }
  useEffect(() => {
    alive.current = true;
    void load();
    return () => {
      alive.current = false;
      controller.current?.abort();
    };
  }, []);
  async function save() {
    if (gate.current || !saved || !values || blocked || !dirty) return;
    gate.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    let confirmed = false;
    try {
      await saveWebsiteIdentity(
        {
          settings: Object.fromEntries(
            WEBSITE_IDENTITY_FIELDS.map((field) => field.key)
              .filter((key) => values[key] !== saved.settings[key])
              .map((key) => [key, values[key]]),
          ),
          expectedVersion: saved.version,
        },
        options(),
      );
      confirmed = true;
      const next = await getWebsiteIdentity(options());
      if (alive.current) {
        setSaved(next);
        setValues(next.settings);
        setBlocked(false);
        setMessage(
          "Branding settings saved. The selections below reflect the current saved settings.",
        );
      }
    } catch {
      if (alive.current) {
        setBlocked(true);
        setError(
          confirmed
            ? "The save completed, but current settings could not be reloaded. Your selections are retained. Reload saved branding settings before continuing."
            : "The save could not be confirmed or settings changed. Your selections are retained. Reload saved branding settings before continuing.",
        );
      }
    } finally {
      gate.current = false;
      if (alive.current) setBusy(false);
    }
  }
  async function uploadAsset(
    key: "frontend_logo_url" | "favicon_url",
    file: File,
  ) {
    if (gate.current || blocked || !values) return;
    if (
      !["image/png", "image/jpeg", "image/webp", "image/gif"].includes(
        file.type,
      ) &&
      !/\.(png|jpe?g|webp|gif)$/i.test(file.name)
    ) {
      setError("Only PNG, JPEG, WebP, and GIF files are accepted.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Choose an image no larger than 10 MB.");
      return;
    }
    gate.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const asset = await uploadWebsiteIdentityAsset(
        { file, settingKey: key },
        options(),
      );
      if (alive.current) {
        setValues((current) =>
          current ? { ...current, [key]: asset.url } : current,
        );
        setMessage(
          "Image uploaded to Media. Save branding settings to apply it. Unused uploads remain in Media.",
        );
      }
    } catch {
      if (alive.current)
        setError(
          "The upload could not be confirmed. Your saved branding is unchanged. Check Media before retrying; the image may already have uploaded.",
        );
    } finally {
      gate.current = false;
      if (alive.current) setBusy(false);
    }
  }
  const valid =
    values &&
    saved &&
    WEBSITE_IDENTITY_FIELDS.every(
      ({ key }) =>
        values[key] === saved.settings[key] ||
        validWebsiteIdentityValue(key, values[key].trim()),
    );
  return (
    <section className="website-identity" aria-label="Website branding">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (valid) void save();
        }}
      >
        <BrandingEditor
          notices={
            <>
              {error && <p role="alert">{error}</p>}
              {message && <p role="status">{message}</p>}
              {busy && <p role="status">Working…</p>}
              {saved && values && !valid && (
                <p role="alert">
                  Correct the changed fields before saving. Use full HTTP or
                  HTTPS URLs without credentials and keep company details within
                  their length limits.
                </p>
              )}
            </>
          }
          images={(["frontend_logo_url", "favicon_url"] as const).map((key) => {
            const title =
              key === "frontend_logo_url" ? "Frontend Logo" : "Favicon";
            const value = values?.[key] ?? "";
            return (
              <BrandingImageEditor
                key={key}
                title={title}
                description={
                  key === "frontend_logo_url"
                    ? "Shown in the site header and footer."
                    : "Shown in the browser tab, bookmarks, and saved shortcuts."
                }
                imageUrl={validWebsiteIdentityValue(key, value) ? value : ""}
                control={
                  <BrandingMediaInput
                    settingKey={key}
                    title={title}
                    value={value}
                    disabled={!values || busy || blocked}
                    canUseMedia={canUseMedia}
                    onLibrary={() => setMediaField(key)}
                    onUpload={(file) => void uploadAsset(key, file)}
                    onChange={(url) => {
                      if (values && !busy && !blocked)
                        setValues({ ...values, [key]: url });
                    }}
                  />
                }
              />
            );
          })}
          renderField={(field) => {
            const props = {
              id: field.id,
              value: values?.[field.key] ?? "",
              disabled: !values || busy || blocked,
              placeholder: field.placeholder,
              onChange: (
                event: import("react").ChangeEvent<
                  HTMLInputElement | HTMLTextAreaElement
                >,
              ) =>
                values &&
                setValues({
                  ...values,
                  [field.key]:
                    field.key === "company_google_business_url"
                      ? normalizeBrandingUrl(event.target.value)
                      : event.target.value,
                }),
            };
            return field.rows ? (
              <textarea
                {...props}
                rows={field.rows}
                data-testid={`textarea-${field.id}`}
              />
            ) : (
              <input
                {...props}
                autoComplete="off"
                data-testid={`input-${field.id}`}
                inputMode={
                  field.key === "company_google_business_url" ? "url" : "text"
                }
                onFocus={(event) => {
                  if (
                    field.key === "company_google_business_url" &&
                    values &&
                    !event.currentTarget.value
                  ) {
                    const input = event.currentTarget;
                    setValues({ ...values, [field.key]: "https://" });
                    requestAnimationFrame(() => input.setSelectionRange(8, 8));
                  }
                }}
              />
            );
          }}
          toolbar={
            <>
              <button
                className="branding-save"
                type="submit"
                data-testid="button-save-company-information"
                disabled={!saved || busy || blocked || !dirty || !valid}
              >
                {busy ? (
                  <Loader2 className="branding-spinner" aria-hidden="true" />
                ) : (
                  <Save aria-hidden="true" />
                )}
                Save Branding Settings
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void load(true)}
              >
                <RefreshCw aria-hidden="true" />
                Reload saved branding settings
              </button>
            </>
          }
        />
      </form>
      <p className="branding-save-help">
        Image uploads, library selections and removals are staged until you
        save. Only changed fields are saved. External image addresses must
        already belong to the Media Library. Clear an override to restore the
        website fallback.
      </p>
      <dialog
        ref={mediaDialog}
        className="media-picker"
        aria-label="Choose branding image"
        onCancel={() => setMediaField(null)}
      >
        <button type="button" onClick={() => setMediaField(null)}>
          Close image picker
        </button>
        {mediaField && canUseMedia && (
          <Suspense fallback={<p role="status">Loading Media Library…</p>}>
            <MediaLibrary
              acceptAsset={(asset) =>
                asset.mimeType.startsWith("image/") &&
                validWebsiteIdentityValue(mediaField, asset.url)
              }
              onSelect={(asset) => {
                if (
                  values &&
                  !busy &&
                  !blocked &&
                  validWebsiteIdentityValue(mediaField, asset.url)
                ) {
                  setValues({ ...values, [mediaField]: asset.url });
                  setMessage(
                    "Image selected from Media. Save branding settings to apply it.",
                  );
                  setMediaField(null);
                }
              }}
            />
          </Suspense>
        )}
      </dialog>
    </section>
  );
}

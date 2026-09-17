import {
  WEBSITE_IDENTITY_FIELDS,
  validWebsiteIdentityValue,
} from "../../../../platform/p1-core/shared/website-identity";
import { useEffect, useRef, useState } from "react";
import {
  uploadWebsiteIdentityAsset,
  getWebsiteIdentity,
  saveWebsiteIdentity,
} from "@workspace/api-client-react/dashboard";
import { useCmsUnsavedChanges } from "./useCmsUnsavedChanges";
type Snapshot = Awaited<ReturnType<typeof getWebsiteIdentity>>;
type Settings = Snapshot["settings"];
export default function WebsiteIdentity() {
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
    if (gate.current || blocked) return;
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
    <section className="panel" aria-label="Website branding">
      <h2>Website branding</h2>
      <p>
        Manage the retained company identity, website logo and favicon. These
        settings are separate from the business dashboard identity.
      </p>
      <p>
        The current public P1 header, footer and contact page still use their
        published website content. Connecting these identity overrides to those
        pages is pending. Retained CMS and email consumers may use these
        settings.
      </p>
      <p>
        Use complete HTTP or HTTPS image addresses or uploaded /uploads/cms/
        paths. Leave a field blank to clear its override. Only changed fields
        are saved; unsupported existing values remain unchanged.
      </p>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      {busy && <p role="status">Working…</p>}
      <button type="button" disabled={busy} onClick={() => void load(true)}>
        Reload saved branding settings
      </button>
      {values && (
        <section aria-label="Draft identity preview">
          <h3>Draft identity preview</h3>
          <p>{values.company_name}</p>
          <p style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
            {values.company_address}
          </p>
          {(["frontend_logo_url", "favicon_url"] as const).map((key) =>
            values[key] && validWebsiteIdentityValue(key, values[key]) ? (
              <img
                key={key}
                src={values[key]}
                alt={
                  key === "frontend_logo_url"
                    ? "Draft website logo"
                    : "Draft favicon"
                }
                referrerPolicy="no-referrer"
                style={{
                  maxWidth: "100%",
                  maxHeight: key === "favicon_url" ? 48 : 120,
                  objectFit: "contain",
                }}
              />
            ) : null,
          )}
        </section>
      )}
      {saved && values && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (valid) void save();
          }}
        >
          <fieldset
            disabled={busy || blocked}
            style={{
              minWidth: 0,
              marginBlock: "1rem",
              display: "grid",
              gap: "1rem",
            }}
          >
            <legend>Company and website identity</legend>
            {WEBSITE_IDENTITY_FIELDS.map(({ key, label }) => (
              <div key={key}>
                <label htmlFor={key}>{label}</label>
                {key === "company_address" ||
                key === "company_phone_numbers" ? (
                  <textarea
                    id={key}
                    value={values[key]}
                    onChange={(e) =>
                      setValues({ ...values, [key]: e.target.value })
                    }
                    style={{ width: "100%", minWidth: 0 }}
                  />
                ) : (
                  <input
                    id={key}
                    autoComplete="off"
                    inputMode={key.endsWith("_url") ? "url" : "text"}
                    value={values[key]}
                    onChange={(e) =>
                      setValues({ ...values, [key]: e.target.value })
                    }
                    style={{ width: "100%", minWidth: 0 }}
                  />
                )}
                {(key === "frontend_logo_url" || key === "favicon_url") && (
                  <label>
                    Upload {key === "frontend_logo_url" ? "logo" : "favicon"}
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/gif"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (file) void uploadAsset(key, file);
                      }}
                    />
                  </label>
                )}
              </div>
            ))}
          </fieldset>
          {!valid && (
            <p role="alert">
              Correct the changed fields before saving. Use full HTTP or HTTPS
              URLs without credentials and keep company details within their
              length limits.
            </p>
          )}
          <button type="submit" disabled={busy || blocked || !dirty || !valid}>
            Save branding settings
          </button>
        </form>
      )}
    </section>
  );
}

import {
  SOCIAL_MEDIA_PLATFORMS,
  SOCIAL_SETTING_KEYS,
  SOCIAL_ICON_STYLES,
  getSocialMediaLinks,
  normalizeSocialIconStyle,
  isSafeSocialUrl,
} from "../../../../platform/p1-core/shared/social-media";
import { SocialPlatformIcon } from "./SocialIcon";
import { useEffect, useRef, useState } from "react";
import {
  getWebsiteSocial,
  saveWebsiteSocial,
} from "@workspace/api-client-react/dashboard";
import { useCmsUnsavedChanges } from "./useCmsUnsavedChanges";
type Snapshot = Awaited<ReturnType<typeof getWebsiteSocial>>;
type Settings = Snapshot["settings"];
export default function WebsiteSocial() {
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
    "Leave social settings? Unsaved or unconfirmed changes may remain. Reload saved social settings before editing again.",
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
        "Discard your selections and reload saved social settings?",
      )
    )
      return;
    gate.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await getWebsiteSocial(options());
      if (alive.current) {
        setSaved(result);
        setValues(result.settings);
        setBlocked(false);
      }
    } catch {
      if (alive.current) {
        setBlocked(true);
        setError(
          "Could not load social settings. Your selections are retained. Try reloading saved social settings.",
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
      await saveWebsiteSocial(
        {
          settings: Object.fromEntries(
            SOCIAL_SETTING_KEYS.filter(
              (key) => values[key] !== saved.settings[key],
            ).map((key) => [key, values[key]]),
          ),
          expectedVersion: saved.version,
        },
        options(),
      );
      confirmed = true;
      const next = await getWebsiteSocial(options());
      if (alive.current) {
        setSaved(next);
        setValues(next.settings);
        setBlocked(false);
        setMessage(
          "Social settings saved. The selections below reflect the current saved settings.",
        );
      }
    } catch {
      if (alive.current) {
        setBlocked(true);
        setError(
          confirmed
            ? "The save completed, but current settings could not be reloaded. Your selections are retained. Reload saved social settings before continuing."
            : "The save could not be confirmed or settings changed. Your selections are retained. Reload saved social settings before continuing.",
        );
      }
    } finally {
      gate.current = false;
      if (alive.current) setBusy(false);
    }
  }
  const changed = SOCIAL_SETTING_KEYS.filter(
    (key) => saved && values && saved.settings[key] !== values[key],
  );
  const valid = changed.every((key) =>
    key === "social_icon_style"
      ? values![key] === "" ||
        SOCIAL_ICON_STYLES.some((style) => style === values![key])
      : values![key].trim() === "" || isSafeSocialUrl(values![key].trim()),
  );
  const links = values ? getSocialMediaLinks(values) : [];
  const iconStyle = normalizeSocialIconStyle(values?.social_icon_style);
  return (
    <section className="panel" aria-label="Website social media">
      <h2>Website social media</h2>
      <p>
        Manage your website’s social profiles and icon style. Public website
        footer display is not available yet.
      </p>
      <p>
        Use full HTTP or HTTPS profile addresses without sign-in credentials.
        Leave an address blank to remove that link. Only changed fields are
        saved.
      </p>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      {busy && <p role="status">Working…</p>}
      <button type="button" disabled={busy} onClick={() => void load(true)}>
        Reload saved social settings
      </button>
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
            <legend>Social profiles</legend>
            {SOCIAL_MEDIA_PLATFORMS.map((platform) => (
              <div key={platform.key}>
                <label htmlFor={platform.settingKey}>
                  {platform.label} URL
                </label>
                <input
                  id={platform.settingKey}
                  inputMode="url"
                  autoComplete="off"
                  value={values[platform.settingKey]}
                  onChange={(e) =>
                    setValues({
                      ...values,
                      [platform.settingKey]: e.target.value,
                    })
                  }
                  style={{ width: "100%", minWidth: 0 }}
                />
              </div>
            ))}
            <div>
              <label htmlFor="social-icon-style">Icon style</label>
              <select
                id="social-icon-style"
                value={values.social_icon_style}
                onChange={(e) =>
                  setValues({ ...values, social_icon_style: e.target.value })
                }
              >
                <option value="">Default (brand colors)</option>
                {values.social_icon_style &&
                  !SOCIAL_ICON_STYLES.some(
                    (style) => style === values.social_icon_style,
                  ) && (
                    <option value={values.social_icon_style}>
                      Existing custom style: {values.social_icon_style}
                    </option>
                  )}
                <option value="brand">Brand colors</option>
                <option value="outline">Outline</option>
                <option value="solid">Solid</option>
              </select>
            </div>
          </fieldset>
          {!valid && (
            <p role="alert">
              Correct the changed addresses or icon style before saving. Use
              full HTTP or HTTPS links without credentials.
            </p>
          )}
          <button type="submit" disabled={busy || blocked || !dirty || !valid}>
            Save social settings
          </button>
        </form>
      )}
      {values && (
        <section aria-label="Social icon preview">
          <h3>Draft icon preview</h3>
          <p>
            Only usable addresses appear here. Existing unsupported values
            remain stored until you replace them.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: ".5rem" }}>
            {links.map((link) => (
              <a
                key={link.platform}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={link.label}
                title={link.label}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 44,
                  height: 44,
                  fontSize: 20,
                  borderRadius: iconStyle === "brand" ? "50%" : ".35rem",
                  border:
                    iconStyle === "outline"
                      ? "1px solid currentColor"
                      : "1px solid transparent",
                  background:
                    iconStyle === "solid"
                      ? "hsl(var(--foreground))"
                      : "transparent",
                  color:
                    iconStyle === "brand"
                      ? link.brandColor
                      : iconStyle === "solid"
                        ? "hsl(var(--background))"
                        : "hsl(var(--foreground))",
                }}
              >
                <SocialPlatformIcon platform={link.platform} />
              </a>
            ))}
          </div>
          {links.length === 0 && <p>No usable profile links selected.</p>}
        </section>
      )}
    </section>
  );
}

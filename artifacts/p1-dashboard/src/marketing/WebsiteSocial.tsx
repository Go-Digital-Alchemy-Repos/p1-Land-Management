import { Loader2, Save, RefreshCw } from "lucide-react";
import {
  SocialMediaEditor,
  normalizePrefilledSocialUrl,
} from "../../../../platform/p1-core/client/src/components/shared/social-media-editor";
import "./website-social.css";
import {
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
    <section className="website-social" aria-label="Website social media">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (valid) void save();
        }}
      >
        <SocialMediaEditor
          notices={
            <>
              {error && <p role="alert">{error}</p>}
              {message && <p role="status">{message}</p>}
              {busy && <p role="status">Working…</p>}
              {!valid && (
                <p role="alert">
                  Correct the changed addresses or icon style before saving. Use
                  full HTTP or HTTPS links without credentials.
                </p>
              )}
            </>
          }
          renderInput={(platform) => (
            <input
              id={`social-${platform.key}`}
              inputMode="url"
              autoComplete="off"
              disabled={!values || busy || blocked}
              value={values?.[platform.settingKey] ?? ""}
              placeholder={`https://${platform.key === "x" ? "x.com" : `${platform.key}.com`}/your-profile`}
              data-testid={`input-social-${platform.key}`}
              onFocus={(event) => {
                if (values && event.currentTarget.value === "") {
                  const input = event.currentTarget;
                  setValues({ ...values, [platform.settingKey]: "https://" });
                  requestAnimationFrame(() => input.setSelectionRange(8, 8));
                }
              }}
              onChange={(event) =>
                values &&
                setValues({
                  ...values,
                  [platform.settingKey]: normalizePrefilledSocialUrl(
                    event.target.value,
                  ),
                })
              }
            />
          )}
          styleControl={
            <select
              id="social-icon-style"
              data-testid="select-social-icon-style"
              disabled={!values || busy || blocked}
              value={values?.social_icon_style ?? ""}
              onChange={(event) =>
                values &&
                setValues({ ...values, social_icon_style: event.target.value })
              }
            >
              <option value="">Default (Brand Color)</option>
              {values?.social_icon_style &&
                !SOCIAL_ICON_STYLES.some(
                  (style) => style === values.social_icon_style,
                ) && (
                  <option value={values.social_icon_style}>
                    Existing custom style: {values.social_icon_style}
                  </option>
                )}
              <option value="brand">Brand Color</option>
              <option value="outline">Outline</option>
              <option value="solid">Solid</option>
            </select>
          }
          preview={
            links.length ? (
              <div className="social-media-links">
                {links.map((link) => (
                  <a
                    key={link.platform}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={link.label}
                    title={link.label}
                    data-testid={`link-social-${link.platform}`}
                    className={`social-media-link social-media-link-${iconStyle}`}
                    style={
                      {
                        "--social-color": link.brandColor,
                      } as import("react").CSSProperties
                    }
                  >
                    <SocialPlatformIcon platform={link.platform} />
                  </a>
                ))}
              </div>
            ) : null
          }
          toolbar={
            <>
              <button
                className="social-media-save"
                type="submit"
                data-testid="button-save-social-media"
                disabled={!saved || busy || blocked || !dirty || !valid}
              >
                {busy ? (
                  <Loader2
                    className="social-media-spinner"
                    aria-hidden="true"
                  />
                ) : (
                  <Save aria-hidden="true" />
                )}
                Save Social Media
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void load(true)}
              >
                <RefreshCw aria-hidden="true" />
                Reload saved social settings
              </button>
            </>
          }
        />
      </form>
    </section>
  );
}

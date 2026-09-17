import { TypographyPreview } from "./TypographyPreview";
import { useEffect, useRef, useState } from "react";
import {
  getWebsiteTypography,
  saveWebsiteTypography,
} from "@workspace/api-client-react/dashboard";
import { useCmsUnsavedChanges } from "./useCmsUnsavedChanges";
type Snapshot = Awaited<ReturnType<typeof getWebsiteTypography>>;
type Fonts = Snapshot["fonts"];
const controls: Array<{ key: keyof Fonts; label: string }> = [
  { key: "frontend_body_font", label: "Body font" },
  { key: "frontend_heading_font", label: "Heading font" },
];
export default function WebsiteTypography() {
  const [saved, setSaved] = useState<Snapshot | null>(null),
    [values, setValues] = useState<Fonts | null>(null),
    [busy, setBusy] = useState(false),
    [blocked, setBlocked] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const alive = useRef(true),
    gate = useRef(false),
    controller = useRef<AbortController | null>(null);
  const dirty = Boolean(
    saved && values && JSON.stringify(saved.fonts) !== JSON.stringify(values),
  );
  useCmsUnsavedChanges(
    dirty || blocked,
    "Leave website fonts? Unsaved or unconfirmed changes may remain. Reload saved fonts before editing again.",
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
      !window.confirm("Discard your selections and reload saved website fonts?")
    )
      return;
    gate.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await getWebsiteTypography(options());
      if (alive.current) {
        setSaved(result);
        setValues(result.fonts);
        setBlocked(false);
      }
    } catch {
      if (alive.current) {
        setBlocked(true);
        setError(
          "Could not load website fonts. Your selections are retained. Try reloading saved fonts.",
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
      await saveWebsiteTypography(
        {
          fonts: Object.fromEntries(
            controls
              .filter(({ key }) => values[key] !== saved.fonts[key])
              .map(({ key }) => [key, values[key]]),
          ),
          expectedVersion: saved.version,
        },
        options(),
      );
      confirmed = true;
      const next = await getWebsiteTypography(options());
      if (alive.current) {
        setSaved(next);
        setValues(next.fonts);
        setBlocked(false);
        setMessage(
          "Website fonts saved. The selections below reflect the current saved settings.",
        );
      }
    } catch {
      if (alive.current) {
        setBlocked(true);
        setError(
          confirmed
            ? "The save completed, but current settings could not be reloaded. Your selections are retained. Reload saved fonts before continuing."
            : "The save could not be confirmed or settings changed. Your selections are retained. Reload saved fonts before continuing.",
        );
      }
    } finally {
      gate.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return (
    <section className="panel" aria-label="Website typography">
      <h2>Website typography</h2>
      <p>
        Choose the website’s body and heading fonts. Business Center fonts stay
        independent. Theme defaults restore the website’s original fonts.
      </p>
      <p>
        Saved fonts apply on new public-page loads and previews within about 30
        seconds. Web fonts load from Google Fonts; the browser uses a fallback
        if they are unavailable.
      </p>
      <p>
        <a
          href="https://www.p1landmanagement.com/?cmsPreview=1"
          target="_blank"
          rel="noopener noreferrer"
        >
          Preview the saved website
        </a>
      </p>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      {busy && <p role="status">Working…</p>}
      <button type="button" disabled={busy} onClick={() => void load(true)}>
        Reload saved fonts
      </button>
      {saved && values && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void save();
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
            <legend>Website fonts</legend>
            {controls.map(({ key, label }) => (
              <div key={key} style={{ display: "grid", gap: ".5rem" }}>
                <label htmlFor={key}>{label}</label>
                <select id={key}
                  value={values[key]}
                  onChange={(e) =>
                    setValues({ ...values, [key]: e.target.value })
                  }
                  style={{ width: "100%", minWidth: 0, minHeight: 44 }}
                >
                  <option value="">Use website theme default</option>
                  {values[key] &&
                    !saved.options.some(
                      (option) => option.value === values[key],
                    ) && (
                      <option value={values[key]}>
                        Existing custom value: {values[key]}
                      </option>
                    )}
                  {(["sans", "serif"] as const).map((category) => (
                    <optgroup
                      key={category}
                      label={category === "sans" ? "Sans serif" : "Serif"}
                    >
                      {saved.options
                        .filter((option) => option.category === category)
                        .map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            ))}
          </fieldset>
          <p>
            Only changed selections are saved. Existing custom values remain
            untouched until replaced.
          </p>
          <button type="submit" disabled={busy || blocked || !dirty}>
            Save website fonts
          </button>
        </form>
      )}
      {saved && values && <TypographyPreview fonts={values} options={saved.options}/>}
    </section>
  );
}

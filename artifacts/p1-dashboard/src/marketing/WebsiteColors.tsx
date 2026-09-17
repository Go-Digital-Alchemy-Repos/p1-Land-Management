import { useEffect, useRef, useState } from "react";
import {
  getWebsiteColors,
  saveWebsiteColors,
} from "@workspace/api-client-react/dashboard";
import { useCmsUnsavedChanges } from "./useCmsUnsavedChanges";
type Snapshot = Awaited<ReturnType<typeof getWebsiteColors>>;
type Colors = Snapshot["colors"];
const controls: Array<{ key: keyof Colors; label: string }> = [
  { key: "brand_primary_color", label: "Primary" },
  { key: "brand_secondary_color", label: "Secondary" },
  { key: "brand_tertiary_color", label: "Tertiary" },
  { key: "brand_quaternary_color", label: "Quaternary" },
  { key: "text_h1_color", label: "H1 text" },
  { key: "text_h2_color", label: "H2 text" },
  { key: "text_h3_h6_color", label: "H3\u2013H6 text" },
  { key: "text_body_color", label: "Body text" },
  { key: "text_heading_subtext_color", label: "Heading subtext" },
  { key: "text_supporting_copy_color", label: "Supporting copy" },
  { key: "text_helper_text_color", label: "Helper text" },
  { key: "text_meta_color", label: "Metadata" },
  { key: "text_link_color", label: "Link" },
  { key: "text_link_hover_color", label: "Link hover" },
  { key: "text_inverse_color", label: "Inverse text" },
  { key: "text_primary_foreground_color", label: "Text on primary" },
  { key: "text_secondary_foreground_color", label: "Text on secondary" },
  { key: "text_tertiary_foreground_color", label: "Text on tertiary" },
];
export default function WebsiteColors() {
  const [saved, setSaved] = useState<Snapshot | null>(null),
    [values, setValues] = useState<Colors | null>(null),
    [busy, setBusy] = useState(false),
    [blocked, setBlocked] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const alive = useRef(true),
    gate = useRef(false),
    controller = useRef<AbortController | null>(null);
  const dirty = Boolean(
    saved && values && JSON.stringify(saved.colors) !== JSON.stringify(values),
  );
  useCmsUnsavedChanges(
    dirty || blocked,
    "Leave website colors? Unsaved or unconfirmed changes may remain. Reload saved colors before editing again.",
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
        "Discard your selections and reload saved website colors?",
      )
    )
      return;
    gate.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await getWebsiteColors(options());
      if (alive.current) {
        setSaved(result);
        setValues(result.colors);
        setBlocked(false);
      }
    } catch {
      if (alive.current) {
        setBlocked(true);
        setError(
          "Could not load website colors. Your selections are retained. Try reloading saved colors.",
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
      await saveWebsiteColors(
        {
          colors: Object.fromEntries(
            controls
              .filter(({ key }) => values[key] !== saved.colors[key])
              .map(({ key }) => [key, values[key]]),
          ),
          expectedVersion: saved.version,
        },
        options(),
      );
      confirmed = true;
      const next = await getWebsiteColors(options());
      if (alive.current) {
        setSaved(next);
        setValues(next.colors);
        setBlocked(false);
        setMessage(
          "Website colors saved. The selections below reflect the current saved settings.",
        );
      }
    } catch {
      if (alive.current) {
        setBlocked(true);
        setError(
          confirmed
            ? "The save completed, but current settings could not be reloaded. Your selections are retained. Reload saved colors before continuing."
            : "The save could not be confirmed or settings changed. Your selections are retained. Reload saved colors before continuing.",
        );
      }
    } finally {
      gate.current = false;
      if (alive.current) setBusy(false);
    }
  }
  const changed = controls.filter(
    ({ key }) => saved && values && saved.colors[key] !== values[key],
  );
  const valid = changed.every(({ key }) =>
    /^(?:#[0-9a-fA-F]{6})?$/.test(values![key]),
  );
  const swatch = (key: keyof Colors) =>
    values && /^#[0-9a-fA-F]{6}$/.test(values[key]) ? values[key] : undefined;
  return (
    <section className="panel" aria-label="Website color palette">
      <h2>Website color palette</h2>
      <p>
        Manage the retained website branding colors. These settings are
        independent of the Business Center theme.
      </p>
      <p>
        Saved colors apply to new public-page loads and website previews within
        about 30 seconds. Clear a field to restore its website fallback. Some
        page-specific styling can override global colors.
      </p>
      <p>
        Use a six-digit hex color such as #1F2A44, or leave a field blank to use
        its existing website fallback. Only changed fields are saved. Existing
        custom values remain untouched unless you edit them.
      </p>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      {busy && <p role="status">Working…</p>}
      <button type="button" disabled={busy} onClick={() => void load(true)}>
        Reload saved colors
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
            style={{ minWidth: 0, marginBlock: "1rem" }}
          >
            <legend>Website colors</legend>
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit,minmax(min(100%,240px),1fr))",
                gap: "1rem",
              }}
            >
              {controls.map(({ key, label }) => (
                <div key={key}>
                  <label htmlFor={key}>{label}</label>
                  <div
                    style={{
                      display: "flex",
                      gap: ".5rem",
                      alignItems: "center",
                    }}
                  >
                    <input
                      id={key}
                      value={values[key]}
                      placeholder="Website fallback"
                      style={{ minWidth: 0, width: "100%" }}
                      aria-invalid={
                        changed.some((field) => field.key === key) &&
                        !/^(?:#[0-9a-fA-F]{6})?$/.test(values[key])
                      }
                      onChange={(e) =>
                        setValues({ ...values, [key]: e.target.value })
                      }
                    />
                    <input
                      type="color"
                      aria-label={`${label} picker`}
                      style={{
                        width: "44px",
                        minHeight: "44px",
                        flex: "0 0 44px",
                      }}
                      value={
                        /^#[0-9a-fA-F]{6}$/.test(values[key])
                          ? values[key]
                          : "#000000"
                      }
                      onChange={(e) =>
                        setValues({ ...values, [key]: e.target.value })
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
          </fieldset>
          <aside
            aria-label="Draft color preview"
            style={{
              padding: "1rem",
              border: "1px solid hsl(var(--border))",
              borderRadius: ".5rem",
              marginBlock: "1rem",
            }}
          >
            <h3>Draft color preview</h3>
            <p>
              This sample uses your valid draft colors. Blank or custom values
              use the sample’s default styling.
            </p>
            <div style={{ color: swatch("text_body_color") }}>
              <h1 style={{ color: swatch("text_h1_color") }}>Main heading</h1>
              <h2 style={{ color: swatch("text_h2_color") }}>
                Section heading
              </h2>
              <h3 style={{ color: swatch("text_h3_h6_color") }}>
                Supporting heading
              </h3>
              <p style={{ color: swatch("text_heading_subtext_color") }}>
                Heading subtext
              </p>
              <p style={{ color: swatch("text_supporting_copy_color") }}>
                Supporting copy
              </p>
              <p>Body copy</p>
              <p style={{ color: swatch("text_helper_text_color") }}>
                Helper message
              </p>
              <p style={{ color: swatch("text_meta_color") }}>Metadata</p>
              <p>
                <span
                  style={{
                    color: swatch("text_link_color"),
                    textDecoration: "underline",
                  }}
                >
                  Link sample
                </span>
                {" · "}
                <span
                  style={{
                    color: swatch("text_link_hover_color"),
                    textDecoration: "underline",
                  }}
                >
                  Hover sample
                </span>
              </p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: ".5rem" }}>
                {(
                  [
                    [
                      "brand_primary_color",
                      "text_primary_foreground_color",
                      "Primary",
                    ],
                    [
                      "brand_secondary_color",
                      "text_secondary_foreground_color",
                      "Secondary",
                    ],
                    [
                      "brand_tertiary_color",
                      "text_tertiary_foreground_color",
                      "Tertiary",
                    ],
                    [
                      "brand_quaternary_color",
                      "text_inverse_color",
                      "Quaternary / inverse",
                    ],
                  ] as const
                ).map(([background, foreground, label]) => (
                  <span
                    key={background}
                    style={{
                      padding: ".75rem",
                      border: "1px solid hsl(var(--border))",
                      backgroundColor: swatch(background),
                      color: swatch(foreground),
                    }}
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </aside>
          {!valid && (
            <p role="alert">
              Changed colors must be blank or a # followed by six hexadecimal
              digits.
            </p>
          )}
          <button type="submit" disabled={busy || blocked || !dirty || !valid}>
            Save website colors
          </button>
        </form>
      )}
    </section>
  );
}

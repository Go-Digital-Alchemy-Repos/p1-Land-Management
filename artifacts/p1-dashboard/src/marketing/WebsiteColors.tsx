import { Loader2, RefreshCw, Save } from "lucide-react";
import {
  ColorEditor,
  BRANDING_COLOR_FIELDS,
} from "../../../../platform/p1-core/client/src/components/shared/color-editor";
import "./website-colors.css";
import { useEffect, useRef, useState } from "react";
import {
  getWebsiteColors,
  saveWebsiteColors,
} from "@workspace/api-client-react/dashboard";
import { useCmsUnsavedChanges } from "./useCmsUnsavedChanges";
type Snapshot = Awaited<ReturnType<typeof getWebsiteColors>>;
type Colors = Snapshot["colors"];
const controls = BRANDING_COLOR_FIELDS;
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
  const previewValues = Object.fromEntries(
    controls.map(({ key }) => [key, swatch(key)]),
  );
  return (
    <section className="website-colors" aria-label="Website color palette">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (valid) void save();
        }}
      >
        <ColorEditor
          previewValues={previewValues}
          notices={
            <>
              {error && <p role="alert">{error}</p>}
              {message && <p role="status">{message}</p>}
              {busy && <p role="status">Working…</p>}
              {!valid && (
                <p role="alert">
                  Changed colors must be blank or a # followed by six
                  hexadecimal digits.
                </p>
              )}
            </>
          }
          renderControls={(field) => (
            <>
              <input
                type="color"
                aria-label={`${field.label} picker`}
                data-testid={`input-color-${field.key}`}
                disabled={!values || busy || blocked}
                value={swatch(field.key) ?? "#000000"}
                onChange={(event) =>
                  values &&
                  setValues({
                    ...values,
                    [field.key]: event.target.value.toUpperCase(),
                  })
                }
              />
              <input
                id={field.key}
                value={values?.[field.key] ?? ""}
                placeholder="#000000"
                data-testid={`input-hex-${field.key}`}
                disabled={!values || busy || blocked}
                aria-describedby={`${field.key}-description`}
                aria-invalid={
                  changed.some(({ key }) => key === field.key) &&
                  !/^(?:#[0-9a-fA-F]{6})?$/.test(values?.[field.key] ?? "")
                }
                onChange={(event) =>
                  values &&
                  setValues({ ...values, [field.key]: event.target.value })
                }
              />
            </>
          )}
          toolbar={
            <>
              <button
                className="color-save"
                type="submit"
                data-testid="button-save-branding-colors"
                disabled={!saved || busy || blocked || !dirty || !valid}
              >
                {busy ? (
                  <Loader2 className="color-spinner" aria-hidden="true" />
                ) : (
                  <Save aria-hidden="true" />
                )}
                Save Color Palette
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void load(true)}
              >
                <RefreshCw aria-hidden="true" />
                Reload saved colors
              </button>
            </>
          }
        />
      </form>
      <p className="color-save-help">
        Use a six-digit hex color such as #1F2A44, or leave a field blank to use
        its website fallback. Only changed fields are saved. Existing custom
        values remain untouched unless you edit them. These settings are
        independent of the Business Center theme.
      </p>
    </section>
  );
}

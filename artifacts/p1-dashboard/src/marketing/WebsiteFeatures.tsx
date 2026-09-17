import { useEffect, useRef, useState } from "react";
import {
  getWebsiteFeatures,
  saveWebsiteFeatures,
} from "@workspace/api-client-react/dashboard";
import { useCmsUnsavedChanges } from "./useCmsUnsavedChanges";
type Snapshot = Awaited<ReturnType<typeof getWebsiteFeatures>>;
type Features = Snapshot["features"];
const controls: Array<{
  key: keyof Features;
  label: string;
  description: string;
}> = [
  {
    key: "cmsEnabled",
    label: "CMS",
    description:
      "Website editing, pages, media, sections, menus, galleries and SEO tools.",
  },
  {
    key: "blogEnabled",
    label: "Blog",
    description: "Website blog publishing tools and API entry points.",
  },
  {
    key: "eventsEnabled",
    label: "Events",
    description:
      "Event administration, registration and event API entry points.",
  },
  {
    key: "crmEnabled",
    label: "Website CRM intake",
    description:
      "The retained website CRM pipeline and intake routes. Native Revenue / Sales stays available.",
  },
  {
    key: "careersEnabled",
    label: "Careers",
    description: "Career tools, job listings and application API entry points.",
  },
];
export default function WebsiteFeatures() {
  const [saved, setSaved] = useState<Snapshot | null>(null),
    [values, setValues] = useState<Features | null>(null),
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
    JSON.stringify(saved.features) !== JSON.stringify(values),
  );
  useCmsUnsavedChanges(
    dirty || blocked,
    "Leave website modules? Unsaved or unconfirmed changes may remain. Reload saved modules before editing again.",
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
        "Discard your selections and reload saved website modules?",
      )
    )
      return;
    gate.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await getWebsiteFeatures(options());
      if (alive.current) {
        setSaved(result);
        setValues(result.features);
        setBlocked(false);
      }
    } catch {
      if (alive.current) {
        setBlocked(true);
        setError(
          "Could not load website modules. Your selections are retained. Try reloading saved modules.",
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
      await saveWebsiteFeatures(
        { features: values, expectedVersion: saved.version },
        options(),
      );
      confirmed = true;
      const next = await getWebsiteFeatures(options());
      if (alive.current) {
        setSaved(next);
        setValues(next.features);
        setBlocked(false);
        setMessage(
          "Website modules saved. The selections below reflect the current saved settings.",
        );
      }
    } catch {
      if (alive.current) {
        setBlocked(true);
        setError(
          confirmed
            ? "The save completed, but current settings could not be reloaded. Your selections are retained. Reload saved modules before continuing."
            : "The save could not be confirmed or settings changed. Your selections are retained. Reload saved modules before continuing.",
        );
      }
    } finally {
      gate.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return (
    <section className="panel" aria-label="Website module settings">
      <h2>Website modules</h2>
      <p>
        Control which website services are available. Turning off a module
        preserves its stored records and does not change team permissions or
        dashboard business settings.
      </p>
      <p>
        Availability also depends on the public website’s configured routes.
        Enabling a module does not create a new public page or navigation item.
        CMS controls editing tools; it does not take the public website offline.
      </p>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      {busy && <p role="status">Working…</p>}
      <button type="button" disabled={busy} onClick={() => void load(true)}>
        Reload saved modules
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
              display: "grid",
              gap: "1rem",
              marginBlock: "1rem",
              minWidth: 0,
              border: "1px solid hsl(var(--border))",
              padding: "1rem",
              borderRadius: ".5rem",
            }}
          >
            <legend>Available website modules</legend>
            {controls.map((control) => (
              <div key={control.key}>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: ".5rem",
                  }}
                >
                  <input
                    type="checkbox"
                    style={{ width: "1.1rem", minHeight: "1.1rem", flex: "0 0 auto" }}
                    checked={values[control.key]}
                    onChange={(e) =>
                      setValues({ ...values, [control.key]: e.target.checked })
                    }
                  />
                  {control.label}
                </label>
                <p style={{ margin: ".25rem 0 0", overflowWrap: "anywhere" }}>
                  {control.description}
                </p>
              </div>
            ))}
          </fieldset>
          <div style={{ display: "flex", flexWrap: "wrap", gap: ".75rem" }}>
            <button
              type="button"
              disabled={busy || blocked}
              onClick={() => setValues({ ...saved.defaults })}
            >
              Use default selections
            </button>
            <button type="submit" disabled={busy || blocked || !dirty}>
              Save website modules
            </button>
          </div>
          <p>
            Default selections only change this form until you save. They keep
            Events and Careers off.
          </p>
        </form>
      )}
    </section>
  );
}

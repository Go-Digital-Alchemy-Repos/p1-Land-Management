import { Save, RefreshCw, Loader2 } from "lucide-react";
import { FeatureAppsEditor } from "../../../../platform/p1-core/client/src/components/shared/feature-apps-editor";
import "./website-features.css";
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
    label: "Enable CMS",
    description:
      "Website editing, pages, media, sections, menus, galleries and SEO tools.",
  },
  {
    key: "blogEnabled",
    label: "Enable Blog",
    description: "Website blog publishing tools and API entry points.",
  },
  {
    key: "eventsEnabled",
    label: "Enable Events",
    description:
      "Event administration, registration and event API entry points.",
  },
  {
    key: "crmEnabled",
    label: "Enable CRM",
    description:
      "The retained website CRM pipeline and intake routes. Native Revenue / Sales stays available.",
  },
  {
    key: "careersEnabled",
    label: "Enable Career Center",
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
    <section className="website-features" aria-label="Website module settings">
      <form onSubmit={event => { event.preventDefault(); void save(); }}>
        <FeatureAppsEditor
          fields={controls}
          notices={<>
            {error && <p role="alert">{error}</p>}
            {message && <p role="status">{message}</p>}
            {busy && <p role="status">Working…</p>}
          </>}
          renderToggle={field => <button
            id={`feature-${field.key}`}
            type="button"
            role="switch"
            className="feature-apps-switch"
            aria-labelledby={`feature-label-${field.key}`}
            aria-describedby={`feature-help-${field.key}`}
            aria-checked={Boolean(values?.[field.key as keyof Features])}
            disabled={!values || busy || blocked}
            onClick={() => values && setValues({ ...values, [field.key]: !values[field.key as keyof Features] })}
          ><span /></button>}
          toolbar={<>
            <button className="feature-apps-save" type="submit" disabled={!saved || busy || blocked || !dirty}>
              {busy ? <Loader2 aria-hidden="true" /> : <Save aria-hidden="true" />} Save Configuration
            </button>
            <button type="button" disabled={busy} onClick={() => void load(true)}><RefreshCw aria-hidden="true" /> Reload saved modules</button>
            <button type="button" disabled={!saved || busy || blocked} onClick={() => saved && setValues({ ...saved.defaults })}>Use default selections</button>
          </>}
        />
      </form>
      <p className="feature-apps-note">Availability also depends on the public website’s configured routes. Enabling a module does not create a new public page or navigation item. CMS controls editing tools; it does not take the public website offline. These settings do not change team permissions or dashboard business settings.</p>
      <p className="feature-apps-note">Default selections only change this form until you save. They keep Events and Careers off.</p>
    </section>
  );
}

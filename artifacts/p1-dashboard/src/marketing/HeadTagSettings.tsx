import type {
  WebsiteScriptConfiguration,
  GoogleAnalyticsScriptSettings,
} from "../../../../platform/p1-core/shared/website-script-management";
import { BarChart3, ShieldCheck } from "lucide-react";
import { HeadTagPresentation } from "../../../../platform/p1-core/client/src/components/shared/head-tag-presentation";
import { useEffect, useRef, useState } from "react";
import {
  getWebsiteHeadTags,
  saveWebsiteHeadTags,
} from "@workspace/api-client-react/dashboard";
import { useCmsUnsavedChanges } from "./useCmsUnsavedChanges";
export default function HeadTagSettings() {
  const [saved, setSaved] = useState<Awaited<
      ReturnType<typeof getWebsiteHeadTags>
    > | null>(null),
    [html, setHtml] = useState(""),
    [busy, setBusy] = useState(false),
    [blocked, setBlocked] = useState(false),
    [error, setError] = useState(""),
    [message, setMessage] = useState("");
  const live = useRef(true),
    gate = useRef(false),
    controller = useRef<AbortController | null>(null);
  const dirty = Boolean(saved && html !== saved.html);
  useCmsUnsavedChanges(
    dirty || blocked,
    "Leave website head tags? Unsaved or unconfirmed changes may remain. Reload saved tags before editing again.",
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
      !window.confirm("Discard your draft and load saved website head tags?")
    )
      return;
    gate.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const result = await getWebsiteHeadTags(options());
      if (live.current) {
        setSaved(result);
        setHtml(result.html);
        setBlocked(false);
      }
    } catch {
      if (live.current) {
        setBlocked(true);
        setError(
          "Could not load website head tags. Your draft is retained. Try reloading saved tags.",
        );
      }
    } finally {
      gate.current = false;
      if (live.current) setBusy(false);
    }
  }
  useEffect(() => {
    live.current = true;
    void load();
    return () => {
      live.current = false;
      controller.current?.abort();
    };
  }, []);
  async function save() {
    if (gate.current || !saved || blocked || !dirty) return;
    gate.current = true;
    setBusy(true);
    setError("");
    setMessage("");
    let committed = false;
    try {
      await saveWebsiteHeadTags(
        { html, expectedVersion: saved.version },
        options(),
      );
      committed = true;
      const next = await getWebsiteHeadTags(options());
      if (live.current) {
        setSaved(next);
        setHtml(next.html);
        setBlocked(false);
        setMessage(
          "Website head tags saved. The loaded values reflect the current saved website settings.",
        );
      }
    } catch {
      if (live.current) {
        setBlocked(true);
        setError(
          committed
            ? "The save completed, but current settings could not be reloaded. Your draft is retained. Reload saved tags before editing again."
            : "The save could not be confirmed or settings changed. Your draft is retained. Reload saved tags before editing again.",
        );
      }
    } finally {
      gate.current = false;
      if (live.current) setBusy(false);
    }
  }
  return (
    <HeadTagPresentation
      headingLevel={1}
      managedScripts={<ManagedScripts />}
      html={html}
      onChange={setHtml}
      onSave={() => void save()}
      busy={busy}
      editorDisabled={busy || !saved}
      saveDisabled={busy || blocked || !dirty || html.length > 100000}
      saveLabel="Save website head tags"
      onReload={() => void load(true)}
      error={error}
      message={message}
      publicationNotice={
        <>
          Saved markup appears on normal public page loads after a refresh of up
          to 30 seconds. Admin pages and editor previews are excluded. Inline
          scripts and unapproved script sources remain blocked by website
          security policy.
        </>
      }
      limitNotice={
        html.length > 100000 ? (
          <>
            The editor can save up to 100,000 characters. Existing longer markup
            is retained until you explicitly shorten it.
          </>
        ) : undefined
      }
    />
  );
}

const scriptsEndpoint = "/api/v1/marketing/cms/website-system/scripts";
function ManagedScripts() {
  const [saved, setSaved] = useState<WebsiteScriptConfiguration | null>(null);
  const [draft, setDraft] = useState<GoogleAnalyticsScriptSettings>({
    source: "deployment",
    measurementId: "",
  });
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(true);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const generation = useRef(0),
    gate = useRef(false),
    controller = useRef<AbortController | null>(null);
  const dirty = Boolean(
    saved && JSON.stringify(draft) !== JSON.stringify(saved.googleAnalytics),
  );
  useCmsUnsavedChanges(
    dirty || (Boolean(saved) && blocked),
    "Leave managed scripts? Unsaved or unconfirmed settings remain.",
  );
  async function request(method: "GET" | "PUT", body?: unknown) {
    const response = await fetch(scriptsEndpoint, {
      method,
      credentials: "same-origin",
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.any([
        controller.current!.signal,
        AbortSignal.timeout(30000),
      ]),
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      ...(body ? { body: JSON.stringify(body) } : {}),
    });
    if (!response.ok) throw new Error("Managed settings request failed");
    return response.json() as Promise<WebsiteScriptConfiguration>;
  }
  async function run(save = false) {
    if (gate.current || (save && (!saved || blocked || !dirty))) return;
    if (
      !save &&
      dirty &&
      !window.confirm(
        "Discard your managed scripts draft and reload saved settings?",
      )
    )
      return;
    gate.current = true;
    controller.current = new AbortController();
    const owner = generation.current;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (save)
        await request("PUT", {
          expectedVersion: saved!.version,
          googleAnalytics: draft,
        });
      const next = await request("GET");
      if (owner !== generation.current) return;
      setSaved(next);
      setDraft(next.googleAnalytics);
      setBlocked(false);
      if (save)
        setMessage(
          "Managed scripts saved and current settings reloaded. Changes apply on new public page loads.",
        );
    } catch {
      if (owner !== generation.current) return;
      setBlocked(true);
      setError(
        save
          ? "The save could not be confirmed or settings changed. Your draft is retained. Reload managed scripts before saving again."
          : "Managed scripts could not be loaded. Retry loading; your draft is retained.",
      );
    } finally {
      if (owner === generation.current) {
        gate.current = false;
        setBusy(false);
      }
    }
  }
  useEffect(() => {
    void run();
    return () => {
      generation.current++;
      controller.current?.abort();
      gate.current = false;
    };
  }, []);
  const valid =
    /^G-[A-Z0-9]+$/.test(draft.measurementId) &&
    draft.measurementId.length <= 64;
  return (
    <div
      className="head-tag-card"
      aria-label="Managed website scripts"
      aria-busy={busy}
    >
      <header className="head-tag-card-header">
        <h3>
          <BarChart3 size={18} color="#2563eb" aria-hidden="true" />
          Managed website scripts
        </h3>
        <p>
          Structured settings control the website’s existing loaders. Do not add
          duplicate raw tags.
        </p>
      </header>
      <div className="head-tag-card-content">
        <h4>Google Analytics</h4>
        <p>
          Effective measurement ID:{" "}
          <strong>
            {saved?.effectiveGoogleAnalytics.measurementId ?? "Not active"}
          </strong>
          {saved
            ? ` · ${saved.effectiveGoogleAnalytics.source}`
            : " · Not loaded"}
        </p>
        {saved && (
          <p style={{ overflowWrap: "anywhere" }}>
            Script: {saved.scriptUrls.googleAnalytics}
          </p>
        )}
        <label>
          Analytics configuration
          <select
            aria-label="Analytics configuration"
            disabled={busy || !saved || blocked}
            value={draft.source}
            onChange={(event) =>
              setDraft({
                ...draft,
                source: event.target
                  .value as GoogleAnalyticsScriptSettings["source"],
              })
            }
          >
            <option value="deployment">Use deployment configuration</option>
            <option value="managed">Use managed measurement ID</option>
            <option value="disabled">Disable Google Analytics</option>
          </select>
        </label>
        <label>
          GA4 measurement ID
          <input
            aria-label="GA4 measurement ID"
            maxLength={64}
            placeholder="G-YX69CJ1QNJ"
            value={draft.measurementId}
            disabled={busy || !saved || blocked || draft.source !== "managed"}
            onChange={(event) =>
              setDraft({ ...draft, measurementId: event.target.value })
            }
          />
        </label>
        {draft.source === "managed" && !valid && (
          <p>Enter a valid GA4 measurement ID beginning with G-.</p>
        )}
        {saved?.rawMarkupConflict && (
          <p role="alert">
            Saved raw head markup contains a managed script loader. Remove the
            duplicate from Public Head Markup before enabling managed analytics.
          </p>
        )}
        <p>
          Analytics reporting property settings do not change this tracking ID.
          Tracking excludes editor previews and private routes; cookie-consent
          gating is not configured.
        </p>
        {error && <p role="alert">{error}</p>}
        {message && <p role="status">{message}</p>}
        <div className="head-tag-actions">
          <button
            type="button"
            disabled={
              busy ||
              blocked ||
              !dirty ||
              (draft.source === "managed" && !valid)
            }
            onClick={() => void run(true)}
          >
            Save managed scripts
          </button>
          <button type="button" disabled={busy} onClick={() => void run()}>
            Reload managed scripts
          </button>
        </div>
        <h3>
          <ShieldCheck size={18} color="#16a34a" aria-hidden="true" />
          Cloudflare Turnstile
        </h3>
        <p>
          {saved
            ? saved.turnstile.enabled
              ? "Enabled"
              : "Disabled"
            : "Status not loaded"}
        </p>
        <p style={{ overflowWrap: "anywhere" }}>
          Public site key: {saved?.turnstile.siteKey ?? "Not active"}
        </p>
        {saved && (
          <p style={{ overflowWrap: "anywhere" }}>
            Script: {saved.turnstile.scriptUrl}
          </p>
        )}
        <p>
          Verification credentials are server-managed. Changing providers or
          rotating credentials requires the matching public site key and private
          secret together, followed by verification. Secrets are never displayed
          here. The widget loads on public forms when enabled.
        </p>
      </div>
    </div>
  );
}

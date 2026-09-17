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
    <section className="panel" aria-label="Website head tag settings">
      <h2>Head tag additions</h2>
      <p>
        Store custom verification tags, meta tags or vendor scripts for the
        public website’s head. These settings belong to the website.
      </p>
      <p role="status">
        Saved markup appears on normal public page loads after a refresh of up
        to 30 seconds. Admin pages and editor previews are excluded. Inline
        scripts and unapproved script sources remain blocked by website security
        policy.
      </p>
      <p>
        Use the structured Google Analytics integration for GA4 configuration.
        Raw tags entered here are not automatically gated by cookie-consent
        preferences.
      </p>
      {error && <p role="alert">{error}</p>}
      {message && <p role="status">{message}</p>}
      <button type="button" disabled={busy} onClick={() => void load(true)}>
        Reload saved tags
      </button>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
      >
        <label style={{ display: "grid", gap: ".5rem", marginBlock: "1rem" }}>
          Public website head markup
          <textarea
            rows={14}
            value={html}
            disabled={busy || !saved}
            onChange={(e) => setHtml(e.target.value)}
            spellCheck={false}
            style={{
              width: "100%",
              boxSizing: "border-box",
              fontFamily: "monospace",
              overflowWrap: "anywhere",
            }}
          />
        </label>
        {html.length > 100000 && (
          <p role="alert">
            The editor can save up to 100,000 characters. Existing longer markup
            is retained until you explicitly shorten it.
          </p>
        )}
        <button
          type="submit"
          disabled={busy || blocked || !dirty || html.length > 100000}
        >
          {busy ? "Working…" : "Save website head tags"}
        </button>
      </form>
    </section>
  );
}

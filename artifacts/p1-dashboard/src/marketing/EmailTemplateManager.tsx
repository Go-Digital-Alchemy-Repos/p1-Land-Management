import React, { useEffect, useRef, useState, type FormEvent } from "react";
import { Download, Mail, RefreshCw, Save } from "lucide-react";
import {
  getWebsiteFeatures,
  getWebsiteEmailTemplates,
  saveWebsiteEmailTemplate,
  restoreWebsiteEmailTemplates,
  previewWebsiteEmailTemplate,
  testWebsiteEmailTemplate,
} from "@workspace/api-client-react/dashboard";
import { useEmailTemplateReservation } from "./useEmailTemplateReservation";
import { useCmsUnsavedChanges } from "./useCmsUnsavedChanges";
import "./email-template-manager.css";
import { EmailVisualEditor } from "./EmailVisualEditor";

type Collection = Awaited<ReturnType<typeof getWebsiteEmailTemplates>>;
type Template = Collection["templates"][number];
type Fields = { subject: string; htmlBody: string; isActive: boolean };
type Draft = {
  slug: string;
  version: string;
  fields: Fields;
  baseline: string;
};
const fieldsOf = (item: Template): Fields => ({
  subject: item.subject,
  htmlBody: item.htmlBody,
  isActive: item.isActive,
});

export default function EmailTemplateManager() {
  const [collection, setCollection] = useState<Collection | null>(null);
  const [features, setFeatures] = useState<
    Awaited<ReturnType<typeof getWebsiteFeatures>>["features"] | null
  >(null);
  const [editorMode, setEditorMode] = useState<"visual" | "html">("visual");
  const [selected, setSelected] = useState("");
  const [query, setQuery] = useState("");
  const [module, setModule] = useState("");
  const [status, setStatus] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [preview, setPreview] = useState<{
    subject: string;
    html: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const gate = useRef(false),
    live = useRef(true),
    request = useRef<AbortController | null>(null);
  const reservation = useEmailTemplateReservation(draft?.slug ?? null);
  const dirty = Boolean(
    draft && JSON.stringify(draft.fields) !== draft.baseline,
  );
  useCmsUnsavedChanges(
    dirty || blocked,
    "Leave email templates? Download your draft first to retain unsaved changes.",
  );
  const templates = (collection?.templates ?? []).filter(
    (item) =>
      Boolean(features) &&
      (item.module !== "events" || features?.eventsEnabled) &&
      (item.module !== "crm" || features?.crmEnabled) &&
      (item.module !== "careers" || features?.careersEnabled),
  );
  const current = templates.find((item) => item.slug === selected);
  const shown = templates.filter(
    (item) =>
      (!module || item.module === module) &&
      (!status || String(item.isActive) === status) &&
      `${item.name} ${item.slug} ${item.description ?? ""}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  function options() {
    request.current = new AbortController();
    return {
      signal: AbortSignal.any([
        request.current.signal,
        AbortSignal.timeout(30000),
      ]),
    };
  }
  async function run(work: () => Promise<void>, mutation = false) {
    if (gate.current) return;
    gate.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await work();
    } catch {
      if (live.current) {
        if (mutation) setBlocked(true);
        setError(
          mutation
            ? "The operation was not confirmed, the saved content changed, or the reservation was lost. Your draft is retained. Download it and reload saved templates before another change. Do not repeat an uncertain save or test send."
            : "Could not load this result. Your draft is retained; retry when the connection is available.",
        );
      }
    } finally {
      gate.current = false;
      if (live.current) setBusy(false);
    }
  }
  async function reload() {
    if (
      gate.current ||
      ((dirty || blocked) &&
        !window.confirm(
          "Replace your local draft with the latest saved template? Download the draft first if you need to keep it.",
        ))
    )
      return;
    await run(async () => {
      const requestOptions = options();
      const [next, featureState] = await Promise.all([
        getWebsiteEmailTemplates(requestOptions),
        getWebsiteFeatures(requestOptions),
      ]);
      if (!live.current) return;
      setFeatures(featureState.features);
      if (draft) {
        const saved = next.templates.find((item) => item.slug === draft.slug);
        if (!saved) {
          setCollection(next);
          setError(
            "The selected template is no longer available. Your draft is retained; download it before closing.",
          );
          return;
        }
        const fields = fieldsOf(saved);
        setDraft({
          slug: saved.slug,
          version: saved.version,
          fields,
          baseline: JSON.stringify(fields),
        });
      }
      setCollection(next);
      setBlocked(false);
      setPreview(null);
    });
  }
  useEffect(() => {
    live.current = true;
    void reload();
    return () => {
      live.current = false;
      request.current?.abort();
    };
  }, []);
  function select(item: Template) {
    if (
      gate.current ||
      ((dirty || blocked) &&
        !window.confirm(
          "Discard the retained draft and open another template? Download it first if needed.",
        ))
    )
      return;
    setSelected(item.slug);
    setDraft(null);
    setPreview(null);
    setBlocked(false);
    setError("");
    setNotice("");
  }
  function edit() {
    if (!current || busy || blocked) return;
    const fields = fieldsOf(current);
    setDraft({
      slug: current.slug,
      version: current.version,
      fields,
      baseline: JSON.stringify(fields),
    });
    setPreview(null);
    setEditorMode("visual");
  }
  function patch(update: Partial<Fields>) {
    setDraft((value) =>
      value ? { ...value, fields: { ...value.fields, ...update } } : value,
    );
    setPreview(null);
  }
  function download() {
    if (!draft) return;
    const url = URL.createObjectURL(
      new Blob(
        [JSON.stringify({ slug: draft.slug, ...draft.fields }, null, 2)],
        { type: "application/json" },
      ),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `${draft.slug}-draft.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  async function save(event: FormEvent) {
    event.preventDefault();
    if (!draft || blocked || gate.current || !reservation.owned) return;
    await run(async () => {
      await reservation.verify();
      const saved = await saveWebsiteEmailTemplate(
        draft.slug,
        { template: draft.fields, expectedVersion: draft.version },
        options(),
      );
      if (!live.current) return;
      const fields = fieldsOf(saved);
      setDraft({
        slug: saved.slug,
        version: saved.version,
        fields,
        baseline: JSON.stringify(fields),
      });
      const next = await getWebsiteEmailTemplates(options());
      if (live.current) {
        setCollection(next);
        setNotice("Email template saved.");
        setPreview(null);
      }
    }, true);
  }
  async function showPreview() {
    if (!current || gate.current) return;
    await run(async () => {
      const result = await previewWebsiteEmailTemplate(
        current.slug,
        {
          subject: draft?.fields.subject ?? current.subject,
          htmlBody: draft?.fields.htmlBody ?? current.htmlBody,
        },
        options(),
      );
      if (live.current) setPreview(result);
    });
  }
  async function sendTest() {
    if (
      !current ||
      dirty ||
      blocked ||
      gate.current ||
      !window.confirm(
        `Send a real test email for “${current.name}” to your signed-in account's email address? It uses the saved template and sample values, not unsaved draft content.`,
      )
    )
      return;
    await run(async () => {
      const result = await testWebsiteEmailTemplate(current.slug, options());
      if (!result.success) throw Error("Test send not confirmed");
      if (live.current) setNotice(result.message);
    }, true);
  }
  async function restore() {
    if (
      !collection ||
      draft ||
      blocked ||
      gate.current ||
      !window.confirm(
        "Restore built-in template subjects and HTML to their defaults? Existing activation choices and custom templates are preserved. Current built-in customizations will be replaced.",
      )
    )
      return;
    await run(async () => {
      const next = await restoreWebsiteEmailTemplates(
        { expectedVersion: collection.version },
        options(),
      );
      if (live.current) {
        setCollection(next);
        setPreview(null);
        setNotice(
          "Built-in defaults restored. Activation choices and custom templates preserved.",
        );
      }
    }, true);
  }
  return (
    <article className="email-template-manager">
      <header className="page-hero">
        <div>
          <p className="eyebrow">WEBSITE SYSTEM</p>
          <h1>
            <Mail size={28} /> Email templates
          </h1>
          <p>Manage website email content, placeholders and activation.</p>
        </div>
      </header>
      <div className="email-template-toolbar">
        <button disabled={busy} onClick={() => void reload()}>
          <RefreshCw size={16} /> Reload saved templates
        </button>
        <button
          disabled={busy || !collection || Boolean(draft) || blocked}
          onClick={() => void restore()}
        >
          Restore built-in defaults
        </button>
      </div>
      {error && (
        <p role="alert" className="email-template-error">
          {error}
        </p>
      )}
      {notice && <p role="status">{notice}</p>}
      {busy && <p role="status">Working…</p>}
      <div className="email-template-workspace">
        <aside className="email-template-panel" aria-label="Template library">
          <label>
            Search templates
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </label>
          <label>
            Module
            <select value={module} onChange={(e) => setModule(e.target.value)}>
              <option value="">All modules</option>
              {[...new Set(templates.map((item) => item.module))]
                .sort()
                .map((name) => (
                  <option key={name}>{name}</option>
                ))}
            </select>
          </label>
          <label>
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="">All statuses</option>
              <option value="true">Active</option>
              <option value="false">Inactive</option>
            </select>
          </label>
          <p>{shown.length} templates</p>
          <nav aria-label="Email templates">
            {shown.map((item) => (
              <button
                key={item.slug}
                disabled={busy}
                aria-current={selected === item.slug ? "page" : undefined}
                onClick={() => select(item)}
              >
                <strong>{item.name}</strong>
                <small>
                  {item.module} · {item.isActive ? "Active" : "Inactive"}
                </small>
              </button>
            ))}
          </nav>
        </aside>
        <section
          className="email-template-panel"
          aria-label="Selected template"
        >
          {current || draft ? (
            <>
              <h2>{current?.name ?? draft?.slug}</h2>
              <p>{current?.description}</p>
              {current && (
                <p>
                  Available variables:{" "}
                  {current.variables.length
                    ? current.variables.map((variable) => (
                        <code key={variable}>{`{{${variable}}} `}</code>
                      ))
                    : "None"}
                </p>
              )}
              {draft ? (
                <form onSubmit={save}>
                  {!reservation.owned && (
                    <p role="alert">
                      {reservation.error ||
                        (reservation.holder
                          ? `${reservation.holder} is editing this template.`
                          : "Waiting for an edit reservation.")}{" "}
                      Your draft stays here.{" "}
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => void reservation.acquire()}
                      >
                        Retry reservation
                      </button>
                    </p>
                  )}
                  <fieldset disabled={busy}>
                    <label>
                      Subject
                      <input
                        required
                        maxLength={1000}
                        value={draft.fields.subject}
                        onChange={(e) => patch({ subject: e.target.value })}
                      />
                    </label>
                    <div
                      className="email-template-toolbar"
                      aria-label="Editor mode"
                    >
                      <button
                        type="button"
                        aria-pressed={editorMode === "visual"}
                        onClick={() => setEditorMode("visual")}
                      >
                        Visual editor
                      </button>
                      <button
                        type="button"
                        aria-pressed={editorMode === "html"}
                        onClick={() => setEditorMode("html")}
                      >
                        HTML editor
                      </button>
                    </div>
                    {editorMode === "visual" &&
                    !/<(?:html|head|body|!doctype)\b/i.test(
                      draft.fields.htmlBody,
                    ) ? (
                      <EmailVisualEditor
                        value={draft.fields.htmlBody}
                        onChange={(htmlBody) => patch({ htmlBody })}
                        disabled={busy || blocked || !reservation.owned}
                      />
                    ) : (
                      <label>
                        HTML body
                        <textarea
                          required
                          rows={18}
                          maxLength={500000}
                          value={draft.fields.htmlBody}
                          onChange={(e) => patch({ htmlBody: e.target.value })}
                        />
                      </label>
                    )}
                    {editorMode === "visual" &&
                      /<(?:html|head|body|!doctype)\b/i.test(
                        draft.fields.htmlBody,
                      ) && (
                        <p>
                          Full-document HTML is edited as source to preserve its
                          head, styles and document structure.
                        </p>
                      )}
                    <label className="email-template-check">
                      <input
                        type="checkbox"
                        checked={draft.fields.isActive}
                        onChange={(e) => patch({ isActive: e.target.checked })}
                      />{" "}
                      Active
                    </label>
                    <div className="email-template-toolbar">
                      <button
                        type="submit"
                        disabled={blocked || !reservation.owned}
                      >
                        <Save size={16} /> Save template
                      </button>
                      <button type="button" onClick={download}>
                        <Download size={16} /> Download draft
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (
                            (!dirty && !blocked) ||
                            window.confirm(
                              "Discard your retained draft? Download it first if needed.",
                            )
                          ) {
                            setDraft(null);
                            setPreview(null);
                          }
                        }}
                      >
                        Close editor
                      </button>
                    </div>
                  </fieldset>
                </form>
              ) : (
                current && (
                  <>
                    <p>
                      <strong>Saved subject:</strong> {current.subject}
                    </p>
                    <button disabled={busy || blocked} onClick={edit}>
                      Edit template
                    </button>
                  </>
                )
              )}
              <div className="email-template-toolbar">
                <button
                  disabled={busy || !current}
                  onClick={() => void showPreview()}
                >
                  Preview {draft ? "draft" : "saved template"}
                </button>
                <button
                  disabled={busy || dirty || blocked || !current}
                  onClick={() => void sendTest()}
                >
                  Send saved test email
                </button>
              </div>
              <p className="email-template-caption">
                Test emails use saved content and sample values, and go only to
                the signed-in account’s email address. Preview does not send
                email.
              </p>
              {preview && (
                <section aria-label="Email preview">
                  <h3>Preview subject: {preview.subject}</h3>
                  <iframe
                    title="Email template preview"
                    sandbox=""
                    referrerPolicy="no-referrer"
                    srcDoc={`<!doctype html><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'; img-src data: https://www.p1landmanagement.com https://p1landmanagement.com https://dashboard.p1landmanagement.com; base-uri 'none'; form-action 'none'">${preview.html}`}
                  />
                  <p className="email-template-caption">
                    Scripts, forms and remote resources are blocked in this
                    preview.
                  </p>
                </section>
              )}
            </>
          ) : (
            <p>
              {collection
                ? "Select a template to review its content."
                : busy
                  ? "Loading templates…"
                  : "Template library unavailable. Reload saved templates to try again."}
            </p>
          )}
        </section>
      </div>
    </article>
  );
}

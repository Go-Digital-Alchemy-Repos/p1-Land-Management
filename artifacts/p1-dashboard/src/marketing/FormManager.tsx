import { buildSubmissionCsv } from "../../../../platform/p1-core/shared/form-submission-export";
import { useEffect, useRef, useState } from "react";
import {
  listMarketingForms,
  createMarketingForm,
  updateMarketingForm,
  listMarketingFormSubmissions,
} from "@workspace/api-client-react/dashboard";
import type {
  MarketingForm,
  MarketingFormInput,
  MarketingFormSubmission,
} from "../../../../lib/api-client-react/src/dashboard/models";
import { useCmsUnsavedChanges } from "./useCmsUnsavedChanges";
import "./form-manager.css";
import { FormDeliveryQueue } from "./FormDeliveryQueue";
import { FormFieldsEditor, validateFormFields } from "./FormFieldsEditor";

const message = (error: unknown) =>
  (error as { data?: { message?: string; error?: string } }).data?.message ||
  (error as { data?: { error?: string } }).data?.error ||
  (error as Error).message ||
  "Form request failed";
const settingsLabels: Record<string, string> = {
  notifyAdmins: "Notify subscribed team members",
  storeAsContactMessage: "Store as a contact message",
  createCrmLead: "Create a CRM lead",
  mailchimpEnabled: "Send to Mailchimp",
};
function draft(form: MarketingForm | "new"): MarketingFormInput {
  if (form === "new")
    return {
      name: "",
      slug: "",
      kind: "custom",
      description: "",
      isSystem: false,
      isActive: false,
      fields: [],
      settings: {
        submitButtonText: "Submit",
        successMessage: "Thanks! Your submission has been received.",
      },
    };
  const {
    name,
    slug,
    kind,
    description,
    isSystem,
    isActive,
    fields,
    settings,
  } = form;
  return structuredClone({
    name,
    slug,
    kind,
    description,
    isSystem,
    isActive,
    fields,
    settings,
  });
}
function Editor({
  form,
  close,
  saved,
  canUseMedia,
}: {
  canUseMedia: boolean;
  form: MarketingForm | "new";
  close: () => void;
  saved: () => void;
}) {
  const [value, setValue] = useState(() => draft(form)),
    [baseline, setBaseline] = useState(() => JSON.stringify(draft(form))),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const gate = useRef(false),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const dirty = JSON.stringify(value) !== baseline;
  useCmsUnsavedChanges(dirty);
  const patch = (update: Partial<MarketingFormInput>) =>
    setValue((current) => ({ ...current, ...update }));
  const setting = (key: string, val: unknown) =>
    setValue((current) => ({
      ...current,
      settings: { ...current.settings, [key]: val },
    }));
  async function save() {
    if (gate.current) return;
    const fieldError = validateFormFields(value.fields || []);
    if (fieldError) {
      setError(fieldError);
      return;
    }
    if (
      value.isActive &&
      !window.confirm(
        "Save this active form? Changes will affect new submissions wherever the form is used.",
      )
    )
      return;
    gate.current = true;
    setBusy(true);
    setError("");
    try {
      if (form === "new") await createMarketingForm(value);
      else await updateMarketingForm(form.id, value);
      if (alive.current) {
        setBaseline(JSON.stringify(value));
        saved();
      }
    } catch (error) {
      if (alive.current) setError(message(error));
    } finally {
      gate.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return (
    <section className="form-editor" aria-label="Website form editor">
      <h2>{form === "new" ? "Create form" : `Edit ${form.name}`}</h2>
      <p>
        Form changes apply wherever this form is used. Existing submissions keep
        their saved answers.
      </p>
      {error && <p role="alert">{error}</p>}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <fieldset disabled={busy}>
          <legend>Form details</legend>
          <label>
            Name
            <input
              required
              value={value.name}
              onChange={(event) => patch({ name: event.target.value })}
            />
          </label>
          <label>
            Slug
            <input
              required
              pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
              disabled={value.isSystem}
              value={value.slug}
              onChange={(event) => patch({ slug: event.target.value })}
            />
          </label>
          <label>
            Description
            <textarea
              aria-label="Description"
              value={value.description || ""}
              onChange={(event) => patch({ description: event.target.value })}
            />
          </label>
          <label>
            Kind
            <select
              aria-label="Kind"
              disabled={value.isSystem}
              value={value.kind}
              onChange={(event) =>
                patch({
                  kind: event.target.value as MarketingFormInput["kind"],
                })
              }
            >
              {[
                "contact",
                "newsletter",
                "interest",
                "application",
                "custom",
              ].map((kind) => (
                <option key={kind}>{kind}</option>
              ))}
            </select>
          </label>
          {value.isSystem && (
            <p>
              System form identity is protected. Its slug and kind cannot be
              changed.
            </p>
          )}
          <label className="form-check">
            <input
              type="checkbox"
              checked={!!value.isActive}
              onChange={(event) => patch({ isActive: event.target.checked })}
            />
            Accept submissions
          </label>
        </fieldset>
        <fieldset disabled={busy}>
          <legend>Submission behavior</legend>
          <label>
            Submit button text
            <input
              value={String(value.settings?.submitButtonText || "")}
              onChange={(event) =>
                setting("submitButtonText", event.target.value)
              }
            />
          </label>
          <label>
            Success message
            <textarea
              aria-label="Success message"
              value={String(value.settings?.successMessage || "")}
              onChange={(event) =>
                setting("successMessage", event.target.value)
              }
            />
          </label>
          {Object.entries(settingsLabels).map(([key, label]) => (
            <label className="form-check" key={key}>
              <input
                type="checkbox"
                checked={!!value.settings?.[key]}
                onChange={(event) => setting(key, event.target.checked)}
              />
              {label}
            </label>
          ))}
          <label>
            Mailchimp tag
            <input
              value={String(value.settings?.mailchimpTag || "")}
              onChange={(event) => setting("mailchimpTag", event.target.value)}
            />
          </label>
          <p>
            Delivery uses the configured website integrations. Team notification
            recipients are managed in People &amp; access after canonical
            notification delivery is enabled.
          </p>
        </fieldset>
        <fieldset disabled={busy}>
          <legend>Fields ({value.fields?.length || 0})</legend>
          <FormFieldsEditor
            canUseMedia={canUseMedia}
            fields={value.fields || []}
            onChange={(fields) => patch({ fields })}
          />
        </fieldset>
        <div className="form-actions">
          <button disabled={busy} type="submit">
            {busy ? "Saving…" : "Save form"}
          </button>
          <button
            disabled={busy}
            type="button"
            onClick={() => {
              if (
                !dirty ||
                window.confirm("Discard your unsaved form changes?")
              )
                close();
            }}
          >
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}
function Submissions({
  form,
  close,
}: {
  form: MarketingForm;
  close: () => void;
}) {
  const [rows, setRows] = useState<MarketingFormSubmission[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(true),
    [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setBusy(true);
    setError("");
    void listMarketingFormSubmissions(form.id, { signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) setRows(result);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(message(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [form.id, attempt]);
  return (
    <section className="form-manager" aria-label="Form submissions">
      <h2>{form.name} submissions</h2>
      <div className="form-actions">
        {(["csv", "json"] as const).map((format) => (
          <button
            key={format}
            disabled={busy || !!error || !rows.length}
            onClick={() => {
              const data =
                format === "csv"
                  ? "\uFEFF" + buildSubmissionCsv(rows)
                  : JSON.stringify(rows, null, 2);
              const url = URL.createObjectURL(
                new Blob([data], {
                  type:
                    format === "csv"
                      ? "text/csv;charset=utf-8"
                      : "application/json;charset=utf-8",
                }),
              );
              const anchor = document.createElement("a");
              anchor.href = url;
              anchor.download = `${form.slug.replace(/[^a-zA-Z0-9_-]/g, "_") || "form"}-submissions.${format}`;
              document.body.append(anchor);
              anchor.click();
              anchor.remove();
              setTimeout(() => URL.revokeObjectURL(url), 1000);
            }}
          >
            Export {format.toUpperCase()}
          </button>
        ))}
      </div>
      <p>
        CSV includes every saved answer key and treats formula-like values as
        text. JSON preserves the exact saved values.
      </p>

      <button onClick={close}>Back to forms</button>
      {busy && <p role="status">Loading submissions…</p>}
      {error && (
        <p role="alert">
          {error}{" "}
          <button onClick={() => setAttempt((current) => current + 1)}>
            Retry
          </button>
        </p>
      )}
      {!busy && !error && !rows.length && <p>No submissions yet.</p>}
      {!busy &&
        !error &&
        rows.map((row) => (
          <article key={row.id}>
            <h3>
              {row.createdAt
                ? new Date(row.createdAt).toLocaleString()
                : "Submission"}
            </h3>
            <p>Reference: {row.id}</p>
            {row.source && <p>Source: {row.source}</p>}
            <dl>
              {Object.entries(row.data).map(([key, value]) => (
                <div key={key}>
                  <dt>{key}</dt>
                  <dd>
                    {typeof value === "string"
                      ? value
                      : JSON.stringify(value, null, 2)}
                  </dd>
                </div>
              ))}
            </dl>
          </article>
        ))}
    </section>
  );
}
export default function FormManager({
  canUseMedia = false,
}: {
  canUseMedia?: boolean;
}) {
  const [deliveries, setDeliveries] = useState(false);
  const [rows, setRows] = useState<MarketingForm[]>([]),
    [selected, setSelected] = useState<MarketingForm | "new" | null>(null),
    [submissions, setSubmissions] = useState<MarketingForm | null>(null),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(true),
    [attempt, setAttempt] = useState(0),
    [query, setQuery] = useState(""),
    [notice, setNotice] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    setBusy(true);
    setError("");
    void listMarketingForms({ signal: controller.signal })
      .then((result) => {
        if (!controller.signal.aborted) setRows(result);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(message(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setBusy(false);
      });
    return () => controller.abort();
  }, [attempt]);
  if (deliveries)
    return <FormDeliveryQueue close={() => setDeliveries(false)} />;
  if (selected)
    return (
      <Editor
        canUseMedia={canUseMedia}
        key={selected === "new" ? "new" : selected.id}
        form={selected}
        close={() => setSelected(null)}
        saved={() => {
          setSelected(null);
          setNotice("Form saved.");
          setAttempt((current) => current + 1);
        }}
      />
    );
  if (submissions)
    return (
      <Submissions form={submissions} close={() => setSubmissions(null)} />
    );
  const visible = rows.filter((row) =>
    `${row.name} ${row.slug}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <section className="form-manager" aria-label="Website forms">
      <p>Manage website forms and review their saved submissions.</p>
      <button onClick={() => setDeliveries(true)}>Delivery monitoring</button>
      {notice && <p role="status">{notice}</p>}
      <div className="form-actions">
        <button
          disabled={busy || !!error}
          onClick={() => {
            setNotice("");
            setSelected("new");
          }}
        >
          Create form
        </button>
        <button
          disabled={busy}
          onClick={() => setAttempt((current) => current + 1)}
        >
          Refresh forms
        </button>
      </div>
      <label>
        Search forms
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      {busy && <p role="status">Loading forms…</p>}
      {error && <p role="alert">{error}</p>}
      {!busy && !error && (
        <div className="form-grid">
          {visible.map((row) => (
            <article key={row.id}>
              <h2>{row.name}</h2>
              <p>
                {row.slug} · {row.kind}
              </p>
              <p>
                {row.isActive ? "Active" : "Inactive"}
                {row.isSystem ? " · System" : ""} · {row.fields.length} fields
              </p>
              {row.description && <p>{row.description}</p>}
              <div className="form-actions">
                <button
                  onClick={() => {
                    setNotice("");
                    setSelected(row);
                  }}
                >
                  Edit {row.name}
                </button>
                <button onClick={() => setSubmissions(row)}>
                  View {row.name} submissions
                </button>
              </div>
            </article>
          ))}
          {!visible.length && <p>No matching forms.</p>}
        </div>
      )}
    </section>
  );
}

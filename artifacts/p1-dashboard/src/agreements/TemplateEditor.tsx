import { useEffect, useRef, useState } from "react";
import {
  listAgreementTemplates,
  getAgreementTemplate,
  createAgreementTemplate,
  updateAgreementTemplate,
  publishAgreementTemplate,
  reviseAgreementTemplate,
  archiveAgreementTemplate,
  duplicateAgreementTemplate,
} from "@workspace/api-client-react/dashboard";
import type {
  AgreementTemplate,
  AgreementTemplateKind,
  CreateAgreementTemplate,
} from "../../../../lib/api-client-react/src/dashboard/models";
import { useCmsUnsavedChanges } from "../marketing/useCmsUnsavedChanges";
import { message, labels, draft, payload, type Draft } from "./template-draft";
import { TemplateRows } from "./TemplateRows";
export default function TemplateEditor({
  row,
  kind,
  close,
  changed,
  canUseClauses,
  initialValue,
  requireReview = false,
}: {
  row: AgreementTemplate | null;
  kind: AgreementTemplateKind;
  close: () => void;
  changed: (row: AgreementTemplate) => void;
  canUseClauses: boolean;
  initialValue?: Draft;
  requireReview?: boolean;
}) {
  const [value, setValue] = useState(() =>
      structuredClone(initialValue || draft(row)),
    ),
    [baseline] = useState(() => JSON.stringify(initialValue || draft(row))),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [options, setOptions] = useState<AgreementTemplate[]>([]),
    [catalogError, setCatalogError] = useState(""),
    [catalogAttempt, setCatalogAttempt] = useState(0),
    [loading, setLoading] = useState(kind === "package");
  const [reviewed, setReviewed] = useState(false);
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
  useEffect(() => {
    if (kind !== "package") return;
    const controller = new AbortController();
    setLoading(true);
    setCatalogError("");
    void listAgreementTemplates(
      { kind: "all", state: "published" },
      { signal: controller.signal },
    )
      .then((data) => {
        if (!controller.signal.aborted) setOptions(data);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setCatalogError(message(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [kind, catalogAttempt]);
  const editable = !row || row.status === "draft";
  const patch = (change: Partial<Draft>) => {
    setReviewed(false);
    setValue((old) => ({ ...old, ...change }));
  };
  async function run(action: () => Promise<AgreementTemplate>) {
    if (gate.current) return;
    gate.current = true;
    setBusy(true);
    setError("");
    try {
      const saved = await action();
      if (alive.current) changed(saved);
    } catch (error) {
      if (alive.current) setError(message(error));
    } finally {
      gate.current = false;
      if (alive.current) setBusy(false);
    }
  }
  async function save() {
    if (requireReview && !reviewed) return;
    await run(async () => {
      const content = {
        name: value.name,
        description: value.description,
        body: value.body,
        payload: payload(kind, value),
      };
      return row
        ? updateAgreementTemplate(row.id, {
            ...content,
            expectedEditVersion: row.edit_version,
          })
        : createAgreementTemplate({
            ...content,
            kind,
          } as CreateAgreementTemplate);
    });
  }
  return (
    <section className="template-library" aria-label="Template editor">
      <h2>
        {row
          ? `${row.name} · v${row.version}`
          : `Create ${labels[kind]} template`}
      </h2>
      <p>
        {row ? `${row.status} version` : "New draft"}. Published versions stay
        fixed for existing documents.
      </p>
      {error && <p role="alert">{error}</p>}
      {catalogError && (
        <p role="alert">
          {catalogError}{" "}
          <button
            type="button"
            disabled={busy}
            onClick={() => setCatalogAttempt((n) => n + 1)}
          >
            Retry components
          </button>
        </p>
      )}
      {canUseClauses && (
        <a href="/settings/term-libraries">Open term libraries</a>
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void save();
        }}
      >
        <fieldset disabled={busy || !editable}>
          <legend>Template content</legend>
          <label>
            Name
            <input
              required
              maxLength={200}
              value={value.name}
              onChange={(e) => patch({ name: e.target.value })}
            />
          </label>
          <label>
            Description
            <textarea
              aria-label="Description"
              maxLength={2000}
              value={value.description}
              onChange={(e) => patch({ description: e.target.value })}
            />
          </label>
          <label>
            {kind === "msa" ? "Agreement terms" : "Additional notes"}
            <textarea
              aria-label={
                kind === "msa" ? "Agreement terms" : "Additional notes"
              }
              rows={10}
              maxLength={50000}
              value={value.body}
              onChange={(e) => patch({ body: e.target.value })}
            />
          </label>
          <TemplateRows kind={kind} value={value} patch={patch} />
          {kind === "package" && (
            <>
              <p>
                Choose specific published versions. Updating a component later
                does not replace this package’s selection.
              </p>
              {loading && <p role="status">Loading published components…</p>}
              {(
                [
                  ["msaId", "msa"],
                  ["scopeId", "scope"],
                  ["costId", "cost"],
                ] as const
              ).map(([field, type]) => (
                <label key={field}>
                  {labels[type]} version
                  <select
                    aria-label={`${labels[type]} version`}
                    disabled={loading || !!catalogError}
                    value={value.package[field] || ""}
                    onChange={(e) =>
                      patch({
                        package: {
                          ...value.package,
                          [field]: e.target.value || null,
                        },
                      })
                    }
                  >
                    <option value="">Choose a published version</option>
                    {value.package[field] &&
                      !options.some(
                        (row) => row.id === value.package[field],
                      ) && (
                        <option value={value.package[field]!}>
                          Saved version (not currently published)
                        </option>
                      )}
                    {options
                      .filter((row) => row.kind === type)
                      .map((row) => (
                        <option key={row.id} value={row.id}>
                          {row.name} · v{row.version}
                        </option>
                      ))}
                  </select>
                </label>
              ))}
            </>
          )}
        </fieldset>
        {requireReview && (
          <label className="agreement-section-choice">
            <input
              type="checkbox"
              checked={reviewed}
              onChange={(e) => setReviewed(e.target.checked)}
            />
            I reviewed the reusable text, removed client-specific details, and
            checked the default quantities and pricing.
          </label>
        )}
        <div className="template-actions">
          {editable && (
            <button
              type="submit"
              disabled={busy || (requireReview && !reviewed)}
            >
              Save draft
            </button>
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (!dirty || window.confirm("Discard unsaved template changes?"))
                close();
            }}
          >
            Back to templates
          </button>
        </div>
      </form>
      {row && (
        <div className="template-actions">
          {row.status === "draft" && (
            <button
              disabled={busy || dirty}
              onClick={() => {
                if (
                  window.confirm(
                    "Publish this reviewed template version for use in new agreements?",
                  )
                )
                  void run(() =>
                    publishAgreementTemplate(row.id, {
                      expectedEditVersion: row.edit_version,
                    }),
                  );
              }}
            >
              Publish version
            </button>
          )}
          {row.status === "published" && (
            <button
              disabled={busy}
              onClick={() =>
                void run(() =>
                  reviseAgreementTemplate(row.id, {
                    expectedEditVersion: row.edit_version,
                  }),
                )
              }
            >
              Create revision
            </button>
          )}
          <button
            disabled={busy || dirty}
            onClick={() => {
              const name = window.prompt(
                "Name for the new draft copy",
                `${row.name} copy`,
              );
              if (name?.trim())
                void run(() =>
                  duplicateAgreementTemplate(row.id, {
                    name: name.trim(),
                    expectedEditVersion: row.edit_version,
                  }),
                );
            }}
          >
            Duplicate template
          </button>
          {row.status !== "archived" && (
            <button
              disabled={busy || dirty}
              onClick={() => {
                if (
                  window.confirm(
                    "Archive this version? Existing documents retain their saved content.",
                  )
                )
                  void run(() =>
                    archiveAgreementTemplate(row.id, {
                      expectedEditVersion: row.edit_version,
                    }),
                  );
              }}
            >
              Archive version
            </button>
          )}
          {error && (
            <button
              disabled={busy}
              onClick={() => {
                if (
                  !dirty ||
                  window.confirm(
                    "Discard local changes and reload the saved template?",
                  )
                )
                  void run(() => getAgreementTemplate(row.id));
              }}
            >
              Reload saved template
            </button>
          )}
        </div>
      )}
    </section>
  );
}

import { useEffect, useRef, useState } from "react";
import {
  updateAgreementDraft,
  changeAgreementDraftContext,
  getAgreementDraft,
} from "@workspace/api-client-react/dashboard";
import type {
  AgreementDraft,
  AgreementDraftContext,
} from "../../../../lib/api-client-react/src/dashboard/models";
import { costDraft, costPayload, message } from "./template-draft";
import { TemplateRows } from "./TemplateRows";
import { useCmsUnsavedChanges } from "../marketing/useCmsUnsavedChanges";
import AgreementContextFields from "./AgreementContextFields";
import AgreementDraftPreview from "./AgreementDraftPreview";
export default function AgreementDraftEditor({
  row,
  canEdit,
  changed,
}: {
  row: AgreementDraft;
  canEdit: boolean;
  changed: (row: AgreementDraft) => void;
}) {
  const [value, setValue] = useState(() => ({
    title: row.title,
    terms: row.content.terms,
    scope: structuredClone(row.content.scope),
    costs: costDraft(row.content.costs),
    notes: { ...row.content.notes },
    dates: { ...row.dates },
  }));
  const [baseline] = useState(() => JSON.stringify(value));
  const [context, setContext] = useState<AgreementDraftContext | null>(null),
    [contextReady, setContextReady] = useState(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const gate = useRef(false),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const dirty = JSON.stringify(value) !== baseline;
  useCmsUnsavedChanges(
    dirty || Boolean(context),
    "Discard your unsaved agreement changes?",
  );
  const editable = canEdit && row.status === "draft";
  async function run(action: () => Promise<AgreementDraft>) {
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
  return (
    <section className="template-library" aria-label="Client agreement draft">
      <a href="/agreements/drafts">All agreement drafts</a>
      <h2>{row.title}</h2>
      <p>
        {row.status} · version {row.version} · last saved{" "}
        {new Date(row.updated_at).toLocaleString()}
      </p>
      {!editable && <p>This agreement draft is read-only.</p>}
      {error && <p role="alert">{error} Your local edits have been kept.</p>}
      <button
        disabled={busy}
        onClick={() => {
          if (
            (dirty || context) &&
            !window.confirm(
              "Discard local edits and reload the saved agreement draft?",
            )
          )
            return;
          void run(() => getAgreementDraft(row.id));
        }}
      >
        Reload saved draft
      </button>
      <details>
        <summary>Source template versions</summary>
        {row.source_templates.length ? (
          <ul>
            {row.source_templates.map((source) => (
              <li key={source.id}>
                {source.name} · {source.kind} · v{source.version}
              </li>
            ))}
          </ul>
        ) : (
          <p>Started without a template.</p>
        )}
        <p>
          Edits here affect only this draft. Original template versions remain
          unchanged.
        </p>
      </details>
      <section aria-label="Agreement context">
        <h3>Client and property context</h3>
        <p>
          {row.context_snapshot["client.name"] || "No client attached"} ·{" "}
          {row.context_snapshot["property.name"] || "No property attached"}
        </p>
        {row.lead_id && <p>Inquiry: {row.lead_id}</p>}
        {editable && !context && (
          <button
            disabled={busy || dirty}
            onClick={() =>
              setContext({
                clientId: row.client_id,
                propertyId: row.property_id,
                leadId: row.lead_id,
                sourceEstimateId: row.source_estimate_id,
              })
            }
          >
            Change agreement context
          </button>
        )}
        {context && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (contextReady)
                void run(() =>
                  changeAgreementDraftContext(row.id, {
                    expectedVersion: row.version,
                    context,
                  }),
                );
            }}
          >
            <fieldset disabled={busy}>
              <legend>Change attached records</legend>
              <AgreementContextFields
                value={context}
                change={setContext}
                ready={setContextReady}
              />
              <p>
                Saving refreshes the saved client/property placeholders. Terms,
                scope, costs and source versions stay as written.
              </p>
              <button disabled={!contextReady}>Save agreement context</button>
              <button type="button" onClick={() => setContext(null)}>
                Cancel context change
              </button>
            </fieldset>
          </form>
        )}
        {dirty && <p>Save or reload local edits before changing context.</p>}
      </section>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(() =>
            updateAgreementDraft(row.id, {
              expectedVersion: row.version,
              title: value.title,
              dates: value.dates,
              content: {
                terms: value.terms,
                scope: value.scope,
                costs: costPayload(value.costs),
                notes: value.notes,
              },
            }),
          );
        }}
      >
        <fieldset disabled={busy || !editable || Boolean(context)}>
          <legend>Client-specific agreement</legend>
          <label>
            Agreement title
            <input
              required
              maxLength={200}
              value={value.title}
              onChange={(e) => setValue({ ...value, title: e.target.value })}
            />
          </label>
          {(["preparedOn", "startsOn", "endsOn"] as const).map((key, index) => (
            <label key={key}>
              {["Prepared on", "Starts on", "Ends on"][index]}
              <input
                type="date"
                value={value.dates[key] || ""}
                onChange={(e) =>
                  setValue({
                    ...value,
                    dates: { ...value.dates, [key]: e.target.value || null },
                  })
                }
              />
            </label>
          ))}
          <label>
            Agreement terms
            <textarea
              aria-label="Agreement terms"
              rows={12}
              maxLength={50000}
              value={value.terms}
              onChange={(e) => setValue({ ...value, terms: e.target.value })}
            />
          </label>
          <p>
            Supported placeholders:{" "}
            {
              "{{client.name}}, {{client.billing_address}}, {{property.name}}, {{property.address}}, {{agreement.prepared_on}}, {{agreement.starts_on}}, {{agreement.ends_on}}"
            }
            .
          </p>
          <TemplateRows
            kind="scope"
            value={value}
            patch={(patch) => setValue({ ...value, ...patch })}
          />
          <TemplateRows
            kind="cost"
            value={value}
            patch={(patch) => setValue({ ...value, ...patch })}
          />
          {(["scope", "cost", "package"] as const).map((key) => (
            <label key={key}>
              {key === "package"
                ? "Additional agreement notes"
                : `${key === "scope" ? "Scope" : "Cost"} notes`}
              <textarea
                aria-label={`${key} notes`}
                maxLength={50000}
                value={value.notes[key]}
                onChange={(e) =>
                  setValue({
                    ...value,
                    notes: { ...value.notes, [key]: e.target.value },
                  })
                }
              />
            </label>
          ))}
          {editable && (
            <button disabled={!dirty}>
              {busy ? "Saving draft…" : "Save agreement draft"}
            </button>
          )}
        </fieldset>
      </form>
      <AgreementDraftPreview row={row} dirty={dirty} />
    </section>
  );
}

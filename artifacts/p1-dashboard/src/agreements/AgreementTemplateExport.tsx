import { useEffect, useRef, useState } from "react";
import { prepareAgreementTemplateExport } from "@workspace/api-client-react/dashboard";
import type {
  AgreementDraft,
  AgreementTemplateExport as ExportCandidate,
  AgreementScopePayload,
  AgreementCostPayload,
} from "../../../../lib/api-client-react/src/dashboard/models";
import { costDraft, draft, labels, message } from "./template-draft";
import TemplateEditor from "./TemplateEditor";
export default function AgreementTemplateExport({
  row,
  close,
}: {
  row: AgreementDraft;
  close: () => void;
}) {
  const [kind, setKind] = useState<ExportCandidate["kind"]>("msa"),
    [candidate, setCandidate] = useState<ExportCandidate | null>(null),
    [saved, setSaved] = useState(""),
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
  async function prepare() {
    if (gate.current) return;
    gate.current = true;
    setBusy(true);
    setError("");
    try {
      const result = await prepareAgreementTemplateExport(row.id, {
        kind,
        expectedVersion: row.version,
      });
      if (alive.current) setCandidate(result);
    } catch (error) {
      if (alive.current) setError(message(error));
    } finally {
      gate.current = false;
      if (alive.current) setBusy(false);
    }
  }
  if (saved)
    return (
      <section className="template-library">
        <h2>Reusable template draft saved</h2>
        <p role="status">
          {saved} is saved as an unpublished template. The client agreement is
          unchanged.
        </p>
        <a href="/agreements/templates">
          Open template library to review and publish
        </a>
        <button onClick={close}>Return to agreement draft</button>
      </section>
    );
  if (candidate) {
    const initial = {
      ...draft(null),
      name: candidate.name,
      description: candidate.description,
      body: candidate.body,
      ...(candidate.kind === "scope"
        ? { scope: candidate.payload as AgreementScopePayload }
        : {}),
      ...(candidate.kind === "cost"
        ? { costs: costDraft(candidate.payload as AgreementCostPayload) }
        : {}),
    };
    return (
      <section
        className="template-library"
        aria-label="Review reusable template"
      >
        <h2>Review reusable defaults</h2>
        <p>
          Known client details have been replaced with placeholders or review
          markers. Read every section and remove any remaining client-specific
          instructions, names, dates or negotiated terms. Automatic matching
          cannot identify every private detail.
        </p>
        {candidate.kind === "cost" && (
          <p>
            Quantities are reset to 1 and unit prices to $0.00. Set reusable
            defaults before saving.
          </p>
        )}
        <TemplateEditor
          row={null}
          kind={candidate.kind}
          initialValue={initial}
          requireReview
          canUseClauses={false}
          close={close}
          changed={(template) => setSaved(template.name)}
        />
      </section>
    );
  }
  return (
    <section
      className="template-library"
      aria-label="Save agreement as template"
    >
      <h2>Save as new template</h2>
      <p>
        Prepare a reusable MSA, scope or cost breakdown from the saved
        agreement. Review and save it as an unpublished template; publication
        remains a separate action in the template library.
      </p>
      <p>
        After reviewing and publishing the individual components, combine them
        into an agreement package in the template library.
      </p>
      {error && <p role="alert">{error}</p>}
      <label>
        Reusable component
        <select
          aria-label="Reusable component"
          value={kind}
          disabled={busy}
          onChange={(e) => setKind(e.target.value as typeof kind)}
        >
          {(["msa", "scope", "cost"] as const).map((kind) => (
            <option key={kind} value={kind}>
              {labels[kind]}
            </option>
          ))}
        </select>
      </label>
      <button disabled={busy} onClick={() => void prepare()}>
        {busy ? "Preparing reusable draft…" : "Prepare template review"}
      </button>
      <button disabled={busy} onClick={close}>
        Return to agreement draft
      </button>
    </section>
  );
}

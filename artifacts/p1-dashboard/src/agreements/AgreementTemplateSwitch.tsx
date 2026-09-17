import { useEffect, useRef, useState } from "react";
import {
  listAgreementTemplates,
  reviewAgreementDraftTemplates,
  applyAgreementDraftTemplates,
} from "@workspace/api-client-react/dashboard";
import type {
  AgreementDraft,
  AgreementDraftContent,
  AgreementDraftSelection,
  AgreementDraftTemplateReview,
  AgreementTemplate,
  ReviewAgreementDraftTemplates,
} from "../../../../lib/api-client-react/src/dashboard/models";
import { message } from "./template-draft";
import { basisLabels } from "./AgreementDraftPreview";
type Section = ReviewAgreementDraftTemplates["sections"][number];
const names: Record<Section, string> = {
  terms: "Agreement terms",
  scope: "Scope and scope notes",
  costs: "Cost rows and cost notes",
  packageNotes: "Additional agreement notes",
};
const keys = {
  terms: "msaId",
  scope: "scopeId",
  costs: "costId",
  packageNotes: "packageId",
} as const;
const kinds = {
  terms: "msa",
  scope: "scope",
  costs: "cost",
  packageNotes: "package",
} as const;
function ComparisonSection({
  content,
  section,
}: {
  content: AgreementDraftContent;
  section: Section;
}) {
  if (section === "terms")
    return <p className="agreement-text">{content.terms || "Empty"}</p>;
  if (section === "packageNotes")
    return <p className="agreement-text">{content.notes.package || "Empty"}</p>;
  if (section === "scope")
    return (
      <>
        <ul>
          {content.scope.items.map((item) => (
            <li key={item.id}>
              <strong>{item.title}</strong>
              <p className="agreement-text">{item.description}</p>
            </li>
          ))}
        </ul>
        <h5>Exclusions</h5>
        <p className="agreement-text">{content.scope.exclusions || "None"}</p>
        <p className="agreement-text">{content.notes.scope}</p>
      </>
    );
  return (
    <>
      <ul>
        {content.costs.items.map((item) => (
          <li key={item.id}>
            <strong>{item.description}</strong>
            <p>
              {item.quantity} {item.unit} ×{" "}
              {(item.unitPriceCents / 100).toFixed(2)} USD ·{" "}
              {basisLabels[item.basis]}
            </p>
          </li>
        ))}
      </ul>
      <p className="agreement-text">{content.notes.cost}</p>
    </>
  );
}
export default function AgreementTemplateSwitch({
  row,
  changed,
  close,
}: {
  row: AgreementDraft;
  changed: (row: AgreementDraft) => void;
  close: () => void;
}) {
  const [templates, setTemplates] = useState<AgreementTemplate[]>([]),
    [loading, setLoading] = useState(true),
    [catalogError, setCatalogError] = useState(""),
    [attempt, setAttempt] = useState(0);
  const [sections, setSections] = useState<Section[]>([]),
    [selection, setSelection] = useState<AgreementDraftSelection>({}),
    [mode, setMode] = useState("components");
  const [review, setReview] = useState<AgreementDraftTemplateReview | null>(
      null,
    ),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const reviewedRequest = useRef<ReviewAgreementDraftTemplates | null>(null),
    gate = useRef(false),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setCatalogError("");
    void listAgreementTemplates(
      { kind: "all", state: "published" },
      { signal: controller.signal },
    )
      .then((rows) => {
        if (!controller.signal.aborted) setTemplates(rows);
      })
      .catch((error) => {
        if (!controller.signal.aborted) setCatalogError(message(error));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [attempt]);
  function invalidate() {
    setReview(null);
    reviewedRequest.current = null;
    setError("");
  }
  async function compare() {
    if (gate.current) return;
    gate.current = true;
    setBusy(true);
    invalidate();
    const request = { expectedVersion: row.version, selection, sections };
    try {
      const result = await reviewAgreementDraftTemplates(row.id, request);
      if (alive.current) {
        setReview(result);
        reviewedRequest.current = request;
      }
    } catch (error) {
      if (alive.current) setError(message(error));
    } finally {
      gate.current = false;
      if (alive.current) setBusy(false);
    }
  }
  async function apply() {
    if (gate.current || !review || !reviewedRequest.current) return;
    if (
      !window.confirm(
        "Replace only the reviewed sections in this client draft? Client-specific edits in those sections will be replaced.",
      )
    )
      return;
    gate.current = true;
    setBusy(true);
    setError("");
    try {
      const saved = await applyAgreementDraftTemplates(row.id, {
        ...reviewedRequest.current,
        reviewToken: review.reviewToken,
      });
      if (alive.current) changed(saved);
    } catch (error) {
      if (alive.current) {
        setError(
          message(error) +
            " Reload the saved draft after an uncertain response, or compare again before applying.",
        );
        setReview(null);
        reviewedRequest.current = null;
      }
    } finally {
      gate.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return (
    <section
      className="template-library"
      aria-label="Replace agreement templates"
    >
      <h3>Compare template replacement</h3>
      <p>
        Only checked sections will be replaced. Other client-specific work stays
        unchanged. Scope and cost notes travel with their corresponding rows.
      </p>
      {error && <p role="alert">{error}</p>}
      {catalogError && <p role="alert">{catalogError}</p>}
      <button
        disabled={busy}
        onClick={() => {
          invalidate();
          setAttempt((n) => n + 1);
        }}
      >
        Refresh replacement templates
      </button>
      <fieldset disabled={busy || loading || Boolean(catalogError)}>
        <legend>Replacement sources</legend>
        <label>
          Source selection
          <select
            aria-label="Replacement source selection"
            value={mode}
            onChange={(e) => {
              setMode(e.target.value);
              setSelection({});
              setSections([]);
              invalidate();
            }}
          >
            <option value="components">Individual templates</option>
            <option value="package">Agreement package</option>
          </select>
        </label>
        {mode === "package" && (
          <label>
            Package
            <select
              aria-label="Replacement package"
              value={selection.packageId || ""}
              onChange={(e) => {
                setSelection({ packageId: e.target.value || null });
                invalidate();
              }}
            >
              <option value="">Choose a published package</option>
              {templates
                .filter((t) => t.kind === "package")
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name} · v{t.version}
                  </option>
                ))}
            </select>
          </label>
        )}
        {(Object.keys(names) as Section[])
          .filter((section) => mode === "package" || section !== "packageNotes")
          .map((section) => (
            <div key={section}>
              <label className="agreement-section-choice">
                <input
                  type="checkbox"
                  checked={sections.includes(section)}
                  onChange={(e) => {
                    setSections((current) =>
                      e.target.checked
                        ? [...current, section]
                        : current.filter((value) => value !== section),
                    );
                    if (!e.target.checked && mode === "components")
                      setSelection((current) => ({
                        ...current,
                        [keys[section]]: null,
                      }));
                    invalidate();
                  }}
                />
                {names[section]}
              </label>
              {mode === "components" && sections.includes(section) && (
                <label>
                  {names[section]} template
                  <select
                    aria-label={`${names[section]} replacement`}
                    value={selection[keys[section]] || ""}
                    onChange={(e) => {
                      setSelection({
                        ...selection,
                        [keys[section]]: e.target.value || null,
                      });
                      invalidate();
                    }}
                  >
                    <option value="">Choose a published template</option>
                    {templates
                      .filter((t) => t.kind === kinds[section])
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} · v{t.version}
                        </option>
                      ))}
                  </select>
                </label>
              )}
            </div>
          ))}
        <button
          type="button"
          disabled={
            !sections.length ||
            (mode === "package"
              ? !selection.packageId
              : sections.some((section) => !selection[keys[section]]))
          }
          onClick={() => void compare()}
        >
          Compare replacement
        </button>
      </fieldset>
      {review && (
        <div aria-label="Template replacement comparison">
          <h3>Current draft and proposed replacement</h3>
          <p>
            Template text is shown before placeholder substitution. Review the
            full sections below; applying replaces their content, including
            local edits.
          </p>
          {review.sections.map((section) => (
            <section key={section}>
              <h4>{names[section]}</h4>
              <div className="agreement-comparison">
                <article>
                  <h5>Current draft</h5>
                  <ComparisonSection
                    content={review.before}
                    section={section}
                  />
                </article>
                <article>
                  <h5>Proposed replacement</h5>
                  <ComparisonSection content={review.after} section={section} />
                </article>
              </div>
            </section>
          ))}
          {review.preview.unresolvedPlaceholders.length > 0 && (
            <p>
              Unresolved after replacement:{" "}
              {review.preview.unresolvedPlaceholders.join(", ")}
            </p>
          )}
          <button disabled={busy} onClick={() => void apply()}>
            Apply reviewed replacement
          </button>
        </div>
      )}
      <button disabled={busy} onClick={close}>
        Cancel template replacement
      </button>
    </section>
  );
}

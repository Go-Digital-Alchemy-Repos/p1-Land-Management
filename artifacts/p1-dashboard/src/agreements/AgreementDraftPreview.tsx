import type { AgreementDraft } from "../../../../lib/api-client-react/src/dashboard/models";
const dollars = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );
export const basisLabels = {
  one_time: "One-time",
  fixed_monthly: "Fixed monthly",
  per_visit: "Per visit",
};
export default function AgreementDraftPreview({
  row,
  dirty,
}: {
  row: AgreementDraft;
  dirty: boolean;
}) {
  const { content, unresolvedPlaceholders, totalsByBasis } = row.preview;
  return (
    <section className="agreement-preview" aria-label="Saved agreement preview">
      <h2>Saved draft preview · version {row.version}</h2>
      <p role="status">
        {dirty
          ? "Unsaved changes are not shown here. Save the draft to update this preview."
          : "This is a private draft. It has not been sent to the client."}
      </p>
      {unresolvedPlaceholders.length > 0 && (
        <div role="note">
          <h3>Unresolved placeholders</h3>
          <p>
            Complete the agreement context or edit these placeholders before
            preparing a proposal.
          </p>
          <ul>
            {unresolvedPlaceholders.map((token) => (
              <li key={token}>
                <code>{`{{${token}}}`}</code>
              </li>
            ))}
          </ul>
        </div>
      )}
      <h3>{row.title}</h3>
      <p>
        {row.context_snapshot["client.name"] || "Client not attached"} ·{" "}
        {row.context_snapshot["property.name"] || "Property not attached"}
      </p>
      <dl>
        {(["preparedOn", "startsOn", "endsOn"] as const).map((key, index) => (
          <div key={key}>
            <dt>{["Prepared on", "Starts on", "Ends on"][index]}</dt>
            <dd>{row.dates[key] || "Not set"}</dd>
          </div>
        ))}
      </dl>
      <h3>Agreement terms</h3>
      <p className="agreement-text">{content.terms || "No terms yet."}</p>
      <h3>Scope</h3>
      {content.scope.items.map((item) => (
        <article key={item.id}>
          <h4>{item.title}</h4>
          <p className="agreement-text">{item.description}</p>
        </article>
      ))}
      {content.scope.exclusions && (
        <>
          <h4>Exclusions</h4>
          <p className="agreement-text">{content.scope.exclusions}</p>
        </>
      )}
      {content.notes.scope && (
        <p className="agreement-text">{content.notes.scope}</p>
      )}
      <h3>Cost breakdown</h3>
      {content.costs.items.map((item) => (
        <article key={item.id}>
          <h4>{item.description}</h4>
          <p>
            {item.quantity} {item.unit} × {dollars(item.unitPriceCents)} ={" "}
            {dollars(item.totalCents)} · {basisLabels[item.basis]}
          </p>
        </article>
      ))}
      <dl>
        {Object.entries(totalsByBasis).map(([key, value]) => (
          <div key={key}>
            <dt>{basisLabels[key as keyof typeof basisLabels]}</dt>
            <dd>{dollars(value)}</dd>
          </div>
        ))}
      </dl>
      <p>
        Each billing basis is separate. Per-visit totals depend on the number of
        visits; no combined contract total is implied.
      </p>
      {content.notes.cost && (
        <p className="agreement-text">{content.notes.cost}</p>
      )}
      {content.notes.package && (
        <>
          <h3>Additional agreement notes</h3>
          <p className="agreement-text">{content.notes.package}</p>
        </>
      )}
    </section>
  );
}

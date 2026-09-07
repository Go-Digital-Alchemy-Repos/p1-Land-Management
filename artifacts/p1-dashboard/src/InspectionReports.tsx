type Finding = {
  label?: string;
  condition?: string;
  note?: string;
};
type Inspection = {
  id: string;
  property_name?: string;
  title: string;
  findings: Finding[] | unknown;
  published: boolean;
  created_at: string;
};

export function InspectionReports({
  inspections,
  canPublish,
  onPublish,
}: {
  inspections: Inspection[];
  canPublish: boolean;
  onPublish: (id: string) => void;
}) {
  return (
    <section className="panel inspection-reports" aria-label="Inspection reports">
      <div className="panel-heading">
        <div>
          <h2>Inspection reports</h2>
          <p>
            {canPublish
              ? "Review observations before publishing a client-visible report."
              : "Published property observations and recommended follow-up."}
          </p>
        </div>
      </div>
      {!inspections.length && (
        <p className="muted">
          {canPublish
            ? "No inspections have been recorded."
            : "No inspection reports have been published for your properties."}
        </p>
      )}
      <div className="inspection-report-list">
        {inspections.map((inspection) => {
          const findings = Array.isArray(inspection.findings)
            ? inspection.findings
            : [];
          return (
            <article key={inspection.id} className="inspection-report">
              <div className="panel-heading">
                <div>
                  <h3>{inspection.title}</h3>
                  <p>
                    {inspection.property_name || "Property"} · {new Date(inspection.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className="badge">
                  {inspection.published ? "Published" : "Private review"}
                </span>
              </div>
              {!findings.length && <p>No observations were recorded.</p>}
              {findings.map((finding, index) => (
                <section key={index} className="inspection-finding">
                  <strong>{finding.label || "Observation"}</strong>
                  {finding.condition && (
                    <span>{finding.condition.replaceAll("_", " ")}</span>
                  )}
                  {finding.note && <p>{finding.note}</p>}
                </section>
              ))}
              {canPublish && !inspection.published && (
                <button className="primary" onClick={() => onPublish(inspection.id)}>
                  Review and publish report
                </button>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}

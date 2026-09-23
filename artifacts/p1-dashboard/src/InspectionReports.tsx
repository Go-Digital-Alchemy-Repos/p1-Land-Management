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
  onPublish: (id: string) => Promise<void>;
}) {
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const publishing = useRef(false);
  async function publish(id: string) {
    if (publishing.current) return;
    publishing.current = true;
    setBusyId(id);
    setError("");
    try {
      await onPublish(id);
      setReviewId(null);
    } catch (cause) {
      setError((cause as Error).message);
    } finally {
      publishing.current = false;
      setBusyId(null);
    }
  }
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
              {canPublish && !inspection.published && (reviewId === inspection.id ?
                <div className="phase-form" role="group" aria-label={`Publish review for ${inspection.title}`}>
                  <p>These {findings.length} observations will become visible to the client. Review the details above before publishing.</p>
                  {error && <p role="alert" className="error">{error}</p>}
                  <button type="button" className="secondary" disabled={Boolean(busyId)} onClick={() => { setReviewId(null); setError(""); }}>Cancel</button>
                  <button type="button" className="primary" disabled={Boolean(busyId)} onClick={() => void publish(inspection.id)}>{busyId === inspection.id ? "Publishing…" : "Publish report to client"}</button>
                </div> :
                <button className="primary" onClick={() => { setReviewId(inspection.id); setError(""); }}>
                  Review report
                </button>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
import { useRef, useState } from "react";

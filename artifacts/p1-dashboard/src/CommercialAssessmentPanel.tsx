import { useEffect, useRef, useState } from "react";
import {
  archiveCommercialAssessmentBaseline,
  createCommercialAssessmentBaseline,
  getCommercialAssessmentBaseline,
  listCommercialAssessmentBaselines,
  reviewCommercialAssessmentBaseline,
  updateCommercialAssessmentBaseline,
} from "@workspace/api-client-react/dashboard";
import "./commercial-assessment.css";

type Priority = "low" | "medium" | "high";
type Category = typeof categories[number][0];
type Finding = { category: Category; conditionLabel: string | null; observation: string; priority: Priority | null };
type Recommendation = { findingIndex: number | null; recommendation: string; priority: Priority | null };
type Summary = Awaited<ReturnType<typeof listCommercialAssessmentBaselines>>[number];
type Detail = Awaited<ReturnType<typeof getCommercialAssessmentBaseline>>;
type AssessmentApi = {
  list: typeof listCommercialAssessmentBaselines;
  create: typeof createCommercialAssessmentBaseline;
  get: typeof getCommercialAssessmentBaseline;
  update: typeof updateCommercialAssessmentBaseline;
  review: typeof reviewCommercialAssessmentBaseline;
  archive: typeof archiveCommercialAssessmentBaseline;
};
const defaultApi: AssessmentApi = {
  list: listCommercialAssessmentBaselines,
  create: createCommercialAssessmentBaseline,
  get: getCommercialAssessmentBaseline,
  update: updateCommercialAssessmentBaseline,
  review: reviewCommercialAssessmentBaseline,
  archive: archiveCommercialAssessmentBaseline,
};
const categories = [
  ["grounds_vegetation", "Grounds & vegetation"], ["stormwater_drainage", "Stormwater & drainage"],
  ["grading_erosion", "Grading & erosion"], ["tree_land", "Tree & land management"],
  ["roads_access", "Roads & access"], ["emergency_corrective", "Emergency & corrective response"],
  ["recurring_site_management", "Recurring site management"], ["other", "Other"],
] as const;
const emptyFinding = (): Finding => ({ category: "grounds_vegetation", conditionLabel: null, observation: "", priority: null });
const emptyRecommendation = (): Recommendation => ({ findingIndex: null, recommendation: "", priority: null });
function toDraft(detail: Detail) {
  const indexByFindingId = new Map(detail.findings.map((finding, index) => [finding.id, index]));
  return {
    title: detail.title,
    scopeNote: detail.scope_note || "",
    findings: detail.findings.map(({ category, conditionLabel, observation, priority }) => ({ category: category as Category, conditionLabel: conditionLabel || null, observation, priority: priority as Priority | null || null })),
    recommendations: detail.recommendations.map((item) => ({ findingIndex: item.finding_id ? (indexByFindingId.get(item.finding_id) ?? null) : null, recommendation: item.recommendation, priority: item.priority as Priority | null || null })),
  };
}
export function CommercialAssessmentPanel({ leadId, leadVersion, disabled, onLeadMutationAck, api = defaultApi }: { leadId: string; leadVersion: number; disabled: boolean; onLeadMutationAck: (ack: { expectedVersion: number; newVersion: number }) => void; api?: AssessmentApi }) {
  const [items, setItems] = useState<Summary[]>([]), [selected, setSelected] = useState<Detail | null>(null);
  const [title, setTitle] = useState("Commercial site assessment"), [scopeNote, setScopeNote] = useState("");
  const [findings, setFindings] = useState<Finding[]>([]), [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false), [saving, setSaving] = useState(false), [error, setError] = useState("");
  const [archiveOpen, setArchiveOpen] = useState(false), [archiveReason, setArchiveReason] = useState("");
  const requestGeneration = useRef(0);
  const active = items.find((item) => item.status !== "archived");
  async function loadList() {
    const current = ++requestGeneration.current; setLoading(true); setError("");
    try { const next = await api.list(leadId); if (current === requestGeneration.current) setItems(next); }
    catch (e) { if (current === requestGeneration.current) setError((e as Error).message); }
    finally { if (current === requestGeneration.current) setLoading(false); }
  }
  async function select(assessmentId: string) {
    const current = ++requestGeneration.current; setLoading(true); setError("");
    try {
      const detail = await api.get(leadId, assessmentId);
      if (current === requestGeneration.current) { setSelected(detail); setArchiveOpen(false); setArchiveReason(""); const draft = toDraft(detail); setTitle(draft.title); setScopeNote(draft.scopeNote); setFindings(draft.findings); setRecommendations(draft.recommendations); }
    } catch (e) { if (current === requestGeneration.current) setError((e as Error).message); }
    finally { if (current === requestGeneration.current) setLoading(false); }
  }
  useEffect(() => { void loadList(); return () => { requestGeneration.current++; }; }, [leadId, api]);
  async function create() {
    setSaving(true); setError("");
    try {
      const receipt = await api.create(leadId, { operationId: crypto.randomUUID(), expectedLeadVersion: leadVersion, title, scopeNote: scopeNote.trim() || null });
      onLeadMutationAck({ expectedVersion: leadVersion, newVersion: receipt.leadVersion });
      await select(receipt.assessmentId); await loadList();
    } catch (e) { setError((e as Error).message); } finally { setSaving(false); }
  }
  async function save() {
    if (!selected) return; setSaving(true); setError("");
    try {
      const detail = await api.update(leadId, selected.id, { expectedVersion: selected.version, title, scopeNote: scopeNote.trim() || null, findings: findings.filter((item) => item.observation.trim()), recommendations: recommendations.filter((item) => item.recommendation.trim()) });
      setSelected(detail); setItems((current) => current.map((item) => item.id === detail.id ? { ...item, title: detail.title, version: detail.version, status: detail.status } : item));
    } catch (e) { setError((e as Error).message); } finally { setSaving(false); }
  }
  async function review() {
    if (!selected) return; setSaving(true); setError("");
    try { const detail = await api.review(leadId, selected.id, { expectedVersion: selected.version }); setSelected(detail); await loadList(); }
    catch (e) { setError((e as Error).message); } finally { setSaving(false); }
  }
  async function archive() {
    if (!selected || !archiveReason.trim()) return;
    setSaving(true); setError("");
    try {
      await api.archive(leadId, selected.id, { expectedVersion: selected.version, reason: archiveReason.trim() });
      setSelected(null); setTitle("Commercial site assessment"); setScopeNote(""); setFindings([]); setRecommendations([]); setArchiveOpen(false); setArchiveReason("");
      await loadList();
    }
    catch (e) { setError((e as Error).message); } finally { setSaving(false); }
  }
  const locked = disabled || saving || loading || selected?.status !== "draft";
  return <section className="commercial-assessment" aria-label="Commercial site assessment baseline">
    <div className="panel-heading"><h3>Commercial site assessment</h3><button type="button" disabled={loading || saving} onClick={() => void loadList()}>Refresh assessments</button></div>
    <p>Document the discovery baseline before a proposal or operational handoff. Review records are locked snapshots.</p>
    {error && <p className="error" role="alert">{error}</p>}
    {loading && <p role="status">Loading assessments…</p>}
    <div className="assessment-list" aria-label="Assessment baselines">
      {items.map((item) => <button type="button" key={item.id} aria-pressed={selected?.id === item.id} disabled={loading || saving} onClick={() => void select(item.id)}><strong>{item.title}</strong><small>{item.status} · version {item.version}</small></button>)}
    </div>
    {!active && !selected && <div className="assessment-create"><label>Assessment title<input value={title} maxLength={200} onChange={(event) => setTitle(event.target.value)} disabled={disabled || saving} /></label><label>Initial scope note<textarea value={scopeNote} maxLength={4000} onChange={(event) => setScopeNote(event.target.value)} disabled={disabled || saving} /></label><button type="button" className="primary" disabled={disabled || saving || !title.trim()} onClick={() => void create()}>{saving ? "Creating…" : "Create assessment baseline"}</button></div>}
    {selected && <div className="assessment-editor">
      <label>Assessment title<input value={title} maxLength={200} disabled={locked} onChange={(event) => setTitle(event.target.value)} /></label>
      <label>Scope note<textarea value={scopeNote} maxLength={4000} disabled={locked} onChange={(event) => setScopeNote(event.target.value)} /></label>
      <h4>Findings</h4>
      {findings.map((finding, index) => <fieldset key={index} disabled={locked}><legend>Finding {index + 1}</legend><label>Category<select value={finding.category} onChange={(event) => setFindings((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, category: event.target.value as Category } : item))}>{categories.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label>Condition <input value={finding.conditionLabel || ""} maxLength={200} onChange={(event) => setFindings((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, conditionLabel: event.target.value || null } : item))} /></label><label>Observation<textarea value={finding.observation} maxLength={4000} onChange={(event) => setFindings((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, observation: event.target.value } : item))} /></label><label>Priority<select value={finding.priority || ""} onChange={(event) => setFindings((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, priority: (event.target.value || null) as Priority | null } : item))}><option value="">Not assigned</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label><button type="button" onClick={() => setFindings((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Remove finding</button></fieldset>)}
      {selected.status === "draft" && <button type="button" disabled={locked} onClick={() => setFindings((current) => [...current, emptyFinding()])}>Add finding</button>}
      <h4>Recommended actions</h4>
      {recommendations.map((item, index) => <fieldset key={index} disabled={locked}><legend>Recommendation {index + 1}</legend><label>Related finding<select value={item.findingIndex ?? ""} onChange={(event) => setRecommendations((current) => current.map((value, itemIndex) => itemIndex === index ? { ...value, findingIndex: event.target.value === "" ? null : Number(event.target.value) } : value))}><option value="">General recommendation</option>{findings.map((finding, findingIndex) => <option key={findingIndex} value={findingIndex}>Finding {findingIndex + 1}: {finding.observation.slice(0, 60) || "Untitled"}</option>)}</select></label><label>Recommendation<textarea value={item.recommendation} maxLength={4000} onChange={(event) => setRecommendations((current) => current.map((value, itemIndex) => itemIndex === index ? { ...value, recommendation: event.target.value } : value))} /></label><label>Priority<select value={item.priority || ""} onChange={(event) => setRecommendations((current) => current.map((value, itemIndex) => itemIndex === index ? { ...value, priority: (event.target.value || null) as Priority | null } : value))}><option value="">Not assigned</option><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label><button type="button" onClick={() => setRecommendations((current) => current.filter((_, itemIndex) => itemIndex !== index))}>Remove recommendation</button></fieldset>)}
      {selected.status === "draft" && <button type="button" disabled={locked} onClick={() => setRecommendations((current) => [...current, emptyRecommendation()])}>Add recommendation</button>}
      <div className="assessment-actions">{selected.status === "draft" && <><button type="button" className="primary" disabled={locked || !title.trim()} onClick={() => void save()}>{saving ? "Saving…" : "Save draft"}</button><button type="button" disabled={locked} onClick={() => void review()}>Mark reviewed and lock snapshot</button></>}{selected.status !== "archived" && <button type="button" disabled={disabled || saving} onClick={() => { setArchiveOpen(true); setArchiveReason(""); }}>Archive assessment</button>}</div>
      {archiveOpen && selected.status !== "archived" && <form className="assessment-archive" onSubmit={(event) => { event.preventDefault(); void archive(); }}>
        <p>Archiving preserves this private record and any reviewed snapshot. It does not create a proposal, booking, or work order.</p>
        <label>Archive reason<textarea value={archiveReason} maxLength={2000} required disabled={disabled || saving} onChange={(event) => setArchiveReason(event.target.value)} /></label>
        <div><button type="submit" disabled={disabled || saving || !archiveReason.trim()}>{saving ? "Archiving…" : "Confirm archive"}</button><button type="button" disabled={saving} onClick={() => { setArchiveOpen(false); setArchiveReason(""); }}>Cancel</button></div>
      </form>}
      {selected.reviews.length > 0 && <p>Reviewed snapshot: version {selected.reviews[0].assessment_version} on {new Date(selected.reviews[0].created_at).toLocaleString()}.</p>}
    </div>}
  </section>;
}

import { useEffect, useMemo, useState } from "react";

type Template = { id: string; name: string; version: number; body: string };
type Client = { id: string; name: string };
type Property = { id: string; client_id: string; name: string };
type Line = { id: string; description: string; unit: string | null; quantity: number; unitPriceCents: number };
type Draft = { id: string; clientId: string; clientName: string; propertyId: string | null; propertyName: string | null; templateId: string; templateName: string; templateVersion: number; title: string; body: string; version: number; status: "draft" | "archived"; lineItems: Line[] };
const money = (cents: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);
async function request(path: string, init?: RequestInit) {
  const response = await fetch(`/api/v1${path}`, { credentials: "same-origin", headers: init?.body ? { "content-type": "application/json" } : undefined, ...init });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw Error(body.error || body.message || `Request failed (${response.status})`);
  return body;
}

export function AgreementComposer({ role }: { role: string }) {
  const canManageTemplates = ["owner", "manager"].includes(role);
  const [templates, setTemplates] = useState<Template[]>([]), [clients, setClients] = useState<Client[]>([]), [properties, setProperties] = useState<Property[]>([]), [drafts, setDrafts] = useState<Draft[]>([]);
  const [selected, setSelected] = useState<Draft | null>(null), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const [templateId, setTemplateId] = useState(""), [clientId, setClientId] = useState(""), [propertyId, setPropertyId] = useState(""), [title, setTitle] = useState("");
  const [templateEditor, setTemplateEditor] = useState({ id: "", body: "" });
  const [line, setLine] = useState({ description: "", unit: "", quantity: "1", price: "" });
  const load = async () => {
    setBusy(true); setError("");
    try {
      const [nextTemplates, nextClients, nextProperties, nextDrafts] = await Promise.all([
        request("/agreement-templates"), request("/clients"), request("/properties"), request("/agreement-drafts"),
      ]);
      setTemplates(nextTemplates); setClients(nextClients); setProperties(nextProperties); setDrafts(nextDrafts);
      setTemplateId((value) => value || nextTemplates[0]?.id || "");
      setTemplateEditor((current) => current.id ? current : { id: nextTemplates[0]?.id || "", body: nextTemplates[0]?.body || "" });
      setClientId((value) => value || nextClients[0]?.id || "");
      setSelected((current) => current ? nextDrafts.find((draft: Draft) => draft.id === current.id) || null : nextDrafts[0] || null);
    } catch (cause) { setError((cause as Error).message); } finally { setBusy(false); }
  };
  useEffect(() => { void load(); }, []);
  const clientProperties = useMemo(() => properties.filter((property) => property.client_id === clientId), [properties, clientId]);
  const saveSelected = async (changes: Record<string, unknown>) => {
    if (!selected) return;
    setBusy(true); setError("");
    try {
      const saved = await request(`/agreement-drafts/${selected.id}`, { method: "PATCH", body: JSON.stringify({ expectedVersion: selected.version, ...changes }) });
      setSelected(saved); setDrafts((all) => all.map((draft) => draft.id === saved.id ? saved : draft));
    } catch (cause) { setError((cause as Error).message); } finally { setBusy(false); }
  };
  const createDraft = async (event: React.FormEvent) => {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const created = await request("/agreement-drafts", { method: "POST", body: JSON.stringify({ templateId, clientId, ...(propertyId ? { propertyId } : {}), ...(title.trim() ? { title: title.trim() } : {}) }) });
      setDrafts((all) => [created, ...all]); setSelected(created); setTitle("");
    } catch (cause) { setError((cause as Error).message); } finally { setBusy(false); }
  };
  const addLine = async (event: React.FormEvent) => {
    event.preventDefault(); if (!selected) return;
    setBusy(true); setError("");
    try {
      const price = Math.round(Number(line.price) * 100);
      if (!Number.isFinite(price) || price < 0) throw Error("Enter a valid unit price.");
      const saved = await request(`/agreement-drafts/${selected.id}/line-items`, { method: "POST", body: JSON.stringify({ expectedVersion: selected.version, description: line.description, ...(line.unit.trim() ? { unit: line.unit.trim() } : {}), quantity: Number(line.quantity), unitPriceCents: price }) });
      setSelected(saved); setDrafts((all) => all.map((draft) => draft.id === saved.id ? saved : draft)); setLine({ description: "", unit: "", quantity: "1", price: "" });
    } catch (cause) { setError((cause as Error).message); } finally { setBusy(false); }
  };
  const removeLine = async (lineId: string) => {
    if (!selected) return; setBusy(true); setError("");
    try {
      const saved = await request(`/agreement-drafts/${selected.id}/line-items/${lineId}`, { method: "DELETE", body: JSON.stringify({ expectedVersion: selected.version }) });
      setSelected(saved); setDrafts((all) => all.map((draft) => draft.id === saved.id ? saved : draft));
    } catch (cause) { setError((cause as Error).message); } finally { setBusy(false); }
  };
  const install = async (slug: string) => {
    setBusy(true); setError("");
    try { await request(`/agreement-template-sources/${slug}/install`, { method: "POST" }); await load(); } catch (cause) { setError((cause as Error).message); } finally { setBusy(false); }
  };
  const saveTemplateRevision = async () => {
    if (!templateEditor.id) return;
    setBusy(true); setError("");
    try { await request(`/agreement-templates/${templateEditor.id}/revise`, { method: "POST", body: JSON.stringify({ body: templateEditor.body }) }); setTemplateEditor({ id: "", body: "" }); await load(); } catch (cause) { setError((cause as Error).message); } finally { setBusy(false); }
  };
  return <section className="agreement-composer" aria-label="Agreement templates and client drafts">
    <div className="panel-heading"><div><h2>Agreement templates & drafts</h2><p>Start from a reusable MSA, customize a private client draft, and add each work-order line separately. Saving here never schedules work or creates a bill.</p></div><button disabled={busy} onClick={() => void load()}>Refresh</button></div>
    {error && <p className="error" role="alert">{error}</p>}
    {canManageTemplates && <section className="agreement-composer-card"><h3>Standard templates</h3><p>Install the owner-supplied templates into this dashboard once. Revisions create a new version and never rewrite existing client drafts.</p><div className="agreement-actions"><button disabled={busy} onClick={() => void install("master-services-agreement")}>Install Master Services Agreement</button><button disabled={busy} onClick={() => void install("standard-snow-ice-removal")}>Install Standard Snow & Ice Removal</button></div>{templates.length > 0 && <><label>Template to revise<select value={templateEditor.id} onChange={(event) => { const next = templates.find((template) => template.id === event.target.value); setTemplateEditor({ id: event.target.value, body: next?.body || "" }); }}><option value="">Choose a template</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.name} · v{template.version}</option>)}</select></label><label>Template terms<textarea value={templateEditor.body} onChange={(event) => setTemplateEditor({ ...templateEditor, body: event.target.value })} /></label><button disabled={busy || !templateEditor.id || !templateEditor.body.trim()} onClick={() => void saveTemplateRevision()}>Save new template revision</button></>}</section>}
    <div className="agreement-composer-grid"><section className="agreement-composer-card"><h3>New client agreement</h3><form onSubmit={createDraft}><label>Template<select required value={templateId} onChange={(event) => setTemplateId(event.target.value)}><option value="">Choose a template</option>{templates.map((template) => <option key={template.id} value={template.id}>{template.name} · v{template.version}</option>)}</select></label><label>Client account<select required value={clientId} onChange={(event) => { setClientId(event.target.value); setPropertyId(""); }}><option value="">Choose a client</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}</select></label><label>Property <span className="muted">optional</span><select value={propertyId} onChange={(event) => setPropertyId(event.target.value)}><option value="">All client properties / set later</option>{clientProperties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}</select></label><label>Draft title <span className="muted">optional</span><input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Defaults to template and client" /></label><button className="primary" disabled={busy || !templateId || !clientId}>Create editable draft</button></form></section>
      <section className="agreement-composer-card"><h3>Client agreement drafts</h3>{drafts.length ? <div className="agreement-composer-list">{drafts.map((draft) => <button key={draft.id} aria-pressed={selected?.id === draft.id} onClick={() => setSelected(draft)}><strong>{draft.title}</strong><span>{draft.clientName}{draft.propertyName ? ` · ${draft.propertyName}` : ""}</span><small>{draft.templateName} · v{draft.version} · {draft.lineItems.length} line {draft.lineItems.length === 1 ? "item" : "items"}</small></button>)}</div> : <p className="muted">No client agreement drafts yet.</p>}</section></div>
    {selected && <section className="agreement-composer-card agreement-composer-editor"><div className="panel-heading"><div><h3>{selected.title}</h3><p>{selected.clientName}{selected.propertyName ? ` · ${selected.propertyName}` : ""} · Template snapshot: {selected.templateName} v{selected.templateVersion}</p></div><span className="muted">Draft v{selected.version}</span></div><label>Agreement title<input disabled={busy || selected.status !== "draft"} value={selected.title} onChange={(event) => setSelected({ ...selected, title: event.target.value })} onBlur={() => void saveSelected({ title: selected.title })} /></label><label>Editable agreement terms<textarea disabled={busy || selected.status !== "draft"} value={selected.body} onChange={(event) => setSelected({ ...selected, body: event.target.value })} onBlur={() => void saveSelected({ body: selected.body })} /></label><h4>Work-order line items</h4><table><thead><tr><th>Description</th><th>Qty</th><th>Unit</th><th>Unit price</th><th>Total</th><th /></tr></thead><tbody>{selected.lineItems.map((item) => <tr key={item.id}><td>{item.description}</td><td>{item.quantity}</td><td>{item.unit || "—"}</td><td>{money(item.unitPriceCents)}</td><td>{money(Math.round(item.quantity * item.unitPriceCents))}</td><td><button disabled={busy || selected.status !== "draft"} onClick={() => void removeLine(item.id)}>Remove</button></td></tr>)}{!selected.lineItems.length && <tr><td colSpan={6} className="muted">Add services, materials, labor, or a work order one line at a time.</td></tr>}</tbody></table>{selected.status === "draft" && <form className="agreement-line-form" onSubmit={addLine}><label>Description<input required value={line.description} onChange={(event) => setLine({ ...line, description: event.target.value })} /></label><label>Quantity<input required type="number" min="0.01" step="0.01" value={line.quantity} onChange={(event) => setLine({ ...line, quantity: event.target.value })} /></label><label>Unit<input value={line.unit} onChange={(event) => setLine({ ...line, unit: event.target.value })} placeholder="visit, hour, month" /></label><label>Unit price (USD)<input required inputMode="decimal" value={line.price} onChange={(event) => setLine({ ...line, price: event.target.value })} /></label><button className="primary" disabled={busy}>Add line item</button></form>}</section>}
  </section>;
}

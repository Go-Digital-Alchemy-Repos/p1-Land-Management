import { useEffect, useState, type CSSProperties, type FormEvent, type ReactNode } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  ClipboardList,
  FileText,
  MapPin,
  MessageSquare,
  Plus,
  Users,
} from "lucide-react";
import { ClientContacts } from "./ClientContacts";
import type { ClientWorkspaceTab, PropertyWorkspaceTab } from "./dashboard-routes";
import { motifForWorkspace } from "./motifs";
import { ContactDetails } from "./contact-links";
import { RichTextEditor } from "./RichTextEditor";

type Request = (path: string, body?: unknown) => Promise<any>;
type WorkspaceProps = {
  id: string;
  tab: ClientWorkspaceTab;
  request: Request;
  onTab: (tab: ClientWorkspaceTab) => void;
  onProperty: (id: string) => void;
};

const clientTabs: { id: ClientWorkspaceTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "properties", label: "Properties" },
  { id: "contacts", label: "Contacts" },
  { id: "agreements", label: "Agreements" },
  { id: "schedule", label: "Schedule" },
  { id: "requests", label: "Requests" },
  { id: "projects", label: "Projects" },
  { id: "notes", label: "Internal notes" },
];

const propertyTabs: { id: PropertyWorkspaceTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "schedule", label: "Schedule" },
  { id: "agreements", label: "Agreements" },
  { id: "requests", label: "Requests" },
  { id: "projects", label: "Projects" },
  { id: "inspections", label: "Inspections" },
  { id: "notes-files", label: "Notes & files" },
];

function stamp(value: string | null | undefined) {
  if (!value) return "Not scheduled";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function Empty({ title, text }: { title: string; text: string }) {
  return <div className="atlas-empty"><span aria-hidden="true">⌁</span><h3>{title}</h3><p>{text}</p></div>;
}

export function WorkspaceTabs<T extends string>({
  tabs,
  active,
  onChange,
}: {
  tabs: { id: T; label: string }[];
  active: T;
  onChange: (id: T) => void;
}) {
  return <div className="workspace-tabs" role="tablist" aria-label="Account sections">
    {tabs.map((item) => <button key={item.id} type="button" role="tab" aria-selected={item.id === active} className={item.id === active ? "active" : ""} onClick={() => onChange(item.id)}>{item.label}</button>)}
  </div>;
}

export function DataSurface({
  title,
  detail,
  action,
  children,
  className = "",
}: {
  title: string;
  detail?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return <section className={`data-surface ${className}`}>
    <header className="data-surface-header"><div><h2>{title}</h2>{detail && <p>{detail}</p>}</div>{action}</header>
    <div className="data-surface-body">{children}</div>
  </section>;
}

function Rows({
  items,
  columns,
  empty,
}: {
  items: any[];
  columns: { label: string; render: (item: any) => React.ReactNode }[];
  empty: { title: string; text: string };
}) {
  if (!items.length) return <Empty {...empty} />;
  return <div className="atlas-table-wrap"><table className="atlas-table"><thead><tr>{columns.map((column) => <th key={column.label}>{column.label}</th>)}</tr></thead><tbody>{items.map((item) => <tr key={item.id}>{columns.map((column) => <td key={column.label} data-label={column.label}>{column.render(item)}</td>)}</tr>)}</tbody></table></div>;
}

function Status({ value }: { value: string }) {
  return <span className={`atlas-status ${value.replaceAll("_", "-")}`}>{value.replaceAll("_", " ")}</span>;
}

function NoteComposer({
  clientId,
  properties,
  request,
  onSaved,
}: {
  clientId: string;
  properties: any[];
  request: Request;
  onSaved: () => void;
}) {
  const [body, setBody] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError("");
    try {
      await request(`/clients/${clientId}/notes`, { body, ...(propertyId ? { propertyId } : {}) });
      setBody(""); setPropertyId(""); onSaved();
    } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); }
  }
  return <form className="note-composer" onSubmit={submit}>
    <label>New internal note<RichTextEditor value={body} onChange={setBody} required maxLength={10000} ariaLabel="New internal note" placeholder="Capture context for the office team. Notes are permanent once saved." /></label>
    <div className="note-composer-actions"><label>Property scope<select value={propertyId} onChange={(event) => setPropertyId(event.target.value)}><option value="">Client-wide note</option>{properties.map((property) => <option key={property.id} value={property.id}>{property.name}</option>)}</select></label><button type="submit" className="primary" disabled={busy || !body.trim()}><Plus size={16} />{busy ? "Saving…" : "Add note"}</button></div>
    {error && <p className="error" role="alert">{error}</p>}
  </form>;
}

export function ClientWorkspace({ id, tab, request, onTab, onProperty }: WorkspaceProps) {
  const [workspace, setWorkspace] = useState<any>(null);
  const [error, setError] = useState("");
  const load = () => request(`/clients/${id}/workspace`).then(setWorkspace).catch((reason) => setError(reason.message));
  useEffect(() => { setWorkspace(null); setError(""); void load(); }, [id]);
  if (error) return <DataSurface title="Client workspace unavailable"><Empty title="This client is unavailable" text={error} /></DataSurface>;
  if (!workspace) return <div className="workspace-loading">Loading client account…</div>;
  const client = workspace.client;
  const attention = [...workspace.requests.filter((item: any) => item.status === "new"), ...workspace.projects.filter((item: any) => !["complete", "completed"].includes(item.status))];
  return <article className="account-workspace atlas-clients">
    <section className="page-hero account-hero" style={{ "--page-motif": motifForWorkspace("client") } as CSSProperties}><div className="page-hero-content"><p className="eyebrow">CLIENT COMMAND CENTER</p><div className="account-hero-title"><div><h1>{client.name}</h1><p><ContactDetails prefix={client.billing_address} phone={client.phone} email={client.email} /></p></div><span className="atlas-chip"><Users size={15} />Client account</span></div></div></section>
    <WorkspaceTabs tabs={clientTabs} active={tab} onChange={onTab} />
    {tab === "overview" && <div className="account-overview"><div className="account-primary-column"><div className="atlas-stat-grid"><Stat label="Properties" value={workspace.properties.length} icon={<MapPin size={18} />} /><Stat label="Upcoming work" value={workspace.schedule.length} icon={<CalendarDays size={18} />} /><Stat label="Active agreements" value={workspace.agreements.filter((item: any) => item.status === "active").length} icon={<FileText size={18} />} /><Stat label="Needs attention" value={attention.length} icon={<MessageSquare size={18} />} /></div><DataSurface title="Upcoming work" detail="The next scheduled service across this account." action={<button className="text-action" onClick={() => onTab("schedule")}>View schedule <ArrowUpRight size={15} /></button>}><Rows items={workspace.schedule.slice(0, 5)} columns={[{ label: "Work", render: (item) => <strong>{item.title}</strong> }, { label: "Property", render: (item) => item.property_name }, { label: "Scheduled", render: (item) => stamp(item.scheduled_at) }, { label: "Status", render: (item) => <Status value={item.status} /> }]} empty={{ title: "No work on the calendar", text: "Scheduled jobs for this client will appear here." }} /></DataSurface><DataSurface title="Account activity" detail="Recent internal operational activity."><div className="activity-list">{workspace.activity.length ? workspace.activity.map((item: any) => <div key={item.id}><span className="activity-dot" /><p><strong>{item.author_name || "P1 team"}</strong> {item.action.replaceAll(".", " ")}</p><small>{stamp(item.created_at)}</small></div>) : <Empty title="No activity yet" text="New account activity will appear here." />}</div></DataSurface></div><aside className="context-rail"><DataSurface title="Property portfolio" detail={`${workspace.properties.length} operational properties`}><div className="context-list">{workspace.properties.slice(0, 5).map((property: any) => <button key={property.id} onClick={() => onProperty(property.id)}><MapPin size={16} /><span><strong>{property.name}</strong><small>{property.address}</small></span><ArrowUpRight size={15} /></button>)}{!workspace.properties.length && <p className="muted">No properties yet.</p>}</div></DataSurface><DataSurface title="Active agreements"><div className="context-list">{workspace.agreements.filter((item: any) => item.status === "active").slice(0, 4).map((agreement: any) => <div key={agreement.id}><FileText size={16} /><span><strong>{agreement.title}</strong><small>{agreement.property_name} · ends {agreement.ends_on}</small></span></div>)}{!workspace.agreements.some((item: any) => item.status === "active") && <p className="muted">No active agreements.</p>}</div></DataSurface></aside></div>}
    {tab === "properties" && <DataSurface title="Properties" detail="Operational places connected to this client account."><Rows items={workspace.properties} columns={[{ label: "Property", render: (property) => <button className="table-link" onClick={() => onProperty(property.id)}>{property.name} <ArrowUpRight size={15} /></button> }, { label: "Address", render: (property) => property.address }, { label: "Acreage", render: (property) => property.acreage ? `${property.acreage} acres` : "—" }, { label: "Access", render: (property) => property.access_instructions ? "Instructions on file" : "—" }]} empty={{ title: "No properties yet", text: "Add a property to begin scheduling work for this client." }} /></DataSurface>}
    {tab === "contacts" && <DataSurface title="Contacts" detail="People associated with this account."><ClientContacts client={client} request={request} /></DataSurface>}
    {tab === "agreements" && <DataSurface title="Service agreements" detail="Active, draft, and prior client commitments."><Rows items={workspace.agreements} columns={[{ label: "Agreement", render: (item) => <strong>{item.title}</strong> }, { label: "Property", render: (item) => item.property_name }, { label: "Term", render: (item) => `${item.starts_on} — ${item.ends_on}` }, { label: "Status", render: (item) => <Status value={item.status} /> }]} empty={{ title: "No agreements yet", text: "Service agreements linked to this client will appear here." }} /></DataSurface>}
    {tab === "schedule" && <DataSurface title="Client schedule" detail="Upcoming and in-flight operational work."><Rows items={workspace.schedule} columns={[{ label: "Work", render: (item) => <strong>{item.title}</strong> }, { label: "Property", render: (item) => item.property_name }, { label: "Scheduled", render: (item) => stamp(item.scheduled_at) }, { label: "Status", render: (item) => <Status value={item.status} /> }]} empty={{ title: "No work on the calendar", text: "Schedule a work order to see it here." }} /></DataSurface>}
    {tab === "requests" && <DataSurface title="Service requests" detail="Requests connected to this client’s properties."><Rows items={workspace.requests} columns={[{ label: "Request", render: (item) => item.description }, { label: "Property", render: (item) => item.property_name }, { label: "Received", render: (item) => stamp(item.created_at) }, { label: "Status", render: (item) => <Status value={item.status} /> }]} empty={{ title: "No service requests", text: "Client requests will appear here." }} /></DataSurface>}
    {tab === "projects" && <DataSurface title="Projects" detail="Project work across the account."><Rows items={workspace.projects} columns={[{ label: "Project", render: (item) => <strong>{item.name}</strong> }, { label: "Property", render: (item) => item.property_name }, { label: "Scope", render: (item) => item.scope }, { label: "Status", render: (item) => <Status value={item.status} /> }]} empty={{ title: "No projects", text: "Projects for this account will appear here." }} /></DataSurface>}
    {tab === "notes" && <div className="notes-layout"><DataSurface title="Internal notes" detail="Office-only, append-only account context."><NoteComposer clientId={id} properties={workspace.properties} request={request} onSaved={load} /><div className="note-list">{workspace.notes.length ? workspace.notes.map((note: any) => <article key={note.id}><header><strong>{note.author_name}</strong><span>{note.property_name || "Client-wide"}</span><time>{stamp(note.created_at)}</time></header><p>{note.body}</p></article>) : <Empty title="No notes yet" text="Keep the next handoff clear by adding the first internal note." />}</div></DataSurface><aside className="context-rail"><DataSurface title="Note policy"><p className="muted">Notes are visible to office roles only. They cannot be edited or deleted after saving.</p></DataSurface></aside></div>}
  </article>;
}

function Stat({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return <section className="atlas-stat"><span>{icon}</span><strong>{value}</strong><p>{label}</p></section>;
}

export function PropertyWorkspace({
  id,
  tab,
  request,
  onTab,
  onClient,
  canOpenClient,
  role,
}: {
  id: string;
  tab: PropertyWorkspaceTab;
  request: Request;
  onTab: (tab: PropertyWorkspaceTab) => void;
  onClient: (id: string) => void;
  canOpenClient: boolean;
  role: string;
}) {
  const [workspace, setWorkspace] = useState<any>(null);
  const [error, setError] = useState("");
  useEffect(() => { setWorkspace(null); setError(""); request(`/properties/${id}/workspace`).then(setWorkspace).catch((reason) => setError(reason.message)); }, [id]);
  if (error) return <DataSurface title="Property workspace unavailable"><Empty title="This property is unavailable" text={error} /></DataSurface>;
  if (!workspace) return <div className="workspace-loading">Loading property workspace…</div>;
  const property = workspace.property;
  const visiblePropertyTabs = propertyTabs
    .filter((item) => role !== "crew" || ["overview", "schedule"].includes(item.id))
    .map((item) =>
      item.id === "notes-files" && !canOpenClient
        ? { ...item, label: "Files" }
        : item,
    );
  const tabSurface = (title: string, detail: string, items: any[], columns: any[], empty: any) => <DataSurface title={title} detail={detail}><Rows items={items} columns={columns} empty={empty} /></DataSurface>;
  return <article className="account-workspace atlas-properties"><section className="page-hero account-hero" style={{ "--page-motif": motifForWorkspace("property") } as CSSProperties}><div className="page-hero-content"><p className="eyebrow">PROPERTY WORKSPACE</p><div className="account-hero-title"><div><h1>{property.name}</h1><p>{canOpenClient ? <button className="breadcrumb-link" onClick={() => onClient(property.client_id)}>{property.client_name}</button> : <span>{property.client_name}</span>}<span> / </span>{property.address}{property.acreage ? ` · ${property.acreage} acres` : ""}</p></div><span className="atlas-chip"><MapPin size={15} />Operational</span></div></div></section><WorkspaceTabs tabs={visiblePropertyTabs} active={tab} onChange={onTab} />
    {tab === "overview" && <div className="account-overview"><div className="account-primary-column"><div className="atlas-stat-grid"><Stat label="Upcoming work" value={workspace.schedule.length} icon={<CalendarDays size={18} />} /><Stat label="Active agreements" value={workspace.agreements.filter((item: any) => item.status === "active").length} icon={<FileText size={18} />} /><Stat label="Open requests" value={workspace.requests.filter((item: any) => item.status === "new").length} icon={<MessageSquare size={18} />} /><Stat label="Inspections" value={workspace.inspections.length} icon={<ClipboardList size={18} />} /></div>{tabSurface("Upcoming work", "Scheduled service at this property.", workspace.schedule.slice(0, 5), [{ label: "Work", render: (item: any) => <strong>{item.title}</strong> }, { label: "Scheduled", render: (item: any) => stamp(item.scheduled_at) }, { label: "Status", render: (item: any) => <Status value={item.status} /> }], { title: "No work scheduled", text: "Future work orders will appear here." })}</div><aside className="context-rail">{tabSurface("Operational context", canOpenClient ? "Access and relationship details." : "Property relationship details.", [{ id: "context" }], [{ label: "Context", render: () => <div className="property-context"><strong>Client</strong>{canOpenClient ? <button className="table-link" onClick={() => onClient(property.client_id)}>{property.client_name} <ArrowUpRight size={14} /></button> : <p>{property.client_name}</p>}{canOpenClient && property.access_instructions && <><strong>Access instructions</strong><p>{property.access_instructions}</p></>}</div> }], { title: "", text: "" })}{canOpenClient && tabSurface("Primary contacts", "Account contacts.", workspace.contacts.slice(0, 3), [{ label: "Contact", render: (item: any) => <><strong>{item.name}</strong><small><ContactDetails prefix={item.position} email={item.email} phone={item.phone} /></small></> }], { title: "No contacts", text: "No contacts are recorded." })}</aside></div>}
    {tab === "schedule" && tabSurface("Property schedule", "Scheduled and in-progress work.", workspace.schedule, [{ label: "Work", render: (item: any) => <strong>{item.title}</strong> }, { label: "Scope", render: (item: any) => item.scope || "—" }, { label: "Scheduled", render: (item: any) => stamp(item.scheduled_at) }, { label: "Status", render: (item: any) => <Status value={item.status} /> }], { title: "No work scheduled", text: "Future work will appear here." })}
    {tab === "agreements" && tabSurface("Service agreements", "Terms attached to this property.", workspace.agreements, [{ label: "Agreement", render: (item: any) => <strong>{item.title}</strong> }, { label: "Term", render: (item: any) => `${item.starts_on} — ${item.ends_on}` }, { label: "Status", render: (item: any) => <Status value={item.status} /> }], { title: "No agreements", text: "No service agreements are linked to this property." })}
    {tab === "requests" && tabSurface("Service requests", "Requests and follow-up for this property.", workspace.requests, [{ label: "Request", render: (item: any) => item.description }, { label: "Received", render: (item: any) => stamp(item.created_at) }, { label: "Status", render: (item: any) => <Status value={item.status} /> }], { title: "No requests", text: "Requests will appear here." })}
    {tab === "projects" && tabSurface("Projects", "Property projects and phases.", workspace.projects, [{ label: "Project", render: (item: any) => <strong>{item.name}</strong> }, { label: "Scope", render: (item: any) => item.scope }, { label: "Status", render: (item: any) => <Status value={item.status} /> }], { title: "No projects", text: "Projects will appear here." })}
    {tab === "inspections" && tabSurface("Inspections", "Inspection records and observations.", workspace.inspections, [{ label: "Inspection", render: (item: any) => <strong>{item.title}</strong> }, { label: "Findings", render: (item: any) => `${Array.isArray(item.findings) ? item.findings.length : 0} observations` }, { label: "Date", render: (item: any) => stamp(item.created_at) }], { title: "No inspections", text: "Inspection records will appear here." })}
    {tab === "notes-files" && <div className="notes-layout">{canOpenClient && tabSurface("Internal notes", "Office-only account context for this property.", workspace.notes, [{ label: "Note", render: (item: any) => <><strong>{item.author_name}</strong><p>{item.body}</p><small>{stamp(item.created_at)}</small></> }], { title: "No internal notes", text: "Notes scoped to this property will appear here." })}{tabSurface("Files", "Published property documents and photos.", workspace.files, [{ label: "File", render: (item: any) => <strong>{item.name}</strong> }, { label: "Type", render: (item: any) => item.mime }, { label: "Added", render: (item: any) => stamp(item.created_at) }], { title: "No files", text: "Files will appear here when they are available." })}</div>}
  </article>;
}

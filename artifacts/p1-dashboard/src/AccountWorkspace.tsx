import { CrmArchive } from "./CrmArchive";
import { ClientNotes } from "./ClientNotes";
import { CrmTasks } from "./CrmTasks";
import {
  canManageServiceAgreements,
  hasCapability,
} from "@workspace/api-zod/business-access";
import { canAccessWorkspaceTab } from "./dashboard-routes";
import { lazy, Suspense, useEffect, useState, type FormEvent, type MouseEvent, type ReactNode } from "react";
import {
  ArrowUpRight,
  CalendarDays,
  ClipboardList,
  FileText,
  FolderKanban,
  LayoutDashboard,
  NotebookPen,
  type LucideIcon,
  MapPin,
  MessageSquare,
  Plus,
  SquarePen,
  Users,
} from "lucide-react";
import { ClientContacts } from "./ClientContacts";
import { AgreementEditor } from "./AgreementEditor";
import type { ClientWorkspaceTab, PropertyWorkspaceTab } from "./dashboard-routes";

import { ContactDetails } from "./contact-links";
import { RichTextEditor } from "./RichTextEditor";
import { formatPhoneNumber } from "./phone";
import type {
  AgreementEstimateOption,
  AgreementRecurrenceOption,
  DashboardProperty,
  ServiceAgreementFinancial,
} from "../../../lib/api-client-react/src/dashboard/models";
import "./property-profile-edit.css";

const ClientPropertyMap = lazy(async () => ({ default: (await import("./PropertyMap")).PropertyMap }));
const PropertyLocationMap = lazy(async () => ({ default: (await import("./PropertyMap")).PropertyLocationMap }));

type Request = (path: string, body?: unknown) => Promise<any>;
type PropertyChoice = Pick<WorkspaceProperty, "id" | "name">;
type WorkspaceProps = {
  id: string;
  tab: ClientWorkspaceTab;
  request: Request;
  onTab: (tab: ClientWorkspaceTab) => void;
  onProperty: (id: string) => void;
  role: string;
  capabilities?: string[];
  referenceProperties?: WorkspaceProperty[];
};

type WorkspaceTab<T extends string> = {
  id: T;
  label: string;
  icon: LucideIcon;
  tone: "blue" | "green" | "violet" | "amber" | "cyan" | "rose";
};

const clientTabs: WorkspaceTab<ClientWorkspaceTab>[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, tone: "blue" },
  { id: "properties", label: "Properties", icon: MapPin, tone: "green" },
  { id: "contacts", label: "Contacts", icon: Users, tone: "violet" },
  { id: "agreements", label: "Agreements", icon: FileText, tone: "amber" },
  { id: "schedule", label: "Schedule", icon: CalendarDays, tone: "cyan" },
  { id: "requests", label: "Requests", icon: MessageSquare, tone: "rose" },
  { id: "projects", label: "Projects", icon: FolderKanban, tone: "violet" },
  { id: "notes", label: "Notes & tasks", icon: NotebookPen, tone: "amber" },
];

const propertyTabs: WorkspaceTab<PropertyWorkspaceTab>[] = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, tone: "blue" },
  { id: "schedule", label: "Schedule", icon: CalendarDays, tone: "cyan" },
  { id: "agreements", label: "Agreements", icon: FileText, tone: "amber" },
  { id: "requests", label: "Requests", icon: MessageSquare, tone: "rose" },
  { id: "projects", label: "Projects", icon: FolderKanban, tone: "violet" },
  { id: "inspections", label: "Inspections", icon: ClipboardList, tone: "green" },
  { id: "notes-files", label: "Notes & files", icon: NotebookPen, tone: "amber" },
];

function stamp(value: string | null | undefined) {
  if (!value) return "Not scheduled";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function upcomingWork<T extends { status: string; scheduled_at?: string | null }>(
  work: T[],
  now = Date.now(),
): T[] {
  return work.filter((item) =>
    item.status === "scheduled" &&
    Boolean(item.scheduled_at) &&
    Date.parse(item.scheduled_at!) >= now,
  );
}

export function isOpenRequestStatus(status: string): boolean {
  return !["closed", "cancelled", "converted"].includes(status);
}

function Empty({ title, text }: { title: string; text: string }) {
  return <div className="atlas-empty"><span aria-hidden="true">⌁</span><h3>{title}</h3><p>{text}</p></div>;
}

export function WorkspaceTabs<T extends string>({
  tabs,
  active,
  basePath,
  onChange,
}: {
  tabs: WorkspaceTab<T>[];
  active: T;
  basePath: string;
  onChange: (id: T) => void;
}) {
  function follow(event: MouseEvent<HTMLAnchorElement>, id: T) {
    if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onChange(id);
  }
  return <nav className="workspace-tabs" aria-label="Account sections">
    {tabs.map((item) => <a key={item.id} href={`${basePath}${item.id === "overview" ? "" : `/${item.id}`}`} aria-current={item.id === active ? "page" : undefined} className={item.id === active ? "active" : ""} onClick={(event) => follow(event, item.id)}><span className={`workspace-tab-icon workspace-tab-icon--${item.tone}`} aria-hidden="true"><item.icon size={17} strokeWidth={1.8} /></span>{item.label}</a>)}
  </nav>;
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

type WorkspaceProperty = {
  id: string;
  client_id?: string;
  name: string;
  address: string;
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  acreage: string | number | null;
  access_instructions: string;
  property_type_id?: string | null;
  property_type_name?: string | null;
  version: number;
};

function FormMessage({ error }: { error: string }) {
  return error ? <p className="error" role="alert">{error}</p> : null;
}

function splitPropertyAddress(property?: WorkspaceProperty) {
  if (property?.address_line1 && property.city && property.state && property.postal_code) {
    return {
      addressLine1: property.address_line1,
      addressLine2: property.address_line2 || "",
      city: property.city,
      state: property.state,
      postalCode: property.postal_code,
    };
  }
  const match = property?.address.match(/^(.+?)[,.]\s*([^,]+),\s*([A-Za-z]{2})\s+(\d{5}(?:-\d{4})?)$/);
  return {
    addressLine1: match?.[1] || property?.address || "",
    addressLine2: "",
    city: match?.[2] || "",
    state: match?.[3] || "",
    postalCode: match?.[4] || "",
  };
}

function PropertyEditor({
  clientId,
  property,
  propertyTypes,
  request,
  onSaved,
  onCancel,
  focusName = false,
}: {
  clientId: string;
  property?: WorkspaceProperty;
  propertyTypes: { id: string; name: string }[];
  request: Request;
  onSaved: () => void;
  onCancel: () => void;
  focusName?: boolean;
}) {
  const [name, setName] = useState(property?.name || "");
  const [addressParts, setAddressParts] = useState(() => splitPropertyAddress(property));
  const [acreage, setAcreage] = useState(property?.acreage?.toString() || "");
  const [accessInstructions, setAccessInstructions] = useState(property?.access_instructions || "");
  const [propertyTypeId, setPropertyTypeId] = useState(property?.property_type_id || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save(event: FormEvent) {
    event.preventDefault();
    const normalizedAcreage = acreage.trim() === "" ? null : Number(acreage);
    if (normalizedAcreage !== null && (!Number.isFinite(normalizedAcreage) || normalizedAcreage < 0)) {
      setError("Acreage must be a non-negative number.");
      return;
    }
    setBusy(true); setError("");
    try {
      await request(property ? `/properties/${property.id}` : "/properties", property
        ? { name, ...addressParts, acreage: normalizedAcreage, accessInstructions, propertyTypeId: propertyTypeId || null, version: property.version }
        : { clientId, name, ...addressParts, ...(normalizedAcreage === null ? {} : { acreage: normalizedAcreage }), accessInstructions, propertyTypeId: propertyTypeId || null });
      onSaved();
    } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); }
  }
  return <form className="account-resource-form" onSubmit={save}>
    <div><h3>{property ? "Edit property" : "Add property"}</h3><p>Keep the address and site access details ready for operations.</p></div>
    <label>Property name<input autoFocus={focusName} required maxLength={10000} value={name} onChange={(event) => setName(event.target.value)} /></label>
    <label>Property type<select value={propertyTypeId} onChange={(event) => setPropertyTypeId(event.target.value)}><option value="">Not classified</option>{propertyTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
    <label>Address line 1<input required maxLength={200} autoComplete="address-line1" value={addressParts.addressLine1} onChange={(event) => setAddressParts((current) => ({ ...current, addressLine1: event.target.value }))} /></label>
    <label>Address line 2 <span className="optional-field">Optional</span><input maxLength={200} autoComplete="address-line2" value={addressParts.addressLine2} onChange={(event) => setAddressParts((current) => ({ ...current, addressLine2: event.target.value }))} /></label>
    <div className="account-address-grid"><label>City<input required maxLength={100} autoComplete="address-level2" value={addressParts.city} onChange={(event) => setAddressParts((current) => ({ ...current, city: event.target.value }))} /></label><label>State<input required maxLength={2} autoComplete="address-level1" pattern="[A-Za-z]{2}" placeholder="NC" value={addressParts.state} onChange={(event) => setAddressParts((current) => ({ ...current, state: event.target.value }))} /></label><label>ZIP code<input required autoComplete="postal-code" inputMode="numeric" pattern="[0-9]{5}(-[0-9]{4})?" placeholder="28105" value={addressParts.postalCode} onChange={(event) => setAddressParts((current) => ({ ...current, postalCode: event.target.value }))} /></label></div>
    <label>Acreage<input type="number" min="0" step="0.01" value={acreage} onChange={(event) => setAcreage(event.target.value)} /></label>
    <label className="account-resource-editor">Access instructions<RichTextEditor value={accessInstructions} onChange={setAccessInstructions} maxLength={10000} ariaLabel="Access instructions" placeholder="Gate codes, arrival details, and site access guidance." /></label>
    <div className="account-resource-actions"><button type="button" className="secondary" disabled={busy} onClick={onCancel}>Cancel</button><button className="primary" disabled={busy}>{busy ? "Saving…" : property ? "Save property" : "Add property"}</button></div>
    <FormMessage error={error} />
  </form>;
}

function RequestEditor({
  properties,
  request,
  onSaved,
  onCancel,
}: {
  properties: PropertyChoice[];
  request: Request;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [propertyId, setPropertyId] = useState(properties[0]?.id || "");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try { await request("/requests", { propertyId, description }); onSaved(); }
    catch (reason) { setError((reason as Error).message); } finally { setBusy(false); }
  }
  return <form className="account-resource-form" onSubmit={save}>
    <div><h3>Create service request</h3><p>Record a request received by phone or directly from the client.</p></div>
    <label>Property<select required value={propertyId} onChange={(event) => setPropertyId(event.target.value)}><option value="">Choose a property</option>{properties.map((property) => <option value={property.id} key={property.id}>{property.name}</option>)}</select></label>
    <label>Request details<textarea required maxLength={10000} value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Describe the requested service and any timing or access details." /></label>
    <div className="account-resource-actions"><button type="button" className="secondary" disabled={busy} onClick={onCancel}>Cancel</button><button className="primary" disabled={busy || !propertyId || !description.trim()}>{busy ? "Creating…" : "Create request"}</button></div>
    <FormMessage error={error} />
  </form>;
}

function ProjectEditor({
  project,
  properties,
  request,
  onSaved,
  onCancel,
}: {
  project?: any;
  properties: PropertyChoice[];
  request: Request;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [propertyId, setPropertyId] = useState(project?.property_id || properties[0]?.id || "");
  const [name, setName] = useState(project?.name || "");
  const [scope, setScope] = useState(project?.scope || "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      await request(project ? `/projects/${project.id}` : "/projects", project ? { name, scope, expectedVersion: project.version } : { propertyId, name, scope, phases: [] });
      onSaved();
    } catch (reason) { setError((reason as Error).message); } finally { setBusy(false); }
  }
  return <form className="account-resource-form" onSubmit={save}>
    <div><h3>{project ? "Edit project" : "Create project"}</h3><p>Set the accountable property and the operational scope before planning phases.</p></div>
    {!project && <label>Property<select required value={propertyId} onChange={(event) => setPropertyId(event.target.value)}><option value="">Choose a property</option>{properties.map((property) => <option value={property.id} key={property.id}>{property.name}</option>)}</select></label>}
    <label>Project name<input required maxLength={10000} value={name} onChange={(event) => setName(event.target.value)} /></label>
    <label>Scope<textarea required maxLength={10000} value={scope} onChange={(event) => setScope(event.target.value)} placeholder="Describe the work, outcome, and constraints." /></label>
    <div className="account-resource-actions"><button type="button" className="secondary" disabled={busy} onClick={onCancel}>Cancel</button><button className="primary" disabled={busy || (!project && !propertyId)}>{busy ? "Saving…" : project ? "Save project" : "Create project"}</button></div>
    <FormMessage error={error} />
  </form>;
}

function ClientAgreementEditor({
  clientId,
  properties,
  existing,
  request,
  onSaved,
  onCancel,
}: {
  clientId: string;
  properties: WorkspaceProperty[];
  existing?: ServiceAgreementFinancial;
  request: Request;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [recurrences, setRecurrences] = useState<AgreementRecurrenceOption[]>([]);
  const [estimates, setEstimates] = useState<AgreementEstimateOption[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    Promise.all([request("/recurring-services"), request("/estimates")])
      .then(([nextRecurrences, nextEstimates]) => { if (active) { setRecurrences(nextRecurrences); setEstimates(nextEstimates); } })
      .catch((reason) => { if (active) setError((reason as Error).message); });
    return () => { active = false; };
  }, [request]);
  const agreementProperties: DashboardProperty[] = properties.map((property) => ({
    ...property,
    client_id: clientId,
    acreage: property.acreage === null ? null : String(property.acreage),
  }));
  if (error) return <div className="account-resource-form"><FormMessage error={error} /><button className="secondary" onClick={onCancel}>Close</button></div>;
  return <div className="account-resource-form agreement-editor-shell"><AgreementEditor existing={existing} properties={agreementProperties} recurrences={recurrences} estimates={estimates} onSaved={() => { onSaved(); onCancel(); }} onCancel={onCancel} /></div>;
}

export function ClientWorkspace({ id, tab, request, onTab, onProperty, role, capabilities, referenceProperties = [] }: WorkspaceProps) {
  const [workspace, setWorkspace] = useState<any>(null);
  const [propertyTypes, setPropertyTypes] = useState<{ id: string; name: string }[]>([]);
  const [error, setError] = useState("");
  const [editor, setEditor] = useState<
    | { kind: "property"; property?: WorkspaceProperty }
    | { kind: "request" }
    | { kind: "project"; project?: any }
    | { kind: "agreement"; existing?: ServiceAgreementFinancial }
    | null
  >(null);
  const load = () => {
    setWorkspace(null);
    setError("");
    return Promise.all([request(`/clients/${id}/workspace`), hasCapability({ role, capabilities }, "customers.properties") ? request("/property-types") : Promise.resolve([])])
      .then(([nextWorkspace, nextPropertyTypes]) => { setWorkspace(nextWorkspace); setPropertyTypes(nextPropertyTypes); })
      .catch((reason) => setError(reason.message));
  };
  useEffect(() => { setWorkspace(null); setPropertyTypes([]); setError(""); setEditor(null); void load(); }, [id, capabilities]);
  if (error) return <DataSurface title="Client workspace unavailable"><Empty title="Could not load this client" text={error} /><button type="button" className="secondary" onClick={() => void load()}>Retry client workspace</button></DataSurface>;
  if (!workspace) return <div className="workspace-loading">Loading client account…</div>;
  const client = workspace.client;
  const properties = (hasCapability({ role, capabilities }, "customers.properties") ? workspace.properties : referenceProperties.filter(property => property.client_id === id)) as WorkspaceProperty[];
  const propertyChoices = (hasCapability({ role, capabilities }, "customers.properties") ? workspace.properties : workspace.propertyChoices || []) as PropertyChoice[];
  const canManage = canManageServiceAgreements({ role, capabilities });
  const canSee = (section: string) => canAccessWorkspaceTab("client", section, role, capabilities);
  const attention = [...workspace.requests.filter((item: any) => isOpenRequestStatus(item.status)), ...workspace.projects.filter((item: any) => !["complete", "completed"].includes(item.status))];
  const activeAgreements = workspace.agreements.filter((item: any) => item.status === "active");
  const upcoming = upcomingWork(workspace.schedule);
  return <article className="account-workspace atlas-clients">
    <section className="page-hero account-hero"><div className="page-hero-content"><p className="eyebrow">CLIENT COMMAND CENTER</p><div className="account-hero-title"><div><h1>{client.name}</h1><p><ContactDetails prefix={client.billing_address} phone={client.phone} email={client.email} /></p></div><span className="atlas-chip"><Users size={15} />Client account</span></div></div></section>
    <WorkspaceTabs tabs={clientTabs.filter(item => canAccessWorkspaceTab("client", item.id, role, capabilities))} active={tab} basePath={`/clients/${encodeURIComponent(id)}`} onChange={onTab} />
    {tab === "overview" && <div className="account-overview"><div className="account-primary-column"><div className="atlas-stat-grid"><Stat available={canSee("properties")} label="Properties" value={workspace.properties.length} icon={<MapPin size={18} />} /><Stat available={canSee("schedule")} label="Upcoming work" value={upcoming.length} icon={<CalendarDays size={18} />} /><Stat available={canSee("agreements")} label="Active agreements" value={workspace.agreements.filter((item: any) => item.status === "active").length} icon={<FileText size={18} />} /><Stat available={canSee("requests") || canSee("projects")} label="Needs attention" value={attention.length} icon={<MessageSquare size={18} />} /></div>{canSee("schedule") && <DataSurface title="Upcoming work" detail="The next scheduled service across this account." action={<button className="text-action" disabled={!canSee("schedule")} onClick={() => onTab("schedule")}>View schedule <ArrowUpRight size={15} /></button>}><Rows items={upcoming.slice(0, 5)} columns={[{ label: "Work", render: (item) => <strong>{item.title}</strong> }, { label: "Property", render: (item) => item.property_name }, { label: "Scheduled", render: (item) => stamp(item.scheduled_at) }, { label: "Status", render: (item) => <Status value={item.status} /> }]} empty={{ title: "No upcoming work", text: "Future scheduled jobs for this client will appear here." }} /></DataSurface>}<DataSurface title="Account activity" detail="Recent internal operational activity."><div className="activity-list">{workspace.activity.length ? workspace.activity.map((item: any) => <div key={item.id}><span className="activity-dot" /><p><strong>{item.author_name || "P1 team"}</strong> {item.action.replaceAll(".", " ")}</p><small>{stamp(item.created_at)}</small></div>) : <Empty title="No activity yet" text="New account activity will appear here." />}</div></DataSurface></div><aside className="context-rail">{canSee("properties") && <DataSurface title="Property portfolio" detail={`${workspace.properties.length} operational properties`}><div className="context-list">{workspace.properties.slice(0, 5).map((property: any) => <button key={property.id} onClick={() => onProperty(property.id)}><MapPin size={16} /><span><strong>{property.name}</strong><small>{property.address}</small></span><ArrowUpRight size={15} /></button>)}{!workspace.properties.length && <p className="muted">No properties yet.</p>}</div></DataSurface>}{canSee("agreements") && <DataSurface title="Active agreements"><div className="context-list">{workspace.agreements.filter((item: any) => item.status === "active").slice(0, 4).map((agreement: any) => <div key={agreement.id}><FileText size={16} /><span><strong>{agreement.title}</strong><small>{agreement.property_name} · ends {agreement.ends_on}</small></span></div>)}{!workspace.agreements.some((item: any) => item.status === "active") && <p className="muted">No active agreements.</p>}</div></DataSurface>}</aside></div>}
    {tab === "overview" && hasCapability({ role, capabilities }, "revenue.sales") && workspace.salesOrigins?.length > 0 && (
      <DataSurface title="Recent Sales history" detail="The latest internal inquiries linked to this client account.">
        <div className="context-list">
          {workspace.salesOrigins.map((lead: { id: string; name: string; status: string; reported_company_name: string | null; created_at: string }) => (
            <a className="account-sales-origin" key={lead.id} href={`/sales/leads/${encodeURIComponent(lead.id)}`}>
              <FileText size={17} aria-hidden="true" />
              <span><strong>{lead.name}</strong><small>{lead.reported_company_name || "Inquiry"} · {stamp(lead.created_at)} · {lead.status}</small></span>
              <ArrowUpRight size={15} aria-hidden="true" />
            </a>
          ))}
        </div>
      </DataSurface>
    )}
    {tab === "properties" && <DataSurface title="Properties" detail="Operational places connected to this client account." action={<button className="text-action" onClick={() => setEditor({ kind: "property" })}><Plus size={15} /> Add property</button>}>{editor?.kind === "property" && <PropertyEditor clientId={id} property={editor.property} propertyTypes={propertyTypes} request={request} onSaved={() => { setEditor(null); void load(); }} onCancel={() => setEditor(null)} />}<Suspense fallback={<div className="property-map-loading client-property-map" role="status">Loading client property map…</div>}><ClientPropertyMap properties={workspace.properties} compact onOpen={property => onProperty(property.id)} /></Suspense><Rows items={workspace.properties} columns={[{ label: "Property", render: (property) => <button className="table-link" onClick={() => onProperty(property.id)}>{property.name} <ArrowUpRight size={15} /></button> }, { label: "Type", render: (property) => property.property_type_name || "Unclassified" }, { label: "Address", render: (property) => property.address }, { label: "Acreage", render: (property) => property.acreage ? `${property.acreage} acres` : "—" }, { label: "Access", render: (property) => property.access_instructions ? "Instructions on file" : "—" }, { label: "", render: (property) => <button className="table-link" onClick={() => setEditor({ kind: "property", property })}>Edit</button> }]} empty={{ title: "No properties yet", text: "Add a property to begin scheduling work for this client." }} /></DataSurface>}
    {tab === "contacts" && <DataSurface title="Contacts" detail="People associated with this account."><ClientContacts client={client} request={request} /></DataSurface>}
    {tab === "agreements" && <DataSurface title="Service agreements" detail="Active, draft, and prior client commitments." action={canManage ? <button className="text-action" onClick={() => setEditor({ kind: "agreement" })}><Plus size={15} /> New agreement</button> : undefined}>{editor?.kind === "agreement" && <ClientAgreementEditor clientId={id} properties={properties} existing={editor.existing} request={request} onSaved={() => void load()} onCancel={() => setEditor(null)} />}<Rows items={workspace.agreements} columns={[{ label: "Agreement", render: (item) => <strong>{item.title}</strong> }, { label: "Property", render: (item) => item.property_name }, { label: "Term", render: (item) => `${item.starts_on} — ${item.ends_on}` }, { label: "Status", render: (item) => <Status value={item.status} /> }, ...(canManage ? [{ label: "", render: (item: any) => item.status === "draft" ? <button className="table-link" onClick={() => void request(`/service-agreements/${item.id}`).then((existing) => setEditor({ kind: "agreement", existing }))}>Edit draft</button> : <span className="muted">Terms locked</span> }] : [])]} empty={{ title: "No agreements yet", text: "Service agreements linked to this client will appear here." }} /></DataSurface>}
    {tab === "schedule" && <DataSurface title="Client schedule" detail="Upcoming and in-flight operational work."><Rows items={workspace.schedule} columns={[{ label: "Work", render: (item) => <strong>{item.title}</strong> }, { label: "Property", render: (item) => item.property_name }, { label: "Scheduled", render: (item) => stamp(item.scheduled_at) }, { label: "Status", render: (item) => <Status value={item.status} /> }]} empty={{ title: "No work on the calendar", text: "Schedule a work order to see it here." }} /></DataSurface>}
    {tab === "requests" && <DataSurface title="Service requests" detail="Requests connected to this client’s properties." action={<button className="text-action" onClick={() => setEditor({ kind: "request" })}><Plus size={15} /> Create request</button>}>{editor?.kind === "request" && <RequestEditor properties={propertyChoices} request={request} onSaved={() => { setEditor(null); void load(); }} onCancel={() => setEditor(null)} />}<Rows items={workspace.requests} columns={[{ label: "Request", render: (item) => item.description }, { label: "Property", render: (item) => item.property_name }, { label: "Received", render: (item) => stamp(item.created_at) }, { label: "Status", render: (item) => <Status value={item.status} /> }]} empty={{ title: "No service requests", text: "Client requests will appear here." }} /></DataSurface>}
    {tab === "projects" && <DataSurface title="Projects" detail="Project work across the account." action={hasCapability({ role, capabilities }, "operations.projects") ? <button className="text-action" onClick={() => setEditor({ kind: "project" })}><Plus size={15} /> New project</button> : undefined}>{editor?.kind === "project" && <ProjectEditor project={editor.project} properties={propertyChoices} request={request} onSaved={() => { setEditor(null); void load(); }} onCancel={() => setEditor(null)} />}<Rows items={workspace.projects} columns={[{ label: "Project", render: (item) => <strong>{item.name}</strong> }, { label: "Property", render: (item) => item.property_name }, { label: "Scope", render: (item) => item.scope }, { label: "Status", render: (item) => <Status value={item.status} /> }, ...(hasCapability({ role, capabilities }, "operations.projects") ? [{ label: "", render: (item: any) => <button className="table-link" onClick={() => setEditor({ kind: "project", project: item })}>Edit</button> }] : [])]} empty={{ title: "No projects", text: "Projects for this account will appear here." }} /></DataSurface>}
    {tab === "notes" && <div className="notes-layout"><DataSurface title="Notes & tasks" detail="Internal customer notes and follow-ups."><CrmTasks kind="client" parentId={id} /><ClientNotes key={id} clientId={id} properties={workspace.properties} /><CrmArchive key={"archive-"+id} kind="client" parentId={id} /></DataSurface><aside className="context-rail"><DataSurface title="Note policy"><p className="muted">Notes are visible to office roles only. They cannot be edited or deleted after saving.</p></DataSurface></aside></div>}
  </article>;
}

function Stat({ label, value, icon, available = true }: { label: string; value: number; icon: ReactNode; available?: boolean }) {
  return <section className="atlas-stat"><span>{icon}</span><strong title={available ? undefined : "Not included in your access"}>{available ? value : "—"}</strong><p>{label}</p></section>;
}

export function PropertyWorkspace({
  id,
  tab,
  request,
  onTab,
  onClient,
  canOpenClient,
  role,
  capabilities,
}: {
  id: string;
  tab: PropertyWorkspaceTab;
  request: Request;
  onTab: (tab: PropertyWorkspaceTab) => void;
  onClient: (id: string) => void;
  canOpenClient: boolean;
  role: string;
  capabilities?: string[];
  referenceProperties?: WorkspaceProperty[];
}) {
  const [workspace, setWorkspace] = useState<any>(null);
  const [propertyTypes, setPropertyTypes] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [typeSaving, setTypeSaving] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const canManage = hasCapability({ role, capabilities }, "customers.properties");
  const canEditProfile = canManage && (role === "owner" || role === "manager");
  const load = () => {
    setWorkspace(null);
    setError("");
    return Promise.all([
      request(`/properties/${id}/workspace`),
      canManage ? request("/property-types") : Promise.resolve([]),
    ]).then(([nextWorkspace, nextTypes]) => {
      setWorkspace(nextWorkspace);
      setPropertyTypes(nextTypes);
    }).catch((reason) => setError(reason.message));
  };
  useEffect(() => {
    let active = true;
    setEditOpen(false);
    setWorkspace(null); setError(""); setPropertyTypes([]);
    const requests = [request(`/properties/${id}/workspace`)];
    if (canManage) requests.push(request("/property-types"));
    Promise.all(requests).then(([nextWorkspace, nextTypes]) => {
      if (!active) return;
      setWorkspace(nextWorkspace);
      setPropertyTypes(nextTypes || []);
    }).catch((reason) => { if (active) setError(reason.message); });
    return () => { active = false; };
  }, [id, canManage]);
  if (error) return <DataSurface title="Property workspace unavailable"><Empty title="Could not load this property" text={error} /><button type="button" className="secondary" onClick={() => void load()}>Retry property workspace</button></DataSurface>;
  if (!workspace) return <div className="workspace-loading">Loading property workspace…</div>;
  const property = workspace.property;
  async function updatePropertyType(propertyTypeId: string) {
    setTypeSaving(true); setError("");
    try {
      await request(`/properties/${id}/property-type`, {
        propertyTypeId: propertyTypeId || null,
        expectedVersion: property.version,
      });
      await load();
    } catch (reason) { setError((reason as Error).message); } finally { setTypeSaving(false); }
  }
  const visiblePropertyTabs = propertyTabs
    .filter((item) => canAccessWorkspaceTab("property", item.id, role, capabilities))
    .map((item) =>
      item.id === "notes-files" && !canOpenClient
        ? { ...item, label: "Files" }
        : item,
    );
  const canSee = (section: string) => canAccessWorkspaceTab("property", section, role, capabilities);
  const upcoming = upcomingWork(workspace.schedule);
  const tabSurface = (title: string, detail: string, items: any[], columns: any[], empty: any) => <DataSurface title={title} detail={detail}><Rows items={items} columns={columns} empty={empty} /></DataSurface>;
  return <article className="account-workspace atlas-properties"><section className="page-hero account-hero"><div className="page-hero-content"><p className="eyebrow">PROPERTY WORKSPACE</p><div className="account-hero-title"><div><div className="property-profile-title-row"><h1>{property.name}</h1>{canEditProfile && <button type="button" className="property-profile-edit-trigger" aria-label={`Edit ${property.name} profile`} aria-expanded={editOpen} onClick={() => setEditOpen((open) => !open)}><SquarePen size={17} aria-hidden="true" /><span>Edit</span></button>}</div><p>{canOpenClient ? <button className="breadcrumb-link" onClick={() => onClient(property.client_id)}>{property.client_name}</button> : <span>{property.client_name}</span>}<span> / </span>{property.address}{property.acreage ? ` · ${property.acreage} acres` : ""}</p></div><span className="atlas-chip"><MapPin size={15} />Operational</span></div></div></section><WorkspaceTabs tabs={visiblePropertyTabs} active={tab} basePath={`/properties/${encodeURIComponent(id)}`} onChange={onTab} />
    {editOpen && canEditProfile && <section id="property-profile-edit-panel" className="property-profile-edit-panel" aria-label="Edit property details"><PropertyEditor clientId={property.client_id || ""} property={property} propertyTypes={propertyTypes} request={request} focusName onSaved={() => { setEditOpen(false); void load(); }} onCancel={() => setEditOpen(false)} /></section>}
    {tab === "overview" && <div className="account-overview property-overview"><aside className="context-rail property-context-rail"><DataSurface title="Property map" detail="Road and regional context."><Suspense fallback={<div className="property-map-loading" role="status">Loading property map…</div>}><PropertyLocationMap property={property} /></Suspense></DataSurface><DataSurface title="Property classification" detail="Used to organize the property portfolio."><div className="property-type-control">{canManage ? <label>Property type<select value={property.property_type_id || ""} disabled={typeSaving} onChange={(event) => void updatePropertyType(event.target.value)}><option value="">Not classified</option>{propertyTypes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label> : <p>{property.property_type_name || "Not classified"}</p>}{typeSaving && <small>Saving classification…</small>}</div></DataSurface><DataSurface title="Operational context" detail={canOpenClient ? "Access and relationship details." : "Property relationship details."}><div className="property-context"><strong>Client</strong>{canOpenClient ? <button className="table-link" onClick={() => onClient(property.client_id)}>{property.client_name} <ArrowUpRight size={14} /></button> : <p>{property.client_name}</p>}{hasCapability({ role, capabilities }, "customers.properties") && property.access_instructions && <><strong>Access instructions</strong><p>{property.access_instructions}</p></>}</div></DataSurface>{canOpenClient && <DataSurface title="Primary contacts" detail="Account contacts."><div className="context-list">{workspace.contacts.slice(0, 3).map((item: any) => <div key={item.id}><Users size={16} /><span><strong>{item.name}</strong><small><ContactDetails prefix={item.position} email={item.email} phone={item.phone} /></small></span></div>)}{!workspace.contacts.length && <p className="muted">No contacts are recorded.</p>}</div></DataSurface>}</aside><div className="account-primary-column"><div className="atlas-stat-grid"><Stat available={canSee("schedule")} label="Upcoming work" value={upcoming.length} icon={<CalendarDays size={18} />} /><Stat available={canSee("agreements")} label="Active agreements" value={workspace.agreements.filter((item: any) => item.status === "active").length} icon={<FileText size={18} />} /><Stat available={canSee("requests")} label="Open requests" value={workspace.requests.filter((item: any) => isOpenRequestStatus(item.status)).length} icon={<ClipboardList size={18} />} /><Stat available={canSee("inspections")} label="Inspections" value={workspace.inspections.length} icon={<ClipboardList size={18} />} /></div>{tabSurface("Upcoming work", "Scheduled service at this property.", upcoming.slice(0, 5), [{ label: "Work", render: (item: any) => <strong>{item.title}</strong> }, { label: "Scheduled", render: (item: any) => stamp(item.scheduled_at) }, { label: "Status", render: (item: any) => <Status value={item.status} /> }], { title: "No upcoming work", text: "Future scheduled work orders will appear here." })}</div></div>}
    {tab === "schedule" && tabSurface("Property schedule", "Scheduled and in-progress work.", workspace.schedule, [{ label: "Work", render: (item: any) => <strong>{item.title}</strong> }, { label: "Scope", render: (item: any) => item.scope || "—" }, { label: "Scheduled", render: (item: any) => stamp(item.scheduled_at) }, { label: "Status", render: (item: any) => <Status value={item.status} /> }], { title: "No work scheduled", text: "Future work will appear here." })}
    {tab === "agreements" && tabSurface("Service agreements", "Terms attached to this property.", workspace.agreements, [{ label: "Agreement", render: (item: any) => <strong>{item.title}</strong> }, { label: "Term", render: (item: any) => `${item.starts_on} — ${item.ends_on}` }, { label: "Status", render: (item: any) => <Status value={item.status} /> }], { title: "No agreements", text: "No service agreements are linked to this property." })}
    {tab === "requests" && tabSurface("Service requests", "Requests and follow-up for this property.", workspace.requests, [{ label: "Request", render: (item: any) => item.description }, { label: "Received", render: (item: any) => stamp(item.created_at) }, { label: "Status", render: (item: any) => <Status value={item.status} /> }], { title: "No requests", text: "Requests will appear here." })}
    {tab === "projects" && tabSurface("Projects", "Property projects and phases.", workspace.projects, [{ label: "Project", render: (item: any) => <strong>{item.name}</strong> }, { label: "Scope", render: (item: any) => item.scope }, { label: "Status", render: (item: any) => <Status value={item.status} /> }], { title: "No projects", text: "Projects will appear here." })}
    {tab === "inspections" && tabSurface("Inspections", "Inspection records and observations.", workspace.inspections, [{ label: "Inspection", render: (item: any) => <strong>{item.title}</strong> }, { label: "Findings", render: (item: any) => `${Array.isArray(item.findings) ? item.findings.length : 0} observations` }, { label: "Date", render: (item: any) => stamp(item.created_at) }], { title: "No inspections", text: "Inspection records will appear here." })}
    {tab === "notes-files" && <div className="notes-layout">{canOpenClient && tabSurface("Internal notes", "Office-only account context for this property.", workspace.notes, [{ label: "Note", render: (item: any) => <><strong>{item.author_name || "Historical author unavailable"}</strong><p>{item.body}</p><small>{stamp(item.created_at)}</small></> }], { title: "No internal notes", text: "Notes scoped to this property will appear here." })}{tabSurface("Files", "Published property documents and photos.", workspace.files, [{ label: "File", render: (item: any) => <strong>{item.name}</strong> }, { label: "Type", render: (item: any) => item.mime }, { label: "Added", render: (item: any) => stamp(item.created_at) }], { title: "No files", text: "Files will appear here when they are available." })}</div>}
  </article>;
}

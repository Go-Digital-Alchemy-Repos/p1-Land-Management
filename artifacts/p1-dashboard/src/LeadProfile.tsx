import { useEffect, useRef, useState, type MouseEvent, type ReactNode } from "react";
import {
  getCommercialInquiry,
  getLeadDetails,
  getLeadFollowUp,
  listAgreementDrafts,
} from "@workspace/api-client-react/dashboard";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FileText,
  History,
  LayoutDashboard,
  Users,
} from "lucide-react";
import { CommercialAssessmentPanel } from "./CommercialAssessmentPanel";
import { CommercialContextPanel } from "./CommercialContextPanel";
import { CrmArchive } from "./CrmArchive";
import { CrmTasks } from "./CrmTasks";
import { EmailLink, PhoneLink } from "./contact-links";
import { LeadDetails } from "./LeadDetails";
import { LeadFollowUp } from "./LeadFollowUp";
import { LeadNotes } from "./LeadNotes";
import { LeadOnboarding } from "./LeadOnboarding";
import { PipelineStage } from "./PipelineSettings";
import type { LeadWorkspaceTab } from "./dashboard-routes";
import "./lead-profile.css";

type Details = Awaited<ReturnType<typeof getLeadDetails>>;
type FollowUp = Awaited<ReturnType<typeof getLeadFollowUp>>["lead"];
type Drafts = Awaited<ReturnType<typeof listAgreementDrafts>>["items"];

const tabs = [
  { id: "overview", label: "Overview", icon: LayoutDashboard, tone: "blue" },
  { id: "follow-up", label: "Follow-up", icon: CalendarDays, tone: "cyan" },
  { id: "details", label: "Inquiry details", icon: FileText, tone: "amber" },
  { id: "activity", label: "Activity", icon: History, tone: "violet" },
  { id: "assessment", label: "Assessment", icon: ClipboardList, tone: "green" },
  { id: "handoff", label: "Client handoff", icon: Users, tone: "rose" },
] as const;

function dateTime(value: string | null | undefined) {
  return value
    ? new Date(value).toLocaleString("en-US", {
        month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit",
      })
    : "Not set";
}

function Detail({ label, value }: { label: string; value: ReactNode }) {
  return <div className="lead-profile-fact"><dt>{label}</dt><dd>{value || "Not provided"}</dd></div>;
}

export function LeadProfile({
  id,
  tab,
  canOnboard,
  onTab,
}: {
  id: string;
  tab: LeadWorkspaceTab;
  canOnboard: boolean;
  onTab: (tab: LeadWorkspaceTab) => void;
}) {
  const [details, setDetails] = useState<Details | null>(null);
  const [followUp, setFollowUp] = useState<FollowUp | null>(null);
  const [owners, setOwners] = useState<Awaited<ReturnType<typeof getLeadFollowUp>>["owners"]>([]);
  const [drafts, setDrafts] = useState<Drafts | null>(null);
  const [commercial, setCommercial] = useState<"yes" | "no" | "unavailable">("no");
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState("");
  const generation = useRef(0);
  const heading = useRef<HTMLHeadingElement>(null);

  async function load() {
    const current = ++generation.current;
    setBusy(true);
    setError("");
    try {
      const [nextDetails, nextFollowUp, nextDrafts, intake] = await Promise.all([
        getLeadDetails(id),
        getLeadFollowUp(id),
        listAgreementDrafts({ leadId: id, limit: 20 }).catch(() => null),
        getCommercialInquiry(id).then(() => "yes" as const).catch((cause: { status?: number }) =>
          cause.status === 404 ? "no" as const : "unavailable" as const),
      ]);
      if (current !== generation.current) return;
      setDetails(nextDetails);
      setFollowUp(nextFollowUp.lead);
      setOwners(nextFollowUp.owners);
      setDrafts(nextDrafts?.items ?? null);
          setCommercial(intake);
    } catch (cause) {
      if (current === generation.current)
        setError((cause as { status?: number }).status === 404
          ? "This inquiry was not found. Check the link or return to Sales."
          : "Could not load this inquiry. Retry when the connection is available.");
    } finally {
      if (current === generation.current) setBusy(false);
    }
  }

  useEffect(() => {
    setDetails(null);
    setFollowUp(null);
    void load();
    return () => { generation.current++; };
  }, [id]);

  // Contact corrections increment the lead version. Re-read it before mounting
  // the versioned assessment editors when returning from another profile tab.
  useEffect(() => {
    if (tab === "assessment" && details) void load();
  }, [tab]);

  useEffect(() => {
    document.title = details ? `${details.name} · Sales · P1` : "Inquiry · Sales · P1";
  }, [details?.name]);

  useEffect(() => {
    if (!busy && details) heading.current?.focus({ preventScroll: true });
  }, [tab, busy, id]);

  function tabClick(event: MouseEvent<HTMLAnchorElement>, next: LeadWorkspaceTab) {
    if (event.button || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onTab(next);
  }

  const context = details?.submittedContext;
  const owner = owners.find((person) => person.id === followUp?.owner_id)?.name ||
    (followUp?.owner_id ? "Previous owner" : "Unassigned");
  const linkedClientId = followUp?.converted_client_id;
  const agreementHref = `/agreements/drafts?new=1&leadId=${encodeURIComponent(id)}`;
  const leadUrl = `/sales/leads/${encodeURIComponent(id)}`;

  return <section className="lead-profile" aria-label="Inquiry profile">
    <a className="lead-profile-back" href="/sales"><ArrowLeft size={16} aria-hidden="true" /> Sales overview</a>
    {error && <div className="lead-profile-error" role="alert"><p>{error}</p><button type="button" onClick={() => void load()}>Retry</button></div>}
    {busy && <p role="status">Loading inquiry profile…</p>}
    {!busy && !error && details && followUp && <>
      <header className="lead-profile-header">
        <div>
          <p className="lead-profile-eyebrow">SALES · INQUIRY PROFILE</p>
          <h1 ref={heading} tabIndex={-1}>{details.name}</h1>
          <p>{details.reported_company_name || "Company not provided"}{details.location ? ` · ${details.location}` : ""}</p>
        </div>
        <div className="lead-profile-header-actions">
          <span className="lead-profile-stage"><PipelineStage value={followUp.status} /></span>
          {linkedClientId && canOnboard && <a className="lead-profile-client" href={`/clients/${linkedClientId}`}><Users size={17} aria-hidden="true" /> Open client profile <ArrowUpRight size={15} aria-hidden="true" /></a>}
        </div>
      </header>
      <nav className="workspace-tabs lead-profile-tabs" aria-label="Inquiry sections">
        {tabs.filter((item) => (item.id !== "assessment" || commercial !== "no") && (item.id !== "handoff" || canOnboard)).map((item) => {
          const Icon = item.icon;
          return <a key={item.id} href={`${leadUrl}${item.id === "overview" ? "" : `/${item.id}`}`} onClick={(event) => tabClick(event, item.id)} aria-current={tab === item.id ? "page" : undefined} className={tab === item.id ? "active" : ""}>
            <span className={`workspace-tab-icon workspace-tab-icon--${item.tone}`} aria-hidden="true"><Icon size={17} strokeWidth={1.8} /></span>{item.label}
          </a>;
        })}
      </nav>

      {tab === "overview" && <div className="lead-profile-layout">
        <div className="lead-profile-main">
          <section className="lead-profile-surface" aria-labelledby="lead-next-title">
            <div className="lead-profile-surface-heading"><div><p className="lead-profile-eyebrow">NEXT STEP</p><h2 id="lead-next-title">Keep this inquiry moving</h2></div><button type="button" onClick={() => onTab("follow-up")}>Edit follow-up</button></div>
            <p className="lead-profile-next-action">{followUp.next_action || "No next action recorded yet."}</p>
            <dl className="lead-profile-facts lead-profile-facts--compact"><Detail label="Owner" value={owner} /><Detail label="Due" value={dateTime(followUp.next_action_due_at)} /><Detail label="Last activity" value={dateTime(followUp.last_activity_at)} /></dl>
          </section>
          <section className="lead-profile-surface" aria-labelledby="lead-story-title">
            <div className="lead-profile-surface-heading"><div><p className="lead-profile-eyebrow">REQUEST</p><h2 id="lead-story-title">What they told us</h2></div><button type="button" onClick={() => onTab("details")}>Review details</button></div>
            <p className="lead-profile-message">{details.description || "No message was recorded."}</p>
            <dl className="lead-profile-facts"><Detail label="Location" value={details.location} /><Detail label="Property or project" value={context?.reported_property_name} /><Detail label="Property type" value={context?.property_type} /><Detail label="Approximate acreage" value={context?.acreage_description} /><Detail label="Services of interest" value={context?.services?.join(", ")} /><Detail label="Timing" value={context?.service_timing} /></dl>
          </section>
          <section className="lead-profile-surface" aria-labelledby="lead-agreement-title">
            <div className="lead-profile-surface-heading"><div><p className="lead-profile-eyebrow">COMMERCIAL PROGRESS</p><h2 id="lead-agreement-title">Agreement work</h2></div><a href={agreementHref}>New draft <ArrowUpRight size={15} aria-hidden="true" /></a></div>
            {drafts === null ? <p className="muted">Agreement draft status is unavailable. Open agreement drafts to check the latest work.</p> : drafts.length ? <ul className="lead-profile-drafts">{drafts.map((draft) => <li key={draft.id}><a href={`/agreements/drafts/${draft.id}`}>{draft.title}</a><span>{draft.status}</span></li>)}</ul> : <p className="muted">No agreement draft is linked to this inquiry yet. Won records the sales outcome; agreement signing is tracked separately.</p>}
          </section>
        </div>
        <aside className="lead-profile-side">
          <section className="lead-profile-surface" aria-labelledby="lead-contact-title"><h2 id="lead-contact-title">Contact</h2><dl className="lead-profile-facts lead-profile-facts--stack"><Detail label="Name" value={details.name} /><Detail label="Email" value={details.email ? <EmailLink email={details.email} /> : null} /><Detail label="Phone" value={details.phone ? <PhoneLink phone={details.phone} /> : null} /><Detail label="Company" value={details.reported_company_name} /></dl></section>
          <section className="lead-profile-surface" aria-labelledby="lead-path-title"><h2 id="lead-path-title">From lead to client</h2><ol className="lead-profile-journey"><li className="done"><CheckCircle2 size={17} aria-hidden="true" /> Inquiry received</li><li className={followUp.status === "won" ? "done" : ""}><CheckCircle2 size={17} aria-hidden="true" /> Sales outcome: {followUp.status === "won" ? "Won" : "in progress"}</li><li className={linkedClientId ? "done" : ""}><Users size={17} aria-hidden="true" /> {linkedClientId ? "Client linked" : "Client handoff pending"}</li></ol>{canOnboard && !linkedClientId && <button type="button" onClick={() => onTab("handoff")}>{followUp.status === "won" ? "Review client handoff" : "View handoff requirements"}</button>}</section>
        </aside>
      </div>}

      {tab === "follow-up" && <section className="lead-profile-surface lead-profile-focus"><p className="lead-profile-eyebrow">SALES OPERATIONS</p><h2>Owner, stage & next action</h2><p className="muted">Make one focused update. Won records the sales result and leaves agreement signing as a separate step.</p><LeadFollowUp key={id} leadId={id} onSaved={setFollowUp} initiallyOpen /></section>}
      {tab === "details" && <section className="lead-profile-surface lead-profile-focus"><p className="lead-profile-eyebrow">INQUIRY RECORD</p><h2>Contact & submitted details</h2><LeadDetails key={id} leadId={id} onSaved={setDetails} initiallyOpen /></section>}
      {tab === "activity" && <div className="lead-profile-activity"><section className="lead-profile-surface"><h2>Notes</h2><LeadNotes leadId={id} /></section><section className="lead-profile-surface"><h2>Follow-up tasks</h2><CrmTasks kind="lead" parentId={id} /></section><section className="lead-profile-surface"><h2>Imported history</h2><CrmArchive kind="lead" parentId={id} /></section></div>}
      {tab === "assessment" && commercial === "yes" && <div className="lead-profile-activity"><section className="lead-profile-surface"><h2>Prospect context</h2><CommercialContextPanel key={id} leadId={id} leadVersion={followUp.version} onMutationAck={({ expectedVersion, newVersion }) => setFollowUp((current) => current?.version === expectedVersion ? { ...current, version: newVersion } : current)} /></section><section className="lead-profile-surface"><h2>Site assessment</h2><CommercialAssessmentPanel key={`${id}:${followUp.version}`} leadId={id} leadVersion={followUp.version} disabled={false} onLeadMutationAck={({ expectedVersion, newVersion }) => setFollowUp((current) => current?.version === expectedVersion ? { ...current, version: newVersion } : current)} /></section></div>}
      {tab === "assessment" && commercial === "unavailable" && <section className="lead-profile-surface" role="alert"><h2>Assessment unavailable</h2><p>The inquiry loaded, but its commercial assessment could not be checked. Retry before deciding whether this inquiry has an assessment.</p><button type="button" onClick={() => void load()}>Retry assessment</button></section>}
      {tab === "handoff" && canOnboard && <section className="lead-profile-surface lead-profile-focus"><p className="lead-profile-eyebrow">CLIENT TRANSITION</p><h2>Review the customer handoff</h2><p className="muted">The inquiry stays in Sales with its original history. Link an existing customer or create a new one after Won; property and agreement setup continue in the client workspace.</p><LeadOnboarding key={id} leadId={id} suggestedCustomer={{ name: details.reported_company_name || details.name, email: details.email, phone: details.phone }} onSaved={() => void load()} initiallyOpen />{linkedClientId && <a className="lead-profile-client" href={`/clients/${linkedClientId}`}>Continue in client profile <ArrowUpRight size={15} aria-hidden="true" /></a>}</section>}
      {tab === "handoff" && !canOnboard && <section className="lead-profile-surface"><p>You do not have access to customer handoff.</p></section>}
      {tab === "assessment" && commercial === "no" && <section className="lead-profile-surface"><p>No commercial assessment is associated with this inquiry.</p></section>}
    </>}
  </section>;
}

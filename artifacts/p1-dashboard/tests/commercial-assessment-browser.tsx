import { createRoot } from "react-dom/client";
import { CommercialAssessmentPanel } from "../src/CommercialAssessmentPanel";
import "../src/style.css";

const leadId = "00000000-0000-4000-8000-000000000001";
const propertyId = "00000000-0000-4000-8000-000000000002";
const assessmentId = "00000000-0000-4000-8000-000000000003";
const slotId = "00000000-0000-4000-8000-000000000004";
const now = "2026-09-15T14:00:00.000Z";
let exists = false;
let leadVersion = 1;
let appointment: any = null;
let detail: any = {
  id: assessmentId, lead_id: leadId, property_id: propertyId,
  title: "Carolinas campus assessment", status: "draft", version: 1,
  scope_note: "Document exterior conditions before any proposal or operational handoff.",
  findings: [], recommendations: [], reviews: [], appointments: [],
  created_at: now, updated_at: now,
};
const syncAppointments = () => { detail = { ...detail, appointments: appointment ? [appointment] : [] }; };
const api: any = {
  list: async () => exists ? [{ ...detail }] : [],
  create: async (_lead: string, input: any) => {
    exists = true;
    detail = { ...detail, title: input.title, scope_note: input.scopeNote || null };
    leadVersion += 1;
    return { assessmentId, leadId, version: 1, leadVersion, propertyId };
  },
  get: async () => { syncAppointments(); return structuredClone(detail); },
  update: async (_lead: string, _assessment: string, input: any) => {
    if (input.expectedVersion !== detail.version) throw new Error("Assessment changed; refresh before saving");
    detail = {
      ...detail, version: detail.version + 1, title: input.title, scope_note: input.scopeNote,
      findings: input.findings.map((item: any, index: number) => ({ ...item, id: `finding-${index}` })),
      recommendations: input.recommendations.map((item: any, index: number) => ({ ...item, id: `recommendation-${index}`, finding_id: item.findingIndex === null ? null : `finding-${item.findingIndex}` })),
    };
    return structuredClone(detail);
  },
  review: async (_lead: string, _assessment: string, input: any) => {
    if (input.expectedVersion !== detail.version) throw new Error("Assessment changed; refresh before review");
    detail = { ...detail, status: "reviewed", version: detail.version + 1, reviews: [{ assessment_version: detail.version + 1, created_at: now }] };
    return structuredClone(detail);
  },
  archive: async (_lead: string, _assessment: string, input: any) => {
    if (appointment?.status === "confirmed") throw new Error("Cancel the confirmed appointment before archiving this assessment");
    detail = { ...detail, status: "archived", version: detail.version + 1, archive_reason: input.reason };
    return structuredClone(detail);
  },
  listSlots: async () => appointment?.status === "confirmed" ? [] : [{ id: slotId, starts_at: "2026-09-17T14:00:00.000Z", ends_at: "2026-09-17T15:00:00.000Z" }],
  bookAppointment: async (_lead: string, _assessment: string, input: any) => {
    appointment = { id: "00000000-0000-4000-8000-000000000005", slot_id: input.slotId, property_id: propertyId, status: "confirmed", version: 1, created_at: now, updated_at: now };
    return { appointmentId: appointment.id, assessmentId, propertyId, slotId: input.slotId, startsAt: "2026-09-17T14:00:00.000Z", endsAt: "2026-09-17T15:00:00.000Z" };
  },
  cancelAppointment: async (_lead: string, _assessment: string, id: string, input: any) => {
    if (!appointment || id !== appointment.id || input.expectedAppointmentVersion !== appointment.version) throw new Error("Appointment changed; refresh before cancelling");
    appointment = { ...appointment, status: "cancelled", version: 2, cancellation_reason: input.reason };
    return { appointmentId: id, assessmentId, status: "cancelled", version: 2 };
  },
};

createRoot(document.getElementById("root")!).render(
  <CommercialAssessmentPanel
    leadId={leadId}
    leadVersion={leadVersion}
    disabled={false}
    api={api}
    onLeadMutationAck={({ newVersion }) => { leadVersion = newVersion; }}
  />,
);

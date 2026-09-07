import {
  crmLeadInputSchema,
  type CrmClient,
  type CrmLead,
  type CrmLeadInput,
  type InsertCrmClient,
  type InsertCrmLead,
} from "@shared/schema";
import { storage } from "../storage";

function cleanString(value: string | null | undefined) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed || null;
}

function valueToString(value: unknown): string | null {
  if (typeof value === "string") return cleanString(value);
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const parts = [record.firstName, record.lastName, record.name]
      .map((part) => valueToString(part))
      .filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : null;
  }
  return null;
}

export function inferCrmLeadFromFormData(
  data: Record<string, unknown>,
): Pick<CrmLeadInput, "name" | "email" | "phone" | "company" | "message"> {
  const name =
    valueToString(data.name) ||
    valueToString(data.fullName) ||
    [valueToString(data.firstName), valueToString(data.lastName)].filter(Boolean).join(" ") ||
    valueToString(data.email) ||
    "Website Lead";

  return {
    name,
    email: valueToString(data.email),
    phone: valueToString(data.phone) || valueToString(data.tel),
    company: valueToString(data.company) || valueToString(data.organization),
    message:
      valueToString(data.message) || valueToString(data.comments) || valueToString(data.details),
  };
}

export function normalizeCrmLeadInput(input: unknown) {
  const parsed = crmLeadInputSchema.parse(input);
  return {
    ...parsed,
    email: cleanString(parsed.email),
    phone: cleanString(parsed.phone),
    company: cleanString(parsed.company),
    message: cleanString(parsed.message),
    externalId: cleanString(parsed.externalId),
    ownerId: cleanString(parsed.ownerId),
    formSubmissionId: cleanString(parsed.formSubmissionId),
    nextFollowUpAt: parsed.nextFollowUpAt ?? null,
  };
}

export async function createOrUpdateCrmLead(
  input: unknown,
  createdById?: string | null,
): Promise<{ lead: CrmLead; duplicate: boolean }> {
  const payload = normalizeCrmLeadInput(input);
  return storage.crm.createOrUpdateInboundLead(payload, createdById);
}

export async function createCrmLeadFromFormSubmission({
  formName,
  formSubmissionId,
  data,
}: {
  formName: string;
  formSubmissionId: string;
  data: Record<string, unknown>;
}) {
  return createOrUpdateCrmLead({
    ...inferCrmLeadFromFormData(data),
    source: "website_form",
    formSubmissionId,
    formData: data,
    metadata: { formName },
  });
}

function buildWonLeadClient(lead: CrmLead): InsertCrmClient {
  const clientType = cleanString(lead.company) ? "business" : "individual";
  const now = new Date();
  return {
    sourceLeadId: lead.id,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    company: lead.company,
    clientType,
    primaryEmail: lead.email,
    primaryPhone: lead.phone,
    preferredContactMethod: lead.email ? "email" : lead.phone ? "phone" : "no_preference",
    companyName: lead.company,
    onboardingStatus: "not_started",
    clientSince: now,
    status: "onboarding",
    source: lead.source,
    formData: lead.formData ?? {},
    metadata: {
      ...(lead.metadata ?? {}),
      convertedFromLeadId: lead.id,
      convertedAt: new Date().toISOString(),
    },
    ownerId: lead.ownerId,
    nextFollowUpAt: lead.nextFollowUpAt,
  };
}

export async function updateCrmLead(
  id: string,
  data: Partial<InsertCrmLead>,
  createdById?: string | null,
): Promise<CrmLead | undefined> {
  if (data.stage !== "won") return storage.crm.updateLead(id, data);
  const result = await storage.crm.updateLeadAndCreateWonClient(
    id,
    data,
    buildWonLeadClient,
    createdById,
  );
  return result?.lead;
}

export async function ensureClientForWonLead(
  lead: CrmLead,
  createdById?: string | null,
): Promise<CrmClient> {
  const existing = await storage.crm.getClientBySourceLeadId(lead.id);
  if (existing) return existing;

  const client = await storage.crm.createClient(buildWonLeadClient(lead));

  await storage.crm.createNote({
    leadId: lead.id,
    createdById: createdById ?? null,
    body: "Lead converted to client after moving to Won.",
  });
  await storage.crm.createClientNote({
    clientId: client.id,
    createdById: createdById ?? null,
    body: "Client created from won lead.",
  });

  return client;
}

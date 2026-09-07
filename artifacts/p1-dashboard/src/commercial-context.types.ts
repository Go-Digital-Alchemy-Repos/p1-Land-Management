export type ContextMutationAck = {
  leadId: string;
  expectedVersion: number;
  newVersion: number;
};
export type Candidate = {
  id: string;
  name?: string;
  display_name?: string;
  legal_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string;
  client_id?: string | null;
  lifecycle?: "prospect" | "operational";
  location_precision?: string | null;
  version: number;
};
export type Context = {
  lead: {
    id: string;
    version: number;
    status: string;
    organization_id: string | null;
    contact_id: string | null;
    property_id: string | null;
  };
  intake: { submission_id: string; raw_intake: Record<string, unknown> } | null;
  organization: (Candidate & { archived: boolean }) | null;
  contact:
    | (Candidate & {
        archived: boolean;
        reviewed_by: string | null;
        reviewed_at: string | null;
        channel_source: string | null;
      })
    | null;
  property: (Candidate & { archived: boolean; acreage: string | null }) | null;
};
export type ContactValues = {
  name: string;
  email: string | null;
  phone: string | null;
  source: string;
};
export type ContextInput = {
  operationId: string;
  expectedVersion: number;
  organization:
    | { existingId: string }
    | { create: { displayName: string; legalName: null; clientId: null } };
  contact: { existingId: string } | { create: ContactValues };
  contactRole:
    | "requester"
    | "site_manager"
    | "facilities"
    | "procurement"
    | "owner_representative"
    | "other";
  title: string | null;
  source: string;
  property:
    | null
    | { existingId: string }
    | {
        create: {
          name: string;
          address: string;
          locationPrecision: "region" | "approximate" | "confirmed";
          acreage: number | null;
        };
      };
  propertyRole:
    | "reported_owner"
    | "operator"
    | "manager"
    | "developer"
    | "prospective_customer"
    | "other";
};
export type ContextResult = {
  leadId: string;
  version: number;
  organizationId: string;
  contactId: string;
  propertyId: string | null;
};
export type ReviewInput = {
  expectedVersion: number;
  contactVersion: number;
  contact: ContactValues;
};
export type ReviewResult = {
  leadId: string;
  version: number;
  contactId: string;
  contactVersion: number;
};
export type SearchKind = "organizations" | "contacts" | "properties";
export type ContextTransport = {
  get: (id: string) => Promise<Context>;
  save: (id: string, body: ContextInput) => Promise<ContextResult>;
  review: (id: string, body: ReviewInput) => Promise<ReviewResult>;
  search: (query: {
    kind: SearchKind;
    q: string;
    limit: number;
    after?: string;
  }) => Promise<{ items: Candidate[]; nextCursor: string | null }>;
};
export class ContextError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
async function request<T>(
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const response = await fetch("/api/v1" + path, {
    method,
    credentials: "include",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await response.json().catch(() => null);
  if (!response.ok)
    throw new ContextError(
      data?.message || data?.error || "The request could not be completed.",
      response.status,
    );
  return data as T;
}
export const contextTransport: ContextTransport = {
  get: (id) =>
    request(`/commercial-inquiries/${encodeURIComponent(id)}/context`),
  save: (id, body) =>
    request(
      `/commercial-inquiries/${encodeURIComponent(id)}/context`,
      "POST",
      body,
    ),
  review: (id, body) =>
    request(
      `/commercial-inquiries/${encodeURIComponent(id)}/contact-review`,
      "PATCH",
      body,
    ),
  search: (query) =>
    request(
      "/commercial-context/search?" +
        new URLSearchParams(
          Object.entries(query).map(([k, v]) => [k, String(v)]),
        ),
    ),
};

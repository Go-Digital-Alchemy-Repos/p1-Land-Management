# Proposed COM-04 commercial inquiry handoff contract

Status: Orchestrator approved the initial ingress/inbox/lead/Core-outbox implementation on September7,2026; implementation is in progress, not deployed. Dashboard migration0010_commercial_intake.sql is reserved after scheduling-owner confirmation. Explicit relational prospect resolution remains a later implementation slice under this contract. Code/schema inspected September7,2026. COM-03 currently accepts durable commercial inquiries in P1 Core only. This proposal preserves the Core receipt, existing dashboard `lead` model, separate databases and canonical-auth work. It does not authorize deployment or create another public CRM.

## Existing behavior and constraints

- Core accepts `p1-commercial-assessment` with the reviewed validator in `platform/p1-core/server/services/p1-commercial-assessment.ts`. `forms.createSubmissionWithEffects` commits receipt and effect rows together. Jobs have stable IDs, per-submission effect uniqueness, claim tokens, retry counts and recovery after worker interruption. CRM deduplicates by submission identity; matching email/phone does not collapse different projects.
- Dashboard `lead` currently has name, **required email**, phone, location, description, source, status and optional converted-client/property links. There is no company, opportunity or external-inbox model. `lead.email` must become nullable before accepting phone-only inquiries; no fabricated email is permitted.
- Dashboard `contact` requires `client_id` and now has archived/version fields (migration0008). `property` also requires an operational client. These cannot represent every prospect without a deliberate extension.
- Dashboard estimate requires operational property; assessment slots are scheduling primitives. A received inquiry must not automatically create a client, property, appointment, estimate, QuickBooks customer, auth user, invitation or access grant.
- Audit events already allow null user_id, so authenticated integration actions can be audited as a service principal without a synthetic staff user.

## Exact v1 event and endpoint

Proposed endpoint: `POST /api/integrations/core/v1/commercial-inquiries`. This is a dedicated authenticated service endpoint, not `/api/v1/leads` and not a second browser submission. Register its raw-body parser/authentication narrowly before ordinary browser Origin middleware; do not exempt other APIs or accept a session cookie as service authentication.

```ts
type CommercialInquiryAcceptedV1 = {
  eventType: "p1.commercial_inquiry.accepted";
  schemaVersion: 1;
  eventId: string;             // UUID; stable bridge effect ID
  source: "p1-core";
  sourceInstanceId: string;    // UUID; immutable installation identity, distinct staging/production
  submissionId: string;        // UUID; authoritative Core receipt
  acceptedAt: string;          // UTC ISO timestamp from committed Core receipt
  formSlug: "p1-commercial-assessment";
  inquiry: {
    inquiryType: "commercial_site_assessment";
    name: string; company: string;
    email: string | null; phone: string | null;
    title: string | null; propertyName: string | null;
    address: string; propertyType: string | null; acreage: string | null;
    services: string[];
    projectStage: "development_construction" | "turnover_establishment" |
                  "long_term_operations" | "unknown";
    serviceTiming: "immediate" | "recurring" | "both";
    message: string | null;
    attribution: Record<string, string>;
  };
};
```

Use COM-03 validation limits unchanged: name150, company300, email254, phone50 with7–15 digits, title150, propertyName300, location500, propertyType150, acreage100, services1–12 strings≤100, message5000, attribution≤12 flat string entries each≤2048 and bounded keys. Empty optional strings normalize to null in this event; omitted attribution becomes `{}`. At least one valid contact channel is required. `general_site_assessment` is a valid need. Strict schemas reject unknown envelope/inquiry keys, nested attribution and attachments. Do not forward the honeypot, browser cookies, IP addresses, auth IDs or browser idempotency key. Maximum raw request64KiB; reject before JSON parsing when exceeded.

Generate/freeze this envelope in the existing Core acceptance transaction when adding the bridge effect: allocate its stable job UUID and use the newly inserted receipt's ID/createdAt. Store the immutable envelope with effect kind `commercial_dashboard_intake`; retries must not rebuild it from mutable form settings or subsequently edited lead data. Seed/source settings contain only nonsecret installation identity; signing credentials remain server-side. Existing `crm_intake` and notification effects remain separate.

After the dashboard commits, respond201 for a new mapping or200 for an identical replay:

```json
{"schemaVersion":1,"eventId":"uuid","submissionId":"uuid","leadId":"uuid","receivedAt":"UTC ISO timestamp","duplicate":false}
```

No response claims qualification, booking, company matching or delivery to a human. Return400 malformed payload,401/403 invalid/disabled issuer credentials,409 reused identity with different content,413 excessive body,429 limits,503 transient dependency failure. Errors contain stable codes and correlation IDs, never submitted contact fields.

## Signature, replay and revocation boundary

Use a deployment-specific256-bit random HMAC secret, not a user/session/SSO/provider secret. Headers: `X-P1-Key-Id`, `X-P1-Sent-At` (Unix seconds), `X-P1-Signature` (64 lowercase hex characters). Sign this exact UTF-8 string with HMAC-SHA256:

```text
POST\n/api/integrations/core/v1/commercial-inquiries\n<keyId>\n<sentAt>\n<sha256(rawBodyBytes)>
```

No query string is accepted. Reject timestamps outside±300seconds, malformed signatures, untrusted sourceInstanceId and wrong audience/path. Compare equal-length decoded signatures in constant time. Verify against raw bytes before parsing any business payload. A retry retains identical event bytes but uses a fresh timestamp/signature. Replay within the validity window is deliberately harmless: the inbox fingerprint/identity transaction returns the original result and creates no additional lead, action or audit. No claim of exactly-once network delivery is made.

Use a fixed configured HTTPS dashboard ingress URL with explicit hostname allowlist, request timeout and redirect rejection. Do not accept a destination URL from the form/event. Railway private networking may be used behind an approved encrypted ingress arrangement; do not send contact data to arbitrary URLs or infer transport safety from a hostname.

Proposed metadata table `integration_ingress_key(key_id PK, source_instance_id UUID, enabled BOOLEAN, created_at, revoked_at)`. Secrets are an environment/secret-store key-ID map, not this table. Verify enabled/nonrevoked metadata on every request, including duplicate requests, so owner revocation takes effect without relying on stale cached user sessions. Owner-only audited enable/revoke actions; provisioning new secret material remains deployment-controlled. Permit a short explicit overlap of active old/new keys for rotation, then revoke old. Stage/prod keys and allowed source IDs are disjoint. Loss/revocation leaves Core delivery pending/failed with a recoverable receipt; it does not disable public acceptance.

## Inbox and existing-lead transaction

Proposed `commercial_intake_receipt` columns:

- id UUID PK; source_instance_id UUID; submission_id UUID; event_id UUID; schema_version SMALLINT; payload_sha256 CHAR(64); accepted_at TIMESTAMPTZ; received_at TIMESTAMPTZ.
- lead_id UUID NOT NULL FK lead, unique; raw_intake JSONB containing only the validated bounded event.
- UNIQUE(source_instance_id,event_id) and UNIQUE(source_instance_id,submission_id). Different events cannot produce a second lead for the same receipt. Never use contact email/domain as the lead uniqueness key.

Authenticate first. In one PostgreSQL transaction, take an advisory lock for source-instance/submission identity, look up either identity, reject conflicting hashes/identity combinations, otherwise create the existing lead, insert receipt/mapping and append `commercial.intake_received` audit. The event-ID unique constraint handles a conflicting event ID across submissions; a uniqueness conflict rolls the transaction back, then is classified by reading the existing receipt. A duplicate returns the original mapping without reapplying changes or resetting owner/stage/next-action. A crash before commit yields no partial lead; a crash after commit before response is safely retried.

Map name→lead.name, nullable email/phone→their columns, address→location, message or empty string→description, source=`website_form`, status=`new`. Add structured lead columns: inquiry_type, reported_company_name, contact_title, reported_property_name, property_type, acreage_description, project_stage, service_timing, services TEXT[], attribution JSONB; owner_id FK active staff user, next_action TEXT, next_action_due_at, last_activity_at, version INTEGER. Reported strings are unverified submission facts, not authoritative legal-company identity. Preserve existing noncommercial leads and converted IDs. Add a channel constraint only to commercial leads if legacy rows lack usable channels; do not manufacture backfill data.

## Explicit relational prospect resolution

Initial handoff creates only inbox+lead+audit. Staff resolving an account must see suggestions and choose reuse/create; no automatic company/person merge by domain or name. This prevents one company per browser request and avoids premature billing records.

Proposed additive sales entities and links:

| Table/change | Concrete responsibility |
| --- | --- |
| `sales_company` | id, display_name, legal_name nullable, domain nullable, industry nullable, parent_company_id nullable, linked_client_id nullable FK existing client, owner_id nullable, status prospect/qualified/customer/archived, version, timestamps. No uniqueness by domain alone. |
| Existing `contact` extension | Make client_id nullable; add primary_sales_company_id nullable and title nullable. CHECK at least one of client_id/primary_sales_company_id exists. Retain id, name, optional email/phone, kind, archived/version. Existing customer-contact APIs still require their existing client authorization and must never expose prospect-only contacts to client/crew roles. This reuses the person model rather than creating an unrelated second contact store. |
| `sales_company_contact_role` | id, company_id, contact_id, role (decision_maker/facilities/procurement/owner_representative/site_contact/other), effective_from/to nullable, source, verified_at nullable; multiple time-bounded roles allowed. Relationships convey no access grants. |
| `prospect_site` | id, name nullable, reported_location, location_precision region/address/verified_site, acreage_description nullable, verified_acreage nullable numeric, property_type nullable, linked_property_id nullable FK operational property, version/timestamps. No fake coordinates or client FK. |
| `sales_company_site_role` | company_id, prospect_site_id, role owner/operator/developer/manager/other, evidence/source and effective dates. Supports separate owner/operator/manager and multi-site organizations. |
| Existing `lead` links | nullable sales_company_id, primary_contact_id and prospect_site_id; resolution updates these and audit atomically with expectedVersion. Keep original reported fields/inbox snapshot unchanged. |
| `sales_opportunity` | id, company_id, title, scope, services, pursuit_stage, owner_id, next_action/due_at, estimated_value_min/max nullable, currency nullable, value_source/date nullable, loss_defer_reason nullable, version/timestamps. Created on explicit qualification/pursuit, not every delivery. |
| `sales_opportunity_lead` / `sales_opportunity_site` | Explicit many-to-many links: preserve multiple inquiries for one opportunity and multiple sites where a portfolio pursuit needs them. |
| `sales_opportunity_stakeholder` | opportunity_id, contact_id, company_id nullable, role and provenance; no implicit permissions. |
| Estimate link | nullable sales_opportunity_id on existing estimate, preserving series/revision/change-order semantics. Still create an operational property only through audited staff promotion before using existing estimate/assessment workflows. |

The contact nullability extension is a material reviewed compatibility change, not permission to loosen all contact routes. COM-04 MVP can ship inbox+structured lead+company/contact/site resolution first; opportunity tables require an explicit implementation slice and UI review. Do not label the full pursuit graph delivered if deferred. Operational client/property conversion remains an idempotent staff action; change existing `/leads/:id/convert` to reuse explicit existing-property links instead of always inserting another property. No identity/access/QuickBooks side effects belong in sales resolution.

Core remains authoritative for receipt and delivery status. Dashboard becomes authoritative for assigned follow-up, qualification and opportunities after handoff. Core CRM should display a linked/handoff status, not continue as a competing editable opportunity pipeline. Any dashboard-to-Core status summary is a later separately authenticated, versioned and idempotent projection; no two-way field overwrite loop.

## Staff visibility and recovery

Dashboard reuse `/api/v1/leads` with inquiryType/status/owner/overdue filters and cursor pagination. Add guarded `GET /api/v1/leads/:id/intake` (validated snapshot and external receipt for owner/manager/sales), `PATCH /api/v1/leads/:id/follow-up` (expectedVersion, ownerId, nextAction, dueAt, allowed status), and `POST /api/v1/leads/:id/resolve` (expectedVersion, explicit existing/new company/contact/site choices, stable operationId). Resolve persists its own actor+payload-fingerprint result ledger so retried UI actions cannot duplicate prospects. Never let inactive/non-sales users be assigned by unchecked IDs. Existing browser Origin/auth/MFA requirements continue to apply.

Dashboard commercial queue must show unassigned count, owner, next action/due date, last activity, receipt/source and linked records. Owner/manager/sales can review; client/crew roles cannot enumerate intake or prospect records. Other office-role access should remain explicitly defined rather than inheriting every new sensitive endpoint from a broad office constant.

Core extend the existing form-delivery-jobs view to show commercial bridge queued/processing/failed/completed state, attempt count, sanitized error code, receipt reference, age and accepted lead mapping. Add a narrow receipt/detail view restricted to forms/CRM staff. Reuse existing protected job retry endpoint; retry same job/event, audit actor, never change immutable event content. Manual retry of a409 payload conflict requires diagnosis, not payload editing. Authentication/contract failures surface actionable codes; transient timeouts/429/5xx use backoff and eventually terminal failed state with visible recovery. Preserve existing independent email/CRM jobs.

Core success receipt continues while dashboard is unavailable. Dashboard cannot show messages it never received, so an assigned Core processing queue and pending-delivery visibility are essential until acknowledgement. Alert/queue state must not imply human contact occurred.

## Migration and rollout coordination

Observed dashboard migrations currently end at `0009_assessment_availability.sql`; schedule work is active. **Reserved by the Orchestrator and dashboard owner:** `0010_commercial_intake.sql` for inbox/key metadata/lead compatibility, followed by a separately allocated prospect-relations migration. Update `lib/db/src/dashboard/schema.ts` and migration replay evidence together; no generated snapshot overwrite of another owner's work.

Core currently has `p1-migrations/0000_p1_foundation.sql`. Reusing the effect payload union needs no destructive table change. A new per-job accepted-result table or column should be assigned the next migration only after coordinating with the SSO migration owner. Suggested `commercial_handoff_result(job_id PK FK cms_form_effect_jobs, dashboard_lead_id UUID, received_at, response_version)` avoids embedding mutable receipt results into the immutable outbound event. Completion and result storage commit together after a validated response from the authenticated destination. A stale worker token may not mark another worker's claim complete.

Deploy dashboard compatible schema/receiver first; configure disabled ingress metadata and stage-test signatures. Deploy Core schema/effect code with handoff initially disabled visibly, provision keys, enable dashboard issuer and Core emission. Existing unbridged commercial receipts require an explicit audited backfill that inserts one missing bridge effect per receipt; never repost them through the public form. Rollback disables delivery/emission but preserves accepted receipts and jobs; do not drop populated tables or recreate leads. Back up both isolated databases and document version/order before rollout.

No automatic deletion until owner-approved retention rules exist. Recommend separately reviewing raw-intake retention, long-lived minimal idempotency receipt retention and archived prospect retention; deleting deduplication keys while replay remains possible would recreate leads. Logs contain correlation/receipt IDs, status and error class only—not email, phone, message, signature or body. Snapshot access and backups remain privileged.

## Acceptance required before COM-04 completion

1. Shared strict event fixtures, phone-only/null-email compatibility and existing estimate/noncommercial regression coverage.
2. Valid signature accepted; bad signature, timestamp, issuer, key revocation, cross-environment source, oversized/malformed body and arbitrary destination rejected; no browser/session bypass.
3. Parallel repeated event returns one lead/receipt/audit; changed hash conflicts; same person/two receipts yields two leads; replays do not reset staff changes.
4. Crash before/after transaction commit and Core completion; lost response; worker restart; dashboard outage;429; revoked key; notification failure: no lost receipt, visible retry/recovery, one mapping.
5. Explicit company/contact/site reuse and operation-key retries; prospect-only contacts remain private; no client/user/access/QBO creation by intake.
6. Assigned commercial queue and overdue/next-action UI, failed-delivery recovery with audited retry; public form still makes one request and reports durable receipt only.
7. Staging synthetic inquiry through Core→dashboard and original project details verified, followed by backup/restore rehearsal and exact deployed revisions. No real outreach/provider subscription required.


## Implementation review decisions — September 7

Core migration `0001_commercial_handoff.sql` is reserved for frozen delivery bytes and validated delivery results; SSO must use0002 or later after coordination. The immutable inquiry snapshot is committed with acceptance. Exact wire bytes freeze under the active delivery claim before first send, allowing missing deployment credentials to leave a recoverable job instead of rejecting the public inquiry. Retries reuse those bytes; a changed source identity fails explicitly.

The dashboard commercial list uses `{items,nextCursor}`, default50/max200, opaque filter-bound cursors, and `created_at DESC,id DESC` ordering with PostgreSQL microsecond precision. Filters include status, owner (including unassigned), and overdue follow-up. Filters reset pagination. The Core job monitor must also make older failed and pending jobs reachable rather than silently truncate at200.

Independent review requires commercial-role restrictions through every route, including the legacy general lead list; dispatch and finance retain ordinary-lead access without receiving restricted commercial inquiry fields. Existing conversion must increment the commercial lead version and activity timestamp so stale follow-up writes cannot overwrite conversion. Both findings require mounted authorization/conflict regressions before deployment. No automatic client/account/access creation is introduced by intake.

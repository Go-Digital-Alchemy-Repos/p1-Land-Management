# Initial prospect linking API and operational boundary

Implementation candidate for the approved prospect lifecycle/inventory. Dashboard owns reviewed context; Core and the dashboard receipt retain immutable intake. This slice does not implement prospective booking, assessment reports, proposals, onboarding or external communications.

## Staff API

Every endpoint below is under `/api/v1` and requires owner, manager or sales. Existing session/origin/MFA boundaries are unchanged.

`GET /commercial-inquiries/:id/context` returns `{lead,intake,organization,contact,property}`. `lead` has id/status/version/organization_id/contact_id/property_id. `intake` contains submission_id and the immutable raw_intake. Organization returns id/display_name/legal_name/client_id/archived/version. Contact returns id/client_id/name/email/phone/archived/version/reviewed_by/reviewed_at/channel_source. Property returns id/name/address/acreage/client_id/lifecycle/location_precision/archived/version. Unlinked entities are null. Prospect client_id and optional contact email are null, never invented.

`POST /commercial-inquiries/:id/context` accepts the strict shape:

```json
{
  "operationId": "UUID",
  "expectedVersion": 1,
  "organization": {"create": {"displayName": "Reviewed business", "legalName": null, "clientId": null}},
  "contact": {"create": {"name": "Reviewed person", "email": null, "phone": "7045550100", "source": "Direct conversation"}},
  "contactRole": "requester",
  "title": null,
  "source": "Staff review",
  "property": {"create": {"name": "Prospect site", "address": "York region", "locationPrecision": "region", "acreage": null}},
  "propertyRole": "prospective_customer"
}
```

Each entity choice can instead be `{"existingId":"UUID"}`; property may also be null. Contact roles: requester/site_manager/facilities/procurement/owner_representative/other. Property organization roles: reported_owner/operator/manager/developer/prospective_customer/other. Location precision: region/approximate/confirmed. Optional legalName/clientId may be omitted when creating the organization; other illustrated fields are required, with explicit nulls as shown.

Result: `{leadId,organizationId,contactId,propertyId,version}`. Keep the same operationId and exact body when retrying. Creating a second organization for the same customer returns409 with guidance to link the existing organization; only PostgreSQL unique violation23505 on `business_organization_client_id_key` is translated. Other database failures retain the server error path. Identical actor/lead/body replay returns original IDs; changed fingerprint or stale expectedVersion returns409. No automatic matching/merging by name, domain or contact address. Organization clientId links an explicitly selected existing active customer; the action never creates a client. Customer-backed contact/property reuse must match that customer. Archived entities and inactive customers cannot be newly linked. A customer-backed contact must be edited through its existing customer contact workflow.

`PATCH /commercial-inquiries/:id/contact-review` accepts `{expectedVersion,contactVersion,contact:{name,email,phone,source}}`. At least one validated contact channel is required. Returns `{leadId,version,contactId,contactVersion}`. Only a linked, active sales-only contact can be changed here; customer-backed contacts are rejected. Correction updates reviewed contact plus lead version/activity and audit, leaving original lead intake fields and receipt untouched. Source is provenance, not deliverability verification, consent or decision-maker authorization.

`GET /commercial-context/search?kind=organizations|contacts|properties&q=...&limit=25&after=UUID` returns `{items,nextCursor}`. Limit1–100; nextCursor is the last UUID in ascending ID order and is passed as `after`. Reset it when kind/query changes. Results contain explicit context fields, not private operational notes/access instructions. Existing customer entities are read-only matching candidates; selecting them does not grant access or change billing ownership. New prospect contacts/properties remain available only through sales context endpoints. All archive filters are server-side.

## Persistence and behavior

Migration `0011_prospect_context.sql` introduces reviewed business relationships and an actor-bound operation receipt. Existing properties remain operational and retain IDs. `property.lifecycle` is prospect or operational; archive is a separate boolean. A prospect requires null client_id; operational requires a real client_id. New sales-only contacts permit null client_id with at least one channel. Company/contact/property roles are relationships, never ACLs.

Qualification/context linking creates no customer, auth identity, client_access, invitations, accounting records, outbox messages, work, appointment or publication. Existing generic conversion is retained; a commercial lead linked to any organization, contact or property receives409 from legacy conversion until a reviewed onboarding flow is implemented. This also blocks conversion when the property was never selected or was subsequently unlinked, preventing copying a prospect property or creating a customer at qualification. Untouched unlinked commercial and generic lead behavior remains compatible.

Existing operational routes, shared pickers and default propertyAccess are operational-only for every role. List filters and direct child-ID guards cover work, offline sync, schedule, areas, projects, expenses, inspections, files, estimates, billing, requests and booking. Writers lock parent property before child mutation; no database triggers or new lifecycle-transition API are introduced. Recurrence selects at most50 eligible operational services and holds parent locks before child updates. QBO billing ownership explicitly excludes prospect properties. Existing client/property/assignment/financial checks remain in force.

## Review and release gates

Run `node scripts/test-prospect-context.mjs` for fresh disposable PostgreSQL migrations/replay, normalized-context and mounted role/operational-boundary regressions. Test intentionally includes anomalous prospect child rows to exercise defense beyond create paths. The mounted test supplies an identity fixture while real database roles, routers and domain services execute; it does not replace full session/MFA regression coverage. Run the existing commercial and dashboard suites and typecheck in addition.

Back up/restore both relevant deployment revisions before rollout. Deploy guarded APIs with the schema before creating any prospect rows. Rollback must preserve new rows and links; do not revert to older unrestricted property readers while prospects exist. Disable new context writes and retain compatible guarded code during rollback. Full staged UI, backup/restore and cross-role acceptance remain required; a local test is not production acceptance.


## Source acceptance, September 7

Commit `fc302b1` passed Orchestrator integration review against isolated reviewed source, excluding pending identity policy and dispatch-readiness changes. The full dashboard suite passed11 tests; the prospect aggregate and commercial suite passed1 and5 tests respectively with zero skips and migration replay. API typecheck passed. After independent review found a null-property conversion bypass, the guard was expanded to any reviewed organization/contact/property link and the affected prospect/commercial tests were rerun successfully. Tests use actual disposable PostgreSQL and mounted routes; they do not prove production acceptance.

PostgreSQL organization/customer unique conflicts now return409 only for the named organization client constraint; unrelated database errors remain errors. The initial prospect panel, exact-source staging deployment, post-migration restore rehearsal and live acceptance remain required. Existing staging snapshot restore work is tracked separately and does not establish a restore of0011 before that migration is deployed. Shared identity work is excluded.


Upgrade/recovery follow-up: the protected0010 staging dump was restored locally, upgraded with exact `fc302b1` migration0011 and runner transaction/advisory-lock/checksum semantics, then dumped and restored again into PostgreSQL18 with networking disabled. Existing three leads/receipts and four audits were unchanged. Since staging had no operational properties, a local pre-upgrade operational fixture supplied explicit ID/customer-link preservation evidence. Prospect/contact/organization links and all11 ledger entries survived the second restore; five invalid relational fixtures were rejected. Evidence `/tmp/p1-upgrade0011-994e1f57/report.json`; post-upgrade dump SHA-256 `2e1f4ad3996c0c15a24e5a1a2e2b9462eb6595856ec594c9c6d21aa122d62169`. This is SQL recovery evidence, not API authorization, storage/secrets/ACL restoration or live application acceptance.

Combined source484f953 reached staging SUCCESS at `37467a88-6b1f-47f5-afd5-484d04173d01`. Root independently confirmed health, root and expected `index-Cu7rtkLx.js` return200. The dashboard task verified readiness200, stale409, override clearing, dispatch/start transitions and rejection of readiness changes after work starts. Live prospect API checks and the new context panel are separate remaining gates. Production0011 has not been promoted.


Live API acceptance on guarded staging484f953 passed20 HTTP checks. A new synthetic receipt created an inquiry; manager/sales linked organization and phone-only contact with null site, retried the same operation, linked a prospect, and corrected contact details. Stale context/contact updates returned409; legacy conversion returned409; operational areas/timeline/files returned404; dispatch/crew/client were denied403 and anonymous access401. Cleanup revoked all five fixture sessions and deactivated their profiles while retaining audit actors and clearly labelled synthetic prospect records. Evidence `/tmp/p1-prospect-live-acceptance.json`. This does not establish editing-panel acceptance.

Panel review subsequently found that propagating arbitrary context-GET versions into an older follow-up form could bypass its optimistic conflict check. The panel remains unaccepted pending a source-aware mutation acknowledgement and integrated race regressions. Existing production code is not changed by this uncommitted panel.

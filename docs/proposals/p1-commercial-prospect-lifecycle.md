# Minimum commercial prospect lifecycle — linking contract approved, implementation pending

Prepared from the current commercial initiative/master plan and dashboard schema/API. No code, migration or live data changes. Dashboard migration0011 is tentative only; reserve its number with the Orchestrator and SSO owner before implementation.

## Existing behavior and concrete gaps

- Core submission and dashboard `commercial_intake_receipt.raw_intake` preserve original inquiry data. The dashboard `lead` is the existing sales queue, with phone-only support, owner/next action and optimistic versioning. It has no reviewed company/contact/site links.
- `client` is an operational/billing customer; `contact.client_id` and `property.client_id` currently require that customer. Neither is a prospect abstraction. Authentication `account` is unrelated and must remain untouched.
- Current `/leads/:id/convert` creates a client and property, then marks the lead Qualified. Commercial phone-only conversion is now blocked without an email. There is currently no reviewed commercial-contact correction API, so that guard exposes a deliberate workflow gap rather than permission to invent email or edit the database.
- `assessment_slot` can link an existing property, and availability/buffer/blackout/collision logic exists. A slot is not an assessment report; the model lacks a reviewed baseline with observations, recommendations and publication history.
- `estimate.property_id` requires an existing property. Revisions/current-series checks exist. Current approval/decline requires a client-authenticated user with client access, which cannot represent a prospect's signed/offline decision before customer onboarding.
- Existing broad office property/estimate readers and `propertyAccess` permit more staff than the commercial sales roles. Adding prospect properties without filtering those existing paths would repeat the commercial lead privacy bypass.

## Recommended minimum: use one property identity from prospect through operations

Keep `property` the central physical-site object; do not create a second `prospect_site` that must later be copied into an operational property. Add a lifecycle boundary with explicit authorization before allowing the first prospect property. A company can exist without a known site, and a lead can remain region-only until staff confirms enough location information to create/link a property.

Proposed first migration includes only these additive relationships and controlled nullability changes:

1. `business_organization`: UUID, display_name, optional legal_name, optional reviewed website/domain, owner_id, archived, version, timestamps, optional unique `client_id` link to an existing operational customer. No auth identity, client access or accounting side effects. A domain/name is a matching hint, never a unique person/company identity or automatic merge criterion.
2. Reuse `contact` as the human identity rather than add another person table: allow `client_id` to be null only for a sales-only contact; keep every existing customer contact's client link and current APIs unchanged. Add review metadata (reviewed_by/at and channel provenance), preserving null email for phone-only contacts. A new strict CHECK requires at least one usable email or phone for sales-only contacts. Existing historical operational contacts remain compatible.
3. `organization_contact`: organization_id, contact_id, role (requester/site_manager/facilities/procurement/owner_representative/other), title, relationship source and version; composite uniqueness. This is business context, never an access grant. One person may have multiple reviewed organization roles. Linking an existing customer contact does not authorize a sales editor to change that person's operational contact data; editing a customer-backed contact continues through existing client-scoped permission checks. Do not infer shared identity by email alone.
4. Extend `property` with lifecycle `prospect|operational|archived`, version, optional location precision and sales owner. Existing rows default operational; allow null `client_id` only when prospect. Require an operational property to retain a real client. Keep its UUID/areas/assets/history during onboarding. An approximate prospect address must be labeled region/approximate; appointment confirmation requires a usable location and explicit access arrangements. Acreage unknown stays null, not0.
5. `property_organization`: property_id, organization_id, role (reported_owner/operator/manager/developer/prospective_customer/other), optional source/reviewed_at; unique property/organization/role. Avoid a single company owner column that would block multi-party campuses later. Relationships do not change billing ownership or client access.
6. Add nullable reviewed `organization_id`, `contact_id`, `property_id` to `lead`, separate from existing converted IDs. Keep reported intake fields and receipt snapshot unchanged. These links represent the inquiry's current primary sales context; they are not the only relationships allowed on a company or property. New links and corrections increment lead.version and append audit history. Existing lead New→Contacted→Qualified→Proposal→Won/Lost remains intact for this minimum slice.

Do not add a complete opportunity table in this first linking slice. One inquiry remains one existing lead/pursuit; multiple inquiries may explicitly link to the same property/company. Later `sales_opportunity` can own independent scopes, estimated value and milestones, with a lead/opportunity junction, without changing property/company/contact identities or merging Core receipts. No multi-party role becomes an ACL.

## Minimum staff actions and proposed API contracts

All commercial sales context endpoints require owner/manager/sales. Requests are strict; changes use expectedVersion and an operation UUID for idempotent multi-record creation/linking. Conflicting operation fingerprints return409; replay returns original IDs. Use a small business-operation receipt table if existing operation storage cannot provide this invariant; include it in the reviewed migration rather than inventing public idempotency behavior.

- `GET /api/v1/commercial-inquiries/:id/context`: original read-only intake, reviewed current context, explicit matching candidates and versions. No automatic merge.
- `POST /api/v1/commercial-inquiries/:id/context`: `{operationId,expectedVersion,organization:{existingId}|{create:{...}},contact:{existingId}|{create:{name,email:null|string,phone:null|string,title,source}},property:null|{existingId}|{create:{name,address,locationPrecision,acreage:null|number}}}`. Require the reviewed role for each link. Transaction creates/links only business entities and a prospect property, adds relationship rows, advances the lead version and audits actor/link changes. It does not qualify, book, publish or onboard automatically.
- `PATCH /api/v1/commercial-inquiries/:id/contact-review`: versioned correction of reviewed sales contact information with source and confirmation method/date. Never update raw intake. Unknown email remains null. If a real email is learned later by phone/direct correspondence, staff records it here; syntactic validation is distinct from confirmed ownership, and channel confirmation is distinct from marketing consent. No email fabrication or automatic consent flag.
- Company/contact/site search uses bounded keyset pagination and explicit sales scope. Candidate matching shows why a candidate was returned and requires staff selection. Existing archived/wrong-context links fail with no partial creation.

UI: a compact “Review company, contact and property” panel in the commercial inquiry, side-by-side with immutable intake. Provide “Link existing” and “Create prospect” with clear context. Phone-only contacts can be qualified; blocking actions explain which real fact is missing. Never label a prospect as a customer or make a portal invitation part of qualification.

## Lifecycle and subsequent COM05 gates

A. **Context/qualification:** review serviceability, need, company/contact roles and usable contact channel; create/link a prospect property only when location is sufficiently known. Qualification changes sales status only, never client creation.

B. **Assessment booking:** reuse availability/slot scheduling. Sales explicitly requests booking against the prospect property; dispatch may access a minimal assignment view containing appointment/location/access-contact facts required for scheduling, not the full sales dossier. This requires a reviewed booking authorization change, not implicit access to every prospect. No assessment is confirmed by the public form or qualification action.

C. **Assessment record:** next slice adds an assessment tied to property and lead, optional slot, author/status, versioned baseline/findings, review actor/time, approved report snapshot and explicit publication state. Reuse property areas/assets when appropriate. Facts, priorities and recommended actions stay distinct. Prospect/client audiences cannot read draft observations or private facility notes.

D. **Proposal:** reuse estimate revision/current-series machinery on the same prospect property, with lead reference and immutable reviewed recipient/company/property/scope/exclusion snapshot per revision. Restrict prospect estimate readers to sales roles. Add a separate audited staff-recorded external decision action with evidence/reference and decision-maker authority for pre-account buyers; do not impersonate client login or weaken the existing portal decision route. No unsolicited email dispatch is implied.

E. **Won and onboarding:** replace the commercial branch of early `/leads/:id/convert` with a purpose-specific `POST /commercial-inquiries/:id/onboard` after an approved current proposal/recorded customer decision. Require expectedVersion, operationId, selected real payer client or reviewed new-client data, and reviewed contact information. Link/create the client once, set existing property's client_id and lifecycle operational, record conversion IDs and Won, and audit in one transaction. The property UUID and all assessment/estimate history remain unchanged. Existing generic lead conversion can stay compatible. Neither intake, qualification nor onboarding automatically creates auth users, client_access, invitations, QuickBooks entities or service schedules. Those remain explicit approved workflows. Do not reassign a property's existing payer through this action; reuse requires exact existing relationship checks.

Real email may remain a prerequisite for an explicitly email-based proposal/onboarding process, but it must not block phone-only qualification or field assessment. Any relaxation of the present commercial conversion guard is a reviewed workflow change once real contact review and decision evidence exist.

## Privacy and compatibility acceptance before rollout

Allowing null property/client relations is a security boundary change, not a standalone schema patch. Inventory and test every existing property list/detail/export/map, area/asset/file, estimate/history, booking, operations and financial path before inserting prospect rows. Existing customer/crew/client paths must exclude prospect rows unless specifically granted assignment access; broad office propertyAccess cannot remain sufficient. Operational work orders/billing/QBO require operational property and a real client. No document publication/access is inherited from company/person relationships.

Required tests: unchanged existing client/contact/property IDs and APIs; no fabricated clients at qualification; original intake immutable after correction; phone-only review; two inquiries linked to one site remain distinct; concurrent create/replay/link CAS; wrong-client/wrong-role/archived links rejected; dispatch/finance/client/crew denied prospect sales data through legacy routes; assignment-only booking projection; no automatic auth/access/QBO; same property UUID survives idempotent onboarding; proposal revision and authority evidence enforced; rollback leaves no partially linked customer/site; migrations replay and backup/restore.

## Ownership and sequence

Dashboard domain owner owns schema/SQL/services and authorization inventory; dashboard UI owner owns context panel and request contracts after approval. Core owns the immutable submission/outbox only; no cross-database joins or changes to shared login. Orchestrator reviews the new lifecycle/privacy contract and reserves migration0011 with SSO before implementation. Roll out schema and guarded APIs together, then synthetic prospect linking, then COM05 assessment/proposal/onboarding slices. Do not describe the full commercial lifecycle as complete after the linking slice alone.

Unresolved product decisions for Orchestrator/Owner: who may confirm decision-maker authority; when paid assessments require an actual payer; evidence required for external proposal acceptance; channel/marketing consent policy; exact dispatch assignment projection. These should not be guessed from a business role label or possession of an email address.


## Orchestrator decision — September 7

The initial linking slice is approved for implementation with the accompanying authorization inventory. Dashboard migration0011 is reserved by the dashboard owner; Core SSO migration numbering is separate. Preserve one physical property ID and introduce business relationships without creating a billing customer at qualification. No new authentication identity or access grant follows a relationship.

Use lifecycle `prospect|operational` plus a separate archived flag rather than making archive a third lifecycle that would force an unconverted prospect to have a client. Existing properties default operational and unarchived. A prospect has no payer until explicit onboarding; operational properties always retain their real client. Archive is not an authorization bypass and prevents new linking/mutations where appropriate.

This approval covers context linking, reviewed contact correction, operation receipts, privacy guards and their tests. It does not enable prospective booking, reports, proposal decisions or customer onboarding prematurely. Those subsequent lifecycle steps remain required project work and receive separate scoped contracts. Initial linking has no fee, consent, outreach, portal, financial-provider or recurring-service side effects. Do not label the full commercial lifecycle complete when this slice passes.

Existing operational route contracts and IDs must remain compatible. The inventory's default operational-only guards are mandatory before a prospect row can be created. Preserve pending shared-identity code and coordinate narrow shared-file hunks with its owner.

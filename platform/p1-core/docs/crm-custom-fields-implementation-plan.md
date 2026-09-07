# CRM-2: typed custom fields and explicit form mapping

Status: design accepted by Orchestrator for isolated CRM-2 implementation; not implemented or release-approved. Inspected Core `62d904450bd39bda845f94847cc4d1cbf7b91c20`, 2026-09-06 UTC.

## Source constraints

- `shared/schema/crm.ts` has separate lead/client records, untyped `metadata`/`formData`, six fixed stages and unique client `sourceLeadId`. Custom fields must not reinterpret those existing JSON records.
- `server/storage/crm.storage.ts:createOrUpdateInboundLead` uses email/phone advisory locks and accepts the form job transaction. Duplicate intake updates the existing lead and writes a note.
- `updateLeadAndCreateWonClient` locks the lead and atomically creates the client and conversion notes; an existing converted client is returned unchanged.
- `server/services/crm.service.ts:inferCrmLeadFromFormData` supplies heuristic name/email/phone/company/message intake. `shared/schema/forms.ts:CmsFormEffectPayload` currently stores `{kind:"crm_intake", formName}`.
- `forms.service.ts:submitManagedForm` validates data, builds effects, then `forms.storage.ts:createSubmissionWithEffects` atomically inserts submission/jobs. Existing `(formId,idempotencyKey)` replay returns the original submission, without comparing a changed payload.
- `form-effect-jobs.service.ts:applyJob` applies CRM intake and job completion in one transaction, with claim-token protection. External notification delivery has separate at-least-once semantics.
- `system-backup.service.ts` discovers tables and foreign-key ordering dynamically. Inclusion still requires actual restore verification; discovery alone is not acceptance.

## Minimum coherent first release

Deliver definition management, typed editing/display on lead and client details, explicit lead-to-client copy policy, per-form mapping editor with a no-write preview, and durable mapped intake together. Include five scalar types below. No attachments, arbitrary expressions, nested objects, multiselect, computed fields, bulk import, custom search/reporting or new lifecycle stages. No source-repository code copying.

## Persisted contract, ownership and limits

Use four dedicated tables plus nullable form configuration and monotonic revision columns; do not place managed values in arbitrary metadata.

1. `crm_custom_field_definitions`: UUID `id`; globally unique immutable `key`; immutable `entityScope` (`lead`, `client`, `both`); immutable `type`; mutable `archivedAt`; integer `revision` starting at 1; timestamps. Keys match `^[a-z][a-z0-9_]{1,47}$`; reject prototype-related and built-in CRM property names. Keys cannot be reused after archive. One client installation/database owns the definitions; this does not introduce tenancy.
2. `crm_custom_field_revisions`: composite primary key `(definitionId,revision)` and FK to definition; immutable strict version-1 `config` JSON; creation timestamp/actor. Config is `{version:1,label,description,order,requiredOnManualCreate,defaultValue,copyOnConversion,choices}`. Label 1–80 trimmed characters, description at most 300, order integer 0–999. `copyOnConversion` is permitted only for scope `both`. Defaults: description empty, order 0, required false, default null, copy false, choices empty. Updates insert a revision and atomically advance definition revision with expected-revision comparison; archive/unarchive also advances revision. No hard-delete API.
3. `crm_lead_custom_field_values`: `(leadId,definitionId)` primary key, lead FK with cascade delete, composite `(definitionId,definitionRevision)` FK, `value` JSONB scalar, timestamps. Definition references restrict deletion.
4. `crm_client_custom_field_values`: equivalent with client FK. Separate tables avoid unverifiable polymorphic entity IDs. Scope is validated server-side inside every write transaction.
5. `cms_forms.crm_mapping`: nullable versioned strict JSON defined below, not a freely writable settings/metadata key. Existing rows remain null. Add `cms_forms.crm_mapping_revision` integer default 0; increment on every mapping save or removal. The revision survives null/removal so an old editor cannot overwrite a remove/recreate cycle with a reused revision.

Maximum 50 active definitions per scope (a `both` definition counts in each), 200 total including archived; enforce limits under transactional serialization. Config limit 16 KiB; values request limit 64 KiB/50 entries. API contracts reject unknown properties. Definition/revision IDs and scalar values are never interpreted as code, HTML, SQL identifiers or object paths.

| Type | Canonical value and validation |
| --- | --- |
| text | String, trimmed, at most 2,000 characters; reject NUL/control characters except newline/tab. |
| number | Finite JSON number, absolute value at most 1e12; no coercion from empty strings, NaN or Infinity. Not a money type. |
| date | Real Gregorian calendar date `YYYY-MM-DD`, year 0001–9999; never convert through host timezone. |
| choice | One immutable option key; 1–50 options, each option is `{key,label,archived:boolean}` with a key using field-key grammar and label 1–80 characters. Keys cannot be renamed/reused; options can be archived and relabeled. |
| boolean | JSON true/false; false is a supplied value, not missing. |

Null means cleared/no value, never an implicit default. Absent PATCH entries remain unchanged. Reject duplicate definition IDs. Empty text normalizes to null. Required/default behavior applies only to new manual records: default is applied once when omitted, then required fields are checked. Existing records, legacy intake and conversion are not made invalid by adding a required field. UI names this setting “Required for new manual records”; each form separately declares required mappings. Defaults must validate against the same revision and are not retroactive.

Archived definitions/choice options remain readable with archived labels; existing values retain the accepting revision. New manual assignments cannot target archived fields/options; clearing an archived field is allowed explicitly. Unarchive preserves identity. Changing a label/order/default cannot silently rewrite values. Value reads include current presentation plus accepted revision/provenance; historical options remain interpretable through their revision. Unknown stored versions fail visibly/read-only, never reset data.

## Conversion and duplicate ownership

Lead values belong to the lead, client values to the client. A `both` definition with `copyOnConversion=true` copies its present lead value once, including its accepted revision, into the newly created client inside `updateLeadAndCreateWonClient`'s transaction. Archived values remain preserved on the lead; copy only currently active definitions with copy enabled. Required/default rules never invent client values during conversion. Any copy failure rolls back stage, client, values and both notes.

Retrying won on an already converted lead never overwrites client custom values. Later lead edits/intake do not synchronize to a client. Inbound duplicate matching remains email/phone based; custom fields do not introduce identity rules. Mapped intake updates only explicitly supplied non-null custom values on the matched lead; omitted/blank values cannot erase administrator-entered values. Document this overwrite policy in mapping preview. Lock the matched lead before custom-value merge; use one consistent lock order across CRUD, intake and conversion, and test competing paths for deadlocks/lost updates.

## Explicit form mapping and preview

`CrmFormMappingV1 = {version:1, revision:number, mode:"explicit", bindings:Array<{sourceFieldId:string, target:{kind:"builtin", key:"name"|"email"|"phone"|"company"|"message"}|{kind:"custom", definitionId:string}, required:boolean}>}`.

Maximum 55 bindings; one binding per target. Source is an existing stable form field ID, never its label or an arbitrary dotted path; resolver uses the actual field's stored data key. Only scalar compatible sources may map; structured names, address/list fields, HTML, display fields and multiselect are excluded in v1. Text/email/tel/textarea/hidden map to compatible text/built-ins; number/date/single choice/checkbox map through explicitly defined scalar adapters. Checkbox supports only the renderer's documented boolean representation, not JavaScript truthiness. Choice option values must match active target keys; no fuzzy label matching. Email receives existing email validation.

Null mapping preserves the existing heuristic behavior exactly. Explicit mapping requires `createCrmLead=true`; built-ins come only from listed bindings, with “Website Lead” as the missing-name fallback. No automatic heuristic fallthrough. Reject attempts to target stage, status, owner, source, permissions, external IDs or metadata. A mapping may target lead/both definitions only. No public direct-to-client creation.

Store mapping through a dedicated admin endpoint with expected monotonic form mapping revision (including null/removal); return 409 on stale save. Generic form updates cannot write `crm_mapping` and must preserve it. Any form field deletion/type/data-key change that invalidates an existing mapping returns an actionable conflict requiring explicit mapping repair/removal; cosmetic label changes are safe. New submissions re-resolve current definition revisions: an archived target/option causes a configuration-unavailable response rather than dropping data silently.

`POST /api/admin/forms/:id/crm-mapping/preview` accepts a proposed mapping and bounded synthetic sample data; executes the same pure resolver/validator as intake; returns normalized built-ins/custom values, accepting definition revisions, missing/invalid source errors and duplicate-overwrite explanation. No submission, lead, job, provider or log of sample values. Mapping UI shows source→target/type and errors before save, but preview is not mandatory authorization or proof of later production values.

## Submission, retries and errors

Validate explicit mappings and mapped values before inserting a new submission or any job. Return 400 with stable source-field error codes for invalid visitor values, without echoing submitted values; unavailable/archived mapping configuration returns 503 with a neutral visitor message and a separate safe administrator diagnostic. Existing form public/proxy routes retain authentication, size/rate limits and response shape; expose field errors compatibly without requiring site changes to preserve entries.

Add a mapped variant to the existing `crm_intake` payload: `{kind:"crm_intake", version:1, formId, formName, mappingRevision, normalizedBuiltins, customValues:[{definitionId,definitionRevision,value}]}`. Retain the current unversioned variant for queued legacy jobs. The snapshot `formId` must equal the owning submission/form ID; `formName` is display-only and never mapping identity. Keep deduplication key `crm_intake`; do not create a second CRM effect. Resolve and persist this snapshot atomically with submission/jobs, serializing mapping/definition revisions against concurrent changes. Worker validates the snapshot version/shape and applies pinned values even if fields/options were archived after acceptance; it must not rerun current mappings or defaults. Revision rows are retained, not deleted.

For an existing idempotency key, return the original accepted submission before applying *new mapping* validation. Preserve the existing public replay semantics; do not quietly introduce a payload-conflict API in CRM-2. Retain ordinary form/auth validation and test its existing limitations independently. On concurrent first submissions, database uniqueness chooses one accepted snapshot; losing requests return that submission with no extra effects. Changed payloads require the site's existing fresh-key behavior.

Perform lead upsert, custom-value writes and job completion in the existing `completeEffectJob` transaction; claim loss/failure rolls back all. Unknown payload versions or missing retained revisions fail safely into the existing bounded retry/failed-job process with sanitized codes; do not silently run heuristic intake. Explicit administrative retry uses the stored snapshot. Avoid changing external email delivery guarantees or introducing a second worker.

## API, UI and permissions

Add definition GET/POST/PATCH under `/api/admin/crm/settings/custom-fields`, with IDs after static routes. Existing authentication, `crmEnabled`, and CRM permission remain mandatory; definitions/configuration write additionally requires admin. Permitted CRM editors may read definitions and edit record values through existing lead/client access; their payload cannot create definitions/change scope/type or lifecycle permissions. Dedicated record-values GET/PATCH use entity ID, expected values revision (add per-entity integer custom-values revision columns), and strict typed entries; return 409 on stale edits. Every value-writing path, including intake and conversion, increments the same entity values revision under its record lock. General lead/client CRUD cannot bypass custom-value validation. New-record creation includes values atomically, not a second best-effort request.

Mapping GET/PUT/preview remain admin-only and require CMS plus CRM features. Register before dynamic form routes and preserve unrelated mounted permissions; this slice does not widen the existing forms editor gate. No public endpoint exposes definitions, mapping, internal defaults or existing CRM values.

CRM Settings gains “Custom fields” beside Pipeline. Definition UI supports create, label/order/default edits, immutable key/type/scope explanation, archive/unarchive, archived-value notice and conflict recovery. Lead/client detail drawers show accessible typed controls in configured order and a read-only archived section; errors retain entries. Form settings gain explicit enable/disable mapping, source/target controls and synthetic preview. Loading/failed GET blocks saving; disabled-feature/forbidden routes expose no data. Values render as text, with keyboard labels/errors, mobile layout and light/dark acceptance.

## Migration, backup and rollback acceptance

Use additive migration(s): four tables, two per-entity revision columns default 0, nullable mapping column and monotonic mapping revision default 0. No backfill from metadata/formData, no existing-value rewrite, no job replay. Constraints/indexes/FKs must be exercised on populated current-main synthetic fixtures, with migration twice and prior CRM/form/job records unchanged. New definitions/revisions and values require real backup/export→restore proof, including an archived choice and a pending mapped job. Inspect actual table exclusion configuration; fail acceptance if new tables are omitted. Explicitly verify FK ordering and versioned JSON fidelity.

Old code ignores new columns/tables but cannot safely consume new mapped CRM jobs: unversioned handling would apply heuristic intake and lose mapped values. Therefore rollback is **not** a blind binary revert. Stop intake/workers and drain mapped jobs before rollback; block rollback with pending/processing/failed mapped jobs unless a separately tested compatible consumer is retained. Preserve all tables/columns; never down-migrate/drop customer values. Disable explicit mapping intake during old-code operation and require a compatible consumer before reopening it. Test rollback of non-CRM traffic with retained schema and re-upgrade reads. Backups retain ordinary CRM PII; no raw value/sample logging or new external transmission.

## Required implementation and acceptance order

1. Orchestrator accepted this model, overwrite/copy policy, permissions and rollback constraint, with monotonic revisions retained across mapping removal. Keep implementation isolated from the current maintenance release; implement shared contract, additive persistence, typed service/routes and actual PostgreSQL tests.
2. Implement definition and record controls plus atomic conversion; test all five types, limits, archive preservation, stale revisions, generic bypass, concurrent conversion/retry and failed value-write rollback.
3. Implement mapping preview and submission snapshots with legacy job compatibility; real DB tests cover edit/archive between acceptance and execution, claim retry, duplicate intake/custom-value merge and response-loss replay producing one CRM effect-set.
4. Actual-app browser: admin creates field → maps a synthetic form → previews invalid/valid values → submits → sees typed lead values → wins lead → verifies copied client values → edits client → retries won without overwrite → archives field and reloads retained values. Verify editor permissions, invalid input retention, failed GET/save, keyboard/mobile/themes. No mocked success responses, client data or provider calls.
5. Complete populated migration, backup/restore and rollback rehearsal, full required checks and independent review; record exact SHAs/evidence before release. Metadata-only storage, a settings-only editor, or unit tests alone do not satisfy CRM-2.

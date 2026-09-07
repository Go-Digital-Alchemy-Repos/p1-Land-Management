# CRM-1: pipeline presentation settings implementation plan

Status: accepted by Orchestrator for bounded implementation; runtime implemented and CRM-1 acceptance passed; production release pending. Date: 2026-09-05.
Inspected Core HEAD: `ac1d1edfdcd027eabb4df9efbb83951638c5c3d4`; concurrent reliability changes remain outside this design.
Scope: labels, color presets and order over the six existing lead stages. No new stages, custom fields, lifecycle rules, tenancy, dependencies or schema migration.

## Evidence driving the design

- `shared/schema/crm.ts:10` defines six stable `CRM_LEAD_STAGES`; `CRM_LEAD_STAGE_LABELS` supplies default names.
- `client/src/features/admin/crm-page.tsx:66` owns six hardcoded badge color classes; stage iteration/labels occur in board columns, card move selector, detail selector, filter and list rows.
- `server/services/crm.service.ts` interprets key `won` as transactional client conversion. Stage keys and behavior must remain unchanged.
- `system_settings` already supports a unique key, text value, category, secret flag and timestamp; `server/storage/settings.storage.ts` provides JSON-string-compatible persistence and cache invalidation.
- `server/routes/settings.routes.ts:84` validates category only as a nonempty string and value only as a string. Its generic PUT/DELETE would otherwise bypass a new typed configuration API.
- CRM route mount in `server/routes/admin/index.ts:89` has authentication, CRM enabled and CRM permission boundaries; client sidebar currently lists Pipeline and Clients only.

## Proposed exact stored contract

File: new `shared/crm-pipeline-settings.ts`, importing existing stage keys/types without changing `shared/schema/crm.ts`.
Storage: one `system_settings` row, key `crm_pipeline_config`, category `crm`, `isSecret=false`; value is JSON of the following strict object:

```ts
type CrmPipelineColor = "blue" | "cyan" | "emerald" | "amber" | "green" | "slate";
type CrmPipelineConfigV1 = {
  version: 1;
  stages: Array<{ key: CrmLeadStage; label: string; color: CrmPipelineColor }>;
};
```

`stages` order is display order. Exactly six entries must contain every existing key once. No independent order field or redundant labels map is persisted.
Zod validation: strict root/entry objects; literal version 1; stage-key enum; array length 6 plus duplicate/missing-key refinement; color enum; trimmed label length 1–40, no ASCII control characters, case-insensitively unique labels. Unknown properties, arbitrary CSS/HTML configuration, missing stages and unsupported versions return HTTP 400 on write.
Labels render as React text only. No label is interpreted as a route, status key, HTML or workflow instruction.
Maximum accepted serialized config is 4096 UTF-8 bytes; size violations return 400. Never accept `category`, `isSecret`, identity, credential or unrelated settings keys in the typed payload.

Default config preserves the existing order, labels and color tokens:

| Key | Label | Color |
| --- | --- | --- |
| new | New | blue |
| contacted | Contacted | cyan |
| qualified | Qualified | emerald |
| proposal | Proposal | amber |
| won | Won | green |
| lost | Lost | slate |

Client maps presets to the current static Tailwind class triplets at `crm-page.tsx:66`, including slate's current `text-slate-700`; no dynamic Tailwind class synthesis. Preserve text labels so color is never the sole indication of stage.

## Typed service and API

Create `server/services/crm-pipeline-settings.service.ts`; use the existing settings storage, not a competing persistence layer.
`GET /api/admin/crm/settings/pipeline` returns `{ config: CrmPipelineConfigV1, source: "stored" | "default", issue: null | "invalid_stored_config" | "unsupported_version" }`.
Missing row returns defaults with `source="default", issue=null`. Malformed JSON/invalid shape returns defaults with `issue="invalid_stored_config"`; unknown numeric version returns defaults with `issue="unsupported_version"`. Neither read rewrites the row. Log only issue code and setting key, never raw stored contents.
`PUT /api/admin/crm/settings/pipeline` accepts exactly `CrmPipelineConfigV1`, saves one canonical JSON row and returns the GET response with `source="stored", issue=null`. Reject replacing a row carrying an unsupported version with 409; investigate version compatibility instead of silently downgrading.
Malformed legacy value can be replaced only through a valid complete PUT; the admin UI must show the recovery warning before saving. Reset is a visible “Restore defaults” action that populates the editor, followed by ordinary Save; no DELETE route is required.
Config is presentation-only and one-row atomic; concurrent complete saves use documented last-successful-save-wins semantics, consistent with existing settings. Return persisted config after save and invalidate the client query.
Server-side logs for successful writes include actor ID, setting key and version, without raw values. Reuse existing logger; do not add an audit schema or treat logs as an immutable audit trail.

Register both routes before CRM's `/:id` route. Keep the existing parent authentication/CRM feature/permission gates. GET allows admins and editors with CRM permission; PUT additionally requires `requireRole("admin")`. Never expose the generic CRM category or API key through GET.
Reserve `crm_pipeline_config` in existing generic settings PUT and DELETE: return 400 directing admins to the typed endpoint, regardless of supplied category/secret flag. This affects only the new key and prevents schema/permission/feature-gate bypass. Generic read may retain its existing admin-only masked behavior.
No feature flags or user-role changes. No changes to lead CRUD payloads, stage enum, won conversion, form ingestion, customer records, public site manifest or public APIs.

## UI and navigation

- Add explicit `/admin/crm/settings` route to `App.tsx` with admin-only ProtectedRoute and CRM enabled check. Add “Settings” under the CRM sidebar group only for admins; keep Pipeline and Clients available to existing permitted editors.
- Add a settings link beside the board title for admins, using the same destination. Do not overload `/admin/settings/:tab` or expose system integrations to CRM editors.
- New settings page uses existing AdminSidebar/form primitives. Render all six entries with editable label, named color picker, preview badge and keyboard-accessible Move up/Move down buttons. Show stable key and immutable lifecycle description for won/lost; every stage remains present.
- Show loading/error state and prevent save before a successful configuration read. Unsupported-version state is read-only. Invalid legacy config shows recovery notice and default values; Save explicitly replaces it.
- Shared `useCrmPipelineSettings` query key is `['/api/admin/crm/settings/pipeline']`. Board reads return usable defaults when the request is unavailable, with a nonblocking notice; settings editor never treats a failed request as an authoritative empty config.
- Pass the validated config to board columns, card move options, detail-stage options, filter options and list-stage labels. Use configured order for presentation; retain stage keys as React keys, drag/drop IDs, filter values and mutation payloads.
- Derive lookup maps once from the config; keep existing lead grouping across all six keys. Invalidate the config query on save so already mounted board consumers refresh. Ordinary cross-session refresh follows existing settings cache TTL; no new realtime infrastructure.

## Validation and acceptance

Contract tests: default reproduces six current keys/order/labels/colors; trim and size rules; all duplicate/missing/unknown keys, properties, unsupported versions and invalid labels/colors rejected; presets always map to static known classes.
Service/API tests: missing/default, valid stored, malformed/unsupported stored, canonical save, reset via default save, cache invalidation, and generic PUT/DELETE bypass rejection. Use actual mounted routing/auth middleware for 401/403/disabled-CRM checks; explicitly verify CRM editor can GET but cannot PUT, and an unrelated editor cannot GET.
Regression: unchanged lead-stage API accepts only original six keys; label renamed to “Customer” for `won` still sends `won` and creates exactly one client under retry; moving a different key with a similar display label cannot trigger conversion.
Browser acceptance must run the actual application against disposable seeded data, not synthetic HTML or a mocked router:
1. Admin follows CRM → Settings; fresh direct navigation and reload render the same page. All six defaults match the current board.
2. Rename `new` to “Inquiry”, choose cyan, move it after contacted, Save, visit Pipeline and reload. Board order, badge, filter, list and both move selectors reflect the saved config; underlying record stage stays `new`.
3. Use keyboard-only move controls and labels; visible text fits narrow viewport and both supported themes with readable contrast.
4. CRM editor sees configured board labels but no settings link; direct settings URL is forbidden and direct PUT fails. Unauthenticated requests fail; disabling CRM removes navigation and blocks board/settings/API.
5. Move a synthetic lead to renamed `won`, verify a single client and consistent stage after reload; restore defaults and confirm records remain unchanged.
6. Attempt invalid config and generic endpoint bypass, verify rejection and prior saved config retained. Failed load blocks Save; malformed stored config displays recovery notice; unknown version cannot be overwritten.

Required checks: focused schema/service/route tests, existing CRM tests, typecheck, lint, build, actual browser sequence, and settings backup/restore inclusion check. The existing backup scope must retain the system_settings row; no new migration is needed. Record runtime dependency versions and test evidence in the ledger.
Rollback: revert application code; old code ignores the new row and renders original constants, preserving all lead/client data. Keep the row for re-upgrade; deleting it is optional admin maintenance, never an implicit rollback step.

## Ownership and approval checkpoint

Orchestrator should approve key/category, versioned schema, color presets, admin write/editor read split, generic-route key reservation, fallback behavior and last-save-wins semantics before assigning implementation. Divide shared contract/service ownership from UI only after schema acceptance. This design was accepted and implemented as recorded above; production release remains pending. The original design requirements are retained for traceability.

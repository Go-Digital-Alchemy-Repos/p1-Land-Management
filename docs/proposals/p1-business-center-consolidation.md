# P1 Business Center consolidation

Status: Owner-requested implementation scope; not production-release authority. Implementation is in progress on `codex/business-center-consolidation`; see `docs/implementation/business-center-consolidation.md` for verified progress and remaining work. No production cutover is authorized by this document.

## Confirmed direction

- One dashboard application and sign-in; retire the separate `/admin/` application after verified feature parity.
- Retain Core's CMS database, publishing engine, original submissions, revisions and media services.
- Adopt the current admin design system throughout the business web dashboard, independently of public website branding.
- Place Marketing immediately above Settings, with grouped Content, Design, Website System and Reporting navigation.
- Merge CRM pursuit into Revenue/Sales and client records into Customers/Clients. Preserve notes, tasks, ownership, follow-ups, original submissions and history through repeatable source-ID mappings. Reconcile existing commercial handoffs rather than duplicating them.
- Won starts explicit create/link-client onboarding; no automatic property, portal grant or accounting customer.
- Replace People & access with a full admin-style User Manager: profiles, invitations, status, recovery, MFA administration, explicit area/tool permissions, per-form notifications and audit history. Only Owner has automatic full access. Area selection stores explicit individual-tool grants; new tools default to ungranted.
- Server permissions must govern APIs, navigation, summaries, exports and notifications. Preserve crew assignment and client/property boundaries. Keep credential management, user administration and website system administration Owner-only. Invitations establish passwords through the canonical dashboard authentication flow.
- Preserve public APIs, media URLs, previews, intake queues and offline field-work queues during cutover. Require feature inventory, migration reconciliation, isolated restore rehearsal, authorization tests and Owner release acceptance before retiring legacy access. Do not enable GitHub Actions.

## Analytics and Search Console addition

### Evidence and integration baseline

Reviewed reporting source on `codex/admin-google-analytics`, checkpoint `0d4a7d1`:

- `3a7c875`: protected Google Analytics reporting backend.
- `5105e17`: Analytics charts and report controls.
- `c0c0737`: protected Search Console source tab.
- `0d4a7d1`: connection blocker documentation.

The consolidation implementation checkout now contains these reporting additions, cherry-picked onto published baseline `2848855` without replacing newer public-site, dashboard or content-overhaul work. Recheck branch/deployment state before integration because other tasks are active.

The task-read tool returned metadata but no turn bodies for the recent Orchestrator and P1 Business Dashboard tasks. Findings here are grounded in source and `docs/analytics/ADMIN_REPORTING.md` at the reporting checkpoint, not an inferred conversation outcome.

That checkpoint describes reporting as implemented but not connected/deployed. It records blocked service-account key creation and a read-only OAuth alternative pending policy acceptance and provisioning. Do not weaken organization policy or call reports live without a real authenticated report. Public website GA tagging is a separate implementation and must be preserved.

### Destination and parity

Add Marketing → Reporting with separately addressable tools:

| Tool | Dashboard route | Preserved functionality |
| --- | --- | --- |
| Google Analytics | `/marketing/reporting/analytics` | Overview; acquisition channels, source/medium and campaigns; pages and landing pages; geography, devices and browsers; events; 30-minute realtime reports |
| Search Console | `/marketing/reporting/search-console` | Clicks, impressions, CTR, average position; daily trends; queries, pages, countries and devices; prior-period comparisons |

Preserve date presets/custom dates, preceding-period comparisons, chart metric selection, refresh, loaded-row search/sort/pagination and formula-safe CSV export. Preserve loading, empty, unavailable and partially limited result states. Each source works independently when the other is unavailable.

Keep SEO editing in Marketing → Content → SEO; link to Search Console reporting without conflating report access with edit access. Map legacy `/admin/analytics` to the new Analytics destination, preserving any supported source selection through an explicit safe mapping.

### Permission and API changes

- Add separate effective permissions `marketing.analytics.view` and `marketing.search-console.view` to User Manager under Marketing → Reporting. Each permits its report reads, refresh and loaded-row export. Neither grants CRM access or connection management.
- Replace the existing blanket `crm` reporting permission on both UI and server. Existing CRM grants must not silently become reporting grants; include them in the Owner-reviewed access mapping.
- Add allowlisted dashboard routes for historical Analytics, realtime Analytics and Search Console under `/api/v1/marketing/reporting/`. Reuse the existing Core reporting services and response semantics through the authenticated user-scoped Core boundary.
- Ensure Core checks the corresponding report permission independently, including calls through legacy API routes. Splitting the existing router-level CRM check is required because the two sources can have different grants.
- Place connection status/property selection under Marketing → Website System → Website Settings → Integrations. Owner alone manages credentials and connection configuration. Report viewers may see sanitized source identity/status but never credentials.
- Keep existing server credentials on Core. Do not copy them into frontend variables, browser responses, logs or the dashboard database merely to move the UI.

### Data and operational boundaries

- Keep public GA tracking limited to the approved public website. Do not add tracking to authenticated dashboard, CMS, preview or report routes or duplicate page-view tags.
- Preserve fixed report queries, the 93-day request bound, timeouts, bounded concurrency and quota controls. Historical cache is five minutes; realtime cache is 30 seconds; browser responses remain private/no-store. Refresh may reuse the server cache.
- Preserve provider totals rather than summing distinct-user segments or Search Console breakdowns. Show freshness, property timezone, sampling, thresholding and truncation disclosures.
- Search Console requests finalized Web data and uses Pacific dates; GA uses the property timezone. Search clicks, sessions, accepted inquiries and CRM wins remain distinct metrics. Do not invent attribution or revenue reporting.
- Confirm Search Console property coverage before interpreting results: the recorded apex URL-prefix property is not proof of coverage for the public `www` host. Preserve exact authorized property selection; do not silently substitute another property.
- Preserve 10,000-row limits and omitted/anonymized-query disclosures. Exports cover loaded results, not exhaustive search logs. Do not fabricate missing dates as zero.
- Indexing coverage, URL inspection and Core Web Vitals are not provided by the implemented Search Analytics report. This move does not claim to add them.

### Acceptance gates

1. Verify both report destinations, admin styling, deep links, date comparisons, charts, table controls and CSV safety against the existing implementation.
2. Test Analytics-only, Search-Console-only, neither, Owner, revoked and suspended access through UI and direct APIs, including legacy routes.
3. Test independent provider failures, empty data, stale cache, quota/timeouts and disclosure behavior without substituting fixture data in production.
4. Verify no credentials, inquiry PII or private dashboard tracking appear in browser bundles/responses or analytics events.
5. Confirm public page views remain single-counted and independent of dashboard migration.
6. Require real authenticated provider results and confirmed Search Console property coverage before reporting live connection completion. Keep any unresolved connection work visible as a release dependency.
7. Run reporting service/route tests, formatting/CSV tests, permission tests, type checks, production builds and browser parity checks. Record results and deployed revisions separately from this plan.

## Reusable agreement templates and sales composition

### Read-only Blythe reference review

Owner requested borrowing selected Manage Agreements behavior, without modifying Blythe or directly copying its application. Reviewed the Blythe `Project Planning` task and read the GitHub source for `app/admin/agreements/page.tsx` and the agreement validation, service and scope modules. No Blythe files, records or deployments were changed.

Verified reference behaviors: editable MSA with client/date placeholders; structured scope/deliverables; cost rows with title, description, quantity, unit price and frequency; separate draft saving and fixed published revisions; stale-edit rejection; combined MSA/SOW rendering and PDF support. Blythe's implementation is a project-specific draft/publication workflow, not an existing general multi-client template library. P1 must implement the reusable library within its own architecture.

Do not import Blythe's agreement text, Digital Alchemy branding, customer data, project pricing, presentation dependencies, authentication or signature implementation. P1 template content is Owner-supplied/approved. Existing P1 dates, cents-based calculations and lifecycle rules govern the adaptation.

### User workflow and navigation

Add a Templates tab under Revenue → Agreements, at `/agreements/templates`, alongside the existing agreement workspace. Provide reusable MSA, Scope and Cost Breakdown templates and a named agreement-package template that selects specific versions of those components.

1. Create a template or duplicate an existing one; edit its name, description, terms, supported placeholders, scope items and/or default cost rows as appropriate. Save drafts, publish a usable version, revise and archive. Archived versions remain readable from historical agreements but are excluded from new selections.
2. Start a new client agreement from Revenue → Sales or Agreements. Select the existing client/property and originating inquiry/estimate when applicable. A prospect draft may remain attached to its inquiry until explicit operational onboarding supplies the client/property required by P1's estimate workflow; do not create access grants or invented records to bypass that requirement.
3. Select a package or individual MSA, scope and pricing templates. Copy their exact versions into a private client draft. Populate supported client/property/date fields and show unresolved placeholders.
4. Customize the copied MSA, scope/deliverables, exclusions/notes, cost quantities, units and rates. Add, remove and reorder scope/cost items. Show section editors for Agreement Terms, Scope of Work and Cost Breakdown, plus a combined preview.
5. Save the client draft independently of its templates. Offer explicit Save as new template; exclude client identifiers, filled personal fields and client-specific details from reusable defaults, and require review of the resulting template draft before publishing.
6. Prepare the existing P1 estimate/proposal revision from the reviewed draft and send it through P1's current recipient/approval workflow. Customer review and PDF must show the same fixed MSA, scope, price lines and dates that are being approved.
7. On approval, hand off through the existing job/project/recurrence and service-agreement activation path appropriate to the estimate kind. Preserve activation previews, finite terms, cap checks, cancellation, successor/change-order behavior and billing-draft preparation.

Existing term libraries remain reusable clause sources rather than a competing agreement library. Link them from template editing. Sales-only users may select published templates while preparing proposals; template maintenance has its own `revenue.agreement-templates.manage` checkbox. Agreement access alone does not confer template-maintenance access. Owner has both; other grants remain explicit and server-enforced.

### Data, contracts and lifecycle

- Extend the existing `agreement_template` and estimate template-ID/version/snapshot foundation through additive migrations. Preserve older body-only templates as valid MSA templates; do not create a parallel disconnected terms store.
- Add typed template/component versions, draft/published/archived state, reusable scope/cost payloads, package references, source-version metadata, optimistic edit versions and audit history. Use the existing `/api/v1/agreement-templates` contract as the compatible base, extending it for component selection, draft/revision publication and archival. Existing consumers must retain their current response fields.
- Add client composition drafts linked to the inquiry/client/property and eventual estimate revision. Draft editing has no scheduling, billing, notification or publication side effects. Version-check updates and retain unsaved edits on conflicts; never silently overwrite another user's scope or prices.
- Snapshot template content and structured scope/cost data when instantiating a client draft. Sent/approved estimate revisions and activated service agreements retain immutable snapshots. Editing or archiving a source template never rewrites those documents. Switching a template in an existing draft requires an explicit comparison and application step.
- Use the estimate's line items and billing configuration as the authoritative accepted prices. Compute totals server-side with P1's exact monetary rules; document/PDF rendering consumes that same snapshot. Retain separate one-time, fixed-monthly and per-visit bases; do not add unlike rates together as a misleading contract total.
- For combinations needing multiple existing operational/billing records, show the allocation explicitly in the composed proposal and preserve links to each resulting record. Do not reinterpret monthly charges as one-time estimate value or bypass approved caps. Block send/activation when the selected pricing cannot be represented by the supported P1 billing configuration.
- Require all mandatory client fields/placeholders, validated cost rows and necessary estimate relationships before sending. Sent scope, terms or cost changes require a new revision and fresh approval; activated changes use existing successor/change-order rules.
- Preserve the existing approval mechanism for this slice. Blythe's typed/drawn signatures and countersignature evidence are reference capabilities, not automatically part of the migration. A separate electronic-signature workflow must be explicitly scoped before implementation; do not label ordinary estimate approval as such a signature.
- Template selection, saving, publishing and agreement composition never create invoices, post to QuickBooks, collect payment or automatically invite clients. Existing approved workflow actions retain their documented side effects.

### Acceptance criteria

- Create, publish, revise, duplicate and archive MSA, scope, cost and package templates. Use the same template for two clients and verify edits to either client draft do not affect the other or the source.
- Existing body-only templates, sent estimates and active agreements remain intact after migration. Archived/revised templates cannot change historical approved text or prices.
- Verify placeholders, rich-text sanitization, long scope sections, reordered/deleted cost rows, exact cents and supported quantity precision. Browser preview, customer review, PDF and approved totals must agree.
- Verify stale-edit recovery, source-template changes during composition, explicit template switching and retries without duplicate estimates or operational records.
- Verify authorized Sales users can select published templates, only granted template managers can maintain them, and clients see only their permitted sent/approved document revisions.
- Rehearse draft → reviewed proposal → customer approval → appropriate job/recurrence/agreement handoff → activation preview → existing charge preparation. Preserve cap enforcement, partial-period review and cancellation/change-order protections.
- No Blythe changes and no borrowed customer/legal content. Record P1-only implementation evidence and include this feature in the consolidation parity/release checklist.

### Agreement implementation checkpoint — 2026-09-17

The typed/versioned template library, private composition API and native draft workspace are implemented locally. Sales and Agreements now link to `/agreements/drafts`; Sales can compose from published versions and edit client-specific terms, scope/cost rows and context, while Agreements-only users can read saved drafts. The saved preview preserves exact source versions and separate pricing bases and flags unresolved placeholders. Explicit template switching now compares selected sections before applying them, rejects stale or changed sources, and preserves other client-specific content and source history. Save-as-template now prepares reusable MSA/scope/cost candidates with known client details removed, default prices reset, and mandatory user review before saving an unpublished component. Published components can then be combined into packages. This does not yet satisfy the complete agreement acceptance criteria above: proposal preparation and sending, document/PDF parity, operational pricing allocation and end-to-end handoff remain required before completion.

### Content source distinction verified during implementation

The primary P1 public site's content, shared navigation and page SEO come from published Website-editor manifest snapshots. Preserve that source and its draft/publish/revision workflow under Marketing → Content → Website. Generic CMS Pages/Menus/SEO remain distinct retained tools until their consumers are reconciled; do not imply their defaults control P1's public renderer or sitemap. The actual public sitemap is generated by the public runtime from its published route snapshots. This distinction is part of the no-loss inventory and final parity checklist, not authorization to merge content stores or change public publication behavior.

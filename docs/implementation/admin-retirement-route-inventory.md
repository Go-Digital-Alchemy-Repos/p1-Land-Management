# Retained admin route inventory and retirement boundaries

September 19, 2026, with September 22 closeout-branch updates. This inventory
does **not** authorize or establish safe retirement of `/admin`. Native
destinations exist, but a destination is not proof of operation, account,
deep-link or data parity. A default-off, exact-leaf redirect table is now on
the closeout branch; no production redirect is active.

## Inspected sources

- `platform/p1-core/client/src/App.tsx`: explicit retained page routes and feature/role gates.
- `artifacts/p1-dashboard/src/dashboard-routes.ts`: native destinations and capability mapping.
- `artifacts/api-server/src/dashboard/marketing-cms.transport.ts`: exact bridge method/path allowlist, including Owner-only Website System operations.
- `platform/p1-core/client/src/features/admin/settings-page.tsx`: integrations, head-tags, system and email-templates tabs.
- `platform/p1-core/server/routes/index.ts`: retained API/public mounts.
- Native `WebsiteEditor.tsx`, `BlogManager.tsx`, `DocumentManager.tsx`: existing query-based record selection.
- `consolidation-acceptance.md`, `consolidation-next-boundaries.md`, `website-system-parity-inventory.md`, `website-backups-contract.md`: acceptance constraints.

All destination paths below are on the Business Center host. They are proposed mappings to existing source routes, not implemented redirects. Legacy URLs belong to the public host's `/admin` surface. Redirects must use a configured fixed destination origin, preserve only validated supported query fields, and never redirect API requests.

## Page mapping

| Retained route(s) | Existing native destination | Remaining evidence/disposition |
| --- | --- | --- |
| `/admin` | `/` | Dashboard summary measures/actions are different; inventory Owner/editor landing and denied-tool behavior. |
| `/admin/login`, `/admin/forgot-password`, `/admin/reset-password`, `/admin/setup` | Native authentication flow; no universal path substitution | Core reset emails and federation callbacks still land on `/admin` routes. Core reset tokens cannot be consumed by Dashboard Better Auth, and setup state is separate. The closeout branch repairs two legacy recovery forms that previously posted to nonexistent `/api/admin` endpoints; this keeps old tokens usable during transition but does not authorize redirecting them. Never forward reset/setup secrets as ordinary query parameters. |
| `/admin/users` | `/settings/people` | Native User Manager exists and production now shows only the active Owner plus seven retired test-account tombstones. Core user creation can still send a legacy login URL; reconcile provisioning, permissions and recipient behavior before retiring this page. |
| `/admin/analytics` | `/marketing/reporting/analytics`, `/marketing/reporting/search-console` | Preserve report controls/export; Google property/www access and active connection management remain. |
| `/admin/events`, `/admin/events/new`, `/admin/events/settings` | `/marketing/content/events` | Preserve feature-disabled behavior and creation/settings intent; no automatic assumption that `/new` maps to an open form. Event registration/related operations need parity review. |
| `/admin/careers`, `/admin/careers/new`, `/admin/careers/settings` | `/marketing/content/careers` | Preserve disabled module state, applications/settings and create intent. |
| `/admin/forms` | `/marketing/content/forms` | Submission details, delivery jobs/recovery, export and notification controls must remain usable. |
| `/admin/crm` | `/sales` | Real pipeline/lead/activity/custom-field mappings and workflow acceptance remain; not a direct record-ID rename. |
| `/admin/crm/clients` | `/clients` | Source CRM client IDs must map through approved reconciliation; retain unmatched records. |
| `/admin/crm/settings` | `/sales/pipeline-settings` (closeout branch) | Native Owner-only deep link opens the existing pipeline editor. Current production tables have no stored overrides; recheck values and roles before redirect activation. |
| `/admin/blog` | `/marketing/content/blog` | Existing retained alias points to `/admin/cms/blog`; preserve alias in eventual redirect table. |
| `/admin/docs`, `/admin/docs/:slug` | `/marketing/system/documents?doc=<encoded slug>` | Native selection supports `doc`; preserve slug, read/edit/sync/delete and version/reservation semantics. Cross-surface mutation acceptance remains. |
| `/admin/settings`, `/admin/settings/integrations` | `/marketing/system/integrations` | Native Mailgun/Mailchimp/R2 configuration exists. Active Google environment configuration remains separate; no claim all provider cards have parity. |
| `/admin/settings/head-tags` | `/marketing/system/head-tags` | Validate sanitization, publication, preview and authorization. |
| `/admin/settings/system` | `/marketing/system/features` | Confirm every system control, optional-module gate and operational side effect; route name alone is insufficient. |
| `/admin/settings/email-templates` | `/marketing/system/email-templates` | Native visual/source editing, preview, saved-template test, restore and locks exist. Full mutation/mobile and inherited content review remain. |
| `/admin/settings/:tab` unknown tab | Explicit reviewed fallback or not-found | Do not create an open wildcard redirect with arbitrary tab/query propagation. |
| `/admin/design`, `/admin/design/branding` | `/marketing/design/branding` | Identity projection is implemented; verify all published consumers and Owner asset mutation. |
| `/admin/design/colors` | `/marketing/design/colors` | Preserve preview/publication/default/reset controls and contrast acceptance. |
| `/admin/design/social-media` | `/marketing/design/social-media` | Preserve profile ordering/icon style/public delivery. |
| `/admin/design/typography` | `/marketing/design/typography` | Preserve font selection/upload/public delivery and deployment-independent changes. |
| `/admin/system/backups` | `/marketing/system/backups` | Native status/run released. On September 22 the live page showed enabled/configured daily snapshots, a latest scheduled archive of 57 tables and 838 rows, and a clear warning that media bytes are separate. An Owner-only, exact-key-confirmed database restore is on the closeout branch and passes focused tests; it has not been exercised against production. Isolated restore, media-provider recovery and prior-image rollback evidence remain required. |
| `/admin/client-stack-onboarding` | Retired; no replacement | The Owner retired the standalone client-stack onboarding tool on September 20, 2026. Preserve its historical evidence and migrations; do not recreate a multi-client workflow. |
| `/admin/cms/website` | `/marketing/content/website` | Published P1 content contracts remain distinct from generic CMS pages. |
| `/admin/cms/website/:routeId/:componentKey` | `/marketing/content/website?routeId=<encoded>&componentKey=<encoded>` | Native query selection exists; validate both keys, record permission and draft/preview restoration. |
| `/admin/cms` | No identical overview; choose reviewed Content landing | Do not silently equate overview with Website Editor or generic Pages. |
| `/admin/cms/pages`, `/admin/cms/pages/new`, `/admin/cms/pages/:id` | `/marketing/content/pages?page=<id or new>` | Validated direct selection/create intent released at `112f1d1`; see native-cms-editor-deep-links.md. Test revision/publish/schedule/unpublish/relationships/delete operations. |
| `/admin/cms/media` | `/marketing/content/media` | Preserve uploads, metadata, deletion/reference guards, storage URLs and actual asset bytes. |
| `/admin/cms/team` | `/marketing/content/team` | Preserve ordering/visibility/images and public rendering. |
| `/admin/cms/galleries`, `/admin/cms/galleries/new`, `/admin/cms/galleries/:id` | `/marketing/content/galleries?gallery=<id or new>` | Direct selection/create intent released at `112f1d1`; retained-record, item ordering and public consumer parity remain. |
| `/admin/cms/blog`, `/admin/cms/blog/:id` | `/marketing/content/blog?post=<encoded id>` | Native `post` query selection exists; validate old IDs and revision/draft/publish behavior. |
| `/admin/cms/blog/new`, `/admin/cms/blog/settings`, `/admin/cms/blog/comments` | `/marketing/content/blog?post=new`, `/marketing/content/blog?tab=settings`, `/marketing/content/blog?tab=comments` | Native selectors preserve creation/settings/comments intent; taxonomy uses `tab=taxonomy`. UI tab changes preserve unrelated query context and honor unsaved-edit cancellation. Retirement redirects remain unimplemented. |
| `/admin/cms/sections`, `/admin/cms/sections/new`, `/admin/cms/sections/:id` | `/marketing/content/sections?section=<id or new>` | Direct selection/create intent released at `112f1d1`; full editing/reference parity remains. |
| `/admin/cms/seo` | `/marketing/content/seo` | Include redirects, robots/global metadata and affected public responses. |
| `/admin/cms/menus` | `/marketing/content/menus` | Preserve hierarchy/order/locations, deletion relationships and public navigation. |
| `/admin/cms/sidebars` | `/marketing/content/sidebars` | Preserve assignment/order and public rendering. |

The native route resolver recognizes exact Marketing page paths; it does not inherently accept arbitrary `/marketing/content/pages/:id` routes. Only the query selectors explicitly identified above are confirmed by this inspection. A blanket suffix-preserving redirect would create new 404s and lose editing context.

## Backend and public contracts that must remain

Retiring a React administrative page must not remove the retained Core service or its data/worker routes. The native bridge calls retained implementations; its allowlist deliberately prevents new Core routes from becoming available automatically.

| Mount/contract | Why it stays until independently migrated |
| --- | --- |
| `/api/admin` (including CMS/Website System/design handlers) | Native CMS bridge and version/lock/publication operations depend on it. Backups use shared advisory lock and exact stack identity; old restore cannot be deleted merely because status/run moved. |
| `/api/admin/docs` | Native document operations retain Core storage and coordination. |
| `/api/auth/federation`, `/api/auth`, `/api/setup` | Federation and retained identities/recovery/setup require explicit transition, not route deletion. |
| `/api/client-site-content` | Published site snapshots, revision contracts and preview behavior remain public-site dependencies. |
| `/api/cms` | Generic published CMS consumers and previews remain distinct from P1 route snapshots. |
| `/api/client-forms`, `/api/forms`, `/api/contact` | Durable public intake and downstream delivery/CRM work must continue. |
| `/api/uploads`, `/r2`, `/uploads` delivery behavior | Media retrieval/upload/preview URLs and stored references must stay stable or receive a reviewed compatible migration. |
| `/api/p1` identity/colors/fonts/social/head-tag projections and analytics routes | Public rendering and native reporting depend on these services. |
| `/api/branding`, `/api/site-config`, `/api/runtime-integrations`, `/api/seo/global`, `/robots.txt` | Inventory actual consumers; do not remove merely because some newer projections exist. |
| `/api/blog`, `/api/events`, `/api/careers` | Keep public functionality and feature gates; disabled is not deleted. |
| `/api/crm`, `/api/notifications` | Existing records, intake processing and notification workflows require reconciled ownership and migration. |

Keep schedulers, durable jobs, editor reservations, media storage and cache invalidation in the dependency inventory. HTTP route parity alone does not verify those runtime consumers.

## Required retirement evidence

1. Enumerate each retained page's controls, nested dialogs, exports, bulk actions and deep links against native behavior, not only page names.
2. Finish explicit dispositions for CRM settings, authentication/setup, CMS overview, nested create/settings/comment selections and native restore.
3. Verify Owner/member/crew/client permissions on UI, bridge, Core handlers, exports and lookups; preserve optional-feature disabled behavior.
4. Complete reviewed real identity/CRM mapping, write-freeze/import reconciliation, Core/media recovery and prior-image rollback acceptance.
5. Test redirect table locally/staging: exact known paths, encoded IDs/slugs, query filtering, no loops, no API redirects, old bookmarks and signed-token flows. Use reversible redirects during cutover validation.
6. Confirm public SSR/content/media/preview/intake and native bridge workflows after candidate retirement behavior. Keep old application revision and source data available for rollback.

The native restore implementation is code parity for the backup control, not
production recovery acceptance. Nothing in this inventory closes overall
retirement acceptance.

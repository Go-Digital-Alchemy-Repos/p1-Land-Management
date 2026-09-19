## Verified ownership foundation release — September 19

Runtime `9d39eb5df5a4a4b182b21211b4260a5bf0514aa6` is on main and the task branch.
Core v2 was deployed and verified first at20a3ac31; website followed only after
its live upstream returned200/schemaVersion2. Final Railway SUCCESS:
- Core `97654fb2-f5de-4d46-8bff-0567375f1394`
- Website `7b189ff7-bfd5-4cc8-922d-55d6e054cca6`
- Dashboard `635e96c9-a125-49ea-8a76-ca044d7f458a`

Live readiness/dashboard health returned200. Blog index and all five original
articles returned200 with oneH1 and expected titles; sitemap contains each once.
Hydration confirms known empty ownership. No post has been imported or rewritten.
Authenticated Social Media read/visual review confirms restored two-column fields,
Design navigation, icon styling/preview and colorful navigation icons.
Next: preserve source hero/author/date/media identity and implement/review the atomic
five-article importer. Remaining broader acceptance gates remain unchanged.

## Permanent Blog ownership foundation — September 19

Core implementation `20a3ac313be6676c14820b752425b25e237606fe` is pushed to main
and the task branch. It adds migration0006 immutable import receipts, reserved-route
ownership checks, public schema v2 and full-identity restore protection, including
PostgreSQL microsecond timestamps. No import endpoint or real article transfer exists.

Website consumer preserves existing static pages only after confirmed unowned v2
state; it suppresses owned source pages after rename/withdrawal and fails closed
with503/noindex when ownership is unknown. SSR, hydration, listings and sitemap share
ownership decisions. Build-time default extraction retains all six Blog CMS field sets.
34 website tests, typecheck, build/prerender54 passed; parent independently reran11
Blog/ownership tests. Core21 projection/media/route and14 original actualPG publication
tests passed; receipt6, backup8 and migration replay passed. Core typecheck/build passed.
Independent review caught full-receipt restore protection; the corrected tests also
reject altered provenance/hashes and a one-microsecond timestamp change beforeTRUNCATE.

Release must be Core v2 first, then website v2. Check terminal statuses and live v2
before the website push. Do not import the five articles until hero/author/date/media
preservation and reviewed atomic importer acceptance are complete. Keep additive
schema during application rollback; after any imports, website rollback must remain
ownership-aware. No blanket Marketing/CMS acceptance or admin retirement is implied.
Fresh private read-only backup pointer: `/tmp/p1-ownership-db-private-path`; hashes
and bounded capture evidence are in `docs/implementation/blog-static-import-plan.md`.
No production restore or content write occurred.

## Static Blog import review bundle — September 19

Read-only review tooling now lives in `scripts/consolidation/prepare-blog-import.mjs`
and `.test.mjs`. Five tests cover parsing without script execution, content/structure
preservation, unsafe-link changes, wrong/duplicate routes/layout, bounds, deterministic
fingerprints and incomplete input. Full tool constraints and the approved ownership
contract are in `docs/implementation/blog-static-import-plan.md`.

Fresh five-page capture was bracketed by Railway website SUCCESS observation
`f75d9dce-bd05-4cdb-a82d-51ff22c976a7` at2c72c98f. All five preserve content/structure;
source fingerprint `b89dfa689c4e1e71866b2ecbf89dea1c06118d6bb6ec7c0111b36d48f469f6c4`.
`/tmp/p1-blog-public-review-fresh-path` points to captured HTML/evidence; latest local
review bundle is `/tmp/p1-blog-import-reviewed-structure-20260919/review.json`.
These local artifacts are review evidence, not an executed import or archival guarantee.
The exploratory earlier bundle has incorrect caller provenance and is superseded.
No production content, media or database changes occurred. Next: implement immutable
five-route ownership receipts plus coordinated public projection/consumer and restore
preflight safeguards, with reviewed hero/author/date/media preservation before import.
Goal remains active; all other acceptance gates remain in the tracker.

## Verified Blog formatting release — September 19

Code `4c74f67a0f4ea6d5c2e77735232c13ddaf0ce86f` is pushed to main and the
consolidation branch. Railway SUCCESS: Core `08e1081b-6c02-4ef1-ac5e-e708e92b2589`,
Website `60e8796c-0962-49f0-bf9d-d3365247ccfe`, Dashboard
`3e780b72-c332-4806-9522-6e2e1f504b1b`. Core readiness, Dashboard health and public
Blog returned200 after rollout. Source/typecheck/build, pipeline/security and
390px browser evidence is in the acceptance tracker. No production post was edited.

The five live static articles were captured read-only, including resolved hydration
snapshots, into a local review bundle. `/tmp/p1-blog-public-review-path` points to
it; capture-index contains individual HTML hashes. All five contain snapshots.
The next slice is a reproducible review bundle/dry-run importer following
`docs/implementation/blog-static-import-plan.md`; route ownership, dates, author
schema and presentation preservation must be resolved before production import.
The full consolidation goal remains active.

## Verified Blog editor and public delivery release — September 19

Runtime `e6125fb9c76732ada9b1fae60a857f281197a986` is on main and the
consolidation branch. Railway SUCCESS:
- Core `7b27ec34-7a3b-4a8f-a98e-1e9aae4982bc`
- Website `dd553555-a49e-4f88-b719-6aa4788dcf7a`
- Dashboard `f854efd2-569b-4a67-86e4-4356479bbedb`

Core logs confirm migrations completed. Core readiness and Dashboard health return
200. The public Blog publication endpoint returns its valid empty collection;
private Core and Dashboard publication routes return 401 without authentication.
Public Blog SSR retains all five original article links. Authenticated browser
checks verified the restored Blog tools and new-post Content/Layout/SEO tabs,
rich-text toolbar and media picker; no post was saved, adopted or published.
Social Media retains its restored Design navigation, profile fields and icon preview.

The first Core build failed on an out-of-context generated type import; the fix
uses type-only responses derived from Core services and passed isolated typecheck,
production build and seven editor tests before this successful deployment.
See `docs/implementation/blog-publication-consolidation.md` for backup/test evidence.
Full Blog acceptance still requires actual editing/publication acceptance, reviewed
import of the five articles, full public sidebar/comment presentation and recovery.
Remaining CMS/System parity, Search Console access, CRM/account reconciliation,
operational acceptance and safe admin retirement remain open. Goal stays active.

## Verified dashboard recovery release — September 19

Runtime `5af08490509da3f315cac21eb10cc86bc541031f` is pushed to main and the
consolidation branch. Railway SUCCESS:
- Dashboard `ee0c3366-7be3-4625-b6d9-4be260d24a39`
- Core `44a31ebd-ccd8-4285-bc87-f7ac396767eb`
- Website `f28e23a2-cfe1-464d-a645-75d3f4eab142`

Core readiness/database and dashboard health pass. Authenticated refreshed Blog
list renders all existing tools and its correct empty CMS state. The delivered module bundle
`/assets/index-DNKqOUTK.js` contains manual recovery and unsaved-warning controls.
Initial bundle probe selected theme-init.js; corrected module-script selection
verified the actual application asset. Existing tabs need a refresh for this fix.
The full consolidation goal remains active: Blog editor/scheduler/public delivery,
remaining CMS acceptance, Search Console access, CRM/account reconciliation,
operational journey and complete recovery/retirement are still open.

Railway build logs also yielded actual image digests: Core9926fc01 image
`sha256:78e1d103c218befbaa3c9a001c6f9b2a42fe6d2a3d868085e7ad1312c8c1d8e8`
and Dashboard5af08490 image
`sha256:05897d6e0bed749c497b8329216ea075e0cc9bd6803f5240a2c162ac59ee2afb`.
These establish build provenance only; immutable-image retrieval and actual
image-based rollback rehearsal remain unverified.

## Dashboard stale-asset recovery — September 19 candidate

The live deployment finding is corrected with a local error boundary around the
existing tool Suspense regions. Seven tests passed independently, with clean
Dashboard typecheck/build and actual Chrome CSS404/recovery evidence. Manual reload
honors existing navigation cancellation and explicitly warns about unsaved work;
no automatic reload occurs. Cross-report key changes reset the failed boundary.
Existing old bundles require one refresh to receive the fix. See
`docs/implementation/dashboard-lazy-recovery.md`. Deployment evidence follows.

## Verified foundation release — September 19

Runtime `9926fc01fd6d986d7a7247595a1f49162447bdf2` is on main and the
consolidation branch. Railway SUCCESS:
- Core `88e0915f-90ca-48cf-8464-5999773adad7`
- Website `4f3402cd-4477-48a2-b559-9f1bed3f02be`
- Dashboard `69c6f77d-7eb4-4bb0-be9c-77272864c6d6`

Core logs confirm P1 migrations completed at2026-09-19T22:06:38.106Z.
Core readiness and dashboard health pass; public Blog SSR retains all5 original
article links. Authenticated refreshed Blog list shows original tools and its
existing empty CMS catalog. No records were adopted or published.

A preexisting open tab briefly went blank on navigation because its old bundle
requested removed `/assets/BlogManager-CAoRQ0DH.css`; hard reload recovered. A bounded
stale-lazy-asset recovery task is now active, with no automatic draft-discarding
reload authorized. This deployment finding remains open until that fix is tested.
Disposable Blog PostgreSQL container was removed after validation. Goal stays active.

## September 19 continuation — Blog recovery and crew browser evidence

Crew offline browser acceptance is committed and pushed at `bfb9336d` to main and
the consolidation branch. Independent Chrome rerun passed actual offline queue,
reload, full browser-process restart, lost acknowledgement and retry with stable
IDs. The receiver is synthetic; physical reboot/photos/reassignment remain open.
See the acceptance tracker for exact evidence boundaries.

The additive Blog publication foundation is frozen and independently reviewed;
parent14/14 publication/catalog tests, clean Core typecheck and full production
build passed. The candidate is accepted for the internal foundation release;
live deployment verification follows separately.
Review found and repaired cyclic restore ordering, historical archive omission,
new-table timestamp ambiguity and incomplete schema declarations. Parent also
reproduced a preexisting backup capture defect (timezone shift and microsecond
loss) and added query-local raw timestamp capture plus actual round-trip coverage.
No production content or accounts have been changed. Blog API/editor/public route
cutover is still required; this storage work does not complete Blog acceptance.

## Verified redirect release — September 19

Runtime `e139dba0be1e98ec1b3f794c67c801721515ef44` is pushed to main and
`codex/business-center-consolidation`. Railway SUCCESS for Core
`8fc4601c-335c-4f53-bf6f-d70f3bdba860` and website
`a37a2a5e-7041-4954-99ae-914527068c16`. Read-only live checks returned the
valid empty public redirect projection and HTTP200 for `/service-areas`.
No production redirect settings or CRM data were changed. Blog foundation remains
separate and uncommitted pending independent review; no full-parity claim is made.

## September 19 follow-up — CRM payload and redirect safety

Private read-only CRM payload export now completed: three leads, no clients/notes/
tasks; one receipt-backed match, two unresolved parent mappings. File hashes,
snapshot-specific UTC evidence and private bundle pointer are documented in
`docs/implementation/crm-payload-export.md`. No import/freeze or production writes.

Redirect consumer was already released; stale missing-consumer notes are corrected
in the acceptance tracker. New validation caps redirect chains at ten edges while
preserving mixed301/302 and query behavior. 32 focused checks and both typechecks
passed; parent independently reran 25 website runtime/store checks.

Blog revision/publication foundation is being implemented separately by the bounded
Blog agent. Its uncommitted additive schema/service work is excluded from this
redirect release until independently reviewed and validated. Existing APIs, scheduler
and five static article URLs remain unchanged. The full consolidation goal stays active.

## Verified Website System release — September 19

Runtime `001ac605a648d83fbefc6cbc49a07915003b3354` is pushed to main and
`codex/business-center-consolidation`. Railway SUCCESS:
- Dashboard `902d82fa-4734-4c3e-8db1-095994873b7a`
- Core `2c997eb8-0963-4c6f-8316-8ed51008991d`
- Website `c3d5d7df-2f2a-4fb9-b9a8-7a789daa03e6`

Authenticated live reads verified the original-style three-provider Integrations
library, five saved Email Templates and the empty Developer Resources three-pane
workspace. Production content/settings were not changed. Full Core production build
also passed. Inherited template subjects still include Core Platform and an unrelated
provider registration template; template content reconciliation remains open.
The release restores interfaces, not full consolidation acceptance; goal stays active.

## Website System interface restoration — September 19 candidate

Original shared Integrations, Email Templates and Developer Resources presentation
is restored in both retained Core and native dashboard hosts. This implements the
Owner correction to reuse the original tools rather than reduced native forms.
See `docs/implementation/marketing-admin-interface-parity.md` for exact scope,
validation and remaining acceptance gates. All existing data/authentication contracts
are preserved; no providers were provisioned and no production data was changed.

14 Integrations, 14 Email, 7 retained email-helper and 9 Documents tests passed,
with independent Documents review/rerun. Both clean typechecks and dashboard/Core
client builds passed. The restricted dashboard build context passed. Local browser
review verified original tool layout, synthetic saves/previews/token insertion and
390px layouts. Release/deployment verification will be recorded above this entry.

Remaining current work: deeper CMS/public-consumer and concurrency acceptance,
Google connection management/Search Console permission coverage, reviewed real CRM
payload export/mapping/freeze/import, account-policy decisions, complete crew/offline
journey, populated content/media recovery and actual deployed-image rollback,
final full-candidate acceptance and safe `/admin` retirement. Goal remains active.

## Verified release — September 19, Careers/Events and public menus

`4b7cf0f6106b40af504f40a7a8e2c5e879a172c6` is pushed to main and the
consolidation branch. Railway SUCCESS for dashboard
`79f2bfa5-56a1-4813-ae1d-5820b4847222`, Core
`f0a32e3e-d5e3-4bc9-ac1e-e540953fa92f`, and website
`5af2d952-739d-40f9-846d-4cd7cd3ebb66`.

Live public menu endpoint returns 200 and the four unassigned slots. Homepage
SSR and contact-route JSON contain the same menu revision; existing navigation
remains visible. Authenticated Menus shows the publication notice and empty
catalog. Careers correctly displays its disabled-module state with creation
unavailable. No production writes or module enablement were performed.
The candidate evidence below records scope and limitations; goal remains active.

## Careers/Events and public menus — September 19 release candidate

This checkpoint supersedes the historical entries below. Team/Sidebars revision
`cc49b6740169d21c1f810306393440915e534e45` is already live: Railway dashboard
`3912da69-3e3c-4391-94d9-73552c08a1d0`, Core
`dd008d19-39c7-49b3-bb1d-64fabbe47299`, website
`e236f317-6c39-46bf-b660-687c58fa3d01` all SUCCESS.

Current candidate shares original Careers and Events presentation, retains native
transport safeguards, and connects the four P1 menu slots to published public HTML.
All modules remain disabled where previously disabled; no production content or
accounts changed. The live menu catalog was rechecked and is empty, so activation
preserves existing public navigation. See the Marketing parity and public-menu
implementation documents for exact evidence and remaining feature gaps.

Validation: Careers 6 and Events 7 native tests, retained Events 10 tests, menu
adapter 4 tests, shared form accessibility/adapter 5 tests, menu backend 22 tests,
public server 76 tests and snapshot retention 3 tests passed. Core/dashboard/site
typechecks and builds passed; restricted dashboard/public build contexts passed.
Synthetic browser checks covered Careers draft save/readback; Events four-tab
layout and Registrants panel; menu nesting, mobile modal handoff/focus, retained
retry payload/key, accepted receipt, and preview submission disablement. A browser
confirmation stalled the synthetic attendance click; the real embedded attendance
regression tests passed, but that browser action is not claimed verified.

Original `/admin` remains retained. Outstanding goal gates still include full
Marketing feature parity, dynamic Blog/public content consumers, write conflict
coverage, CRM/account migration acceptance, real agreement/crew/offline acceptance,
recovery/rollback and owner acceptance. QuickBooks/Twilio remain deferred.

## Team/Sidebars accepted release candidate — September 19

Shared original Team cards/dialog and Sidebar Details/Widgets interfaces passed
13 adapter tests, independent review, desktop/mobile synthetic browser checks,
clean Core/dashboard typechecks, both isolated builds and restricted dashboard
packaging. Runtime sources are frozen and accepted for release; production
verification follows the commit. Parent corrected Team library-button contrast,
verified nested dialog Escape/focus and saved a synthetic member draft. Sidebar
Form reference preservation and Callout add/save/relist passed. No production
content was modified. Existing unversioned-write/uncertain-create and public
consumer gaps remain open. See Marketing parity evidence and the approved
public-menu implementation contract. No agents currently own unfinished edits.

## Current checkpoint — September 19, Blog and Menus released

This checkpoint supersedes historical in-progress ownership and deployment claims
below. History is retained as evidence, not as the current work queue.

`effa8d77ed0fc625ba1e142ca1a3ead907f228c7` is pushed to main and the
consolidation branch. Railway SUCCESS: dashboard
`270cc051-1560-44e1-800e-1881e1c0fedc`, Core
`70be8e31-67b4-4a6e-96ff-39f7bff8cb4a`, website
`5a7b5019-9253-4551-894c-80d8c4823761`. Authenticated read-only live Blog
and Menus screens loaded their restored controls and real empty catalog states.
No production content was created or published. Twenty-two scoped tests, clean
Core/dashboard typechecks, both production builds and restricted dashboard
packaging passed; local synthetic draft and nesting/save flows passed.

Current parallel work: Team shared presentation is owned by social_ui_reuse;
Sidebars shared presentation by marketing_parity_inventory. Parent owns shell,
packaging allowlist, documentation and integration. Public-menu consumer design
is under read-only review. Preserve all in-progress work.

Priority acceptance gaps remain: remaining Marketing tool parity; generic public
menu delivery; dynamic CMS Blog delivery; server concurrency for Blog, Sidebars
and Sections; full publication/restore acceptance. Sidebars has eight widget
types, including Form, and advisory reservations without server version checks.
Menus has version CAS but not the exact-instance lease implemented for Pages.

Broader goal remains open: Search Console canonical-property access; reviewed
actual CRM mappings/import/freeze; account/access and notification reconciliation;
full browser crew/offline acceptance; content/media and original-image recovery;
final QA and safe retained-admin retirement. Keep `/admin` available.
QuickBooks and Twilio remain deferred. Live Analytics is already working; do not
recreate credentials. The actual account/CRM metadata captures are complete but
are not migration approval or an account transition.

## September 19 — Website/Galleries/Head Tags now deployed

`78fb0e72` is on main/task branch. Railway dashboard, Core and public website
SUCCESS. Shared original editors, Gallery keyboard/modal fixes, Website delayed
response fencing and truthful empty SEO audit are released. Parent33 editor tests
plus8 SEO tests passed; both typechecks and isolated builds passed. Live Website
inventory/home editor and real iframe preview, plus Gallery empty list, verified
read-only. Production publication/save mutations were not performed.

Blog is owned by social_ui_reuse; Menus by marketing_parity_inventory. Their
uncommitted files are NOT part of78fb0e72; preserve them. Parent owns shared shell,
runtime allowlist, docs and integration. Keep original admin available.

## September 19 — Website/Galleries/Head Tags restoration candidate

Original shared editors replace simplified native screens. Parent verified 33
focused tests, both typechecks, dashboard build and synthetic browser interactions
at desktop/mobile. Packaging and independent review passed. Production verification is the
remaining release gate. No production content/settings changed. Prior live
revision remains `a717f748` (feature `7714ccb9`). See Marketing parity document.

Actual private read-only account and CRM metadata captures are now complete. Owner
MFA/inactive-account disposition remains pending; CRM reconciliation has one
receipt-backed existing-record proposal and two unmapped leads, zero conflicts.
Neither capture is frozen or approved migration evidence. Raw content export/import,
account review, delivery/session assurance and retirement gates remain open.

## September 19 — Sections and SEO now live

`7714ccb9` is on main/task branch. Railway dashboard, Core and website SUCCESS;
authenticated production read-only SEO tabs/audit/reference and Reusable Sections
list verified. No production data written. See acceptance/parity docs for exact IDs.
Galleries is owned by marketing_parity_inventory; structured Website by
social_ui_reuse. Parent owns main/runtime allowlist/docs/integration. System tools
read-only inventory from redirect_review is ready. Preserve all in-progress work.

## September 19 — CMS Pages live; Sections and SEO release candidate

Latest pushed revision `1f37c36d` is SUCCESS on the production dashboard, Core and
public website. Runtime code `872d2bb7` restores the original CMS Pages list,
templates, landing wizard and visual builder, with exact-instance/version-fenced Pages and version-fenced Menus.
Core startup verified the additive `p1-migrations/0003_cms_page_concurrency.sql`.
Live CMS Pages list and new-draft controls were read without saving production data.

Social, Branding, Colors, Typography, Modules, Forms and Media shared presentation
work is released. Full Marketing parity remains incomplete. Sections and SEO shared
presentation passed scoped review, 13 adapter tests, both typechecks, isolated
Core/dashboard builds and local desktop/mobile browser checks. Deployment verification
for this next release is pending. Galleries
is the next bounded restoration task. Preserve all concurrent work; do not stage
unrelated candidates together. Sections still has the pre-existing user-reservation
concurrency limitation, unlike fenced CMS Pages; presentation restoration does not
close that server contract gap. See `docs/implementation/marketing-admin-interface-parity.md`.

Private account/access capture tooling is committed, but no actual production
capture/reconciliation has run. Search Console domain access, account/CRM migration,
full crew offline acceptance, content/media recovery and original-image rollback,
and safe admin retirement remain open. Keep `/admin` available.

## September 19 — Forms live; Media candidate accepted for release

Forms7ea1fee dashboard/Core SUCCESS; liveheading/tabs/palette/no-alerts verified.
Media sharedgrid/details/upload/crop editor accepted witheighttests,bothbuilds,
independentreview andlocalbrowser metadata/crop-preview/mobile/dialog checks.
Production data untouched; optionalmultiselectpicker remains open. Dependencies
reusedexactCoreversions, runtimeallowlist/dedupe added; isolateddashboardbuild
withoutCore node_modules passed. Seeparitydoc forvalidationlimits.

## September 19 — Forms candidate accepted for release

Fresh browser verification succeeded: Entries list/detail, clean tabs/new draft,
Email palette/inspector, inactive synthetic save/relist and390pxcontainment. All14tests
passed (six shared/Core plus eight React19 native). Isolated HEAD+Forms Core/dashboard
typechecks/builds passed, excluding current Media changes. Reviewer reverified all
three earlier blockers fixed. No production forms/submissions written. Forms source
and scopedstyles/generator/tests/main integration belong this release; Media package/
lock/components and redirects/menu remain excluded.

## September 19 — Forms candidate awaiting browser completion

Forms reviewer findings corrected by marketing_parity_inventory with seven native
race/legacy/drag tests plus clean-click eighth test; React19 test-host alignment
being completed. Six retained/shared tests and both typechecks/build passed before
Media edits. Browser confirms original library/palette/inspector and corrected scoped
borders/labels; a local active-save confirmation in tab23 blocked that tab and later
button interactions despite textbox edits working. getJsDialog returned undefined;
getAX/close for23 timed out. Do not claim interactive Entries/save verified or release
Forms until fresh browser verification succeeds. Synthetic server44217 on4353;
/tmp/p1-social-review-server.mjs supplies forms,reservations,submissions in memory.

Parent added Forms shared runtime allowlist, removed duplicate Forms header and fixed
owner/wildcard media prop in main (uncommitted Forms scope). Media restoration now
owned by social_ui_reuse. Parent installed existing exact cropper dependencies
react-image-crop11.0.10 ISC and browser-image-compression2.0.2MIT; dashboard package
and pnpm lock changes belong to Media, not Forms. New Media runtime allowlisting
will need media-library-presentation.tsx and image-cropper-editor.tsx when ready.
No production data changed. Branding f2335f4 verified live in previous checkpoint.

## September 19 — Branding live; Forms review corrections underway

Branding f2335f4 dashboard/Core Railway SUCCESS and authenticated live verification
complete. No production settings written. Forms independent review identified reload
and reservation response races plus whole-list failure on a single unsupported form.
marketing_parity_inventory is fixing these with tests, plus unnamed-control labels
and missing scoped border-width reset discovered in browser. Parent main.tsx hides
duplicate generic Forms heading and uses can(media) for owner/wildcard parity.
Forms is NOT committed or released. New tests/config/utilities are part of its scope.
Unrelated redirect/menu work remains dirty and excluded.

## September 19 — Branding restoration accepted for release

Shared logo/favicon cards/company fields restored with capability-gated media
selection and staged versioned saves. Six focused tests, both app typechecks/builds,
independent review and local synthetic browser checks passed. Nested-button and
hidden-input visual defects fixed before release. Runtime source explicitly allowed
in Docker context. Forms restoration remains in progress; unrelated redirects/menu
drafts remain excluded. Website Modules2afc0d3 is now verified live on both apps;
see marketing-admin-interface-parity.md for exact deployment IDs/evidence.

## September 19 — Website Modules shared presentation increment

Feature Apps now shares the retained card/rows/switches with native Website Modules.
Three focused tests, dashboard typecheck/build, and isolated Core typecheck/build
passed. Core isolation used HEAD plus the two scoped runtime files because concurrent
Forms work is still in progress. Synthetic browser switch/default/confirmed-save and
390px layout checks passed. Independent review passed after browser-script updates.
Colors7733706 is live: dashboard d3fe33ab-202f-43b1-bcb1-7d1a10e8b115 and Core
42510145-0b45-4694-918e-5af509276add SUCCESS; all groups/18controls confirmed live.
Branding implemented but awaiting parent acceptance; Forms in progress. Do not merge
unrelated menu/redirect drafts or declare full Marketing parity complete.

## September 19 — Colors shared presentation increment

Colors now shares the retained editor with three original sections, 18 paired
controls and complete Palette Preview. Parent browser validation passed on local
synthetic state, including confirmed save and 390px containment; no production
settings changed. Fourteen focused Social/Typography/Colors tests passed. Full
Marketing parity remains open. Forms original-workspace restoration is delegated
to marketing_parity_inventory; Branding follows Colors. Do not include unrelated
menu/redirect draft files in the UI release.

## September 19 — latest verified release fb2d322

Dashboard deployment 8a021ce9-9a76-4dd5-b298-2e2a21265e6a and Core deployment
555c280d-7661-4f1f-ab90-a1a5fa5571c2 both SUCCESS at fb2d322. Authenticated live
Typography verified with Heading/Body Font Pickers, 40 loaded font cards and Save
disabled on unchanged data. Social live verification recorded below. No production
settings changed. Colors shared extraction is running under social_ui_reuse; add
its color-editor.tsx explicitly to root .dockerignore before releasing. This
checkpoint can be included with that next scoped commit.

## September 19 — Social live; Typography restoration increment

Social restoration is verified live at a9a7d79 after correcting the dashboard build
context. Railway dashboard d1ddbb62-160d-4ca3-94bd-bfdd05e17fc8 SUCCESS; authenticated
page displays original shared fields, preview, Design navigation and colorful icons.
Typography original selectors/font-card libraries/preview now extracted and locally
reviewed for desktop/mobile. No production settings changed. Remaining Marketing
parity includes Branding, Colors, Forms, builder and other inventory rows; retained
admin stays available. Menu/redirect draft files remain unrelated and uncommitted.

## September 19 — Marketing interface correction, Social increment

Owner identified the simplified Marketing pages as a regression from retained `/admin`.
Social now uses one shared presentation component in both apps, original fields and
preview layout, guarded Design navigation, original titles/descriptions and distinct
colorful icons. Dashboard/Core typechecks and builds pass; five focused tests pass.
Parent browser review verified desktop/mobile and local save without production writes.
A URL focus-prefix duplication found during review was fixed and covered.
Remaining page-by-page gaps are recorded in
`docs/implementation/marketing-admin-interface-parity.md`; this increment does not
close Marketing parity or authorize admin retirement. Menu/redirect work remains
uncommitted and must not be included in this UI release. Typography is next.

# Business Center consolidation handoff

Updated September 18, 2026. Read this current-state update before older checkpoint details below.

## Owner correction: Marketing interface fidelity

The Owner rejected the simplified Marketing interfaces as unlike retained `/admin`. Reuse the original page components/layouts/toolbars/icons/features with necessary routing and auth adapters; backend parity alone is insufficient. See `docs/implementation/marketing-admin-interface-parity.md`. Social Media is the first comparison. Keep retained admin available. Current partial menu/redirect changes are preserved but not release-ready.

## September 19 native CMS continuation

Native editor deep links released at `112f1d1`; all three unsaved creation intents opened in the authenticated browser without saving data. Mobile quick contact now shares the published identity at `74c9534`; all three Railway services reached SUCCESS and live homepage markup was verified. Robots delivery was then connected at `ec899b3`, with live projection/GET/HEAD equality verified at `550534b`. CMS redirects and menu assignments still lack public consumers; see consolidation-acceptance.md. Search Console domain access permission is prepared but awaits the pending action-time confirmation. Do not retire retained admin.

## September 19 recovery and reconciliation checkpoint

Completed work is on both `main` and `codex/business-center-consolidation` through `fe4c0a5`; Railway reports SUCCESS for Dashboard, Core and website at that revision. Historical Core archive recovery now passes: 52 tables, 519 rows and both catalog sequences. The rehearsal found and fixed generated-always identity inserts and missing historical identity-sequence metadata. See `docs/implementation/core-recovery-acquisition-2026-09-19.md` for exact source hashes, failed-attempt history and limits. No production restore was performed.

Synthetic CRM import/replay/restore passed, including preservation of a later native task edit. The separate read-only account-access metadata reconciler now covers explicit suspension, verification/MFA representation, grants, notification settings and relationship scopes. These are tools and synthetic evidence, not actual account/CRM migration or authenticated Owner mapping approval. See `synthetic-crm-restore-rehearsal.md` and `account-access-reconciliation.md` in the implementation docs.

The retained admin route inventory now identifies native destinations, missing edit/create links, restore parity and backend dependencies. Isolated source-rebuilt application startup/previous-image rollback now has partial evidence04 (empty content prevents published recovery proof); complete media recovery, real source/account reconciliation, agreement/crew/offline acceptance, Search Console domain/www access and safe retirement remain open. Use `consolidation-acceptance.md` as the requirement-level tracker; do not treat source-matched local images as actual deployed Railway image digests.

## September 19 public identity checkpoint

Public identity delivery is released at `4d85894` on main and the consolidation branch. Core, dashboard and website Railway deployments reached SUCCESS; homepage/contact SSR identity revisions match the live projection, and desktop/mobile read-only checks preserve current P1 branding. See `docs/implementation/public-website-identity.md` for exact release evidence and remaining live-edit/cache limits. Native Integrations and Email Templates were released earlier; their contract documents retain the scoped evidence. The full consolidation remains incomplete. Native backup status/run and history correctness are now released at `47e8136`, with ten real history entries verified read-only in the Owner screen. See `docs/implementation/website-backups-contract.md`. No production backup, retention deletion or restore was performed. Core/media restore, CRM/account reconciliation and crew/offline acceptance remain open.

## September 18 reconciliation and current state

- All completed consolidation code was normally merged to `main`; both `main` and `codex/business-center-consolidation` reached `140a412`. Do not selectively deploy an older public-only main: that previously regressed Dashboard and Core and has been corrected. See `docs/implementation/reconciliation-2026-09-18.md` and `main-release-policy.md` in that directory.
- At `140a412`, Railway reported SUCCESS for website `d431f347-021d-4e8e-9dce-3964ce86ae06`, Dashboard `2196e4ac-0c84-421f-9c54-b8ffdd52e628`, and Core `51843fa2-5821-4072-8d0f-8e65c2a58abd`. Worker remained on its existing compatible deployment. These supersede the September 17 deployment table below.
- Analytics now returns real Google provider data in the consolidated authenticated dashboard. The failure was a valid empty previous-period report being rejected for missing headers; the normalizer and regression coverage were corrected in `8cd8ae1`. Do not provision replacement OAuth credentials.
- Search Console remains open: configured domain property `sc-domain:p1landmanagement.com` returned 403; the authorized property list exposed only `https://p1landmanagement.com/`. Canonical `www`/domain coverage must be verified before switching settings or claiming completion.
- The Service Areas map, sidebar, public improvements and Title Case links are live. The directory now begins with a full-width map; desktop and mobile were visually checked after `140a412` deployment.
- The private September 17 dashboard backup is available on this workstation and an isolated restore/migration/second-restore rehearsal has now passed. See `docs/implementation/dashboard-restore-rehearsal-2026-09-18.md` for scope and limits. This does not establish complete Core/media recovery, application rollback, CRM/account reconciliation, or admin retirement.

The older stopping-point, reporting-error and deployment sections below are historical context, not current operating instructions. Continue from the acceptance tracker. The full consolidation goal remains active.

## Start here on the next workstation

The consolidation is **partially implemented and incrementally deployed, not complete**. Continue the existing implementation; do not rebuild from the original proposal or treat the deployed screens as proof of complete parity.

Repository: https://github.com/Go-Digital-Alchemy-Repos/p1-Land-Management

Working branch: `codex/business-center-consolidation` (not `main`). For a fresh checkout:

```sh
git clone --branch codex/business-center-consolidation https://github.com/Go-Digital-Alchemy-Repos/p1-Land-Management.git p1-business-center-consolidation
cd p1-business-center-consolidation
git status --short
git log -6 --oneline
```

If using an existing checkout, inspect local changes first; fetch and integrate normally without resets or force pushes. Install from the checked-in lockfiles: the root workspace uses pnpm; Core has its own package setup. Inspect each package's scripts before running checks. Production credentials, database dumps, local dependencies, browser sessions and SSH keys are not transferred by cloning GitHub.

Read, in order:

1. `AGENTS.md` and any applicable nested instructions, especially `platform/p1-core/AGENTS.md`.
2. `docs/implementation/consolidation-acceptance.md` — authoritative current acceptance gaps.
3. `docs/implementation/consolidation-release-2026-09-17.md` — deployments, backup and live verification evidence. Later sections supersede earlier account-link-pending observations.
4. `docs/proposals/p1-business-center-consolidation.md` — approved scope.
5. `docs/implementation/business-center-consolidation.md` — chronological implementation and test history, not a current backlog.

Suggested continuation prompt:

> Read handoff.md and the linked acceptance tracker. Continue the approved Business Center consolidation on codex/business-center-consolidation. Verify current repository and deployment state, diagnose the remaining Google reporting configuration issue, then complete the outstanding feature and migration acceptance work. Preserve existing data, access controls and unrelated work; commit and push validated task changes. Do not mark the full goal complete until the acceptance gaps are closed.

## Owner requirements and authorization

- Consolidate website `/admin/` into the business dashboard, eventually retiring the separate admin without losing features or data.
- Marketing immediately above Settings contains Content, Design, Website System and Reporting. Website settings stay separate from business settings.
- CRM belongs in Revenue/Customers and must retain records and operational workflow.
- Adopt the richer admin-style User Manager: only Owner has automatic full access; other team members have explicitly selected dashboard/website capabilities enforced server-side.
- Adopt admin-style themes in place of the former earthtone dashboard UI.
- Bring Analytics and Search Console reports into Marketing, preserving their controls and real provider behavior.
- Reusable MSA, Scope, Cost and Package templates must compose into the existing sales/agreement workflow. Blythe is a read-only feature reference, not a project to modify or directly copy.
- The Owner explicitly requested implementation, GitHub pushes, and deployment of completed work followed by continued implementation. Ordinary task commits/pushes do not require another confirmation. Do not treat this as authorization for destructive data operations or unrelated changes.
- Preserve GitHub Actions' disabled state. Use normal pushes, not history rewriting. Do not send emails or other external communications without explicit authorization.
- The original checkout and Blythe were left untouched. Continue in the task checkout/worktree.

The previous session's goal tool had a stale paused state/older deployment wording; the Owner subsequently explicitly resumed work and authorized incremental deployment. The full goal has not been achieved. Reconcile any new session goal state with the actual Owner instructions rather than claiming completion.

## Exact stopping point: account link succeeded

The Owner finished the explicit CMS credential-proof and Dashboard identity confirmation flow. Verification after their final “done” established:

- A read-only production Core query returned **one active identity link**.
- The authenticated Marketing Website Editor loaded existing website routes and shared content.
- Analytics and Search Console no longer display `Website reporting access is unavailable`.
- Both instead display **`Website reporting is not connected yet.`**, mapped by the transport to `not_configured`.

Do not ask the Owner to link the same account again. Do not claim Google reporting works. The exact missing Google credential/property setting has **not** been established. No content or account permissions were changed during this verification.

Immediate diagnostic sources:

- `artifacts/api-server/src/dashboard/marketing-reporting.transport.ts`
- `platform/p1-core/server/services/google-reporting-auth.ts`
- Related Google reporting routes/services and environment schema (search for `P1_GA_` and `not_configured`).

The current Google auth implementation accepts either `P1_GA_SERVICE_ACCOUNT_JSON` with client email/private key, or all of `P1_GA_CLIENT_ID`, `P1_GA_CLIENT_SECRET`, `P1_GA_REFRESH_TOKEN`. Check configuration presence and property requirements without printing secret values. A not-configured result alone does not prove which setting is absent. Inspect the prior reporting implementation before provisioning replacements or changing provider access.

## Implemented and live, with limits

- Marketing navigation, many native Content/Design screens, Website Editor, appearance controls, User Manager and capability infrastructure.
- Retained Core CMS handlers and data stores behind allowlisted authenticated service transport; this is not yet proof of every legacy operation's parity.
- Native CRM notes/tasks and onboarding work; extraction/import/verification tooling exists, but real CRM migration and reconciliation have not been performed.
- Versioned MSA/Scope/Cost/Package templates; composition and pricing; mounted sales preparation; immutable issuance/documents/PDF/customer approval; revisions/change orders and billing integration. Do not describe these as merely unmounted foundations.
- Live template library had no saved templates. No synthetic legal content was published. Owner-provided standard agreement content remains distinct from test fixtures.
- Dashboard migrations are deployed through `0046_lead_customer_onboarding.sql`, with 50 ledger entries. Thirty preexisting migration files matched production checksums. Historical ledger-only `0019_optional_owner_mfa.sql` was retained, not replayed.
- Production had one active Owner and seven existing disabled fixture accounts at the release check. Do not alter those fixtures casually.

Most recent code fix: `78b893f7f5f936393473d365ea89a867b1d3f90d` recovers an unlinked federation callback to the fixed `/admin/login?federation=link-required` proof form rather than returning raw JSON. It clears temporary flow cookies, retains no-store/no-referrer, never forwards callback secrets or arbitrary return URLs, and preserves other denials and explicit confirmation. No automatic email-based linking was added.

Follow-up evidence commits: `b85a7f3` (recovery deployment), `d0d9c9e` (successful Owner linking/CMS read).

## Remaining work

Use the acceptance tracker for the full matrix. Prioritized outstanding areas:

1. **Live reporting:** diagnose Google configuration, restore real Analytics/Search Console results, verify Search Console property coverage and report/CSV parity; provide appropriate Website System connection management.
2. **Missing Website System features:** Integrations, Email Templates and System Backups still need consolidated equivalents or explicit disposition before admin retirement. Developer Resources and Client Stack Onboarding now have native destinations; retained admin retirement still requires the complete acceptance tracker.
3. **Public identity delivery:** Branding editor exists, but public logo/favicon/company identity still need integration with actual website consumers and published contact content. Consider current image CSP and safe media delivery.
4. **CMS parity:** inventory every legacy operation, nested setting, preview/publication path, shared setting and public consumer. Generic CMS and P1 Website snapshots remain distinct stores/consumers; do not merge them by assumption.
5. **CRM migration:** finish native field/settings/prospect-context gaps, obtain reviewed real source mappings, handle unmatched parents, rehearse import and independent reconciliation, and define source freeze. A raw archive is not native workflow parity.
6. **Access/account migration:** complete endpoint/export/shared-lookup/notification capability coverage, client/crew/offline boundaries, grants, suspension, email verification, MFA/session assurance and existing-account transition rehearsal. One linked Owner is not full account reconciliation.
7. **Agreement acceptance:** complete integrated long-document/multi-client/historical-document tests and real browser journey through crew execution/review, offline behavior, activation and billing, including cancellation/successor/change orders. Prior mixed-billing fixture simulated crew completion and did not exercise external posting.
8. **Retirement/release acceptance:** execute isolated restore/rollback and migration rehearsals, finish redirect/deep-link inventory, verify media/intake/preview/public compatibility, then safely retire `/admin/`. It remains needed today.

Email Templates now has versioned transactional storage, coordinated retained/startup writers, a native Owner-only API and dashboard editor at `/marketing/system/email-templates`. See `docs/implementation/email-template-concurrency.md` for implemented operations and validation. Native library, branded preview, reservation acquisition and unsaved visual-to-HTML editing were verified live at `45e2800`; mobile/full mutation acceptance remains. Website Integrations now has a native Owner UI/API with explicit secret controls, versioned writes and coordinated legacy routes. Authenticated desktop/mobile read-only acceptance passed at `807db42`; active Google configuration management and canonical Search Console coverage remain incomplete. Do not retire retained admin or send test emails as part of unattended validation.

## Deployment state and operations

These were verified SUCCESS during this session; recheck before the next release rather than assuming no concurrent changes.

Railway project: `e83f79dd-d901-4ab1-836b-bdf272b58dc2`.
Production environment: `6126e9ca-b071-4c41-b7c0-aa945fa37067`.

| Surface | Service ID | Latest verified deployment |
| --- | --- | --- |
| Dashboard | `7d129f6d-9f9b-4790-b21c-d8919a0a079c` | `2609669b-c874-4caa-8229-cca765adb1a7` |
| Worker | `171f4abc-c24f-4924-bc06-abf0a75a4c15` | `dc20c68a-d803-49d7-ac95-3922d574f738` |
| Core | `45646c66-c173-4e23-81ab-64ca4d545bbe` | `6660c45f-30da-4c3d-be56-746ff7f6189d` |
| Public website | `72d588fd-c963-4e0f-944b-1cb8c5c2fa19` | `fd94bdd5-6829-40ac-8f06-c82ca10f263b` |

Dashboard/worker application checkpoint: `98c073816cbd97e4627bf066498556e513d61c1a`; public readiness fix: `7e85199`; Core recovery checkpoint: `78b893f7f5f936393473d365ea89a867b1d3f90d`. Latest Git branch head includes later documentation; the services are not all deployed from that head.

Production URLs:

- https://dashboard.p1landmanagement.com
- https://www.p1landmanagement.com (public gateway to Core; valid Marketing origin)

Federation staging environment: `ab648ea4-43a8-4181-bef1-0a40bdf94c3d`; Core service `3676c3a9-dc59-406b-a716-ac8628211ead`; Core recovery deployment `472364f4-657a-43cc-805d-20c5f2bf78f7`.
Staging Core URL: https://p1-core-federation-staging-staging.up.railway.app

Read the installed `use-railway` skill before operations. Railway CLI 5.57.9 worked on the previous workstation; authenticate and verify tools on the new machine. `railway api` worked; the older `railway-api.sh` auth lookup did not. Local SSH used an explicit authorized key rather than the default identity; that key is not in GitHub. Establish authorized access on the new workstation rather than copying private keys into the repository.

Packaging matters:

- Dashboard: existing `scripts/package-dashboard.mjs` allowlist.
- Website: `scripts/package-website.mjs --prebuilt` after required production build/image checks.
- Core: committed `platform/p1-core` archive; configured source root `/platform/p1-core`, Dockerfile `/platform/p1-core/Dockerfile`, readiness `/api/health/ready`. Archive uploads require explicit full-commit `P1_SOURCE_REVISION` because there is no `.git` directory.
- Preserve tested packaging/source-root behavior; do not accidentally deploy `main` via a generic redeploy action. Confirm terminal deployment status and live health/browser behavior.

Federation and Marketing transport secrets are already paired in Railway, outside source. Do not rotate/overwrite them merely to resume work. Dashboard uses `CORE_MARKETING_ORIGIN=https://www.p1landmanagement.com`; Core introspects Dashboard grants. Keep explicit account proof and least privilege.

**`CORE_DASHBOARD_FORM_NOTIFICATIONS_ENABLED` remains unset/false.** Existing notification delivery/recipients are retained until reviewed subscription reconciliation. User Manager preferences alone do not mean canonical delivery is active. Do not toggle this flag casually. Production Core's required two-recipient configuration is already valid; never replace it with staging test addresses.

## Validation evidence and boundaries

Previously recorded checks (not rerun merely to write this document):

- 119 dashboard/database tests and migration replay; 58 focused Core/shared identity tests.
- Shared-library/API/Core/dashboard type checks and builds; Branding browser check.
- A dashboard global client-count assertion initially failed with concurrent fixtures and passed on rerun; that isolation weakness remains recorded.
- Latest recovery change: 12 focused server/client tests, Core `npm run check`, Core `npm run build`; staging and production recovery browser checks passed.
- Live Owner checks: Marketing navigation, User Manager, Appearance, CRM notes/tasks, empty template library, linked Website Editor; reporting explicitly remains not configured.

These are scoped evidence, not a whole-system release certification. Run relevant checks for each new change and final candidate acceptance. Do not run write-oriented tests against production or report simulated crew/provider tests as real acceptance.

## Backups and machine-local state

Production Core snapshot: `24612435-f6ab-4b10-915d-eef76ba1d945`.

Dashboard manual Railway snapshot hit quota, so a private custom-format `pg_dump` was captured and its archive listing checked. On the previous workstation it is at:

`/Users/mikedickerman/.codex/backups/p1-consolidation-20260917/dashboard.dump`

SHA-256: `7d509ebdad328ad5ede44a3baa61e0cce6cf0f6d4c32cbba62976f8941cb9ecc`.

This backup is **not in GitHub and will not appear on a new workstation**. Arrange secure access or a fresh verified backup before any migration requiring it. The private directory also holds release credentials; do not upload that directory or print its contents. A successful archive listing is not a completed restore rehearsal. Keep additive schema during application rollback; no destructive down-migration is authorized by this handoff.

Previous task checkout: `/Users/mikedickerman/Documents/Codex Projects/p1-business-center-consolidation`. Working tree was clean at the start of handoff preparation. No uncommitted implementation needs transfer; no implementation or deployment is running as part of this handoff. Browser sessions and temporary release archives are local conveniences, not prerequisites or portable acceptance evidence.

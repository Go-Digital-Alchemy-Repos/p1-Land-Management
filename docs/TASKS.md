# P1 implementation tasks

Canonical scope: [Master project plan](MASTER_PLAN.md).

All tasks use branch codex/p1-cms-crm from P1 5303da0 and upstream Core aad2057. Owner requested implementation 2026-09-07. Existing local modifications are retained.

| ID | Owner | Status | Surface / next gate |
|---|---|---|---|
| P1-CORE | Backend specialist | INTEGRATION VALIDATION | Isolated copy and migrations implemented; staging Core healthy, synthetic gateway admin login and module exclusion checks passed; staged content/forms checks and production synthetic CRM/dashboard delivery passed; owner/shared-login and public promotion remain. |
| P1-IDENTITY | Project Orchestrator | STAGING PREPARATION | Better Auth dashboard provider and Core federation consumer are integrated and source-verified. The same P1 identity may serve CMS and dashboard only after a paired staging configuration with fresh credentials, exact HTTPS callback origins, backups, browser sign-in/linking, MFA/revocation/outage/preview checks, and rollback rehearsal. Shared CMS sign-in is not yet live. Native client implementation and physical-device acceptance remain required before pilot. |
| P1-PUBLIC | Public specialist | STAGING ACCEPTED | `c3955c1` is live on staging:35 routes share the homepage 1240px desktop shell and aligned mobile gutters; asset parity, mobile error flow and CMS preservation passed. Production artifact/gateway/owner release gates remain. |
| P1-IMAGES | Image specialist | REVIEW | image variants/manifest/pipeline; budgets passed, integrated visual QA next |
| P1-CMS | Orchestrator | INTEGRATION VALIDATION | 36 components across35routes; seven-family and commercial publish/restore staging checks passed; final preview/production gates remain. |
| P1-OPS | Orchestrator | IN PROGRESS | public server, isolated Railway DB/core service, staging; deployment review next |
| P1-QA | Orchestrator | IN PROGRESS | 35-route staged public QA and scoped runtime/security checks passed; admin redirect fix is live. Final browser/accessibility and production gates remain. |
| P1-CONTENT | Strategy task; Orchestrator integration | PLANNED | Strategy/proof brief under docs/strategy; public/CMS implementation follows acceptance of P1-PUBLIC, P1-IMAGES and P1-CMS review gates |
| P1-COMMERCIAL | Orchestrator + content/Core/dashboard owners | IN PROGRESS | Commercial page/intake and signed dashboard handoff passed staging; fc302b1 prospect API reviewed/pushed, editing panel accepted on staging and deployed in reviewedbc7 dashboard; production delivery/readback passed; assessment/onboarding and target-account pursuit remain. COM-01–07 in [initiative](initiatives/commercial-industrial-sales.md) |
| P1-NATIVE | Native specialist; independent review | IN PROGRESS | Android build/emulator storage/account-transition checks and18 logic tests passed; offline restart implementation, iOS build, physical devices and pilot remain. |
| P1-AGREEMENTS | Dashboard task; independent review | STAGING BASELINE, ACCEPTANCE PENDING | Client onboarding (`0015`) and cancellation-review workflow (`0016`) are deployed in dashboard staging from `9b84067`. The source branch now includes retry-safe decision recording and prepared-charge history through `99cc630`. Domain, authenticated HTTP, API/dashboard type checks, production bundle and populated dump/restore rehearsal passed. Browser role/decision acceptance, provider reconciliation and production release remain. |

Latest evidence and deployment limits: [implementation-status.md](implementation-status.md). Business dashboardbc7 is deployed; later service-agreement work remains under independent review. No full pilot acceptance.

## P1-CONTENT scope and integration gate

Registered 2026-09-07 from strategy task `01a07a5b-2a83-7810-bcd7-b9fa65f847d6`. That task owns the content strategy and proof-inventory brief under `docs/strategy`; the Orchestrator owns scheduling and integration. [Strategy and proof-inventory brief](strategy/2026-09-07-growth-corridor-content-strategy.md) received and reviewed for scope alignment. No public or CMS copy changes are authorized by this registration alone before the current review boundaries clear.

- Core service emphasis: commercial and industrial landscaping/grounds management, land management and clearing, site work/earthwork, and verified commercial concrete flatwork.
- Priority markets: York County/Lake Wylie–Rock Hill, West Charlotte/Airport/I-85/Moores Chapel, and University City.
- Chester, Blythewood, Kershaw and the broader mapped region remain select-project or monitoring markets until operational coverage and local evidence are confirmed.
- Data-center vertical is capability-led: no named-client claims, asserted sector experience, security/compliance guarantees, or automatic dashboard-to-CMS publication.
- Project stories remain within the approved CMS/blog model. No separate Portfolio application.
- Every public claim, photograph and reported result requires supporting evidence, technical review and publication permission.

After the three prerequisite review gates are accepted, reconcile the delivered strategy/proof inventory with the approved site routes, claim evidence and CMS contracts. Assign bounded public/CMS edits through existing owners, preserve layout and URLs, and record any additional route/schema proposal before implementation. Acceptance requires verified claims and permissions, content/metadata parity, preview/publish checks and no regression in the existing technical budgets.

Brief integration notes: the proposed `project_story` fields are an editorial/schema proposal, not an accepted contract change yet. The monthly content/repurposing cadence is planning guidance, not a scheduled automation or permission to send email/social posts. Broader core-market classifications, including Lancaster, require serviceability evidence before new local claims. The brief now includes a market-source register dated September 7, 2026, with official/developer sources and a Colliers market report. Source presence is recorded; the Orchestrator has not independently revalidated those external claims. Time-sensitive development, permit, investment and policy statements require revalidation before publication. The delivered document is not itself evidence of P1 project experience or customer permission.

## Ongoing project coordination

Owner requested continued management of all P1 tasks until completion and successful deployment. Active task heartbeat `p1-project-completion-coordination` checks every15minutes, discovers new P1 tasks, resumes concrete authorized work, reconciles shared contracts, reviews/pushes completed code and verifies exact-source deployment/live evidence. Unchanged state stays quiet. Original Core isolation and permission/evidence gates remain intact. The heartbeat is paused only after all approved scope and acceptance gates are completed; missing provider activation does not pause unrelated engineering.

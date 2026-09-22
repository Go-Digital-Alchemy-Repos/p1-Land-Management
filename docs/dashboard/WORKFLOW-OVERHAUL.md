# Dashboard workflow overhaul: review record

The approved direction is a single light-theme dashboard release. Existing colorful icons, business rules, stored records, permission boundaries and public website styling remain in place. The [clickable synthetic preview](../../artifacts/p1-dashboard/preview/workflows.html) is a design-review artifact; it does not connect to the API or stand in for staging acceptance.

## Route and role audit

The canonical route inventory is `DASHBOARD_PAGES` in `artifacts/p1-dashboard/src/dashboard-routes.ts`. Every listed route was opened on the live Owner dashboard during this review. Dynamic screens can still load after their initial shell, so the route sweep establishes reachability and page structure rather than asserting that every asynchronous state was visually accepted. The following groups need final desktop, tablet and phone inspection against the integrated build:

| Workspace | Routes reviewed | Finding and action |
| --- | --- | --- |
| Workspace | `/`, `/my-day`, `/profile` | Overview and My day have distinct task surfaces. Generic heading descriptions elsewhere were replaced with screen-specific copy. Verify keyboard navigation, recovery and offline states in staging. |
| Customers | `/properties`, `/clients`, `/requests`, client and property deep links | Preserve the approved map and record layouts. Client overview now links its internal Sales-origin inquiry only when the actor has Sales access. Review dense record tabs and mobile tables in staging. |
| Operations | `/schedule`, `/recurring`, `/projects`, `/inspections`, work-order deep links | Schedule already contains calendar and field-review regions. Preserve existing action and permission behavior; inspect task density and empty/error states at three breakpoints. |
| Revenue | `/sales`, `/sales/pipeline`, `/sales/pipeline-settings`, `/agreements`, `/agreements/drafts`, `/agreements/templates`, `/billing`, `/expenses` | Sales Overview and Pipeline previously exposed duplicate inline inquiry forms. They now open one direct-linkable profile. Pipeline colors now use valid light-theme tokens. On phones, a stage selector replaces the six stacked columns; the first populated stage opens initially. Inspect agreement and billing detail flows before release. |
| Marketing | Content, Design, Website System and Reporting routes listed in `DASHBOARD_PAGES` | Existing CMS authoring, versions and grants must remain intact. Route-specific headings replace generic copy. Visual and accessibility acceptance across complex editors is still required. |
| Settings | `/settings/people`, `/settings/security`, `/settings/integrations`, `/settings/preferences`, `/settings/term-libraries` | Headings now state each setting's purpose. Owner-only access and read/write grants must be exercised in staging with representative accounts. |

The role review covers Owner, Sales, Dispatch, Finance, Crew and Client. The UI route guard is tested for direct links; the server integration tests exercise staff grants and portal isolation using synthetic accounts. Final acceptance still needs real browser sessions for each role, including an attempt to visit a forbidden deep link and a permitted action on its own screen. No live customer's account should be used for these checks.

## Sales interaction contract

Sales Overview is the priority list, Pipeline is the stage scan, and `/sales/leads/:id` is the single inquiry record. The tabs are Overview, Follow-up, Inquiry details, Activity, commercial Assessment when available, and Client handoff when the actor has both Sales and customer access. Contact corrections and follow-up edits keep their version checks and explicit save/cancel controls. A failed refresh hides stale editable profile content.

Won records the Sales result. It does not imply an executed agreement. The handoff remains an explicit, replayable operation after Won. It creates or links a client without rewriting the original inquiry, creating a property, sending a portal invitation, or posting accounting work. The internal client overview links back to its source inquiry for Sales-authorized staff; the client portal receives no Sales history.

## Validation and release gates

- Dashboard typecheck and build pass. The build reports existing large chunks; evaluate code splitting against measured load before changing bundle boundaries.
- The dashboard React test config resolves one React runtime across retained Core components. All 166 UI tests pass; 45 Node route and utility tests pass separately.
- Isolated PostgreSQL/API integration checks pass for onboarding replay, linked client data minimization, stale lead corrections, follow-up concurrency and Sales grants. These checks create only synthetic local records.
- In the isolated local browser, a synthetic Sales account created an inquiry, opened its direct profile link, assigned an owner, saved Won, reviewed and created a linked synthetic client, and followed the client profile's internal Sales-history link back to the original inquiry. The profile and client workspace had no document overflow at a 390px phone width; the lead profile was also visually reviewed at desktop width. The local Owner account requires MFA by policy, so Owner-only UI acceptance remains open rather than bypassing that protection.
- A broad-granted synthetic staff account reached Workspace, Customers, Operations, Revenue, Marketing content/design/reporting and non-Owner Settings routes. At 390px, these reachable static routes had no document-level horizontal overflow. This is a route/overflow sweep, not a complete visual or assistive-technology acceptance. Owner-only routes correctly rejected the staff account. The isolated Marketing design pages displayed saved-settings load errors; their data-backed interaction and visual acceptance needs a configured staging backend.
- The static preview has clickable journeys and role selection. Its phone and tablet widths do not overflow. It needs Owner design review.
- Still required before the one production release: complete integrated staging walkthroughs of every role and route, visual comparison at phone/tablet/desktop, keyboard and screen-reader acceptance, synthetic end-to-end lead intake through Won and client link, backup/release validation, and post-deploy revision/live verification.

Do not describe the preview as a deployed staging build or the local test results as production acceptance.

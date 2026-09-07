# P1 native client: first implementation slice

Status: implementation proposal for Orchestrator acceptance; inventory only, September 7, 2026. No app, dependencies, authentication changes or deployment were created by this task.

## Baseline and authority

Reviewed committed baseline: `37dfed6835232f8416e4553d690f6eeb24266b16`. The master plan requires actual React Native / Expo iOS and Android applications. The existing web/PWA remains a separate deliverable. Native implementation can begin against the reviewed dashboard API; completion of CMS federation is not a prerequisite for native screens, storage or existing API integration.

Use committed `docs/dashboard/AUTH.md` and `artifacts/api-server/src/dashboard/access.ts`, not the concurrent optional-MFA working changes. The baseline requires verified identity, active business profile, and current-session MFA assurance for owners. `/me` reports status and does not grant assurance. Future CMS sign-in uses the same canonical Better Auth account under the approved federation plan; do not bypass the identity task's pending approval, copy credentials, or infer CMS grants. Any authentication policy/plugin/origin change needs separate review.

## What exists, and what is missing

| Area | Existing evidence | Missing native artifact |
| --- | --- | --- |
| Application | React/Vite dashboard and browser PWA; repository filename inventory found no Expo configuration, native project, app signing or native test target | `artifacts/p1-native` application, routes, native components, Metro/TypeScript/workspace configuration, app identifiers, icons, permission descriptions, development and release builds |
| Identity | Better Auth 1.7.3, signed bearer plugin, strict bearer precedence, server profile/grant enforcement; `/api/auth` and `/api/v1/me` | Native sign-in, MFA/enrollment/recovery states, secure token adapter, session revalidation and expiry UI, tested intermediate MFA challenge handling |
| Contracts | `lib/api-spec/dashboard.openapi.json`, generated client, shared field-event Zod schema | Typed existing `/me`, property/timeline/file read and image-upload contracts; identity transport tests; native runtime compatibility tests |
| Transport | `custom-fetch.ts` exposes `setBaseUrl` and `setAuthTokenGetter`, typed errors | One approved HTTPS API origin, native credential omission rules, response-header/token rotation handling, cancellation and account-switch isolation |
| Offline | `artifacts/p1-dashboard/src/offline.ts`: account-specific IndexedDB, durable operations/photos, acknowledgment-only removal, download replacement guards; `docs/dashboard/OFFLINE.md` | Native transactional database, private file staging, crash recovery, migrations, capacity handling, account cleanup and sync UI. IndexedDB, browser Blob storage and service workers cannot serve as native implementations |
| Business boundaries | Assigned crew work, staff role lists, client grants, published-file checks, versioned operations and idempotent file IDs | Native role-specific navigation and direct-link denial tests; no local role grants or replicated business authorization |
| Acceptance | Browser and server regressions exist; web physical-device/pilot gates remain recorded | Actual iPhone and Android evidence, interrupted app/upload tests, secure-storage/backup validation, signing/distribution and store-release evidence |

The generated dashboard specification currently covers work orders, field sync, setup, commercial inquiries, schedule and readiness. It does not yet describe all existing identity, property, timeline and file endpoints. Extend that specification for selected existing endpoints and regenerate; do not invent a second API/backend or hand-maintain competing DTOs.

## Proposed usable first envelope

1. **Shared native shell and identity:** native sign-in for existing verified invited users, server-derived role landing, MFA challenge and owner recovery/enrollment where required, session expiry, safe sign-out and support messaging. Initial invitation acceptance/password reset may open the existing trusted web flow, followed by native sign-in; no new anonymous signup or initialization route. Explicitly show unactivated accounts rather than granting cached access.
2. **Crew field work:** date-specific My Day and assigned work detail; online download; offline notes, issues, checklist, time and completion operations; camera/library image capture; visible pending, retry and conflict states; foreground Sync Now. Completion remains manager review, never automatic publication or billing.
3. **Staff view:** server-authorized work/detail and schedule views for roles with those permissions. Owner MFA remains enforced. Sales/finance must not inherit dispatch/manager mutation rights. Office approvals, billing, provider connections and commercial editing remain in the web application for this slice.
4. **Client view:** online, granted property/work summary and explicitly published timeline/files. No staff notes, access instructions, raw evidence, prospect records or offline bulk client cache. Keep estimate/billing decisions on the existing web workflow initially. Label the bounded experience clearly; it does not close the complete native roadmap.

## Authentication implementation boundary

Use the existing signed-bearer contract and canonical Better Auth endpoints; no new token issuer, password store or database is needed. A native adapter must prove email/password sign-in, required MFA challenge, recovery-code verification, token replacement and sign-out on both OSes. In particular, do not assume a pre-MFA sign-in response contains a usable token. Inspect the installed Better Auth version's intermediate challenge requirements and retain any challenge credential only in the narrow auth flow, never as business API authorization.

The official [Better Auth Expo integration](https://better-auth.com/docs/integrations/expo) uses a server plugin plus client-managed secure cookies and trusted app schemes. That is not a drop-in substitute for P1's reviewed cookie-free bearer business requests. Do not add that plugin or trusted origins by default. First test the existing endpoint flow; if the intermediate MFA exchange requires adaptation, submit the exact minimal change and adversarial tests to the identity owner. This gates affected authentication integration, not unrelated native implementation.

Persist session credentials only through OS secure storage, never plain preferences, SQLite, logs or crash breadcrumbs. Keep passwords and displayed enrollment/recovery secrets out of persistent state. Bind transport and cache to API environment plus verified account ID; cancel old requests and reject late responses when that binding changes. Never forward bearer headers to arbitrary file URLs, external links or redirects. Recheck `/me` online before loading privileged screens or flushing queues; a cached profile is a label for offline data, not fresh authorization.

## Device persistence and sync invariants

- Use an account/environment-scoped transactional queue with unique operation IDs, original `capturedAt`, stable local ordering and `baseVersion`. Preserve field-event schema and server acknowledgment semantics, including mixed accepted/conflict batches and a response lost after server commit. Never manufacture a new ID to clear a conflict.
- Keep staged image bytes in private persistent app storage, referenced by a durable manifest containing stable upload ID, property/work IDs, classification and local state. Commit capture before showing it as saved; recover interrupted staging and orphaned temporary files without deleting queued originals. Do not remove bytes until durable server acknowledgment.
- Match `/api/v1/files/:id` headers (`x-p1-property`, `x-p1-work`) and reviewed byte/pixel/MIME bounds. Transcode unsupported camera formats to accepted raster formats; test orientation, metadata removal and denied permission. Keep server authorization/decoder authoritative; use authenticated private reads, never public object-storage credentials.
- Preserve changed/missing assignment download guards and pending-photo protections. Reassignment, cancellation, property lifecycle changes, stale versions and revoked sessions stop affected writes and retain work for resolution. Retries do not overwrite newer server content.
- Foreground sync is the first acceptance target. Network reachability is advisory; server response determines success. App suspension, kill and restart must not silently discard work. Background sync is not promised.
- Separate local encryption keys from data. Define encryption and OS backup exclusions for the queue, media and tokens before real customer caching; SecureStore alone does not encrypt SQLite or image files. Handle unavailable/invalidated keys without silently creating an empty replacement queue. No cross-account recovery/export without approved support policy.
- Normal sign-out must warn/block while work is pending, then clear that account after acknowledgment. Forced expiry/revocation must lock access even with pending work; retain protected data for same-account recovery under a documented policy, never keep a revoked session usable. Remote revocation cannot erase a disconnected device immediately.

## Ownership and dependency envelope

| Owner surface for subsequent implementation | Scope |
| --- | --- |
| Native implementation agent: NEW `artifacts/p1-native/**` | App configuration, screens, account/session adapter, SQLite/file queue, sync coordinator, native tests; no backend auth changes |
| Contract owner: `lib/api-spec/dashboard.openapi.json` and generated outputs | Add selected existing DTO/endpoints and multipart/raw upload contract; validate nullability, redaction, status and errors against handlers |
| Integration owner: root workspace manifests/lockfile and CI | Approve exact Expo/React Native/React compatibility matrix and pinned dependencies; keep web React versions stable if native requires a separate compatible version |
| Identity owner: existing auth/access/main only if a demonstrated gap requires it | Review MFA challenge transport, session/token rotation and any narrowly necessary native callback support; unchanged baseline otherwise |
| QA/release owner: NEW native device checklist and evidence | Isolated accounts, platform builds, device acceptance, signing/release records and rollback |

Dependency candidates, not installed or selected versions: Expo, React Native, Expo Router, development client, SecureStore, SQLite, FileSystem, image picker/camera and a supported image conversion module. Reuse generated fetch functions/shared Zod types; avoid bringing web DOM components into native bundles. Add only necessary connectivity/test tooling after compatibility/license/dependency review.

[Expo SecureStore](https://docs.expo.dev/versions/v55.0.0/sdk/securestore/) documents platform backup and biometric restrictions, including Expo Go limitations. [Expo SQLite](https://docs.expo.dev/versions/v54.0.0/sdk/sqlite/) documents SQLCipher support. These establish candidate capabilities, not a chosen SDK matrix. Select and test the actual SDK and encryption configuration together. Use native development builds for acceptance, not an Expo Go-only demonstration.

## Required evidence and implementation order

1. Freeze the accepted API/auth revision; scaffold and build iOS/Android without altering business schema. Add native transport tests against an isolated API database with synthetic users. Verify Metro resolves workspace packages and no web-only APIs leak into runtime.
2. Prove sign-in/MFA before protected API use: verified/unverified, inactive, owner enrolled/unassured, owner enrollment, recovery code, fresh assurance, expired/deleted session, invalid bearer with cookie, cookie-origin checks and token rotation. `/me` cannot create assurance. Test header extraction and any MFA intermediate credential behavior on both OSes.
3. Implement queue/storage and crew workflow. Automate database reopen, duplicate enqueue, interrupted write/upload, response loss, stale assignment, changed download, conflict retention, per-account/environment isolation, low-space failure and cleanup. Assert original payload/IDs survive each retry.
4. Add staff/client views with a server-backed role matrix and direct-ID/deep-link attacks across client/property/work/file boundaries. Verify published-only client content and crew assignment isolation; test role removal while app runs.
5. On physical iPhone and Android: airplane mode, process kill/reboot, date/timezone changes, camera rotation/HEIC, large image, permission denial, interrupted network, screen lock, credential expiry, low disk, installation/upgrade and backup/restore behavior. Record OS/device/build/API revision and actual outcomes. Test accessible labels, focus, dynamic text, contrast and touch targets.
6. Complete a controlled crew capture→sync→manager review and invited client published-view pilot. Native release does not close existing web, billing, backup-restore or provider acceptance gaps. Store submission needs approved bundle/package IDs, P1 signing accounts, privacy disclosures, permission text and distribution authority; no signing secrets in repository or reports.

## Validation and remaining decisions

This task inspected repository filenames, committed identity policy/actor, current offline implementation, generated transport/specification, file and field handlers, architecture/master documentation, and official dependency documentation. No native runtime, build or device tests ran because no native app exists. No code, schema, dependencies or infrastructure changed.

Orchestrator acceptance is needed for the bounded screen envelope and file ownership; exact dependency versions and local encryption/key-loss/support policy must be settled before real-data device pilots. No additional backend is proposed. Pending CMS identity tool approval is preserved and is not used as a blanket stop on native work.


## Accepted implementation and dependency isolation

The Orchestrator accepted this first implementation envelope and assigned artifacts/p1-native to the native implementer. Expo57/RN0.86.3/React19.2.3 is the selected native matrix; exact module pins and platform limits are recorded in its package/README. The existing web React19.1 catalog remains unchanged. Shared-workspace installation was tested and changed unrelated Better Auth/Drizzle peer graphs, including an incompatible React DOM peer pairing. That experimental lockfile was preserved separately and the root lock restored to its prior verified bytes. Native now uses an excluded nested pnpm workspace and its own lockfile; API/Zod source contracts remain shared through local links. Root and native frozen installs/builds must both be documented and tested.

Account/origin-scoped SQLCipher storage, separate OS SecureStore tokens/keys, encrypted queued photo bytes, unavailable-key lockout and same-account recovery are accepted implementation choices. No plaintext password persistence or automatic destructive queue replacement is permitted. OS backup exclusion and physical-device verification remain required evidence, not assumptions from configuration. CMS federation is not a prerequisite for implementing against the current reviewed dashboard identity; pending identity policy changes remain excluded.

# Dashboard auth/file security recheck — 2026-09-07

Scope: frozen copies in `/tmp/p1-dashboard-review-20260907/`, matching live sources at review time; supporting reads of setup completion and migration `artifacts/api-server/migrations/dashboard/0007_security.sql`. No application code edits, database operations, provider requests, or deployments.

## Disposition of original findings

| Finding | Status | Evidence |
|---|---|---|
| Owner access through pre-MFA sessions | Fixed in reviewed source; focused synthetic checks passed | `access.ts:21–23` now requires an assurance row for the exact session. `auth.ts:41–50` records assurance only after successful factor-verification endpoints, preferring the new session. Migration 0007 binds assurance to session ID with cascading deletion. Supporting `api.ts:51–52` requires assurance for setup, and `api.ts:68` deletes other sessions. |
| Unauthenticated body buffering | Fixed; focused synthetic check passed | `files.ts:52–66` authenticates and authorizes before `raw()` at line 67. An unauthenticated invocation returned 401 without parser invocation. |
| Uploads to closed work via another active assignment | Fixed for reported scenario; focused synthetic checks passed | `files.ts:58–59` checks the actual target work status, property, and assignee before parsing; lines 80–89 recheck after parsing. With property access allowed, each reviewed/cancelled/skipped target returned 403. |

## Remaining P2: disconnected uploads bypass the new concurrency cap

Location: `artifacts/api-server/src/dashboard/files.ts:63–64` in the frozen snapshot.

The upload slot is released on `res.close`, even if the asynchronous handler is still decoding an image or awaiting S3. Those operations are not cancelled by closing the response. An authenticated uploader can send an authorized image, disconnect after decoding begins, and immediately start another upload. The counter permits additional work while the disconnected upload remains active.

This was reproduced synthetically against the frozen handler: hold Sharp's `toBuffer()` promises pending, emit response `close` after each admitted upload, and start five uploads. **Five decoder operations remained pending despite the limit of four.** With responses left connected, the fifth request correctly returned 429.

Recommendation: retain the processing slot until the handler's work settles in `finally`; handle aborted requests and parser errors before processing with separate cleanup. Do not release an in-flight processing slot solely because its response closes. Add regressions for disconnect during decoding and during a pending S3 call, verifying no fifth worker is admitted until an existing operation settles.

## Validation performed and limits

Executed **five passing control-check groups plus one confirmed residual reproduction** in an isolated in-memory TypeScript transpilation harness against the frozen source, with synthetic auth/database/Express/Sharp dependencies:

- Unassured owner session denied; assured owner session accepted.
- Successful verification marks the replacement session, not the old session; failed verification does not create assurance.
- Unauthenticated upload rejected before parser invocation.
- All three closed target states denied despite otherwise valid property access.
- Fifth connected upload rejected; disconnected in-flight processing bypass reproduced as described above.

The frozen integration test includes two-browser owner setup/session regression at lines 94–108 and closed-work upload regression at lines 329–332. These were read, **not executed** by this reviewer. The parent independently reported a fresh `scripts/test-dashboard.mjs` run with **5 tests passed, 0 failed, 0 skipped**, plus successful migration replay. That result is attributed to the parent, not this reviewer’s own execution. No end-to-end Better Auth, database migration, network-abort, or live object-storage test was run by this reviewer. Synthetic checks establish application control flow, not complete runtime integration. A role/status change racing after the final authorization read was not evaluated.

## Snapshot SHA-256

- auth.ts: `bf3be5df14faa12d5057144948b3d3e6e82fcb09e802fc97e82ee073a6ea0477`
- access.ts: `977208322000e750099617e95336223377cf85d70ca37c4aaeea39e986256986`
- files.ts: `28c222748c2315d3161d95c6e0c0383ebf1dfbcc2c27ac52859bc6ac2b83877a`
- integration.test.ts: `d259dd5104a050b83a69109b49bc1bd3f0b0fcbcf79986e93b3ee78689ee442b`
- supporting api.ts: `552765c5af365d40cf03b41c4eb65a5a090f3e822868281a922f9955b2be64df`
- migration 0007_security.sql: `b8a3652e7c4945ec16cb6acb133513346b0ee07945ce37001112a12f0d62d279`

## V2 addendum — disconnect concurrency residual fixed

Reviewed frozen `/tmp/p1-dashboard-review-20260907-v2/files.ts` and its diff. The earlier remaining-P2 disposition above applies to V1 and is superseded by this addendum for V2.

The concurrency slot now wraps the awaited parser and `processUpload()` in `try/finally` (`files.ts:63–76`). Abort/close listeners only reject the pending parser and are removed when parsing settles. Once decoding/storage begins, disconnecting the response no longer releases capacity; the slot is retained until processing settles.

**Actually reran the previous bypass against the frozen V2 code**, transpiled in memory with synthetic dependencies. Three groups passed:

1. **Pending Sharp decode:** started four authorized uploads, held decoder promises unresolved, closed all responses, then attempted the fifth. It returned 429 and exactly four decoder calls remained pending. A new upload was admitted only after one existing decoder promise settled.
2. **Pending S3 upload:** repeated the same sequence with completed decoding but unresolved S3 calls. The fifth returned 429, and capacity returned only after an existing storage operation settled.
3. **Pending parsing cleanup:** request aborts, parser errors, and response close rejected the parser, removed abort/close listeners, and returned capacity without starting decode/storage. Subsequent attempts did not encounter leaked slots.

No database/provider/network calls were made by this recheck. These are actual synthetic control-flow executions, not a live HTTP-abort load test. The parent separately reported a fresh V2 `scripts/test-dashboard.mjs` execution: **5 passed, 0 failed, 0 skipped**, with successful migration replay. No application code or deployment was changed by this reviewer.

**Disposition:** all three original findings and the reviewed disconnect concurrency follow-up are fixed in the reviewed snapshots, subject to the runtime limitations stated above.

V2 SHA-256:

- files.ts (frozen and live match): `c626f2f04da546758f67241439473a067220d9b9cfd53f48ba7993524041f930`
- files.diff: `d28691d04fed7ec00738bf0558a5a6974077d62da3247456bf95f3e7cb4f6510`

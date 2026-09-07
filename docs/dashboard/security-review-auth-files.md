# P1 Business Dashboard: scoped auth and file security review

Reviewed 2026-09-07 by independent delegated reviewer. Scope: `artifacts/api-server/src/dashboard/{auth,access,files}.ts`, with supporting reads of API setup, application middleware, policy, and the installed Better Auth implementation. No dashboard code changed, databases accessed, or services deployed. This is a scoped source review, not an exhaustive security scan or production attestation.

Snapshot: Better Auth **1.7.3**. Reviewed source SHA-256 values:

- auth.ts: `2ae2ad4d44cd4119a24b0f9375c6b49c435d9cd9cfa317db1db46fec541a42c6`
- access.ts: `7a0af612c08481b8b4b190b35681b0b4e31c60dfcaa2ac11bb5497e4a2dd0a32`
- files.ts: `9c425dd45659bf107d22043833dd6923d54b53b7320cd3cf1e23a7bd1ba5f4d7`

## Findings requiring owner-task resolution

### P1 — Password-only sessions survive owner MFA enrollment

Location: `artifacts/api-server/src/dashboard/access.ts:21` and `auth.ts:37`.

The owner gate checks the current user's `twoFactorEnabled` boolean rather than whether this session completed MFA. In the installed Better Auth TOTP verification implementation (`dist/plugins/two-factor/totp/index.mjs:205–213`), enrollment updates that boolean, creates a replacement session for the enrolling browser, and deletes only the enrolling session token. Other password-only sessions remain valid. Its internal adapter returns a session joined to the current user record and does not revoke all sessions when `updateUser` changes MFA state.

Reproduction scenario: sign in to the verified bootstrap owner account in browsers A and B before MFA enrollment; enroll and verify TOTP in A, then complete owner setup in A. Browser B's existing password-only cookie now passes `actor()` and accesses owner business APIs without having completed MFA. An attacker holding such a pre-enrollment session inherits the same access.

Recommendation: revoke all other sessions on MFA enrollment/owner activation, or enforce a server-owned per-session MFA assertion for owner access. Add a two-session integration regression requiring B to reauthenticate with MFA while A remains usable. Evidence is source-traced; the two-session runtime reproduction was not executed in this review.

### P2 — Unauthenticated requests buffer up to 15 MB before access checks

Location: `artifacts/api-server/src/dashboard/files.ts:49–52`.

The raw image parser runs before `actor()` and `requireRole()`. Therefore unauthenticated requests with a valid image Content-Type can make Express buffer a 15 MB body before returning 401. Application `/api/v1` middleware checks Origin but has no request limiter; a non-browser client can supply the expected Origin. Better Auth's configured limiter protects its authentication routes, not this custom upload route.

Reproduction scenario: unauthenticated concurrent POST requests to `/api/v1/files/<uuid>` with `Origin` set to the dashboard origin and large `image/png` bodies allocate memory per request without an authorized uploader. This can exhaust the dashboard service's memory under load.

Recommendation: authenticate and authorize the uploader before invoking `raw()`, and apply upload-specific rate/concurrency limits before buffering or decoding. Verify that an unauthorized request is rejected before its body is consumed. No resource-exhaustion test was performed.

### P2 — Another active job permits uploads against a closed job

Location: `artifacts/api-server/src/dashboard/files.ts:59–71`, supporting `access.ts:35`.

Crew property authorization accepts any assigned non-cancelled/non-skipped/non-reviewed work order at the property. The subsequent check for the actual `x-p1-work` target checks only property and assignee, omitting that target's status. Thus access revoked for a reviewed/cancelled/skipped work order can be regained when the crew member has another active work order at the same property.

Reproduction scenario: crew member owns reviewed work order A and active work order B on property P. Upload a new operation UUID with `x-p1-property=P` and `x-p1-work=A`. B satisfies `propertyAccess`; A satisfies the second assignee check; the upload is recorded against closed A. This weakens reviewed job evidence integrity.

Recommendation: authorize the specific target work order and reject new crew uploads for closed states; retain explicitly permitted idempotent replay behavior. Test closed A with active B at the same property, plus positive upload to B. This finding concerns new uploads, not an assumption that all historical photo reads must be prohibited.

## Controls observed and limitations

- Auth requires verified email; signup is gated by bootstrap authorization or an email-bound unexpired invitation. Owner MFA disabling is blocked by the local hook.
- Business access checks active staff membership from the database; client property/file access is joined through `client_access`, and clients only receive published files.
- File bodies are decoded by Sharp and re-encoded to WebP with byte and pixel limits, reducing active-content and decompression risk. Downloads require application authorization and have `no-store` caching.
- Object keys are server-derived; operation ownership is checked before S3 writes and rechecked transactionally for concurrent insertion.
- Runtime behavior, CDN/proxy controls, library vulnerabilities, all other business endpoints, and exhaustive role combinations were not assessed. Existing tests were read, not executed against a service by this reviewer.
- The unrelated prior Core storage lint warning was resolved with a narrow documented `no-control-regex` exception; targeted ESLint on `platform/p1-core/server/services/r2.service.ts` passed.

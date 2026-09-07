# P1 Core federation consumer

Status: Core consumer is integrated in `f219835` and passed the combined Core type check, 664-test suite and production build. No federation deployment or production-owner bootstrap has occurred. Frozen shared contract: `docs/contracts/p1-core-dashboard-federation-v1.md`, SHA-256 `e9ccc4f7563809127d9d88981cff8d6431f1fbd13caeed2a6b575f017f13361e`. Paired real Dashboard-provider and browser acceptance remain required.

Dashboard Better Auth remains the credential authority. Core retains its own explicitly assigned roles, permissions and suspension state. Published content and normal public lead intake remain independent of identity-provider availability.

## Bootstrap authorization

Fresh-owner setup requires all three Core-only deployment settings:

- `CORE_FEDERATION_BOOTSTRAP_ID`: unique UUID for this authorized setup window.
- `CORE_FEDERATION_BOOTSTRAP_PROOF_SHA256`: lowercase SHA-256 of an independently generated random proof containing at least 256 bits of entropy, encoded as 43–128 base64url characters. Store only the hash in deployment configuration; deliver the proof privately to the authorized owner.
- `CORE_FEDERATION_BOOTSTRAP_EXPIRES_AT`: exact UTC timestamp, no more than 24 hours ahead at startup. Missing all settings disables bootstrap. Partial, invalid, expired or excessive windows reject startup when federation is enabled.

The proof helper verifies the current clock every acceptance. A previously loaded configuration does not extend its expiry. Durable single-use enforcement additionally is enforced by the database transaction; hashing alone does not provide consumption or replay protection.

The restricted `/admin/setup` affordance submits proof in a same-origin JSON POST. It must never appear in a URL, analytics, log or persistent browser storage. Clear the sensitive input after acceptance. The response exposes only a fixed local continuation path. An opaque HttpOnly nonce binds the short-lived server intent to the initiating browser; PKCE/state binds the subsequent Dashboard authorization.

After code exchange, fresh owner attestation is required. Under one shared serialization lock, the transaction checks the actual current expiry, unused bootstrap authorization and zero existing Core admins, then creates exactly one local admin with an undisclosed random password placeholder, explicit identity link, server-side federation session, and audit record. It consumes the authorization durably. Callback errors consume login state but must not mark an unsuccessful bootstrap as completed. Deployment proof cannot override an existing admin.

## Legacy account linking

When federation is enabled, existing local password proof grants only a short-lived linking intent. It cannot authorize CMS reads, writes, `/me`, preview or ordinary admin APIs. The UI explicitly confirms linking the local account to the proven canonical Dashboard identity. Email equality alone does not link identities or grant permissions.

Any historically linked user remains ineligible for local password login, reset, change or admin password reset even when federation initiation is disabled. Revoked links and audit history remain intact; account deletion cannot cascade away identity history. Rollback invalidates federation sessions and disables initiation; it never manufactures or restores passwords.

## Session and preview boundary

Use opaque browser session identifiers backed by Core database session records. Keep canonical grant identifiers server-side. Revalidate the link, current local user state and Dashboard grant on every privileged request without positive-result caching. Deny unavailable provider transport with 503, inactive canonical session with 401, and local suspension/link/permission failure with 403, as finalized by the shared contract.

Legacy signed-token draft preview requires the active admin/editor session and content permission in addition to its preview token. Published route snapshots continue to work without Dashboard availability. Existing public customer registration and excluded feature modules remain disabled.

## Validation and release gates

Before enabling: validate frozen shared DTO parity, state/nonce/PKCE replay rejection, concurrent single-use bootstrap, explicit dual-identity linking, local-password bypass rejection, grant/session revocation and policy changes, preview permissions, provider outage/publication availability, additive migration replay, and backup/rollback procedures. Pure helper tests are preliminary and cannot substitute for these integration gates.

## Implemented routes and records

All consumer routes are under `/api/auth/federation`: read-only `GET /status`; same-origin, rate-limited `POST /bootstrap-intent` and `POST /link-intent`; `GET /start` and `/callback`; nonce-bound `GET /confirmation` and same-origin `POST /confirm`. Continuations are fixed `/api/auth/federation/start` or `/admin`; no arbitrary return URL is accepted. Legacy link intent receives no normal local JWT. Its callback rotates the nonce before explicit confirmation.

Migration `0002_identity_federation.sql` adds link, session, intent, state, bootstrap-consumption and audit tables. Only hashes of browser session/state/nonce handles are stored. PKCE verifier and canonical grant remain server-side. Unique local/canonical links and restrictive user foreign keys retain history. Expired temporary state/session records are cleaned on new initiation; audit/link/consumption records persist. There is no local standalone link revoke/reactivate UI in this slice: use existing Core suspension or canonical Dashboard session/profile/MFA controls for denial. Controlled relinking and last-admin safeguards belong to the following account-administration slice.

The migration is additive and runs through the existing P1 Drizzle journal. Deploy it before code activation. Never run a destructive schema push. Existing password reset/change writers share the user-row lock with linking so a concurrent old reset cannot restore a password after a link is established.

## Configuration and rollback

Use exactly the frozen contract's issuer, client id, current secret settings; previous-secret rotation settings belong to the provider and are ignored by Core. Core derives both Dashboard URLs from the registered HTTPS issuer and derives its sole callback from `APP_URL`. No private HTTP substitution, browser cookie forwarding or positive introspection cache is used. The only local HTTP exception requires both `NODE_ENV=test` and `CORE_FEDERATION_ALLOW_SYNTHETIC_HTTP=true`, with loopback-only origins; never deploy that flag.

Remove the three temporary bootstrap settings after successful setup, and always before restarting an expired setup window. The durable consumption record still prevents replay. Generic setup status reveals only whether an admin exists, never proof values.

Before rollback, back up the dedicated P1 database. Disable new initiation and invalidate existing consumer sessions with a scoped `DELETE FROM p1_federation_session` under the approved release procedure, then revoke the confidential client credentials. Keep additive migration, identity links, consumption and audits intact. Disabled mode denies existing federation cookies; session deletion prevents their reappearance if initiation is later re-enabled. Do not roll back to a password-enabled code revision for linked identities, restore passwords, or delete identity history. Re-establish access only through the reviewed canonical identity recovery procedure.

## Reproducible verification

- `python3 script/test-federation-consumer.py`: starts fresh localhost Docker PostgreSQL 17, supplies synthetic-only database/provider state, runs eight bootstrap-helper tests, six service-client boundary tests and one mounted HTTP integration containing concurrent bootstrap, replay/PKCE/nonce, explicit linking, local permissions, signed-preview authentication, password-bypass rejection, canonical401/MFA403/outage503 and published-content assertions. It runs the actual P1 migrations and populated replay. Cleans its own temporary database/container; no live provider is used. Log `/tmp/p1-federation-consumer-tests.log`.
- `npm test`: full existing Core suite plus pure new tests. The integration test is deliberately gated on its disposable database variable and is executed separately by the runner above.
- `npm run check` and `npm run build`: typecheck and production compilation.

Independent paired-provider, real login/MFA continuation, browser nonce/cookie/preview and deployment backup acceptance are not replaced by the synthetic provider. No actual owner proof or provider credential appears in fixtures or evidence.

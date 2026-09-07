# Core federation provider — accepted implementation

The Dashboard provider is integrated through `67a10c2` from independently reviewed provider commits `82529ef`, `906e2e1` and `bb5b114`. It remains disabled by default and has not been deployed. The current accepted production Dashboard web and worker release is `b97a372`.

The exact cross-service authority, configuration, DTOs and rollout contract is [P1 Core–Dashboard Federation v1](../contracts/p1-core-dashboard-federation-v1.md), SHA256 `e9ccc4f7563809127d9d88981cff8d6431f1fbd13caeed2a6b575f017f13361e`. Dashboard remains the canonical credential authority; Core retains explicit local CMS permissions. This provider alone does not enable CMS sign-in or provision a Core administrator.

Migration `0014_core_federation.sql` adds authorization codes, browser continuations and session-bound grants without changing existing user credentials. Authorization uses the existing verified identity, active profile and current per-account MFA boundary. Continuations are bound to an HttpOnly cookie and expire after ten minutes; single-use authorization codes require S256 PKCE and expire after sixty seconds. Introspection rechecks the canonical session and current account policy. Scheduled retention removes expired transient records while preserving lifecycle audit events.

Service authentication uses the registered confidential client over the exact HTTPS issuer. During controlled secret rotation, Dashboard accepts the new current and bounded previous secret before Core switches to the new current secret. An expired previous secret is rejected without disabling the current secret. The HTTP test exception requires an explicit flag, `NODE_ENV=test` and a loopback HTTP issuer; it is rejected outside that combination.

## Validation

Independent review ran 19 passing tests with zero failures or skips and disposable database migration replay. Coverage includes continuation cookie binding and resume replay, wrong PKCE rejection, authorization-code replay, session revocation, current MFA policy changes, service request boundaries and configuration checks. The corrected rotation regression runs against an in-process HTTP router. A disposable negative-control copy restored only the old expiry rejection and caused that regression to fail as expected.

Root integration preserved the exact provider source and contract. The combined Dashboard, including the previously accepted QR/recovery and sidebar changes, passed typecheck and production build. Evidence: `/tmp/p1-federation-bb5-independent-review.json`, `/tmp/p1-federation-bb5-final.log` and `/tmp/p1-federation-bb5-negative.log`.

## Remaining release work

The Core consumer, explicit identity linking, restricted first-owner setup and authenticated draft previews are being implemented separately. Before enabling federation, review the paired implementation, back up both P1 databases and test the complete browser flow, revocation, MFA changes, outage behavior and published-content availability in staging. Use separate environment credentials and exact callback origins. No original Core Platform deployment, database, users or credentials are part of this integration.

Rollback and retention follow the versioned contract. Disabling federation must not restore a local password bypass for a previously linked CMS account. Broader website publication, financial workflows, native device acceptance and full project completion remain separate requirements.

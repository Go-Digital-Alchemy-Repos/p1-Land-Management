# P1 Core–Dashboard Federation v1

Status: approved by the Project Orchestrator on September 7, 2026. This
document is the immutable cross-service contract for the separate Core
implementation. A revision needs Project Orchestrator approval and a new
versioned document; neither side may silently add fields, redirects, origins,
credential types or authorization rules.

## Authority and boundary

Dashboard Better Auth is the canonical P1 credential authority. Core keeps
its own `users` record, `admin`/`editor` role, permissions and suspension
state. A Dashboard identity is eligible to use Core only through an explicit,
active one-to-one Core-user-to-Dashboard-user link. Email equality, Dashboard
role, a dashboard bearer token and a successful `/me` call never create that
link or a Core permission grant.

Dashboard authorization requires its normal `actor()` boundary: verified
email, active dashboard profile, and current-session MFA assurance when the
per-account policy requires it. This is a canonical identity eligibility
check, not a mapping to a Core role or permission.

No password hash, Dashboard session cookie, Better Auth secret, Core JWT
secret or browser-visible federation credential crosses the service boundary.

## Registered deployment configuration

Each environment has exactly one registered Core confidential client:

| Setting                                                                                          | Holder                               | Requirement                                                                                                                                                                                          |
| ------------------------------------------------------------------------------------------------ | ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `DASHBOARD_ORIGIN`                                                                               | Dashboard                            | Exact public HTTPS issuer and browser origin, with no path other than `/`, query, fragment or credentials. This is the Better Auth base URL.                                                         |
| `DASHBOARD_FEDERATION_ISSUER`                                                                    | Core                                 | Exact same HTTPS origin as `DASHBOARD_ORIGIN`; Core derives Dashboard federation URLs from it and has no alternate dashboard base URL.                                                               |
| `CORE_FEDERATION_ENABLED`                                                                        | Dashboard and Core                   | Exact `true` only after staged acceptance; disabled otherwise.                                                                                                                                       |
| `CORE_FEDERATION_CLIENT_ID`                                                                      | Both                                 | 8–128 character `[A-Za-z0-9_-]` identifier.                                                                                                                                                          |
| `CORE_FEDERATION_CLIENT_SECRET_CURRENT`                                                          | Both server runtimes                 | Independent random value at least 256 bits (43+ base64url characters); never browser, source, log or build argument.                                                                                 |
| `CORE_FEDERATION_CLIENT_SECRET_PREVIOUS` and `CORE_FEDERATION_CLIENT_SECRET_PREVIOUS_EXPIRES_AT` | Dashboard only, only during rotation | Optional bounded overlap. Both must be present; Dashboard accepts the previous secret only until its explicit UTC expiry, at most 24 hours ahead. No third secret or indefinite overlap is accepted. |
| `CORE_FEDERATION_REDIRECT_URI`                                                                   | Dashboard                            | Exact HTTPS Core callback, without query/fragment/credentials. Production: `https://www.p1landmanagement.com/api/auth/federation/callback`; staging uses its distinct exact origin.                  |
| Core bootstrap proof                                                                             | Core only                            | Expiring deployment-controlled verifier, hashed at rest; it is not a Dashboard password or a client credential.                                                                                      |

No wildcard host, arbitrary `return_to`, mobile scheme, `localhost` production
exception, cross-origin cookie, or browser POST is allowed. Dashboard's
`trustedOrigins` remains Dashboard-only. The only local HTTP exception is the
explicit synthetic-test flag; it must never exist in a deployed environment.

## Browser authorization flow

1. Core `GET /api/auth/federation/start` creates a server state record with a
   SHA-256 state hash, an S256 PKCE verifier/challenge, purpose
   `p1-core-cms-v1`, expiry of at most 10 minutes and an allowlisted local
   return path. It also sets an opaque, Secure, HttpOnly, SameSite=Lax,
   path-scoped browser nonce cookie. A legacy link intent additionally binds
   the initiating authenticated local Core user id.
2. Core redirects the browser to Dashboard `GET /api/v1/federation/authorize`
   with `client_id`, exact `redirect_uri`, opaque `state`, `code_challenge`,
   `code_challenge_method=S256`, and `purpose=p1-core-cms-v1`.
3. If no Dashboard session exists, Dashboard preserves only this validated
   opaque request server-side for at most 10 minutes during its normal
   login/MFA continuation. It never accepts a raw return URL. It resumes
   authorization only after `actor()` succeeds.
4. Dashboard creates a random 256-bit authorization code, stores only its
   SHA-256 hash bound to canonical user id, exact Better Auth session id,
   registered client/redirect URI, PKCE challenge and owner-attestation flag,
   then redirects with only `code` and original `state`. Code lifetime is 60
   seconds, is single-use, and the redirect has `Referrer-Policy: no-referrer`.
5. Core callback requires the browser nonce plus matching unexpired state and
   consumes both on every terminal path. It rejects state replay, missing
   cookie, PKCE mismatch, foreign callback and all unknown/unlinked subjects.

## Authenticated service API

Core calls the Dashboard authenticated service router at
`$DASHBOARD_FEDERATION_ISSUER/api/integrations/core/v1/federation/*`
over publicly valid TLS. This is not an assertion that a Railway-private HTTP
path is encrypted. Every request has exact `Authorization: Basic
base64(client_id + ':' + current-secret)`, JSON body no larger than 4 KiB, no
browser cookies, no Origin and no query string. Invalid service authentication
returns 401 without credential detail.

Secret rotation is ordered: first deploy Dashboard with the new current secret
and its bounded old previous secret; second switch Core to send only the new
current secret; third remove the previous Dashboard secret after the explicit
overlap expiry. This preserves service continuity without letting Core silently
fall back to an old verifier.

### `POST /token`

Request:

```json
{
  "code": "base64url-random-code",
  "code_verifier": "pkce-verifier",
  "purpose": "p1-core-cms-v1"
}
```

Dashboard atomically validates client, code hash, registered redirect binding,
expiry, PKCE S256 verifier, canonical session existence/expiry, verified email,
active profile and current MFA policy. It consumes the code and returns:

```json
{
  "grantId": "uuid",
  "subject": "dashboard-user-id",
  "email": "verified-email",
  "name": "display-name",
  "expiresAt": "ISO-8601",
  "ownerAttested": false
}
```

The opaque `grantId` is bound to that exact Dashboard session; it is not a
credential by itself. Core stores it only in server-side session state or an
encrypted, signed, Secure, HttpOnly, SameSite cookie. It never appears in a
URL, public response body, local storage or client JavaScript.

### `POST /introspect`

Request:

```json
{
  "grant_id": "uuid",
  "purpose": "p1-core-cms-v1",
  "require_owner_attestation": false
}
```

Dashboard returns 401 when the grant, underlying session or verified identity
is inactive, expired or revoked. It returns 403 for inactive profile, current
MFA failure, or an owner-attestation request whose grant is not both issued to
an owner and still owned by an active Dashboard owner. Success returns active,
the canonical subject, display metadata, Dashboard profile role,
`ownerAttested`, and expiry. It never returns a password, factor material,
session token, cookie or permission map.

Success is exactly this JSON shape (with `expiresAt` an ISO-8601 UTC string):

```json
{
  "active": true,
  "grantId": "uuid",
  "subject": "dashboard-user-id",
  "email": "verified-email",
  "name": "display-name",
  "role": "owner|manager|dispatch|sales|finance|crew|client",
  "ownerAttested": false,
  "expiresAt": "ISO-8601 UTC"
}
```

Core must call introspection on every privileged `admin`/`editor` request,
without a positive-result cache. Dashboard transport/outage is fail-closed
503; inactive grant/session is Core 401; inactive local link, suspension or
local permission denial is Core 403. Published public content remains
available when federation is unavailable.

## Core local-link and bootstrap requirements

Core migration `0002_identity_federation.sql` creates an append-only/auditable
link with unique `core_user_id` and `canonical_user_id`, creation/revocation
timestamps and grant/session correlation. It must not delete audit history.

Legacy linking proves both identities: the initiating local Core user is bound
to state/nonce and the Dashboard identity is proven by the code flow. Matching
email can be displayed for review but cannot link an account automatically.
Core roles and permissions remain explicitly assigned locally.

For the fresh P1 Core production database, bootstrap additionally requires in
one Core transaction: valid expiring deployment proof, a Dashboard
`require_owner_attestation=true` introspection result for this grant, and zero
existing Core admins under a serialization lock. It then creates exactly one
local Core `admin` and its explicit link. Subsequent user roles only arise from
explicit local Core grants/invitations, never a Dashboard role or email.

Federated Core system accounts cannot use Core password login, reset or change
password endpoints; any structurally required local password value is random
and never disclosed. This contract does not enable public customer signup,
public customer accounts, account self-provisioning, or any previously excluded
P1 module. Existing original Core behavior outside the explicit CMS federation
surfaces remains untouched.

## Retention, audit and rollback

Dashboard deletes expired authorization codes and expired grants; audit events
preserve lifecycle evidence without code, verifier, secret or cookie values.
Core deletes/invalidates expired state/nonce and grants while retaining link
and audit records. Both services log only stable opaque ids and outcome codes.

Deploy additive schema and disabled code first, then paired staging
credentials/origins, full authorization/revocation/MFA/PKCE/state/preview
tests, backups of both P1 databases, Dashboard provider, then Core consumer.
Enable bootstrap only for the approved short window. Rollback disables new
federation initiation, revokes client credentials and invalidates Core
federation sessions while retaining additive records. It must not restore or
manufacture local passwords; recovery is through the Dashboard owner and a
new approved bootstrap/link flow.

# Access, initialization and recovery

Anonymous registration is disabled unless the request presents an email-bound unexpired invitation or the designated bootstrap email with a valid expiring code. Verification email delivery is queued through Mailgun. Owner activation requires verified email and the setup code. Installation row locking, owner assignment and permanent initialization closure commit together; all other owner sessions are removed at activation. Removing a user never reopens initialization.

Two-factor authentication is optional by default for every account, including the initial owner. An owner acts as the super admin and can require or remove MFA for any active dashboard account, including their own and client accounts, in dashboard Settings. `session_assurance` records successful TOTP/recovery-code verification and enforces a requirement for that exact current session. An account that is required but not enrolled may complete its first enrollment. Once it is enrolled and required, an unassured session cannot disable MFA, regenerate recovery codes, retrieve the TOTP URI, or reset enrollment; it must first verify the existing authenticator or recovery code. No setup-reset shortcut exists.

Configure `BOOTSTRAP_OWNER_EMAIL`, SHA-256 `BOOTSTRAP_CODE_HASH` and ISO `BOOTSTRAP_EXPIRES_AT` using Railway secret variables. Generate the high-entropy original code securely and deliver privately to the designated owner; never commit or log it. Code is not recoverable from its hash. Missing configuration leaves setup unavailable. Remove setup variables after successful activation as defense in depth; the installation record remains authoritative.

| Role     | Boundary                                                                                                      |
| -------- | ------------------------------------------------------------------------------------------------------------- |
| Owner    | Administration, integrations, office operations; controls per-user MFA requirements                           |
| Manager  | Operational management, review/publication and invited staff                                                  |
| Dispatch | Scheduling and work preparation                                                                               |
| Sales    | Clients, properties, sales workflows                                                                          |
| Finance  | Billing, costs and accounting integration operations except owner connection                                  |
| Crew     | Assigned active work; offline capture; cannot publish or bill                                                 |
| Client   | Granted clients/properties and explicitly published material; requests/assessment bookings/estimate decisions |

Endpoint-specific role lists are authoritative and must be tested. Role-aware UI is convenience, not authorization. All authenticated API responses are uncached; cookies are dashboard-host scoped. File reads authenticate and check property/publication grants. Uploads authenticate and authorize the exact target work order before parsing image bodies, with a four-upload per-process concurrency limit and byte/pixel bounds.

## One P1 operations identity across web and native clients

The dashboard's Better Auth account is the sole identity for the P1 operations web application and its future iOS and Android clients. An invited or bootstrap user therefore creates one verified email/password account; the same credentials sign them in on each supported form factor. Roles, client/property grants, verified-email status, session revocation, and owner MFA are enforced by the dashboard API for every client, rather than copied into a mobile-specific user store.

Native clients sign in through the normal Better Auth email/password endpoint. On a successful sign-in or MFA completion, Better Auth exposes the signed session token in `set-auth-token`; the app stores that token only in the operating system's secure credential store and sends it as `Authorization: Bearer <token>`. The API accepts a bearer request without a browser `Origin` header, but validates the signed token and the normal role/property checks before any protected operation. Browser cookie mutations still require the configured dashboard Origin. Native clients must not persist passwords, send cookies as their primary credential, bypass MFA, or treat a cached offline profile as authorization.

The copied Core CMS has its own database and permission model, but it is now being federated into this credential-sharing boundary. Dashboard Better Auth is the canonical credential authority; Core continues to own its existing admin/editor role and permission map through an explicit local Core-user-to-canonical-user link. The rollout verifies both identities before creating a legacy-account link, uses a single-use short-lived authorization-code exchange authenticated by a dedicated federation credential, and preserves immediate local suspension/revocation checks. It must not copy password hashes, share session secrets, infer Core privileges from email/domain/dashboard access, or create dashboard privileges from a Core role.

Offline revocation cannot instantly erase a disconnected device. Cached material must be limited to assigned work and cleared on completed sign-out; unsynchronized work prevents silent disposal. Additional device/support policy remains a launch prerequisite.

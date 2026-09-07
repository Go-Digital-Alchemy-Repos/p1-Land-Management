# Access, initialization and recovery

Anonymous registration is disabled unless the request presents an email-bound unexpired invitation or the designated bootstrap email with a valid expiring code. Verification email delivery is queued through Mailgun. Owner activation requires verified email, completed TOTP verification for the **current session**, and the setup code. Installation row locking, owner assignment and permanent initialization closure commit together; all other owner sessions are removed at activation. Removing a user never reopens initialization.

`session_assurance` records successful Better Auth TOTP/recovery-code verification for a session. The owner gate checks that record as well as the global enabled flag. A different session created before MFA enrollment cannot inherit its assurance. Disabling owner MFA is prohibited. Recovery codes are displayed at enrollment; operator-assisted recovery needs an identity-verified, audited runbook before launch. No setup-reset shortcut exists.

Configure `BOOTSTRAP_OWNER_EMAIL`, SHA-256 `BOOTSTRAP_CODE_HASH` and ISO `BOOTSTRAP_EXPIRES_AT` using Railway secret variables. Generate the high-entropy original code securely and deliver privately to the designated owner; never commit or log it. Code is not recoverable from its hash. Missing configuration leaves setup unavailable. Remove setup variables after successful activation as defense in depth; the installation record remains authoritative.

| Role     | Boundary                                                                                                      |
| -------- | ------------------------------------------------------------------------------------------------------------- |
| Owner    | Administration, integrations, office operations; current session MFA required                                 |
| Manager  | Operational management, review/publication and invited staff                                                  |
| Dispatch | Scheduling and work preparation                                                                               |
| Sales    | Clients, properties, sales workflows                                                                          |
| Finance  | Billing, costs and accounting integration operations except owner connection                                  |
| Crew     | Assigned active work; offline capture; cannot publish or bill                                                 |
| Client   | Granted clients/properties and explicitly published material; requests/assessment bookings/estimate decisions |

Endpoint-specific role lists are authoritative and must be tested. Role-aware UI is convenience, not authorization. All authenticated API responses are uncached; cookies are dashboard-host scoped. File reads authenticate and check property/publication grants. Uploads authenticate and authorize the exact target work order before parsing image bodies, with a four-upload per-process concurrency limit and byte/pixel bounds.

Offline revocation cannot instantly erase a disconnected device. Cached material must be limited to assigned work and cleared on completed sign-out; unsynchronized work prevents silent disposal. Additional device/support policy remains a launch prerequisite.

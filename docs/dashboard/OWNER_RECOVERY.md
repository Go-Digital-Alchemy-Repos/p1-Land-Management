# Owner MFA recovery

Implemented in6d1e024 with test typing follow-up345db82; independently reviewed and deployed to production. Required owner MFA and session assurance remain unchanged.

`GET /api/v1/me` uses verified login identity, rather than privileged actor access, and reports `ownerMfaRequired`. It is true only for an active owner lacking enrollment or this session's assurance. A revoked/expired session still returns401. Business endpoints continue returning403 until assurance is established.

The frontend routes that owner to OwnerMfaRecovery before normal role screens and suppresses business-data refresh. A disabled-factor owner can enroll with their existing password and verify an authenticator code; an enrolled owner with an unassured session verifies a code or uses a recovery code. Successful verification reloads /me; the server decides when access resumes. Setup authorization is never reused, installation never reopens, and no role/account state is changed directly by the recovery UI.

Enrollment material stays only in component memory and disappears on unmount. It is deliberately displayed to the account holder, never sent to logs. Verification errors retain the entered code and enrollment material. Expired identities return through normal sign-in. The owner must perform their own enrollment; agents must not choose passwords or authenticators.

## Evidence

The isolated ten-test dashboard suite and migration replay passed, including mounted /me/business-route checks for disabled factor, enabled-but-unassured owner, assured owner, removed assurance, nonowner and expired session. Both TypeScript checks and production builds passed. The type-only assertion correction does not change runtime behavior.

`/tests/owner-recovery-browser.html` is a synthetic full-App fixture. Default mode represents an initialized owner with MFA disabled. `?mode=unassured` represents an enrolled owner needing verification; `?mode=assured` and `?mode=manager` preserve normal access. Browser checks exercised enrollment, rejected code000000 remaining visible, successful synthetic123456 verification opening Overview and direct unassured verification. These codes and enrollment material are fixtures, not live credentials.

Read-only production evidence on2026-09-07: installation completed07:41:07UTC, designated account created07:32:00UTC/updated07:33:32UTC, email verified and active owner, twoFactorEnabled=false and zero session-assurance rows. This establishes a recovery need, not how that state arose. No production identity or setup credentials were changed during investigation. Retire one-time bootstrap configuration only after owner assurance is verified; do not weaken the policy to work around recovery.

Production web0c02c3e1-ad33-4650-865c-7bb618607119 reached SUCCESS after staging2964b456-6000-4871-aed0-836d07314801. Staging signed synthetic sessions verified recovery status/business denial before assurance and allowed access afterward; fixtures removed. This does not mean the real owner has completed MFA enrollment.

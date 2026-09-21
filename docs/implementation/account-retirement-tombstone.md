# Account retirement tombstones

Status: implemented locally; not deployed and no production account has changed.

The approved retention policy replaces destructive account deletion with a
reversible tombstone. `account_retirement` preserves the user primary key and
therefore immutable audit attribution. It records the pre-retirement inactive
role and explicit access choices, but does not store credentials, sessions,
MFA material, reset tokens or email contents.

Retirement is Owner-only and admits only an inactive, non-canonical account.
The canonical Owner is the `installation.owner_id`, never an email match or a
role inference. The operation atomically records the tombstone, clears stored
capabilities and form-notification selections, deletes sessions, revokes
unaccepted invitations for that existing account email and writes an audit
event. The account is excluded from User Manager and remains excluded from
staff/operational selectors through the existing active-profile checks.

The authentication hook rejects retired identities before sign-in, password
reset or sign-up handling. Retirement deletes only Better Auth verification
records whose opaque `value` is the retired user ID, including password-reset
tokens; records belonging to other users are retained. Email-verification links
are signed, stateless JWTs rather than database records. Their verified
issued-at timestamp is compared with the account's latest retirement timestamp,
so a link issued before retirement is rejected both while tombstoned and after
recovery. The application identity gate separately rejects a retired account's
pre-existing cookie/bearer session, which closes the race between an incoming
request and session revocation. A tombstone is not a hidden authorization flag:
server-side checks enforce it for direct requests.

## Recovery / rollback

An Owner may call the dedicated recovery route for a tombstoned account. It
marks the tombstone recovered, restores only the prior inactive account's
stored access selections, and deletes sessions again. It never reactivates the
account, restores an invitation, creates a password, reenables MFA, restores a
session, or weakens the canonical Owner/MFA policy. The recovery audit record
and historical attribution remain intact. To make the recovered inactive
account operational, the normal Owner-reviewed activation process is still
required.

A previously recovered inactive account can be retired again. The same durable
tombstone row is atomically renewed instead of inserting a duplicate primary
key, resetting its recovery markers and preserving the newest retirement
boundary for signed verification links.

Before any production transition, retain a new private, mode-0600 read-only
account inventory and its digest; run the migration; retire each verified
non-canonical target through the Owner-only route; then capture the matching
post-change inventory. Roll back through the recovery route only for the
specific retained tombstone after checking the owner session and no pending
work. Do not delete `audit_event` rows or anonymize their actor references.

## Validation

The focused retirement test covers: inactive-only admission, canonical Owner
protection, session revocation, normal User Manager exclusion, pre-session and
existing-session denial, reset denial, pending-invitation revocation, cleared
stored grants, preserved audit rows and constrained recovery. Full migration
replay, API generation/typecheck and production review remain required before
deployment.

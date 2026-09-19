# Account-access metadata reconciliation

Status: implemented for offline metadata inventories and synthetic tests. No real inventory was read, and no account, grant, provider, session, notification flag or database was changed. The existing identity v1 contract remains unchanged.

This separate version-one contract compares captured account state and relationships with **explicit reviewed expectations**. It does not convert legacy roles into grants, match by email, link accounts, create users, alter verification/MFA, enable notification routing, or approve retirement.

## Run and results

Requires Node 22.18 or newer (native TypeScript stripping reads the exact canonical capability vocabulary from `lib/api-zod/src/business-access.ts`). No database or provider environment variables are used.

```sh
node --test scripts/consolidation/reconcile-account-access.test.mjs scripts/consolidation/reconcile-identities.test.mjs
node scripts/consolidation/reconcile-account-access.mjs \
  --input /absolute/private/account-access-inventory.json \
  --output /absolute/private/new-account-access-report.json
```

Exit codes: `0` means supplied metadata matches the supplied reviewed expectations; `2` means a complete discrepancy report was written; `1` means validation or file creation failed. A zero exit is not migration, security or release acceptance. The output must not already exist; it is created exclusively with mode `0600`. Input is limited to 32 MiB and must be valid UTF-8. Output contains account/relationship IDs, issue codes, counts and evidence digests, not emails, names, recipient addresses, raw grants, credentials, secrets or session data. CLI errors are fixed messages and do not print input values.

## Strict metadata-only input contract

Every field below is required unless its type explicitly allows null. Unknown fields are rejected at every object level. Collection record IDs and set values must be unique. IDs contain only letters, digits, `_` and `-` (maximum 200 characters); grant identifiers are bounded lowercase dotted/hyphenated identifiers. Dates are valid UTC timestamps; hashes are lowercase SHA-256. Positive versions must be safe integers. The synthetic fixture in `reconcile-account-access.test.mjs` is a complete executable example.

Top-level fields:

| Field | Shape |
| --- | --- |
| `schemaVersion` | `1` |
| `provenance` | `core`, `dashboard`, `identityInventorySha256` |
| `coreAccounts` | Core admin/editor account records described below |
| `dashboardAccounts` | Canonical account records described below |
| `links` | `{ coreUserId, canonicalUserId, revokedAt: UTC timestamp or null }`; include revoked history |
| `forms` | `{ id, active: boolean }`; current Core form catalog |
| `clients` | `{ id }`; canonical client inventory, including referenced clients |
| `properties` | `{ id, clientId: ID or null, lifecycle: "operational" or "prospect" }` |
| `clientAccess` | `{ userId, clientId }`; canonical `client_access` records |
| `workAssignments` | `{ id, userId, propertyId, status }`; assigned work only; statuses `draft`, `scheduled`, `in_progress`, `completed`, `reviewed`, `cancelled`, `skipped`, `delayed` |
| `notificationRouting` | `{ canonicalEnabled: boolean, legacyRecipientsDisposition: "pending" or "reviewed" }` |
| `review` | Snapshot-bound explicit expectations described below |

Each `provenance.core` and `.dashboard` contains `{ sha256, capturedAt, complete: true }`. The identity digest refers to the privately retained input used by the separate identity reconciliation. The tool does not fetch that artifact or authenticate the capture. Source projection completeness remains the inventory producer's responsibility.

Core account records contain exactly:

- `id`, `role` (`admin` or `editor`), `isSuspended` boolean.
- `emailVerification: { representation: "not_represented" }` and `mfa: { representation: "not_represented" }`. Core's user schema has neither control; never invent false/true parity.
- `adminPermissions` and `formNotificationIds` arrays from Core `users.admin_permissions` and `form_notification_form_ids`.

Canonical account records contain exactly:

- `id`, `role` (`owner`, `member`, `manager`, `dispatch`, `sales`, `finance`, `crew`, `client`). Resolve missing-profile findings in the identity report first; never infer a role for this inventory.
- `active`, `emailVerified`, `mfaRequired`, `twoFactorEnabled` booleans from `staff_profile` and Better Auth `"user"`.
- Stored `capabilities`, `formNotificationIds`, positive `accessVersion`, `reviewedAt` (timestamp or null), and `reviewedBy` (ID or null) from `business_account_access`.

`review` contains exactly:

- `reviewedBy`, `reviewedAt`, `coreSnapshotSha256`, `dashboardSnapshotSha256`, and `expectedCanonicalNotificationsEnabled`.
- `accounts`: one expected record for every canonical account, with `canonicalUserId`, `coreUserId` (ID or null), `coreRole` (`admin`, `editor`, or null), `coreSuspended` (boolean or null), `coreAdminPermissions`, `coreFormNotificationIds`, `accessVersion`, `role`, `active`, `emailVerified`, `mfaRequired`, `twoFactorEnabled`, `capabilities`, `formNotificationIds`, `clientIds`, and `propertyIds`.

For an account without a reviewed Core link, use null Core identity/role/suspension and empty Core grant/subscription arrays. For an Owner, the reviewed effective capability set must contain the entire current canonical vocabulary; a stored empty Owner capability array is legitimate. Crew/client effective office capabilities remain empty regardless of corrupt stored grants, which are reported separately. Unknown source or reviewed grants remain discrepancies; legacy roles never generate canonical grants.

Review hashes must match supplied snapshot hashes, its timestamp must not precede capture, and each expected access version must equal the captured version. The supplied reviewer must appear as an active, verified Owner with required/enrolled MFA. These comparisons **do not authenticate the reviewer**, prove a currently assured session, or prove current freshness. A perfectly consistent old inventory is still old. Cross-database captures are not atomic; retain the real capture/freeze evidence separately.

## Comparison semantics

- Report source suspension versus reviewed suspension and warn when a suspended Core identity is linked to an active canonical account. Do not treat Core suspension as a command to reactivate/deactivate another store.
- Compare Core role and exact stored legacy grants/subscriptions, and canonical role, verification/MFA state, effective capabilities and subscription choices. Missing reviews, stale versions, unknown grants, invalid links and dangling reviewers are explicit findings.
- Check notification eligibility using the implemented active-account, verified-email, staff-role, Forms capability/Owner, opt-in, and required-MFA-enrollment rules. Validate subscriptions against active forms. Legacy-recipient disposition is a supplied review statement, not proof that legacy addresses were exported or provider delivery was tested. `canonicalEnabled: false` can be the explicitly intended current setting; this never claims canonical delivery is active.
- Compare canonical client grants and the **relationship projection** used by `propertyAccess`: operational properties must have a valid client; client accounts follow `client_access`; crews follow assignments except `cancelled`, `skipped`, and `reviewed`; office accounts have the general operational relationship projection. This is deliberately not an endpoint authorization report. Individual routes still require their capabilities, publication checks and other restrictions. Inactive accounts may retain relationships even though authentication denies access.
- Report malformed lifecycle/client relationships, dangling grants/assignments and references to missing expected clients/properties. Retain unresolved differences rather than inventing mappings.

The report keeps `sessionAssuranceVerified`, `notificationDeliveryVerified`, `endpointAccessVerified`, `sourceFreezeVerified`, `automaticChangesAllowed`, and `releaseApproval` false on every run. `metadataMatchesReviewedExpectations` means only that this bounded comparison found no discrepancies.

## Evidence still required

A separately authorized capture must project actual source/canonical metadata and retain private source hashes, capture times, reviewed mappings and unresolved dispositions. Runtime transition tests must cover verified login, suspension and session revocation, required MFA and fresh assurance, federation revocation, notification re-selection during delivery, role-separated route/export/offline access, and client/crew property boundaries. Do not migrate MFA secrets or sessions. Preserve current notification delivery until an explicit recipient reconciliation and rollout decision exists.

Synthetic validation covers matching expectations, suspension/verification/MFA drift, exact grant vocabulary, reviewer/version/hash mismatches, revoked/dangling identity links, inactive/missing forms, notification routing, cross-client scope drift, closed crew work, invalid relationships, secret-field rejection, deterministic reports, invalid UTF-8, and private exclusive output. No production acceptance is claimed.

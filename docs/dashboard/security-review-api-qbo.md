# Independent API and QuickBooks review

Scope: read-only inspection of `artifacts/api-server/src/dashboard/api.ts` and `quickbooks.ts`, with supporting access, auth, server middleware, worker, schema and existing integration-test inspection. The dashboard is a single P1 organization on an isolated hostname/database; office-wide access to P1 clients is intentional. No source changes, deployment, live provider requests, or new runtime tests were performed. Findings below are code-path findings, not reproduced production incidents. Line references identify the reviewed working-tree snapshot.

## P1 — Reconciliation can expose a reassigned QuickBooks invoice to its previous client

**References:** `quickbooks.ts:409–421`, `quickbooks.ts:289`, `quickbooks.ts:313`.

Client invoice reads authorize against stored `external_invoice.client_id`. After initial import for client A, an accountant can correct the invoice customer to B in QuickBooks. Reconciliation then imports the new balance and payment URL without validating `Invoice.CustomerRef` or changing/quarantining local ownership. Reimport also preserves the original `client_id` in its conflict-update clause. A remains authorized to see B's updated financial information/payment link indefinitely. Posted local billing has the analogous issue: reconciliation updates the payment link without checking that the provider customer still matches the property's client.

**Recommendation:** validate provider customer ownership on every refresh before exposing financial details. Atomically remap imported invoices to the known corresponding client, or quarantine mismatched/unmapped invoices from client views pending office review. For locally originated billing, flag unexpected customer changes and suppress client publication rather than silently following a changed customer. Test A-to-B and A-to-unmapped customer changes, including both import and reconciliation paths.

## P2 — Creating billing drafts is not idempotent across browser retries

**References:** `api.ts:617–645`; downstream posting `quickbooks.ts:353–367`.

Every POST `/billing` creates a fresh UUID, with no caller operation key or duplicate-request ledger. On a $10,000 approved estimate, a $2,000 deposit whose successful response is lost can be retried into a second $2,000 draft because the aggregate cap still passes. Both drafts can subsequently become separate invoices: provider request IDs correctly deduplicate retries of a single draft, but differ across these two drafts. The estimate cap prevents over-budget totals, not duplicate financial intent. Existing integration coverage checks the cap, not this retry case.

**Recommendation:** require a stable client operation ID for draft creation, scoped to the actor/action and persisted transactionally with a payload fingerprint and result. Return the original draft for identical retries, reject changed payload reuse, and keep genuinely separate deposits possible. Test lost-response retries and simultaneous duplicate requests.

## P2 — Concurrent initial OAuth callbacks can mismatch company and credentials

**References:** `quickbooks.ts:172–187`; `lib/db/src/dashboard/schema.ts:774–778`.

Two valid first-connection flows for different companies can both read an empty `integration_connection` table before either commits. The first insert stores company A and token A. The second insert conflicts on the provider primary key and replaces only encrypted credentials, leaving company A with token B. The existing-company check is therefore bypassed by concurrency, breaking the intended realm/credential binding and potentially disabling subsequent accounting operations. This requires authorized owner connection flows; it is not an unauthenticated takeover.

**Recommendation:** serialize QuickBooks connection establishment with a transaction advisory lock (an absent row cannot be row-locked), and make the upsert explicitly reject a conflicting realm. Test two simultaneous valid callbacks for different realm IDs and confirm exactly one binding succeeds intact.

## Controls observed and limits

Client reads generally apply `client_access`; property actions use `propertyAccess`; privileged routes enforce server-side roles; non-GET application mutations require the configured Origin. OAuth state is random, hashed, user-bound, expiring and consumed transactionally. Integration credentials use authenticated AES-GCM encryption, fixed provider endpoints and serialized refresh. Invoice posting persists its request ID and freezes its payload before the external call, supporting the provider's [documented request-ID idempotency](https://help.developer.intuit.com/s/article/What-is-RequestId-and-its-usage). These controls do not resolve the findings above.

This review does not certify Better Auth session/MFA behavior, media/file handling, deployment secrets/TLS, provider account settings, or full financial reconciliation correctness. Authentication/file review is being performed separately. No direct anonymous credential disclosure or simple cross-client API IDOR was identified in these two files during this pass.

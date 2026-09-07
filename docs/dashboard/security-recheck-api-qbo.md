# Independent API / QuickBooks fix recheck

Reviewed frozen files in `/tmp/p1-dashboard-review-20260907` against matching live source hashes. No application code edits, provider calls, deployments, or runtime tests were performed. This is an implementation and regression-test review; the test assertions were inspected, not independently executed. Integration execution requires a fresh local test server/database, and this review did not reuse an unknown database.

Parent-executed validation: the Orchestrator reports an independent `node scripts/test-dashboard.mjs` run completed with exit0, five tests passed, zero failed and zero skipped, including the integration test and its internal regression assertions. Migration replay passed. The run used a fresh synthetic Docker PostgreSQL fixture with random ports, no live providers, and cleaned up afterward. This execution evidence was supplied by the parent; this reviewer did not independently run or observe its raw output.

| Original finding | Verdict | Evidence |
| --- | --- | --- |
| P1 stale invoice ownership exposes updated financial data to old client | Fixed in the reviewed refresh/import paths | `quickbooks.ts:396–401` resolves CustomerRef each refresh, remaps imported invoices or sets ownership_verified=false and clears payment_url; mismatched local billing remains attached to its operational client but is quarantined. Import conflict updates now remap client_id; unmatched import quarantines. Client reads require ownership_verified. Migration defaults existing invoices to unverified. |
| P2 duplicate billing drafts on retry | Fixed at API contract level | `api.ts:621–659` requires operationId, takes transaction advisory lock before ledger lookup, rejects different actor/payload reuse, and atomically stores draft + operation + audit. Identical retries return original draft. Genuine separate intents retain different IDs. |
| P2 initial OAuth realm/credential race | Fixed in current callers | `quickbooks.ts:177–191` acquires a transaction advisory lock before the existing-realm check and token exchange; callback invokes helper inside its transaction. Competing company binding observes committed first company and rejects with409. |

Regression-test evidence: frozen `integration.test.ts:275–296` asserts parallel identical billing requests share one ID; changed payload returns409; invoice A-to-B reassignment removes A visibility; unmapped customer is unverified; mismatched locally originated billing is hidden; concurrent two-realm binding has one success, one rejection and one stored connection. Tokens are synthetic and the helper test performs no live provider exchange.

Limitations and follow-up:

- The parent independently executed the local regression suite successfully as recorded above; this reviewer performed source/test inspection only.
- Billing correctness assumes the browser retains operationId across an uncertain-response retry. Frontend behavior is outside this frozen API review.
- `reconcileQuickBooks` still selects external invoices only when local balance_cents>0. Settled external invoices later reopened or reassigned in QuickBooks are not refreshed by that loop. This does not reintroduce the reviewed leak of newly refreshed data, but leaves stale ownership/financial records until a qualifying reimport. Extend reconciliation selection or process provider event invoice IDs to cover reopened/changed settled records.
- New local posting leaves ownership unverified until reconciliation; verify expected client visibility timing with the worker enabled.
- OAuth upsert itself still lacks a realm-conflict predicate; safety currently depends on all connection writers using the advisory-lock helper. Current reviewed code does so.

SHA-256:

```text
api.ts                  552765c5af365d40cf03b41c4eb65a5a090f3e822868281a922f9955b2be64df
quickbooks.ts           b6919afb3e42d2f4c6ac5765ca4554d8508297d9a0b9d05605954466eb07a15e
integration.test.ts     d259dd5104a050b83a69109b49bc1bd3f0b0fcbcf79986e93b3ee78689ee442b
0007_security.sql       b8a3652e7c4945ec16cb6acb133513346b0ee07945ce37001112a12f0d62d279
```

Migration reviewed at `artifacts/api-server/migrations/dashboard/0007_security.sql`. Scope excludes independent authentication/MFA review and any claim of full financial integration certification.

## V2 settled-invoice residual recheck

Frozen `/tmp/p1-dashboard-review-20260907-v2/quickbooks.ts` SHA-256: `337dba7d2fd8494aadb724870bbca4024750cc746303d61caa5e361bc4b13f12`. The associated `quickbooks.diff` removes only `WHERE balance_cents>0` from the external-invoice reconciliation selection. The prior settled-invoice exclusion follow-up is **resolved in this reviewed revision**: all known imported IDs now enter the same provider lookup and ownership-validation loop, regardless of local balance.

Independent focused synthetic execution: extracted the exact frozen `reconcileQuickBooks` function and executed it under Node with stubbed pool/provider/ownership-refresh functions. Asserted the complete SQL string selects all external-invoice IDs; supplied both zero-balance and positive-balance fixture records; asserted both IDs reached the provider stub and ownership-refresh stub. Result: PASS, exit0. No network/database requests or application-code edits. This verifies query construction and loop reachability, not real PostgreSQL execution or provider behavior. Existing integration tests exercise the ownership helper but do not directly exercise this reconciliation selection. Parent reports its independent `node scripts/test-dashboard.mjs` v2 run on the matching QuickBooks hash completed exit0: five passed, zero failed, zero skipped; migration replay passed. The reviewer did not independently observe that raw suite output.

Residual operational limits: reconciliation still depends on successful provider responses and worker execution; a failing invoice stops the loop, and all-known-invoice scans increase provider calls as history grows. Those are operational limits rather than the corrected zero-balance filter defect.

# Business Center identity reconciliation

This read-only tool audits the structural identity inventory before admin retirement. It does not connect to either database, create accounts, link identities, change passwords, grant permissions, or approve a release. Use owner-authorized snapshots from the same reconciliation window. Keep the inventory private: it contains account email addresses.

Run from the repository root:

```sh
node scripts/consolidation/reconcile-identities.mjs --input /private/path/inventory.json --output /private/path/report.json
node --test scripts/consolidation/reconcile-identities.test.mjs
```

The output must not already exist. It is created with mode 0600 and includes a SHA-256 digest of the exact input for evidence tracking. Standard output contains counts only. The report contains source IDs, issue codes and potential identity pairs; email addresses are omitted. A successful command means the inventory was analyzed, not that issues are resolved or cutover is approved.

## Inventory contract

Provide only these fields; unknown fields are rejected to avoid accepting credential/session exports. IDs are nonempty strings, including Core IDs. `links` must include revoked history, not only active links.

```json
{
  "schemaVersion": 1,
  "coreAccounts": [
    { "id": "core-user-id", "email": "owner@example.test", "role": "admin" }
  ],
  "dashboardAccounts": [
    { "id": "canonical-user-id", "email": "owner@example.test", "role": "owner", "active": true, "reviewedAt": null }
  ],
  "links": [
    { "coreUserId": "core-user-id", "canonicalUserId": "canonical-user-id", "revokedAt": null }
  ]
}
```

Source projection:

- Core `users`: include every admin/editor account, without passwords. Public directory/customer accounts are outside this admin identity inventory and require their separate preservation review.
- Dashboard `"user"`: include all identities, left joining `staff_profile` and `business_account_access`. Missing profile uses `role: null`, `active: false`. `reviewedAt` comes from `business_account_access.reviewed_at`. Owner/crew/client accounts do not require explicit staff-tool grant review; their distinct scope rules still require validation.
- Core `p1_identity_link`: project `core_user_id`, `canonical_user_id`, `revoked_at`. Never export initial grants, session tokens, authorization codes or password fields.

Do not omit suspended or unreviewed accounts just to obtain an empty issue list. This tool does not assess Core suspension, email verification, MFA, session assurance, detailed grant parity or client/property access. Those remain independent release gates.

## Resolving findings

Recorded source-ID links take precedence over email matching. Different emails on an existing link do not automatically invalidate it. Duplicate IDs make the inventory invalid; duplicate normalized emails are reported for human review and suppress matching candidates. Revoked links retain their history and require an explicit disposition. Missing referenced accounts, multiple links, missing dashboard profiles, linked client/crew/inactive accounts and unreviewed staff access are explicit findings.

For an unlinked Core account, a unique email match to an unlinked dashboard identity is only a candidate. Use the existing federation linking flow with proof of both accounts and confirmation; do not insert a link from this report or merge by email. Resolve permission review through the Owner's User Manager. Re-export and rerun after authorized changes, retaining the previous report and its input digest. Confirm every remaining finding's disposition before considering identity reconciliation complete.

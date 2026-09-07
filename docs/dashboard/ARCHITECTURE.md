# Architecture and data ownership

The pnpm workspace is extended with `artifacts/p1-dashboard`, a React/Vite application, and a separate Express entry point in `artifacts/api-server/src/dashboard/main.ts`. The existing website API and build stay separate. `/api/v1` is the versioned dashboard boundary; `/api/auth` is Better Auth; `/api/webhooks` handles raw signed provider requests. A separate worker processes PostgreSQL outbox records and recurring work generation.

PostgreSQL is isolated from the Core CMS. SQL migrations in `artifacts/api-server/migrations/dashboard` are the executable schema source; Drizzle's dashboard schema is the typed representation, independently exported from the existing DB package. The migration runner uses a transaction/advisory lock and stored checksums. Do not modify an applied migration. Add compatible forward migrations; rollback application code against compatible columns. No destructive down migrations are provided.

Business profiles and property/account grants are independent from auth identities. Operational records belong to the property. QuickBooks owns posted accounting numbers, taxes, credits, balances and payments. The dashboard owns scope, accepted revisions, work history and reviewed billing intent. An invoice's refreshed accounting customer must be mapped on every refresh; unmapped ownership is hidden from clients.

Outbox data and business changes commit together where implemented. External services cannot participate in the database transaction. Stable operation IDs protect field capture, photos and billing intent; QuickBooks posting saves its request ID and payload before the provider request. Unknown notification outcomes require office review rather than blindly resending.

No business-history deletion UI exists. Archival, legal retention and owner-managed deletion/export procedures still need completion. Data is not tenantized for a commercial SaaS; one operating P1 business with explicit client/property boundaries is intentional.

Native clients should consume generated API contracts, implement device-secure tokens and a durable operation/photo queue, and preserve the same authorization and publication rules. Web IndexedDB/cache implementations are not portable native storage modules.

## Planned commercial domain extension

See the [commercial initiative](../initiatives/commercial-industrial-sales.md) for the proposed entity and handoff contract. Existing contacts/properties require an operational client; current leads require email. Commercial prospects must not be forced into those records or given invented email values. Resolve optional contact-channel validation and prospect-to-operational promotion through additive contract/migration review. Keep a researched target account distinct from a submitted inquiry. Core retains durable original submissions; the dashboard owns commercial pursuit after an authenticated, idempotent inbox handoff. No automatic user invitations, client_access grants, QuickBooks customers or marketing publication result from this handoff. Better Auth account records are not business companies.

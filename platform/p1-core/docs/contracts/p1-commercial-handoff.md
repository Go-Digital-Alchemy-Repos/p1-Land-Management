# Commercial handoff v1 — first integration slice

Core is authoritative for accepted form receipts. Every newly accepted `p1-commercial-assessment` inquiry saves an independent `commercial_dashboard_intake` job alongside the existing CRM and notification effects. Missing integration configuration never rejects or discards an accepted form. Existing commercial submissions need a separately reviewed backfill; this slice does not automatically backfill them.

## Wire and configuration

The exact strict schema lives in `shared/commercial-intake-contract.ts`, mirrored in the dashboard with a byte-equality test. The event contains an event/job UUID, submission UUID, source instance UUID, original acceptance time, and reviewed commercial project fields. Optional email remains null for phone-only inquiries. Nested attribution is rejected. No attachments or account provisioning are supported.

Core environment: `COMMERCIAL_HANDOFF_URL`, `COMMERCIAL_HANDOFF_ALLOWED_HOST`, `COMMERCIAL_HANDOFF_SOURCE_INSTANCE_ID`, `COMMERCIAL_HANDOFF_KEY_ID`, `COMMERCIAL_HANDOFF_SECRET_HEX`. Destination requires HTTPS, exact allowed hostname and `/api/integrations/core/v1/commercial-inquiries`, no credentials/query/fragment or alternate port. Secret is 32 random bytes encoded as 64 hex characters. Parent provisions separate staging/production identities and keys; never reuse session or provider secrets.

Dashboard environment: `CORE_INGRESS_HMAC_KEYS` is a JSON map from key ID to `{secretHex,sourceInstanceId}`. Trusted configuration bootstraps key metadata without re-enabling revoked rows. Explicit owner revocation is durable. Rotation adds a fresh key ID; do not delete revocation metadata.

Headers: `x-p1-key-id`, `x-p1-sent-at` (Unix seconds), `x-p1-signature` (lowercase hex HMAC-SHA256). Signed text joins method POST, exact ingress path, key ID, timestamp and SHA256 of raw body with newline separators. Timestamp tolerance is five minutes. Bodies are capped at 64 KiB. Browser cookies, Origin and query parameters are rejected. Service HMAC does not bypass staff authentication. The ingress has a supplemental process-local request limit; database idempotency remains authoritative.

Outbound bytes freeze under the active worker claim before first transmission and never change on retry. Each attempt signs the same bytes with a fresh timestamp. Config changes cannot silently rewrite the frozen source identity. Network timeout is 15 seconds; redirects are rejected; acknowledgement is bounded to 4096 bytes and must match event and submission identities. Only 200/201 acknowledgements complete the job. Receipt acknowledgement and active-claim completion commit together.

The dashboard transaction locks both source/event and source/submission identities, validates revocable key metadata, and atomically creates one existing lead, one receipt and one audit. Identical retries return the original mapping; conflicting bytes or identities return409. It does not create clients, properties, users, invitations, access grants or QBO records. Separate inquiries by the same person remain separate leads.

## Staff APIs and recovery

`GET /api/v1/commercial-inquiries` is restricted to owner/manager/sales. Returns `{items,nextCursor}` with default50/max200 limit, optional status, ownerId (including `unassigned`), overdue=`true`, cursor. Ordering is created_at descending then id descending. Opaque filter-bound cursors preserve all six PostgreSQL fractional timestamp digits. Use the overdue filter for follow-up triage; reset cursor on filter changes. Details and follow-up endpoints share those roles. Legacy lead listing excludes commercial rows for dispatch/finance. Follow-up requires expectedVersion; explicit conversion advances that version and requires a recorded contact email for commercial phone-only leads.

`GET /api/admin/form-delivery-jobs` returns `{items,nextCursor}`, default50/max200, with status `actionable` (default: all failed jobs and pending commercial jobs), `completed` (commercial), or `all` (commercial plus other failed jobs). Same stable creation ordering and precise timestamp cursors. The Forms monitor provides status selection, shown count, and Load more. Existing failed-job retry retains the same job/event and records an audit entry; never repost public forms to recover delivery.

Worker retries use existing bounded backoff and dead-letter behavior. Failed configuration, authorization, destination errors and malformed acknowledgements have sanitized error codes. Logs and monitoring omit raw inquiry bodies, signatures and secrets. Staff detail access and database backups remain privileged.

## Migration and release ordering

Dashboard `0010_commercial_intake.sql` precedes receiver deployment. Core `0001_commercial_handoff.sql` adds frozen delivery bytes and acknowledgement fields; SSO uses0002+. Back up each isolated database before applying migrations. Deploy compatible dashboard first, Core next; provision separate credentials and verify a synthetic receipt end-to-end before production activation. Rollback disables delivery configuration and preserves all receipt/job/lead tables; do not drop populated schema or erase deduplication identities.

This slice leaves full prospect company/contact/site relationships, reviewed historical backfill, live staged cross-service acceptance, and deployed staff UI acceptance to subsequent integration gates. An email being syntactically present is not proof of consent or verified deliverability; staff must establish those facts before conversion/outreach.

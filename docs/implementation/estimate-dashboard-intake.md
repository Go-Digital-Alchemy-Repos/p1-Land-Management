# Standard estimate delivery to Dashboard

September 20, 2026. This is an additive extension of the existing signed commercial intake transport, not a new authentication or CRM architecture.

New `p1-estimate` submissions queue `estimate_dashboard_intake` alongside existing Core CRM and notification effects. The immutable event uses `p1.estimate_inquiry.accepted` on the existing authenticated ingress path. Dashboard creates a general inquiry in New, source `website_form`, preserving contact, location, acreage, service selection, message and attribution. Commercial-only fields remain null. Distinct submissions stay distinct; event/submission receipts prevent retry duplicates and preserve staff edits. Existing commercial behavior is unchanged.

Both wire-contract copies must remain byte-identical. Estimate attribution keys are limited to 64 characters; the serialized UTF-8 inquiry is capped at 60,000 bytes before durable acceptance, leaving room within the receiver's 65,536-byte envelope limit. Oversized submissions return 400 without storing an undeliverable request. Secrets remain server-side; existing HMAC, source identity, expiration, revocation and transactional receipts apply.

## Release and rollback

1. Deploy Dashboard receiver and mirrored additive contracts first. Verify terminal Railway success before enabling the Core producer.
2. Deploy Core producer/worker and delivery queue label. No database migration or new credentials are required.
3. Retain all queued jobs during recovery. An older worker cannot handle the new kind; forward-fix and retry failed jobs through the delivery queue. Keep a compatible receiver while draining jobs. Never delete submissions or receipts to retry.

This does not backfill historical estimates. Idempotent resubmission returns the stored submission without adding effects. Previously imported estimates may have CRM provenance without ingress receipts; do not synthesize jobs for those records, which could create duplicate inquiries. The separate historical preservation run remains authoritative.

## Evidence

25 focused Core tests pass. Actual isolated PostgreSQL runs pass Dashboard ingress (6 tests) and Core durable effects (17 tests), including concurrent replay, changed-payload rejection, distinct submissions and frozen payload ownership. Temporary database/container cleanup verified. Independent read-only review found no remaining blocker after the payload-capacity correction. No production inquiry or provider notification was generated for testing.

Receiver-first release prepared; Core producer changes are validated locally but not yet committed or deployed. All three affected application typechecks and builds passed (existing dashboard bundle-size warnings remain). Production deployment verification remains pending. Full consolidation, account access decisions, permanent source-write ownership and admin retirement remain open.

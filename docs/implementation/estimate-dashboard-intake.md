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

Receiver revision `519c10b8` reached Railway SUCCESS on Dashboard (`f08c354e-702f-4eb5-a179-2b7656c29059`), Core (`8e358b5d-9ac5-497b-b085-8ba75dfcc69d`) and Website (`63b999eb-da78-49b7-944a-83ca83c7f0e5`); dashboard database health returned 200. Core producer/worker release now follows this compatible receiver. All three affected application typechecks and builds passed (existing dashboard bundle-size warnings remain). Producer revision `b75c3deef4b96c3e4ba62e1597f1484866e72ec1` reached Railway SUCCESS on Dashboard (`4b1a7602-ce39-44ac-9252-e63291490dc8`), Core (`2ebd3ac0-f772-49a1-995d-3d226aba37ce`) and Website (`7259a772-216a-4ebf-a138-368ed3e2bec1`). Dashboard database health and public contact page returned HTTP 200. No live submission was sent; full delivery behavior was exercised against isolated PostgreSQL. Full consolidation, account access decisions, permanent source-write ownership and admin retirement remain open.

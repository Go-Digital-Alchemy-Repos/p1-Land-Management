# Accepted P1 implementation envelope

Owner explicitly requested implementation of the five-stage P1 Website, CMS and CRM Improvement Plan on 2026-09-07.

- Baseline P1 remote 5303da0113a86c6d569712af92e69fb43fb16148; working branch codex/p1-cms-crm. Preexisting local edits preserved.
- Core source: GitHub archive aad2057ca53e0a55a873bcbe9c62a73e267be541, imported to platform/p1-core. Original Core checkout, Git remote, deployments, DB and secrets are read-only/excluded.
- Approved topology: independent P1 Core service and P1 Postgres in existing P1 Railway project e83f79dd-d901-4ab1-836b-bdf272b58dc2, public gateway proxies /admin and /api; CMS draft/publish snapshots drive server HTML and hydration. Dedicated storage and new secret values.
- Keep CMS/blog/media/galleries/forms/CRM/users/revisions/operations; exclude ecommerce/directory/membership/portfolio applications. Events/careers remain disabled. Public gallery uses normal CMS page fields.
- User facts: balanced acquisition goal; testimonials/project evidence unverified. Remove unsupported proof; originals retained, illustrations labeled.
- Shared contracts: upstream client-site manifest/content/preview 1.0; same-origin /admin support is a P1-only adaptation. Public estimate slug p1-estimate uses managed form API and idempotency key; async durable CRM/email effects.
- Parent owns integration, public runtime/CMS adapter and Railway; backend agent owns platform/p1-core; public agent owns frontend quality; image agent owns generated assets/pipeline. No agent may modify original Core or deploy independently.
- Gates: independent security/review of admin exposure and leads, type/build/schema/public and backend tests, fresh DB rehearsal, preview smoke, immutable revision deployment and rollback recording.
- Publication authority: source code deployment is requested; customer claims and external provider credentials are never inferred. Fresh admin setup remains controlled by owner.

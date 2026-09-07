# Repeatable Single-Client Deployment Runbook

Use this runbook only after client intake and launch-gate approval. One “client stack” means one Core
Platform dashboard/API, one client database, and one separately built static React site, plus that
client's configuration and operations. It is not a tenant in a shared system. This blueprint does not
authorize provisioning.

## Boundary and Naming

Choose one immutable lowercase kebab-case `CLIENT_STACK_ID`, for example `acme-store`. Use it in the
Railway project/environment labels, backup prefix, monitoring labels, and operator records. Never reuse
another client's database, secrets, storage prefix, Stripe webhook secret, or release/rollback boundary.

Record the application service ID, PostgreSQL service ID, public domain, protected `dashboard` subdomain,
routing mode, DNS provider, Stripe account/mode, R2 bucket and prefix, email sender, owners, and incident
channel in the client operations record. Do not record secret values there.

## Recommended Domain Topology

- Serve the React public site from the client's normal HTTPS domain, with an explicit apex/`www`
  canonicalization rule.
- Serve the Core Platform dashboard from `dashboard.<client-domain>`, such as `dashboard.example.com`.
- Route public browser requests from `/api` on the public domain to the Core Platform backend where the
  hosting/CDN topology supports it. Keep the dashboard's API same-origin on the dashboard subdomain.
- Keep authentication cookies host-only by default. Use a reviewed signed preview flow between admin and
  public origins. Edge access controls may supplement but never replace application authorization.
- Assign public links, admin links, webhooks, callbacks, CSP, CORS/CSRF, redirects, and email destinations
  to one named origin in the release manifest.

## Domain Setup Wizard Contract

The dashboard onboarding wizard is registrar-agnostic. It captures the public domain, apex/`www` preference,
the required `dashboard` subdomain, site/backend routing targets, same-origin `/api` mode, and DNS/launch owners. It produces
an exact record plan with record type, host, target/value, TTL, provider proxy mode when applicable,
purpose, and copyable manual instructions. It also derives the shared R2 bucket and client object prefixes:
`clients/<client-domain>/backups/` and `clients/<client-domain>/uploads/`.

The operator enters the records at any registrar/DNS provider, then the wizard verifies ownership,
authoritative nameservers, propagation, certificate issuance, public and admin routing, `/api` proxy
behavior, readiness, canonical redirects, and origin policy. Pending propagation is reported separately
from invalid configuration. Record creation alone never marks the domain ready.

For each client onboarding, the installing super admin is the designated DNS and release operator. That
person applies generated records manually through the client's provider account and records prior values
for rollback.

Core Platform never requests or stores registrar/DNS-provider credentials and never creates, updates, or
deletes DNS records in this workflow. The operator records the prior values before applying the generated
plan. Regeneration must produce the same instructions, avoid unrelated records, and include a rollback
plan using those prior values. Direct provider APIs, including Cloudflare automation, are outside the
near-term scope. Domain cutover remains blocked until ownership, DNS, certificate, routing, `/api`,
application health, redirect, and rollback gates all pass.

In Core Platform, administrators open **System → Client Stack Onboarding** to generate the manual plan.
The workflow is intentionally non-persistent and credential-free: it produces a deterministic record plan
from approved values and records the operator's read-only verification outcome. It does not provision a
domain, save registrar credentials, mutate DNS, or authorize a cutover. Preserve the generated plan and
observed evidence in the client operations record before a release review.

Every generated plan, public-DNS observation, and readiness evaluation is retained as an append-only,
credential-free evidence record with its stack ID, authenticated administrator, and timestamp. Review that
history from the onboarding screen before release; it records observations, not approval or cutover.

After the operator publishes a plan, **Verify published DNS** performs public DNS reads only. It checks A,
AAAA, and CNAME answers against the exact planned value. An absent answer is reported as pending propagation;
an answer that does not include the planned value is blocked as a mismatch. ALIAS and ANAME are
provider-specific, so the application leaves them pending for the operator's provider read-only evidence
rather than claiming they passed. This check never changes the overall release-readiness result on its own:
the operator must retain the observed evidence and complete the remaining ownership, certificate, routing,
health, redirect, and rollback checks.

## Railway Blueprint

1. Create a dedicated Railway project or an equivalently isolated project boundary for the client.
2. Add one application service connected to the approved Git repository and one dedicated PostgreSQL
   service. Do not reference another client's database variables.
3. Keep `railway.toml` health checking `/api/health/ready`; use Git-backed builds and immutable commit
   SHAs for release records.
4. Configure the public domain, protected admin subdomain, and same-origin `/api` routing from the approved
   integration contract and domain wizard record plan. For this topology, set `PUBLIC_SITE_ORIGIN` to the
   public site, `CORE_PLATFORM_ADMIN_ORIGIN` to the protected dashboard, and retain `APP_URL` as the exact
   admin origin for legacy Core Platform services. Both exact origins must appear once in `TRUSTED_ORIGINS`.
   The preflight rejects missing, non-canonical, identical, mismatched, or untrusted origins.
5. Set the variables below through Railway's secret/configuration controls. Never commit real values.
6. Run the same candidate configuration and exact approved release record through the preflight. This must
   report success; a valid draft is not a deployment authorization:

   ```bash
   npm run deploy:check -- --release-manifest docs/pilots/<client>/client-release-manifest.json --require-ecommerce --require-email --require-backups --require-observability --require-client-form-proxy --require-separate-origins
   ```

   Each switch may appear only once. The preflight rejects unknown, incomplete, or duplicate options before
   it reads deployment configuration or a release record.

   The command reports only missing or invalid variable names and non-secret identity/origin values. It does
   not replace client approvals, backup/restore evidence, or deployment-window authorization.

## Configuration Inventory

| Area              | Required variables or records                                                                                                                                                                                                                                                                    |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Identity          | `CLIENT_STACK_ID`                                                                                                                                                                                                                                                                                |
| Database          | Dedicated `DATABASE_URL`                                                                                                                                                                                                                                                                         |
| Sessions/security | Unique 32+ character `SESSION_SECRET`, optional unique `CMS_PREVIEW_SECRET`, unique `SETUP_TOKEN` for first setup                                                                                                                                                                                |
| Domain/origins    | Public domain, `dashboard` subdomain, same-origin `/api` routing, DNS provider and manual operator, exact `PUBLIC_SITE_ORIGIN`, `CORE_PLATFORM_ADMIN_ORIGIN`, legacy-compatible `APP_URL` equal to the dashboard origin, exact `TRUSTED_ORIGINS`, certificate/routing status                     |
| Stripe ecommerce  | Dedicated `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET`; record account and test/live mode                                                                                                                                                                              |
| Email             | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`; SPF/DKIM/DMARC ownership evidence                                                                                                                                                                                               |
| Site form proxy   | Matching `CLIENT_FORM_PROXY_TOKEN` on Core Platform and `CORE_PLATFORM_FORM_PROXY_TOKEN` only in the client's site server environment; never expose either to browser code                                                                                                                       |
| Backups           | `SYSTEM_BACKUPS_ENABLED=true`, `SYSTEM_BACKUP_INTERVAL_HOURS=24`, `SYSTEM_BACKUP_RETENTION_DAYS=30`, `core-platform-website-backups` R2 bucket, credentials scoped to the client prefix, and `BACKUP_R2_PREFIX=clients/<client-domain>/backups` (derived from `PUBLIC_SITE_ORIGIN` when omitted) |
| Observability     | `LOG_LEVEL`, `METRICS_ENABLED=true`, a unique 32+ character `METRICS_BEARER_TOKEN`, uptime/error/log destinations, and named responders                                                                                                                                                          |
| Railway metadata  | Git commit SHA, project/service/environment IDs are supplied by Railway and included in backup metadata                                                                                                                                                                                          |

Prefer environment-managed provider secrets for deterministic stacks. If an admin UI can persist a
provider secret in the database, document the precedence and verify that a restored database cannot
silently point to another client's provider account.

## Storage and Backups

- Use a dedicated media bucket or a client-specific namespace with credentials that cannot access other
  client prefixes.
- The template uses the shared `core-platform-website-backups` bucket. Backups default to
  `clients/<client-domain>/backups/`, derived from the public domain entered during activation. Uploads and
  other R2 objects use `clients/<client-domain>/uploads/`; before a domain is configured, the client stack ID
  is used instead. Scope credentials to the client prefix where the
  provider supports it.
- Enable Railway-native PostgreSQL backups in addition to application-level R2 backups.
- Create a manual pre-cutover backup and retain it outside the normal short rolling window.
- Restore into a disposable duplicate environment. Confirm the manifest's `clientStackId`, Railway
  metadata, bucket/prefix, table counts, representative records, login, media references, and order
  totals before declaring restore readiness.

Never restore into production first. The restore command is destructive, requires `--yes`, and refuses a
snapshot whose `clientStackId` does not exactly match the target `CLIENT_STACK_ID`. A legacy snapshot without
stack provenance requires the separate `--allow-legacy-backup` acknowledgement after duplicate-environment
review; that acknowledgement cannot override a mismatched identified stack. See [System Backups](../system-backups.md).

## Stripe and Webhooks

1. Confirm the intended Stripe account and test/live mode with the client owner.
2. Configure only the ecommerce Stripe keys belonging to this stack.
3. Create the endpoint `https://<client-domain>/api/ecommerce/webhook/stripe` and store its unique
   signing secret in this stack.
4. Subscribe only to events supported by the approved release. Record the event list.
5. In test mode, verify signature rejection, successful payment, duplicate delivery, delayed delivery,
   refund, and failure/recovery behavior. Do not enable live mode until Phase 1 launch gates pass.

The platform's membership Stripe handler is separate. Do not confuse its webhook endpoint or settings
with ecommerce.

## Email

Verify sender-domain ownership, SPF, DKIM, DMARC, bounce handling, suppression behavior, and reply/support
routing. Exercise order lookup, confirmation, status, shipment, and refund messages in staging without
using real customer addresses. Confirm URLs resolve to the exact client domain.

## WooCommerce Import Rehearsal

1. Obtain a read-only source export/API credential and record source version, plugins, currency, time
   zone, tax, shipping, payment, subscription, gift-card, and custom-field behavior.
2. Take a source snapshot and run an import dry run; do not write production.
3. Review mapping/exclusion reports and resolve duplicate SKUs/slugs, variants, media failures, missing
   customers, order states, coupon rules, and personally sensitive history.
4. Reconcile products, variants, media, customers, orders by status, stock, coupon usage, and monetary
   totals. Document every accepted difference.
5. Crawl legacy URLs and approve redirects, canonical URLs, sitemap, product JSON-LD, and merchant feeds.
6. Repeat from a clean target. Re-running the importer must not duplicate data.
7. Rehearse source freeze, final delta, backup, release, DNS switch, smoke tests, rollback trigger, and
   support communication. Obtain owner sign-off before live cutover.

## Release Gate

Before each production release record the candidate commit and verify:

- deployment preflight succeeds with all applicable flags;
- lint, type checking, tests, migration tests, build, and bundle budgets pass;
- migrations are backward-compatible with the currently running release;
- a current backup exists and restore/rollback procedures are within their rehearsal window;
- Stripe/email/storage checks use non-production recipients or provider test mode until final approval;
- `/api/health`, `/api/health/ready`, storefront, login, catalog, cart, and checkout smoke checks pass;
- domain ownership, authoritative DNS, propagation, certificates, public/admin routing, same-origin
  `/api`, canonical redirects, and the reviewed DNS rollback plan pass;
- monitoring is receiving stack-labeled telemetry from the authenticated Prometheus scrape and responders are available.

## Rollback

Roll application code back through Railway to the last verified Git-backed deployment. Roll domain
instructions back only from the approved plan and its captured prior values; do not delete or overwrite
unrelated DNS records. The authorized operator applies the rollback manually. Account for DNS TTL and
certificate state in rollback timing. Do not assume a code rollback reverses a database migration. If
data recovery is required, stop writes, preserve the failed state for investigation, restore into a
duplicate environment first, reconcile, then execute the approved destructive restore. Revoke or rotate
non-DNS provider credentials if exposure or cross-client configuration is suspected.

## Required Better Farms Pilot Intake

- legal client/store name, owner, technical approver, finance approver, and support contacts;
- desired `CLIENT_STACK_ID`, public domain, apex/`www` policy, protected admin subdomain, registrar/DNS
  and hosting providers, manual DNS/launch owners, and launch window;
- WooCommerce URL/version, plugins, export/API access, data volumes, custom fields, and retention policy;
- catalog types, SKU/variant/media counts, digital/physical behavior, stock and oversell policy;
- currency, selling countries, tax nexus/exemptions/adviser approval;
- shipping origins, destinations, carriers, packaging, rate and return rules;
- Stripe account ownership/mode, refund/cancellation/dispute rules, expected volume and average order;
- guest/account requirements, privacy jurisdictions, consent, retention, export/erasure policy;
- email domain/provider, sender identity, deliverability records, templates, and support routing;
- brand/CMS content, legacy URLs, SEO/search/feed requirements, analytics and accessibility requirements;
- RPO/RTO, backup retention, monitoring/alert owners, incident contacts, release approvers, rollback limits;
- explicit exclusions for subscriptions, gift cards, multi-currency, marketplaces, complex promotions,
  live carrier rates, and any other deferred capability.

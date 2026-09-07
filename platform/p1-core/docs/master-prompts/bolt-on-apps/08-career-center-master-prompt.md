# Career Center Bolt-On App — Master Prompt

Append this prompt to [00 — Universal Bolt-On App Contract](./00-universal-bolt-on-app-contract.md).

---

Build the complete **Career Center** bolt-on app described below.

## App Registration

- App id/slug: `careers`
- Display name: configurable, default `Career Center`
- Core Platform feature key: `careersEnabled`
- Core Platform persisted setting: `system_configuration.enable_careers`
- Core Platform default: enabled; use disabled for a fresh external installation unless explicitly configured otherwise
- Public routes: `/careers`, `/careers/:slug`
- Admin routes: `/admin/careers`, `/admin/careers/new`, `/admin/careers/settings`
- Public API family: `/api/careers`
- Admin API family: `/api/admin/careers`
- Core permission: `content`; map job publishing, application review, resume access, integrations, and settings to host equivalents

## Product Goal

Provide public job discovery and detail pages, secure application/resume intake, an internal hiring workflow, notifications, job-board feeds/readiness endpoints, sharing, webhooks, and administration.

The module must be industry-neutral and must not assume that jobs belong to directory listings. A job may optionally link to a Directory profile through an adapter when both apps are enabled.

## Domain Model

Implement host-equivalent, namespaced models for:

- jobs with title, unique slug, department, employment type, work mode, location/address, optional directory-profile link, salary range/currency/period/visibility, status, public/internal visibility, summary, rich description, requirements, benefits, application instructions, publish/close dates, SEO/noindex, integration metadata, actor, and timestamps;
- applications with job, applicant identity/contact, cover letter, LinkedIn/portfolio URLs, resume filename/type/size/storage key, status, source, consent, minimum abuse/security metadata, integration metadata, and timestamps;
- application notes/status history with from/to state, actor, note, and timestamp;
- career settings for labels, archive/filter behavior, sharing, notifications, retention, resume rules, feeds, partner metadata, indexing, and signed webhooks.

Use default job statuses `draft`, `published`, `closed`, and `archived`; visibility `public` or `internal`; work modes `on_site`, `hybrid`, and `remote`; and application statuses `new`, `reviewing`, `shortlisted`, `interviewing`, `offered`, `hired`, `rejected`, and `withdrawn`.

Employment types should include full-time, part-time, contract, temporary, internship, and volunteer while remaining configurable/extensible.

## Public Career Experience

Build:

- searchable/filterable careers archive;
- filters for department, location, employment type, and work mode;
- public job detail by slug with accessible rich content, location/work mode, compensation only when configured visible, closing state, sharing, SEO, and JobPosting structured data;
- application form with identity/contact, cover letter, LinkedIn/portfolio, resume, consent, validation, upload progress, success, and duplicate/retry-safe behavior;
- correct handling for draft, internal, future, closed, archived, expired, noindex, and disabled jobs;
- unified search and sitemap inclusion for currently public published jobs only;
- CMS listing-block adapter when CMS is enabled.

## Resume And Application Security

- Require a resume unless host configuration explicitly supports resume-optional jobs.
- For Core parity, allow PDF, DOC, and DOCX up to 5 MB; make limits configurable within a safe server maximum.
- Validate extension, reported MIME type, detected file signature where practical, and size on the server.
- Store resumes in private object storage with a namespaced key; local-development fallback is acceptable only if consistent with host practice.
- Never return a public resume URL.
- Serve resume downloads only through an authenticated, authorized, audited endpoint using a short-lived signed URL or streamed response.
- Sanitize filenames and never execute or inline active uploaded content.
- Apply public application rate limiting and abuse controls.
- Store consent and retention metadata according to host privacy policy.

## Admin Experience

Create a Career Center workspace with:

- job list with search, status, visibility, department, location, and publish/close filters;
- create/edit/duplicate/preview/publish/close/archive/delete according to retention rules;
- validated unique slugs, enum values, blank normalization, date coherence, compensation rules, and SEO;
- application queue with job/status/source/date filters;
- application detail with applicant information, secure resume access, cover letter/links, notes, and complete status history;
- status changes with notes and validated transitions;
- settings for labels, sharing, notifications, resume limits/retention, feeds, indexing, partner metadata, and webhooks;
- masked integration status and connection/readiness tests where possible.

Send applicant/admin notifications asynchronously through host email templates and expose delivery failure operationally without failing a successfully persisted application.

## Integrations

Provide optional, independently configurable adapters for:

- Indeed XML feed;
- Indeed Apply readiness/partner controls;
- ZipRecruiter inbound apply readiness;
- LinkedIn partner metadata;
- Google indexing when the host has a supported implementation;
- generic signed webhook dispatch for job/application lifecycle events.

Rules:

- public feeds include only eligible public published jobs and obey the app toggle;
- inbound partner applications pass through the same validation, idempotency, storage, consent/source, and status rules as website applications;
- webhook payloads contain only required fields and are signed with a secret;
- secrets are encrypted/masked and included only inside the service that needs them;
- webhook delivery is timeout-bounded, retryable, and observable;
- integration failure does not lose the committed job/application transaction.

## Career Center Acceptance Criteria

- An editor can create, preview, publish, close, and archive a job with correct filters and SEO/structured data.
- A visitor can find an eligible job and submit a validated application with a privately stored resume and consent.
- An authorized reviewer can filter applications, securely access resumes, add notes, and move candidates through hiring statuses with history.
- Draft/internal/closed/ineligible jobs and private applicant data never leak through public APIs, search, sitemap, feeds, embeds, or errors.
- Partner feeds/readiness/webhooks obey configuration, signatures, idempotency, and masked-secret rules.
- Career Center works without Directory or CMS, then gains profile linking or CMS blocks through adapters when those apps are enabled.
- Disabling Career Center hides public/admin/API/search/feed/embed surfaces and stops new applications/outbound jobs while preserving jobs, applications, private files, notes, and integration history.

---

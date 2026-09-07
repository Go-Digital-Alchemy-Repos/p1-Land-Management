# Directory Bolt-On App — Master Prompt

Append this prompt to [00 — Universal Bolt-On App Contract](./00-universal-bolt-on-app-contract.md).

---

Build the complete **Directory** bolt-on app described below.

## App Registration

- App id/slug: `directory`
- Display name: configurable, default `Directory`
- Core Platform feature key: `directoryEnabled`
- Core Platform persisted setting: `system_configuration.enable_directory`
- Core Platform default: enabled; use disabled for a fresh external installation unless explicitly configured otherwise
- Public routes: `/directory`, `/directory/:profileId`, `/join`, `/reference/:token`
- Authenticated owner routes: host-equivalent profile, application, application-status, and directory-subscription routes
- Admin route families: `/admin/therapists`, `/admin/directory`, `/admin/applications`
- Public API family: Core parity under `/api/therapists` and host-preferred `/api/directory`
- Admin API family: `/api/admin/therapists`, `/api/admin/directory`, `/api/admin/applications`
- Core permission: `directory`; map to host-equivalent view/manage/review permissions

## Product Goal

Provide a reusable public directory and an operational system for listing owners, administrators, applications, vetting, profile approval, and optional paid listings.

All industry-specific nouns must be configurable: directory name, listing singular/plural, owner singular/plural, specialty singular/plural, application language, and CTA copy. Preserve Core Platform's therapist/professional terminology only as a preset, not as hardcoded UI or schema assumptions.

## Domain Model

Implement host-equivalent, namespaced models for:

- listing-owner user linkage and directory profiles;
- profile identity/title, biography, credentials/license fields, specialties, languages, practice/service mode, contact and social fields;
- structured address/location, latitude/longitude, remote/in-person availability, accepting-new-clients/availability, travel, featured status, approval, active status, and public visibility;
- ordered profile media linked to shared media when available;
- specialty/taxonomy records with active state and stable slugs;
- directory settings, terminology, approval rules, filter visibility, application requirements, fees, and listing/subscription behavior;
- saved/favorited profiles and profile-view analytics where the host supports signed-in users;
- applications, timeline events, credentials, references, background checks, interviews, decisions, and payment state;
- optional directory listing tiers/subscriptions, billing identifiers, lifecycle status, and renewal metadata.

Index public visibility, directory mode, specialty/language arrays or join tables, country/location, featured state, ownership, application status, and provider ids according to the host database.

## Public Directory Experience

Build:

- responsive archive with keyword search, specialty, service/practice mode, language, country/region, availability, travel, sorting, and bounded pagination;
- server-driven filter options derived only from public eligible profiles;
- card/list and optional map views that follow host patterns;
- featured listings without bypassing approval and active-state rules;
- accessible public profile detail with media, credentials, specialties, languages, services, location/service area, availability, contact actions, social links, and appropriate structured data;
- empty, no-results, filter-reset, unavailable-location, and loading states;
- optional save/favorite behavior for authenticated users;
- privacy-safe profile analytics.

When application approval is required, every public list, filter, featured, detail, search, sitemap, and embed query must require an approved and active profile. Do not leak rejection notes, private contact data, application data, license secrets, background-check data, or owner account details.

## Listing Owner And Applicant Experience

Create:

- owner dashboard and profile editor with autosave or explicit save matching the host;
- media, location, specialties, credentials, social links, availability, and public-preview workflows;
- multi-step application with durable draft/autosave state;
- credentials and up to three references, application fee state when configured, review status, timeline-safe next steps, and withdrawal rules;
- secure external reference form using an expiring/unguessable token;
- applicant-facing reads that redact administrator notes and vendor-only background-check fields;
- optional listing-subscription checkout and billing portal, kept separate from the Membership and Ecommerce apps.

## Admin Experience

Create:

- searchable/filterable listing table with approval, active, featured, owner, location, and update status;
- create owner plus profile, edit profile, approve, reject with reason, activate/deactivate, feature/unfeature, and preview;
- taxonomy/specialty management;
- directory settings and terminology controls;
- application queue and full application detail;
- validated application state transitions, timeline notes, reference resend/status, background-check initiate/sync/update, interview scheduling/status, and decision workflow;
- approval/rejection notification delivery;
- safe controls for listing tiers/subscriptions when enabled.

Application status changes must go through a service-level transition map and transaction, not arbitrary field writes. Preserve timeline history and return allowed next states for invalid transitions.

## Rules And Integrations

- Normalize location changes through a single location service so coordinates and display fields remain coherent.
- Use a geocoding/map adapter only when configured; the non-map directory must remain fully usable without it.
- Normalize media URLs through the host media adapter.
- Treat public filters and pagination as bounded, validated query inputs.
- Use email templates for application, reference, approval, rejection, interview, and billing messages.
- Background-check integrations require HTTPS report links, masked credentials, least privilege, and administrator-only detail.
- Application-fee and listing-subscription payment settings are separate from Membership and Ecommerce configuration.
- Reuse open checkout sessions when safe, verify signed webhooks, and reconcile payment state idempotently.
- Career Center may optionally link a job to a public directory profile through an adapter; neither app may require the other.

## Directory Acceptance Criteria

- A visitor can search/filter public eligible listings and view an accessible detail page with no private data leakage.
- A listing owner can maintain a profile, complete the configured application flow, request references, pay any configured fee, and see a sanitized status.
- An authorized reviewer can process an application through valid transitions, vetting, interview, and decision history.
- Approval rules are enforced consistently across list, filter, detail, search, sitemap, map, and embeds.
- Configurable terminology can transform the experience from a therapist directory to another professional/listing directory without code changes.
- Disabling Directory hides public, owner, admin, API, search, map, and embedded surfaces while preserving profiles, applications, files, and billing records.

---
